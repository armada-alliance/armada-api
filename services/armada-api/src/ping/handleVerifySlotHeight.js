const moment = require('moment')
const handleSlotHeightAboveTreshold = require('./handleSlotHeightAboveTreshold')

const handleVerifySlotHeight = async (ctx) => {

    const date = moment.utc().format('YYYY-MM-DD')

    const [{ minSlotHeight, maxSlotHeight }] = await ctx.db.query('SELECT MAX(slotHeight) as maxSlotHeight, MIN(slotHeight) as minSlotHeight FROM metrics WHERE date = ? LIMIT 1', [
        date
    ])

    const metrics = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND nodeType = ?', [
        date,
        'core'
    ])

    await Promise.all(
        metrics.map(async (metric) => {

            const [pool] = await ctx.db.query('SELECT * FROM pools WHERE poolId = ? LIMIT 1', [
                metric.poolId
            ])

            const serviceId = [metric.nodeType, metric.addr, metric.port].join('_')

            let [metricIssue] = await ctx.db.query('SELECT * FROM metric_issues WHERE type = ? AND status = ? AND serviceId = ? LIMIT 1', [
                'slotHeightAboveTreshold',
                'open',
                serviceId
            ])

            let slotHeightAboveTresholdAt = null

            if (metricIssue) {
                slotHeightAboveTresholdAt = metricIssue.createdAt
            }

            // console.log([
            //     maxSlotHeight - metric.slotHeight,
            //     metric.date,
            //     metric.poolId,
            // ])

            const slotHeightDiff = maxSlotHeight - metric.slotHeight

            /**
             * If there's a metric issue, and the slot height is still above the threshold,
             * and 5 minutes has passed since opening the issue,
             * send a notification.
             */
            if (slotHeightAboveTresholdAt && slotHeightDiff > 50) {

                const now = moment.utc()
                const timeSinceLastAboveTreshold = now.diff(slotHeightAboveTresholdAt, 'minutes')
                if (metricIssue.messageCount === 0 && timeSinceLastAboveTreshold > 5) {
                    await handleSlotHeightAboveTreshold(ctx, { pool, metric, metricIssue })
                }
            }

            /**
             * If the slot height is below the threshold and there's an issue,
             * we resolve the issue.
             */
            if (slotHeightAboveTresholdAt && slotHeightDiff < 50) {

                await ctx.db.query('UPDATE metric_issues SET ? WHERE id = ?', [
                    {
                        status: 'resolved',
                        updatedAt: new Date()
                    },
                    metricIssue.id
                ])
            }

            /**
             * If the slot height diff is above the threshold, we want to add a new issue
             * if it is not already there.
             */
            if (slotHeightAboveTresholdAt === null && slotHeightDiff > 50) {

                await ctx.db.query('INSERT INTO metric_issues SET ?', [
                    {
                        type: 'slotHeightAboveTreshold',
                        status: 'open',
                        serviceId,
                        createdAt: new Date()
                    }
                ])
            }

            await ctx.db.query('UPDATE metrics SET ? WHERE date = ? AND poolId = ? AND nodeType = ?', [
                {
                    slotHeightDiff
                },
                metric.date,
                metric.poolId,
                'core'
            ])
        })
    )
}

module.exports = handleVerifySlotHeight