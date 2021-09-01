const sendNotification = require('../notifications/sendNotification')

/**
 * Whenever the slot height is above the threshold, send an email
 */
const handleSlotHeightAboveTreshold = async (ctx, { metric, pool }) => {

    await sendNotification({
        text: `[${pool.ticker}] tip diff is above 50 (${metric.slotHeightDiff}) for longer than 5 minutes.`
    })
}

module.exports = handleSlotHeightAboveTreshold;