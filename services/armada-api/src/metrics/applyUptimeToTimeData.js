const getCurrentSlotIndex = require('./getCurrentSlotIndex')

const applyUptimeToTimeData = (timeData, date) => {

    const slotIndex = getCurrentSlotIndex(date)

    timeData = [
        ...timeData
    ]

    timeData[slotIndex] = 1

    return timeData
}

module.exports = applyUptimeToTimeData