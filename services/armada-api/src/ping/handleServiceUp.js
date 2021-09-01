const moment = require('moment')
const sendNotification = require('../notifications/sendNotification')

const handleServiceUp = async (ctx, { pool, metric, metricIssue }) => {

    let text = null

    const diff = moment().diff(metricIssue.createdAt)

    if (metric.nodeType === 'relay') {
        text = `[${pool.ticker}] Relay ${metric.addr}:${metric.port} is UP. Node was down for ${moment.duration(diff).humanize()}.`
    }

    if (metric.nodeType === 'core') {
        text = `[${pool.ticker}] Block Producer is UP. Node was down for ${moment.duration(diff).humanize()}.`
    }

    if (text) {

        await sendNotification({
            text
        })
    }
}

module.exports = handleServiceUp;