const express = require('express')
const bodyParser = require('body-parser')
const createContext = require('../context/createContext')
const assert = require('assert')
const app = express()
const moment = require('moment')

app.post(`/ping`, bodyParser.json(), async (req, res) => {

    let ctx = await createContext()

    try {

        const nodeVersion = req.body.node_version
        const slotHeight = req.body.slot_height ? ~~req.body.slot_height : null
        const remainingKesPeriods = req.body.remaining_kes_periods ? ~~req.body.remaining_kes_periods : null
        const [token] = (req.headers.authorization || '').split(' ').reverse()

        // console.log(req.headers)
        // console.log(req.body)

        assert(token, 'Token not specified in Authorization header')

        ctx = await createContext()

        const [pool] = await ctx.db.query('SELECT * FROM pools WHERE token = ? LIMIT 1', [
            token
        ])

        assert(pool, `Pool not found for token: ${token}`)

        console.log(
            JSON.stringify({
                ticker: pool.ticker,
                token,
                nodeVersion,
                slotHeight,
                remainingKesPeriods
            })
        )

        const date = moment.utc().format('YYYY-MM-DD')

        let [metric] = await ctx.db.query('SELECT * FROM metrics WHERE date = ? AND poolId = ? LIMIT 1', [
            date,
            pool.poolId
        ])

        if (!metric) {

            await ctx.db.query('INSERT INTO metrics SET ?', {
                date,
                poolId: pool.poolId,
                ticker: pool.ticker,
                remainingKesPeriods,
                slotHeight,
                nodeVersion,
                pingCount: 1,
                updatedAt: null,
                createdAt: new Date(),
            })
        } else {

            await ctx.db.query('UPDATE metrics SET ? WHERE date = ? AND poolId = ?', [
                {
                    ticker: pool.ticker,
                    remainingKesPeriods,
                    slotHeight,
                    nodeVersion,
                    pingCount: metric.pingCount + 1,
                    updatedAt: new Date()
                },
                date,
                pool.poolId
            ])
        }

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