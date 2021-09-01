const createContext = require('./createContext')

const withinContext = async fn => {

    let ctx = null

    try {

        ctx = await createContext()

        await fn(ctx)

    } catch (e) {

        throw e

    } finally {
        if (ctx) {
            await ctx.destroy()
        }
    }
}

module.exports = withinContext