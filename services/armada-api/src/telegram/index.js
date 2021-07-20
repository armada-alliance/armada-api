const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const FormData = require('form-data')
const telegram = axios.create({
    baseURL: `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}`
})

const app = express()

const bot_username = 'armada_robot'

app.post(`/telegram/${process.env.TELEGRAM_WEBHOOK_ID}`, bodyParser.json(), async (req, res) => {

    try {

        const { message } = req.body

        if (message.text === `/stats@${bot_username}`) {

            console.log('reply')

            await telegram.post(`/sendMessage`, {
                chat_id: message.chat.id,
                text: 'Arrr, I\'ll take your request to heart'
            })

            const { data: stream } = await axios.get(`https://api.sublayer.io/webpage-to-image/image?url=https://armada-alliance.com/stats-widget&width=1000&height=500`, { responseType: 'stream' })

            let form = new FormData();
            form.append("photo", stream);
            form.append("chat_id", message.chat.id);
            form.append("caption", "👀");

            await telegram.request({
                method: 'post',
                url: `/sendPhoto`,
                headers: form.getHeaders(),
                data: form
            })
        }
        console.log(req.body)
    } catch (e) {

        console.log(e)

    } finally {
        res.send('ok')

    }

})

module.exports = app