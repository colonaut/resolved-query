const ResolvedQuery = require('./resolved_query');

const eql = (query_value, value, callback) => callback(null, query_value === value);
const lt = (query_value, value, callback) => callback(null, value < query_value);
const gt = (query_value, value, callback) => callback(null, value > query_value);
const lte = (query_value, value, callback) => callback(null, value <= query_value);
const gte = (query_value, value, callback) => callback(null, value >= query_value);
const left = (query_value, value, callback) => callback(null, value.startsWith(query_value));
const right = (query_value, value, callback) => callback(null, value.endsWith(query_value));
const inner = (query_value, value, callback) => callback(null, value.indexOf(query_value) > -1);
const arrayIncludes = (query_value, value, callback) => {
    value = [].concat(value);
    for (let qv of query_value) {
        if (!value.includes(qv))
            return callback(null, false);
    }

    return callback(null, true);
};

const blocked = require('blocked');


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
 *  .then(resolved_query)
 *  .catch(err)
 * //usage with callback
 * resolveQuery({}, (err, resolved_query) => {
 * })
 */
module.exports = function (query, resolved_schema, callback) {
    //TODO: resolved_schema must return an empty array, if no index is given
    const keys = Object.keys(query);//.filter(k => schema_analyzer.index().includes(k));
    const result = {};
    let error;
    for (let key of keys) {
        if (!resolved_schema.index().includes(key))
            error = new Error(`Invalid query: ${key} is not part of index.`);

        let key_res = result[key] = {};
        let query_value = query[key];
        if (resolved_schema.value(key).typeOf('string')) {
            //TODO: escaping **
            let qv = query_value.trim();
            if (qv.endsWith('*')) {
                if (qv.startsWith('*'))
                    key_res.match = inner.bind(this, qv.substring(1, qv.length));
                else
                    key_res.match = left.bind(this, qv.substring(0, qv.length - 1));

                key_res.expression = qv;
            } else if (qv.startsWith('*')) {
                key_res.match = right.bind(this, qv.substring(1, qv.length));
                key_res.expression = qv;
            } else {
                key_res.match = eql.bind(this, query_value);
                key_res.value = query_value;
            }
        } else if (resolved_schema.value(key).typeOf('number')) {
            switch (typeof query_value) {
                case 'number':
                    key_res.is_number = true;
                    key_res.value = Number(query_value);
                    key_res.match = eql.bind(this, Number(query_value));
                    break;
                case 'string':
                    key_res.is_number = true;
                    key_res.expression = query_value = query_value.trim();
                    if (query_value.startsWith('<='))
                        key_res.match = lte.bind(this, Number(query_value.substring(2, query_value.length)));
                    else if (query_value.startsWith('>='))
                        key_res.match = gte.bind(this, Number(query_value.substring(2, query_value.length)));
                    else if (query_value.startsWith('<'))
                        key_res.match = lt.bind(this, Number(query_value.substring(1, query_value.length)));
                    else if (query_value.startsWith('>'))
                        key_res.match = gt.bind(this, Number(query_value.substring(1, query_value.length)));
                    break;
                default:
                    //key_res.match = queryError.bind(this, `Query for "${key}" must be a number or a string but was: ${typeof query_value}`);
                    error = new Error(`Query for "${key}" must be a number or a string but was: ${typeof query_value}`);
                    break;
                //if (isNaN(ensured_number)) //TODO reactivate this check somehow
                //throw new Error('Query for ' + key + ' must be of type number or an expression starting with <, <=, >, or >= following any number, but was: ', query_value);
            }
        } else if (resolved_schema.value(key).typeOf('array')) {
            if (!Array.isArray(query_value))
                error = new Error(`Query for "${key}" must be an array but was: ${typeof query_value}`);

            else {
                key_res.is_array = true;
                key_res.value = query_value;
                key_res.match = arrayIncludes.bind(this, query_value);
            }
        }
    }

    blocked((ms) => {
        console.warn('"ResolvedQuery" blocked for %sms', ms | 0);
    }, {threshold: 1});

    if (typeof callback === 'function') {
        if (error)
            return callback(error);

        return callback(null, new ResolvedQuery(result, keys));
    }

    return new Promise((resolve, reject) => {
        if (error)
            return reject(error);

        return resolve(new ResolvedQuery(result, keys));
    });
};