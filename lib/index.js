const blocked = require('blocked');
//const ResolvedQuery = require('./resolved_query');
const ResolvedQuery = require('./ResolvedQuery');
const Errors = require('./errors.js');

const eql = (query_value, value, callback) => callback(null, query_value === value);
const arrayIncludes = (query_value, value, callback) => {
    value = [].concat(value);
    for (let qv of query_value) {
        if (!value.includes(qv))
            return callback(null, false);
    }

    return callback(null, true);
};
const evalNumberExpression = (expressions, value, callback) => {
    //TODO: !for negation
    for (let i = 0; i < expressions.length; i++) {
        //console.log('debug eval:', value, expressions[i], ':', i);
        if (!eval(value + expressions[i]))
            return callback(null, false);
    }

    return callback(null, true);
};
const evalStringExpression = (regex, value, callback) => callback(null, regex.test(value));


/**
 * @module resolveQuery
 * @description Retrieve a Promise on a ResolvedQuery instance
 * @param query The query object
 * @param {ResolvedSchema} resolved_schema
 * @param {function} [callback] (Error, ResolvedQuery)
 * @returns {Promise<ResolvedQuery>} Only, if no callback is given
 * @example
 * const resolveQuery = require('resolved-query');
 * //usage as promise
 * resolveQuery({})
 *  .then(resolved_query) => {...}
 *  .catch(err) => {...}
 * //usage with callback
 * resolveQuery({}, (err, resolved_query) => {...})
 */
module.exports = function (query, resolved_schema, callback) {
    blocked((ms) => {
        console.warn('"ResolvedQuery" blocked for %sms', ms | 0);
    }, {threshold: 1});

    if (typeof callback === 'function')
        return callback(null, new ResolvedQuery(query, resolved_schema));

    return new Promise((resolve) => {
        return resolve(new ResolvedQuery(query, resolved_schema));
    });
};