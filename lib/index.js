const blocked = require('blocked');
const ResolvedQuery = require('./resolved_query');
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
    const query_keys = Object.keys(query);
    const schema_index = resolved_schema.index();
    const schema_keys = resolved_schema.keys();
    const result = {};
    let error;

    const process = (items, method) => {
        if (error)
            return;

        items = items.concat();
        method(items.shift());
        if (items.length > 0)
            return process(items, method);
    };
    process(query_keys, function (query_key) {
        //We do not want a loop. To prevent blocking the event loop
        //for (let query_key of query_keys) {
        if (!schema_keys.includes(query_key))
            return error = new Errors.QueryError(`Invalid query: ${query_key} is not part of resolved schema (${schema_keys.join(', ')})`);

        //TODO: determine in resolved-schema, if we really can work with an empty array for index. if not we must change first part of condition to a bool converting undefined
        if (schema_index.length && !schema_index.includes(query_key)) {
            return error = new Errors.QueryError(`Invalid query: ${query_key} is not part of resolved schema's index (${schema_index.join(', ')})`);
            //break;
        }

        let key_res = result[query_key] = {};
        let query_value = query[query_key];
        if (resolved_schema.value(query_key).typeOf('string')) {
            const check_regex = /\/(.*)\/([gmiu]{0,4})$/;
            const check_wildcard = /^[^*]*\*[^*]*$/;
            switch (typeof query_value) {
                case 'string':
                    if (check_regex.test(query_value)) {
                        try {
                            let groups = check_regex.exec(query_value);
                            let regexp = new RegExp(groups[1], groups[2]);
                            key_res.match = evalStringExpression.bind(this, regexp);
                            key_res.expression = query_value;

                        } catch (e) {
                            return error = new Errors.QueryError('Invalid RegExp from query ', query_value, e.message)
                        }
                    } else if (check_wildcard.test(query_value)) {
                        //considered to have wildcard
                        try {
                            let regexp = new RegExp(query_value.replace('*', '[^\*]*'));
                            key_res.match = evalStringExpression.bind(this, regexp);
                            key_res.expression = query_value;
                        } catch (e) {
                            return error = new Errors.QueryError('Invalid RegExp from query ', query_value, e.message)
                        }
                    } else {
                        //considered equals
                        key_res.match = eql.bind(this, query_value);
                        key_res.value = query_value;
                    }
                    break;
                case 'object':
                    if (query_value.constructor.name === 'RegExp') {
                        key_res.match = evalStringExpression.bind(this, query_value);
                        key_res.expression = query_value;
                    } else
                        return error = new Errors.QueryError(`Type mismatch: Query for ${query_key} requires String or RegExp, but was ${typeof query_value}`);
                    break;
                default:
                    return error = new Errors.QueryError(`Type mismatch: Query for ${query_key} requires String or RegExp, but was ${typeof query_value}`);
                    break;
            }
        } else if (resolved_schema.value(query_key).typeOf('number')) {
            switch (typeof query_value) {
                case 'number':
                    key_res.is_number = true;
                    key_res.value = Number(query_value);
                    key_res.match = eql.bind(this, Number(query_value));
                    break;
                case 'string':
                    const regex = /\s*(<=|>=|<|>)\s*(\d+\.?\d*)\s*/g;
                    let processed_query = '',
                        expressions = [],
                        groups;

                    while ((groups = regex.exec(query_value)) !== null) {
                        // This is necessary to avoid infinite loops with zero-width matches
                        if (groups.index === regex.lastIndex)
                            regex.lastIndex++;

                        if (groups.length !== 3)
                            return error = new Errors.QueryError('wrong syntax:', groups[0] || 'no query');

                        processed_query += groups[0];
                        expressions.push(`${groups[1]}${groups[2]}`);
                    }
                    if (query_value.length !== processed_query.length)
                        return error = new Errors.QueryError('wrong syntax: evaluated ' + processed_query, ' vs. ', query_value);

                    key_res.is_number = true;
                    key_res.expression = query_value;
                    key_res.match = evalNumberExpression.bind(this, expressions);
                    break;
                default:
                    return error = new Errors.QueryError(`query for "${query_key}" must be a number or an expression string, but was: ${typeof query_value}`);
                    break;
                //if (isNaN(ensured_number)) //TODO reactivate this check somehow
                //throw new Error('Query for ' + key + ' must be of type number or an expression starting with <, <=, >, or >= following any number, but was: ', query_value);
            }
        } else if (resolved_schema.value(query_key).typeOf('array')) {
            if (!Array.isArray(query_value))
                return error = new Error(`Query for "${query_key}" must be an array but was: ${typeof query_value}`);

            else { //TODO: arrayIncludes must support regex as well....? or wildcard at least? dunno yet...
                key_res.is_array = true;
                key_res.value = query_value;
                key_res.match = arrayIncludes.bind(this, query_value);
            }
        }
    });


    blocked((ms) => {
        console.warn('"ResolvedQuery" blocked for %sms', ms | 0);
    }, {threshold: 1});

    if (typeof callback === 'function') {
        if (error)
            return callback(error);

        return callback(null, new ResolvedQuery(result, query_keys));
    }

    return new Promise((resolve, reject) => {
        if (error)
            return reject(error);

        return resolve(new ResolvedQuery(result, query_keys));
    });
};