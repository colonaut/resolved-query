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
const evalNumberExpression = (query_value, value, callback) => {
    //TODO: !for negation
    const regex = /\s*(<=|>=|<|>)\s*(\d+\.?\d*)\s*/g;
    let found = '',
        expr_res = true,
        groups;

    while ((groups = regex.exec(query_value)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (groups.index === regex.lastIndex)
            regex.lastIndex++;

        if (groups.length !== 3)
            return callback(new Errors.QueryError('wrong syntax:', groups[0] || 'no query'));

        found += groups[0];
        /*groups.forEach((match, i) => {
            switch (i) {
                case 0:
                    found += match;
                    break;
                case 1:
                    op = match;
                    break;
                case 2:
                    val = match;
                    break;
                default:
                    throw new Error('query synthax not right: ' + found);
                    break;
            }
            //console.log(`Found match, group ${i}: ${match}`);
            //console.log('eval:', eval(value + op + val));
        });*/

        expr_res = eval(value + groups[1] + groups[2]);
        //console.log('debug eval:', value, found, expr_res);
        if (!expr_res)
            return callback(null, false);
    }

    if (query_value.length !== found.length)
        return callback(new Errors.QueryError('wrong syntax: evaluated ' + found, ' vs. ', query_value));

    return callback(null, expr_res);
};
const evalStringExpression = (regex, value, callback) => {
    //TODO: !for negation

    console.log('DEBUG: eval string value:', value, 'regex:', regex);
    try {
        callback(null, regex.test(value));
    } catch (err) {
        callback(err);
    }

};


/**
 * @module resolveQuery
 * @description Retrieve a Promise on a ResolvedQuery instance
 * @param query The query object
 * @param {ResolvedSchema} resolved_schema
 * @param {function} [callback]
 * @returns {Promise<ResolvedQuery>}
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
    //TODO: resolved_schema must return an empty array, if no index is given, if we want to filter keys of query by index... IF index array is not empty.
    const keys = Object.keys(query);//.filter(k => resolved_schema.index().includes(k));
    const result = {};
    let error;
    for (let key of keys) {
        //TODO: prob. not neccessary, if we do not have keys or an empty array of keys in schema
        if (!resolved_schema.index().includes(key)) {
            error = new Errors.QueryError(`invalid query: ${key} is not part of resolved schema's index (${resolved_schema.index().join(', ')})`);
            break;
        }

        let key_res = result[key] = {};
        let query_value = query[key];
        if (resolved_schema.value(key).typeOf('string')) {
            const check_regex = /\/.*\/[gmiu]{0,4}$/;
            const check_wildcard = /^[^*]*\*[^*]*$/;
            if (check_regex.test(query_value)) {
                //considered to be a regex
                key_res.match = evalStringExpression.bind(this, query_value); //TODO try catch mit error hier, da das hier schon knallt, wenn new Regex gemacht wird... obwohl die übergebene können wir auch später im match TEST!...
                key_res.expression = query_value;
            } else if (check_wildcard.test(query_value)) {
                //considered to have wildcard
                let regex = new RegExp(query_value.replace('*', '\\D*'));
                key_res.match = evalStringExpression.bind(this, regex);
                key_res.expression = query_value;
            } else {
                //considered equals
                key_res.match = eql.bind(this, query_value);
                key_res.value = query_value;
            }
        } else if (resolved_schema.value(key).typeOf('number')) { //TODO regex hier bilden?
            switch (typeof query_value) {
                case 'number':
                    key_res.is_number = true;
                    key_res.value = Number(query_value);
                    key_res.match = eql.bind(this, Number(query_value));
                    break;
                case 'string':
                    key_res.is_number = true;
                    key_res.expression = query_value;// = query_value.trim();
                    key_res.match = evalNumberExpression.bind(this, query_value);
                    break;
                default:
                    error = new Errors.QueryError(`query for "${key}" must be a number or a string but was: ${typeof query_value}`);
                    break;
                //if (isNaN(ensured_number)) //TODO reactivate this check somehow
                //throw new Error('Query for ' + key + ' must be of type number or an expression starting with <, <=, >, or >= following any number, but was: ', query_value);
            }
            if (error)
                break;
        } else if (resolved_schema.value(key).typeOf('array')) {
            if (!Array.isArray(query_value)) {
                error = new Error(`Query for "${key}" must be an array but was: ${typeof query_value}`);
                break;
            } else { //TODO: arrayIncludes must support regex as well....
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