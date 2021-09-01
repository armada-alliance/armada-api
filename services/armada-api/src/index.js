const express = require('express')
const os = require('os')
const cors = require('cors')
const pkg = require('../package.json')
const createContext = require('./context/createContext')
const bodyParser = require('body-parser')
const telegram = require('./telegram')
const ping = require('./ping')
const startInterval = require('./utils/startInterval')
const handleInterval = require('./ping/handleInterval')
const app = express()

startInterval(handleInterval)

app.use(cors())

app.use(telegram)
app.use(ping)

app.post('/newsletter/submit', bodyParser.json(), async (req, res) => {

    let ctx = null

    try {

        ctx = await createContext()

        await ctx.db.query('INSERT INTO contacts SET ?', [
            {
                email: req.body.email,
                createdAt: new Date()
            }
        ])

        res.send('ok')

    } catch (e) {
        console.log(e)
        res.send('error')
    } finally {
        if (ctx) {
            await ctx.destroy()
        }
    }

})

app.get('/', (req, res) => {

    res.json({
        name: pkg.name,
        platform: {
            type: os.type(),
            release: os.release()
        },
        hostname: os.hostname()
    })
})

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

app.listen(PORT, HOST, () => {
    console.log(`${pkg.name} listening on ${HOST}:${PORT}`)
})