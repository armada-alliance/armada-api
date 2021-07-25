const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const FormData = require('form-data')
const createContext = require('../context/createContext')
const telegram = axios.create({
    baseURL: `https://api.telegram.org/bot${process.env.TELEGRAM_API_TOKEN}`
})

const app = express()

const bot_username = 'armada_robot'

app.post(`/telegram/${process.env.TELEGRAM_WEBHOOK_ID}`, bodyParser.json(), async (req, res) => {

    let ctx = await createContext()

    try {

        const { message } = req.body

        if (message.from && message.from.username) {

            let [telegram_user] = await ctx.db.query('SELECT * FROM telegram_users WHERE remoteId = ? LIMIT 1', [
                message.from.id
            ])

            if (!telegram_user) {
                await ctx.db.query('INSERT INTO telegram_users SET ?', {
                    remoteId: message.from.id,
                    username: message.from.username,
                    lastMessage: message.text,
                    lastActiveAt: new Date(),
                    createdAt: new Date()
                })
            } else {
                await ctx.db.query('UPDATE telegram_users SET ? WHERE remoteId = ?', [
                    {
                        username: message.from.username,
                        lastMessage: message.text,
                        lastActiveAt: new Date()
                    },
                    message.from.id
                ])
            }
        }

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
        if (ctx) {
            await ctx.destroy()
        }
    }

})

module.exports = app