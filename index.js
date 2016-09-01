/**
 * Created by kalle on 01.09.2016.
 */
const blocked = require('blocked');
blocked((ms) => {
    console.warn('"ResolvedQuery" blocked for %sms', ms | 0);
}, {threshold: 1});

module.exports = require('./lib/resolve');
