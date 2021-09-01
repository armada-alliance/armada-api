const getCurrentSlotIndex = require('./getCurrentSlotIndex')

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

module.exports = getUptimePctForTimeData