const moment = require('moment')

let pointer = null

const startInterval = (fn) => {

    const handleInterval = () => {

        if (!pointer || moment().isAfter(pointer.clone().add(1, 'minutes'))) {
            pointer = moment().startOf('minute')
            fn()
        }
    }

    let interval = setInterval(handleInterval, 1000);
    return () => {
        clearInterval(interval);
    };
}

module.exports = startInterval