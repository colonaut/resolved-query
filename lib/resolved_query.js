'use strict';
/**
 * @param {Object} query_data Result of the resolve function
 * @param {Array<string>} keys
 * @constructor
 */
function ResolvedQuery (query_data, keys) {
    //TODO determinie if it is an indexed query OR directly throw if not
    //TODO: getIndexId should go in here? (then pass only schema analyzer and query analyzer into adapters) -> probably not so good idea
    //TODO: but index search should be provides a function here?

    /**
     *
     * @param key {string}
     * @returns {boolean}
     */
    this.isNumber = (key) => !!query_data[key].is_number;

    /**
     *
     * @param key {string}
     * @returns {boolean}
     */
    this.isArray = (key) => !!query_data[key].is_array;

    /**
     *
     * @param {object} model
     * @param {function} callback
     * @returns {boolean}
     */
    this.match = (model, callback) => {
        const recursive = (count) => {
            count = count || 0;
            let key = keys[count];

            if (!model[key])
                return callback(new Error(`Key mismatch: model does not contain key "${key}"`), false);

            if (typeof query_data[key].match !== 'function')
                return callback(new Error(`Query could not find match function for key "${key}"`), false);

            query_data[key].match(model[key], (err, res) => {
                if (count === keys.length - 1)
                    return callback(err, res);

                if (!res || err)
                    return callback(err, res);

                recursive(count + 1);
            });
        };
        recursive();
    };

    /**
     *
     * @returns {Array} The keys of the query
     */
    this.keys = () => keys; //TODO: should only reflect keys that are part of the index! (not if schema has no index!!!! think over....)

    /**
     *
     * @param key
     * @returns {Array|String|Number} The given query pattern for key
     */
    this.value = (key) => query_data[key].value;

    /**
     *
     * @param key
     * @returns {string} expression
     */
    this.expr = (key) => query_data[key].expression;

};

module.exports = ResolvedQuery;

