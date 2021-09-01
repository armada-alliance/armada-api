const times = require('lodash/times')
const constant = require('lodash/constant')

const AMOUNT_TIME_DATA_SLOTS = 60 * 24

const createTimeData = () => {
    return times(AMOUNT_TIME_DATA_SLOTS, constant(0))
}
const parseTimeData = input => {
    return input ? input.split('').map(i => ~~i) : createTimeData()
}

const stringifyTimeData = input => {
    return input.join('')
}

module.exports = {
    createTimeData,
    parseTimeData,
    stringifyTimeData
}