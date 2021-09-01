const moment = require('moment')
const getStatusForTimeData = require('../metrics/getStatusForTimeData')
const { parseTimeData } = require('../metrics/timeData')

const handleVerifyCoreUptime = async (ctx) => {

    const date = moment.utc().format('YYYY-MM-DD')

    const metrics = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND nodeType = ?', [
        date,
        'core'
    ])

    await Promise.all(
        metrics.map(async (metric) => {

            const [{ totalCount: previousMetricCount }] = await ctx.db.query('SELECT COUNT(id) as `totalCount` FROM metrics WHERE date < ? AND poolId = ? AND nodeType = ? LIMIT 1', [
                date,
                metric.poolId,
                'core'
            ])

            const timeData = parseTimeData(metric.data)
            const status = getStatusForTimeData(timeData, { firstMetric: !previousMetricCount, isToday: true })

            const serviceId = [metric.nodeType, metric.addr, metric.port].join('_')

            let [metricIssue] = await ctx.db.query('SELECT * FROM metric_issues WHERE type = ? AND status = ? AND serviceId = ? LIMIT 1', [
                'downStatus',
                'open',
                serviceId
            ])

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
                ])
            }

            if (status === 'UP' && lastDownAt !== null) {

                await ctx.db.query('UPDATE metric_issues SET ? WHERE id = ?', [
                    {
                        type: 'downStatus',
                        status: 'open',
                        serviceId,
                        createdAt: new Date()
                    },
                    metricIssue.id
                ])
            }

            await ctx.db.query('UPDATE metrics SET ? WHERE date = ? AND poolId = ? AND nodeType = ?', [
                {
                    status
                },
                metric.date,
                metric.poolId,
                'core'
            ])
        })
    )
}

module.exports = handleVerifyCoreUptime