'use strict';

class QueryError extends Error {
    constructor(message){
        super(message);

        this.name = 'QueryError';
        this.message = message;
    }
}
exports.QueryError = QueryError;

class NotImplementedError extends Error {
    constructor(method_name, adapter){
        super(method_name);

        this.name = 'NotImplementedError';
        this.message = '"' + method_name + '" not implemented in "' + adapter.constructor.name + '"';
    }
}
exports.NotImplementedError = NotImplementedError;
