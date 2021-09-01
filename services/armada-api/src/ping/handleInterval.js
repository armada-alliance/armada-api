const moment = require('moment')
const withinContext = require('../context/withinContext')
const handleVerifySlotHeight = require('./handleVerifySlotHeight')
const handleVerifyCoreUptime = require('./handleVerifyCoreUptime')
const handleVerifyRelayUptime = require('./handleVerifyRelayUptime')

const handleInterval = async () => withinContext(async ctx => {


    console.log('handleInterval', moment().format())
    await handleVerifySlotHeight(ctx)
    await handleVerifyCoreUptime(ctx)
    await handleVerifyRelayUptime(ctx)

})

module.exports = handleInterval