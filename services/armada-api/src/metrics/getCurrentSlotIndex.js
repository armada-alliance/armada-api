const moment = require('moment')

const getCurrentSlotIndex = (date) => {
    const today = moment.utc().startOf('day').valueOf()
    const dateInMillis = moment.utc(date).valueOf()
    const diff = dateInMillis - today
    const slotIndex = ~~(diff / (60 * 1000))
    return slotIndex
}

module.exports = getCurrentSlotIndex