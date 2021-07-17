const createConnection = require('../database/createConnection')

module.exports = async () => {

    const ctx = {}

    ctx.db = await createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        port: process.env.MYSQL_PORT,
    })

    ctx.destroy = async () => {

        ctx.db.end()
    }

    return ctx
}