'use strict';
const Errors = require('./errors');
const Privates = new WeakMap();


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
    //TODO: BLOCKING & !for negation
    for (let i = 0; i < expressions.length; i++) {
        if (!eval(value + expressions[i]))
            return callback(null, false);
    }

    return callback(null, true);
};
const evalStringExpression = (regex, value, callback) => callback(null, regex.test(value));


function resolveQuery(items, callback) {
    if (typeof callback !== 'function') {
        callback = items;
        items = [].concat(Privates.get(this).query_keys);
    }

    if (Privates.get(this).is_resolved)
        callback(null, Privates.get(this).query_result);

    let query_key = items.shift();
    let schema_index = Privates.get(this).schema_index;
    let schema_keys = Privates.get(this).schema_keys;

    if (!schema_keys.includes(query_key))
        return callback(new Errors.QueryError(`Invalid query: ${query_key} is not part of resolved schema (${schema_keys.join(', ')})`));

    //TODO: determine in resolved-schema, if we really can work with an empty array for index. if not we must change first part of condition to a bool converting undefined
    if (schema_index.length && !schema_index.includes(query_key))
        return callback(new Errors.QueryError(`Invalid query: ${query_key} is not part of resolved schema's index (${schema_index.join(', ')})`));

    let query_value = Privates.get(this).query[query_key];
    let query_key_result = Privates.get(this).query_result[query_key] = {};

    if (Privates.get(this).resolved_schema.value(query_key).typeOf('string')) {
        const check_regex = /\/(.*)\/([gmiu]{0,4})$/;
        const check_wildcard = /^[^*]*\*[^*]*$/;
        switch (typeof query_value) {
            case 'string':
                if (check_regex.test(query_value)) {
                    try {
                        let groups = check_regex.exec(query_value);
                        let regexp = new RegExp(groups[1], groups[2]);
                        query_key_result.match = evalStringExpression.bind(this, regexp);
                        query_key_result.expression = query_value;
                    } catch (e) {
                        return callback(new Errors.QueryError('Invalid RegExp from query ', query_value, e.message));
                    }
                } else if (check_wildcard.test(query_value)) {
                    //considered to have wildcard
                    try {
                        let regexp = new RegExp(query_value.replace('*', '[^\*]*'));
                        query_key_result.match = evalStringExpression.bind(this, regexp);
                        query_key_result.expression = query_value;
                    } catch (e) {
                        return callback(new Errors.QueryError('Invalid RegExp from query ', query_value, e.message));
                    }
                } else {
                    //considered equals
                    query_key_result.match = eql.bind(this, query_value);
                    query_key_result.value = query_value;
                }
                break;
            case 'object':
                if (query_value.constructor.name === 'RegExp') {
                    query_key_result.match = evalStringExpression.bind(this, query_value);
                    query_key_result.expression = query_value;
                } else
                    return callback(new Errors.QueryError(`Type mismatch: Query for ${query_key} requires String or RegExp, but was ${typeof query_value}`));
                break;
            default:
                return callback(new Errors.QueryError(`Type mismatch: Query for ${query_key} requires String or RegExp, but was ${typeof query_value}`));
                break;
        }
    } else if (Privates.get(this).resolved_schema.value(query_key).typeOf('number')) {
        switch (typeof query_value) {
            case 'number':
                query_key_result.is_number = true;
                query_key_result.value = Number(query_value);
                query_key_result.match = eql.bind(this, Number(query_value));
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
                        return callback(new Errors.QueryError('wrong syntax:', groups[0] || 'no query'));

                    processed_query += groups[0];
                    expressions.push(`${groups[1]}${groups[2]}`);
                }
                if (query_value.length !== processed_query.length)
                    return callback(new Errors.QueryError('wrong syntax: evaluated ' + processed_query, ' vs. ', query_value));

                query_key_result.is_number = true;
                query_key_result.expression = query_value;
                query_key_result.match = evalNumberExpression.bind(this, expressions);
                break;
            default:
                return callback(new Errors.QueryError(`query for "${query_key}" must be a number or an expression string, but was: ${typeof query_value}`));
                break;
            //if (isNaN(ensured_number)) //TODO reactivate this check somehow
            //throw new Error('Query for ' + key + ' must be of type number or an expression starting with <, <=, >, or >= following any number, but was: ', query_value);
        }
    } else if (Privates.get(this).resolved_schema.value(query_key).typeOf('array')) {
        if (!Array.isArray(query_value))
            return callback(new Error(`Query for "${query_key}" must be an array but was: ${typeof query_value}`));

        else { //TODO: arrayIncludes must support regex as well....? or wildcard at least? dunno yet...
            query_key_result.is_array = true;
            query_key_result.value = query_value;
            query_key_result.match = arrayIncludes.bind(this, query_value);
        }
    }

    if (items.length > 0)
        return resolveQuery.bind(this)(items, callback);

    Object.assign(Privates.get(this), {is_resolved: true});
    return callback(null, Privates.get(this).query_result);
}


/**
 * @param {Object} query_data Result of the resolve function
 * @param {Array<string>} keys
 * @constructor
 */
class ResolvedQuery {
    //TODO determinie if it is an indexed query OR directly throw if not
    //TODO: getIndexId should go in here? (then pass only schema analyzer and query analyzer into adapters) -> probably not so good idea
    //TODO: but index search should be provides a function here?

    constructor(query, resolved_schema) {
        Privates.set(this, {
            query: query,
            resolved_schema: resolved_schema,
            schema_index: resolved_schema.index(),
            schema_keys: resolved_schema.keys(),
            query_keys: Object.keys(query),
            query_result: {},
            is_resolved: false
        });
    }

    /**
     *
     * @param key {string}
     * @returns {boolean}
     */
    isNumber(key) {
        return resolveQuery.bind(this)((err, query_data) => !!query_data[key].is_number);

    }

    /**
     *
     * @param key {string}
     * @returns {boolean}
     */
    isArray(key) {
        return resolveQuery.bind(this)((err, query_data) => !!query_data[key].is_array);
    }

    /**
     *
     * @param {object} model
     * @param {function} callback
     * @returns {boolean} //TODO: should this return the model or null instead of bool? bool for non callback, model for with callback?
     */
    match(model, callback) {
        const recursive = (query_keys, query_data) => { //TODO: outsource
            let query_key = query_keys.shift();

            if (!model[query_key])
                return callback(new Error(`Key mismatch: model does not contain key "${query_key}"`), false);

            if (typeof query_data[query_key].match !== 'function')
                return callback(new Error(`Query could not find match function for key "${query_key}"`), false);

            query_data[query_key].match(model[query_key], (err, res) => {
                if (query_keys.length === 0)
                    return callback(err, res);

                if (!res || err)
                    return callback(err, res);

                recursive(query_keys, query_data);
            });
        };

        resolveQuery.bind(this)((err, query_data) => {
            recursive([].concat(Privates.get(this).query_keys), query_data);
        });
    };

    /**
     *
     * @returns {Array} The keys of the query
     */
    keys() {
        return Privates.get(this).query_keys;
    } //TODO: should only reflect keys that are part of the index! (not if schema has no index!!!! think over....)

    /**
     *
     * @param key
     * @returns {Array|String|Number} The given query pattern for key
     */
    value(key) {
        return resolveQuery.bind(this)((err, query_data) => query_data[key].value);
    }

    /**
     *
     * @param key
     * @returns {string} expression
     */
    expr(key) {
        return resolveQuery.bind(this)((err, query_data) => query_data[key].expression);
    };

}

module.exports = ResolvedQuery;

