const sendNotification = require('../notifications/sendNotification')

const handleServiceDown = async (ctx, { pool, metric }) => {

    let text = null

    if (metric.nodeType === 'relay') {
        text = `[${pool.ticker}] Relay ${metric.addr}:${metric.port} is DOWN`
    }

    if (metric.nodeType === 'core') {
        text = `[${pool.ticker}] Block Producer is DOWN`
    }

    if (text) {

        await sendNotification({
            text
        })
    }
}

module.exports = handleServiceDown;