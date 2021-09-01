const NetcatClient = require('netcat/client')

const netcat = (addr, port, timeout = 5000) => new Promise((resolve) => {

    let nc = null

    try {

        nc = new NetcatClient()

        nc
            .addr(addr)
            .port(port)
            .connect()
            .on('error', () => {
                resolve('failed')
                nc.close()
            })
            .on('connect', () => {
                resolve('passed')
                nc.close()
            })

        setTimeout(() => {
            resolve('timeout')
            nc.close()
        }, timeout)

    } catch (e) {

        resolve('failed')
        if (nc) {
            nc.close()
        }
    }
});

module.exports = netcat