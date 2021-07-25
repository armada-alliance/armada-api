const express = require('express')
const bodyParser = require('body-parser')
const createContext = require('../context/createContext')
const assert = require('assert')
const app = express()
const moment = require('moment')
const times = require('lodash/times')
const constant = require('lodash/constant')

const AMOUNT_TIME_DATA_SLOTS = 60 * 24

const createTimeData = () => {
    return times(AMOUNT_TIME_DATA_SLOTS, constant(0))
}
const parseTimeData = input => {
    return input ? input.split('').map(i => ~~i) : createTimeData()
}

const stringifyTimeData = input => {
    return input.join('')
}

const getCurrentSlotIndex = (date) => {
    const today = moment.utc().startOf('day').valueOf()
    const dateInMillis = moment.utc(date).valueOf()
    const diff = dateInMillis - today
    const slotIndex = ~~(diff / (60 * 1000))
    return slotIndex
}

const applyUptimeToTimeData = (timeData, date) => {

    const slotIndex = getCurrentSlotIndex(date)

    console.log(date, slotIndex)
    timeData = [
        ...timeData
    ]

    timeData[slotIndex] = 1

    return timeData
}

const getUptimePctForTimeData = (timeData, { firstMetric, isToday }) => {

    if (isToday) {
        const slotIndex = getCurrentSlotIndex(new Date())
        timeData = timeData.slice(0, slotIndex + 1)
    }

    if (firstMetric) {
        timeData = timeData.slice(timeData.indexOf(1), timeData.length)
    }

    // console.log('timeData', timeData.join(''))

    return ~~((timeData.reduce((a, b) => a + b, 0) / timeData.length) * 100)
}

app.get('/ping/metrics', async (req, res) => {

    let ctx = await createContext()

    try {

        const date = moment.utc().format('YYYY-MM-DD')

        const startDate = moment.utc().subtract(90, 'days').format('YYYY-MM-DD')

        const pools = await ctx.db.query('SELECT poolId as id, ticker FROM pools')


        const poolsWithMetrics = await Promise.all(
            pools.map(async pool => {

                const metrics = await ctx.db.query('SELECT uptimePct, date FROM metrics WHERE date >= ? AND poolId = ? ORDER BY date DESC', [
                    startDate,
                    pool.id
                ])

                const [{ avgUptimePct }] = await ctx.db.query('SELECT AVG(uptimePct) as avgUptimePct FROM metrics WHERE poolId = ?', [
                    pool.id
                ])

                const [{ totalCount: previousMetricCount }] = await ctx.db.query('SELECT COUNT(id) as `totalCount` FROM metrics WHERE date < ? AND poolId = ? LIMIT 1', [
                    date,
                    pool.id
                ])

                let [metric] = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND poolId = ? LIMIT 1', [
                    date,
                    pool.id
                ])

                return {
                    ...pool,
                    nodeVersion,
                    remainingKesPeriods,
                    slotHeight,
                    timeData: metric ? metric.data : null,
                    firstMetric: metric ? !previousMetricCount : null,
                    avgUptimePct,
                    metrics: metrics.map(metric => ([metric.date, metric.uptimePct]))
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

        const [{ totalCount: previousMetricCount }] = await ctx.db.query('SELECT COUNT(id) as `totalCount` FROM metrics WHERE date < ? AND poolId = ? LIMIT 1', [
            date,
            pool.poolId
        ])

        let [metric] = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND poolId = ? LIMIT 1', [
            date,
            pool.poolId
        ])

        let timeData = parseTimeData(metric.data)

        timeData = applyUptimeToTimeData(timeData, new Date())

        // console.log(stringifyTimeData(timeData))

        if (!metric) {

            await ctx.db.query('INSERT INTO metrics SET ?', {
                date,
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

            await ctx.db.query('UPDATE metrics SET ? WHERE date = ? AND poolId = ?', [
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
                pool.poolId
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