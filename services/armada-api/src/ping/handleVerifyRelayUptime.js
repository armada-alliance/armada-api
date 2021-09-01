const moment = require('moment')
const axios = require('axios')
const netcat = require('../utils/netcat')
const { stringifyTimeData, parseTimeData } = require('../metrics/timeData')
const applyUptimeToTimeData = require('../metrics/applyUptimeToTimeData')
const getUptimePctForTimeData = require('../metrics/getUptimePctForTimeData')
const getStatusForTimeData = require('../metrics/getStatusForTimeData')
const handleServiceDown = require('./handleServiceDown')
const handleServiceUp = require('./handleServiceUp')

const handleVerifyRelayUptime = async (ctx) => {

    const { data: relays } = await axios.get('https://armada-alliance.com/topology.json')

    const date = moment.utc().format('YYYY-MM-DD')

    await Promise.all(
        relays.map(async relay => {

            const [pool] = await ctx.db.query('SELECT * FROM pools WHERE poolId = ? LIMIT 1', [
                relay.poolId
            ])

            if (!pool) {
                return
            }

            const result = await netcat(relay.addr, relay.port, 5000)

            const [{ totalCount: previousMetricCount }] = await ctx.db.query('SELECT COUNT(id) as `totalCount` FROM metrics WHERE date < ? AND poolId = ? AND nodeType = ? AND addr = ? AND port = ? LIMIT 1', [
                date,
                relay.poolId,
                'relay',
                relay.addr,
                relay.port
            ])

            let [metric] = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND poolId = ? AND nodeType = ? AND addr = ? AND port = ?', [
                date,
                relay.poolId,
                'relay',
                relay.addr,
                relay.port
            ])

            let timeData = parseTimeData(metric ? metric.data : null)

            if (result === 'passed') {
                timeData = applyUptimeToTimeData(timeData, new Date())
            }

            const status = getStatusForTimeData(timeData, { firstMetric: !previousMetricCount, isToday: true })

            const serviceId = ['relay', relay.addr, relay.port].join('_')

            let [metricIssue] = await ctx.db.query('SELECT * FROM metric_issues WHERE type = ? AND status = ? AND serviceId = ? LIMIT 1', [
                'downStatus',
                'open',
                serviceId
            ])

            let triggerServiceUp = false
            let triggerServiceDown = false

            let lastDownAt = null

            if (metricIssue) {
                lastDownAt = metricIssue.createdAt
            }

            if (status === 'DOWN' && lastDownAt === null) {

                await ctx.db.query('INSERT INTO metric_issues SET ?', [
                    {
                        type: 'downStatus',
                        status: 'open',
                        serviceId,
                        createdAt: new Date()
                    }
                ]);

                [metricIssue] = await ctx.db.query('SELECT * FROM metric_issues WHERE type = ? AND status = ? AND serviceId = ? LIMIT 1', [
                    'downStatus',
                    'open',
                    serviceId
                ])

                triggerServiceDown = true
            }

            if (status === 'UP' && lastDownAt !== null) {

                await ctx.db.query('UPDATE metric_issues SET ? WHERE id = ?', [
                    {
                        type: 'downStatus',
                        status: 'resolved',
                        serviceId,
                        createdAt: new Date()
                    },
                    metricIssue.id
                ]);

                [metricIssue] = await ctx.db.query('SELECT * FROM metric_issues WHERE id = ? LIMIT 1', [
                    metricIssue.id
                ])

                triggerServiceUp = true
            }


            if (!metric) {

                await ctx.db.query('INSERT INTO metrics SET ?', {
                    date,
                    nodeType: 'relay',
                    type: 'outbound',
                    status,
                    addr: relay.addr,
                    port: relay.port,
                    downtimeInMinutes: 0,
                    poolId: relay.poolId,
                    ticker: relay.ticker,
                    data: stringifyTimeData(timeData),
                    uptimePct: getUptimePctForTimeData(timeData, { firstMetric: !previousMetricCount, isToday: true }),
                    pingCount: 1,
                    updatedAt: null,
                    createdAt: new Date(),
                })
            } else {

                await ctx.db.query('UPDATE metrics SET ? WHERE date = ? AND poolId = ? AND nodeType = ? AND addr = ? AND port = ?', [
                    {
                        ticker: relay.ticker,
                        status,
                        data: stringifyTimeData(timeData),
                        uptimePct: getUptimePctForTimeData(timeData, { firstMetric: !previousMetricCount, isToday: true }),
                        pingCount: metric.pingCount + 1,
                        updatedAt: new Date()
                    },
                    date,
                    relay.poolId,
                    'relay',
                    relay.addr,
                    relay.port
                ])
            }

            [metric] = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND poolId = ? AND nodeType = ? AND addr = ? AND port = ?', [
                date,
                relay.poolId,
                'relay',
                relay.addr,
                relay.port
            ])

            if (triggerServiceDown) {
                handleServiceDown(ctx, { pool, metric, metricIssue })
            }

            if (triggerServiceUp) {
                handleServiceUp(ctx, { pool, metric, metricIssue })
            }
        })
    )
}

module.exports = handleVerifyRelayUptime