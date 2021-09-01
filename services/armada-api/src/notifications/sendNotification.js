const path = require('path')
const fs = require('fs/promises')

const sendNotification = async ({ text }) => {

    console.log('sendNotification', text)

    await fs.appendFile(
        path.join(__dirname, '..', '..', 'logs', 'notifications.log'),
        `${new Date().toISOString()} - ${text}\n`
    )
}

module.exports = sendNotification