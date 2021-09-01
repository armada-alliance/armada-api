const express = require('express')
const bodyParser = require('body-parser')
const createContext = require('../context/createContext')
const assert = require('assert')
const app = express()
const moment = require('moment')
const { parseTimeData, stringifyTimeData } = require('../metrics/timeData')
const applyUptimeToTimeData = require('../metrics/applyUptimeToTimeData')
const getUptimePctForTimeData = require('../metrics/getUptimePctForTimeData')
const getStatusForTimeData = require('../metrics/getStatusForTimeData')

app.get('/ping/pools', async (req, res) => {

    let ctx = await createContext()

    try {

        const includeMetrics = req.query.includeMetrics === "true"

        const date = moment.utc().format('YYYY-MM-DD')

        const startDate = moment.utc().subtract(90, 'days').format('YYYY-MM-DD')

        const pools = await ctx.db.query('SELECT poolId as id, ticker FROM pools')

        const poolsWithMetrics = await Promise.all(
            pools.map(async pool => {

                let services = await ctx.db.query("SELECT CONCAT(`nodeType`, IFNULL(`addr`, ''), IFNULL(`port`, '')) as serviceId, nodeType, addr, port, poolId FROM metrics WHERE poolId = ? GROUP BY serviceId", [
                    pool.id
                ])

                services = await Promise.all(
                    services.map(async service => {

                        const { nodeType, addr, port, poolId } = service

                        let metrics = null

                        if (includeMetrics) {
                            metrics = await ctx.db.query('SELECT uptimePct, date FROM metrics WHERE date >= ? AND poolId = ? AND nodeType = ? ORDER BY date DESC', [
                                startDate,
                                poolId,
                                nodeType
                            ])
                            metrics = metrics.reduce((result, metric) => {
                                const date = moment.utc(metric.date).format('YYYY-MM-DD')
                                result[date] = metric.uptimePct
                                return result
                            }, {})
                        }

                        const [{ avgUptimePct }] = await ctx.db.query('SELECT AVG(uptimePct) as avgUptimePct FROM metrics WHERE poolId = ?', [
                            pool.id
                        ])

                        const [{ totalCount: previousMetricCount }] = await ctx.db.query('SELECT COUNT(id) as `totalCount` FROM metrics WHERE date < ? AND poolId = ? AND nodeType = ? LIMIT 1', [
                            date,
                            poolId,
                            nodeType
                        ])

                        let [metric] = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND poolId = ? AND nodeType = ? LIMIT 1', [
                            date,
                            poolId,
                            nodeType
                        ])

                        let props = {}

                        if (metric && nodeType === 'core') {

                            props = {
                                ...props,
                                nodeVersion: metric.nodeVersion,
                                remainingKesPeriods: metric.remainingKesPeriods,
                                slotHeight: metric.slotHeight,
                            }
                        }

                        if (metric && nodeType === 'relay') {

                            props = {
                                ...props,
                                addr,
                                port
                            }
                        }

                        if (metric) {
                            props = {
                                ...props,
                                timeData: metric.timeData,
                                status: metric.status,
                                downtimeInMinutes: metric.downtimeInMinutes,
                                updatedAt: metric.updatedAt,
                                pingCount: metric.pingCount,
                            }
                        }

                        if (metrics) {
                            props = {
                                ...props,
                                metrics
                            }
                        }

                        return {
                            nodeType,
                            timeData: metric ? metric.data : null,
                            firstMetric: metric ? !previousMetricCount : null,
                            avgUptimePct,
                            ...props,
                        }
                    })
                )

                return {
                    ...pool,
                    services
                }
            })
        )

        res.send({
            pools: poolsWithMetrics
        })

    } catch (e) {

        console.log(e)
        res.send('error')

    } finally {
        if (ctx) {
            await ctx.destroy()
        }
    }
})

app.post(`/ping`, bodyParser.json(), async (req, res) => {

    let ctx = await createContext()

    try {

        const nodeVersion = req.body.node_version
        const slotHeight = req.body.slot_height ? ~~req.body.slot_height : null
        const remainingKesPeriods = req.body.remaining_kes_periods ? ~~req.body.remaining_kes_periods : null
        const [token] = (req.headers.authorization || '').split(' ').reverse()

        // console.log(req.headers)
        // console.log(req.body)

        assert(token, 'Token not specified in Authorization header')

        ctx = await createContext()

        const [pool] = await ctx.db.query('SELECT * FROM pools WHERE token = ? LIMIT 1', [
            token
        ])

        assert(pool, `Pool not found for token: ${token}`)

        console.log(
            JSON.stringify({
                ticker: pool.ticker,
                token,
                nodeVersion,
                slotHeight,
                remainingKesPeriods
            })
        )

        const date = moment.utc().format('YYYY-MM-DD')

        const [{ totalCount: previousMetricCount }] = await ctx.db.query('SELECT COUNT(id) as `totalCount` FROM metrics WHERE date < ? AND poolId = ? AND nodeType = ? LIMIT 1', [
            date,
            pool.poolId,
            'core'
        ])

        let [metric] = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND poolId = ? AND nodeType = ? LIMIT 1', [
            date,
            pool.poolId,
            'core'
        ])

        let timeData = parseTimeData(metric ? metric.data : null)

        timeData = applyUptimeToTimeData(timeData, new Date())

        // console.log(stringifyTimeData(timeData))

        if (!metric) {

            await ctx.db.query('INSERT INTO metrics SET ?', {
                date,
                nodeType: 'core',
                type: 'inbound',
                status: getStatusForTimeData(timeData, { firstMetric: !previousMetricCount, isToday: true }),
                downtimeInMinutes: 0,
                poolId: pool.poolId,
                ticker: pool.ticker,
                data: stringifyTimeData(timeData),
                uptimePct: getUptimePctForTimeData(timeData, { firstMetric: !previousMetricCount, isToday: true }),
                remainingKesPeriods,
                slotHeight,
                nodeVersion,
                pingCount: 1,
                updatedAt: null,
                createdAt: new Date(),
            })
        } else {

            await ctx.db.query('UPDATE metrics SET ? WHERE date = ? AND poolId = ? AND nodeType = ?', [
                {
                    ticker: pool.ticker,
                    data: stringifyTimeData(timeData),
                    uptimePct: getUptimePctForTimeData(timeData, { firstMetric: !previousMetricCount, isToday: true }),
                    remainingKesPeriods,
                    slotHeight,
                    nodeVersion,
                    pingCount: metric.pingCount + 1,
                    updatedAt: new Date()
                },
                date,
                pool.poolId,
                'core'
            ])
        }

    } catch (e) {

        console.log(e)

    } finally {
        res.send('ok')
        if (ctx) {
            await ctx.destroy()
        }
    }

})

module.exports = app