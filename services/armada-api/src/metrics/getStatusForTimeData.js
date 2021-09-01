const getCurrentSlotIndex = require('./getCurrentSlotIndex')

const getStatusForTimeData = (timeData, { firstMetric, isToday }) => {

    if (isToday) {
        const slotIndex = getCurrentSlotIndex(new Date())
        timeData = timeData.slice(0, slotIndex + 1)
    }

    if (firstMetric) {
        timeData = timeData.slice(timeData.indexOf(1), timeData.length)
    }

    const lastMinutes = timeData.slice(-5)

    return lastMinutes.includes(0) ? 'DOWN' : 'UP'
}

module.exports = getStatusForTimeData