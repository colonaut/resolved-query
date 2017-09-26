'use strict';
const resolveQuery = require('./index');
const resolveSchema = require('resolved-schema');
const Errors = require('./errors.js');
const ResolvedQuery = require('./resolved_query.js');

const Joi = require('joi');

describe('When creating a Query instance with callback', function(){
    const schema = Joi.object().keys({
        foo: Joi.string(),
        bar: Joi.string(),
        buzz: Joi.string()
    });
    const index = ['foo', 'bar', 'buzz'];
    const query_data = {
        foo: 'foo',
        bar: 'bar',
        buzz: 'buzz'
    };

    let query, error;

    before(function (done) {
        resolveSchema(schema, {
            index: index
        }, (err, resolved_schema) => {
            resolveQuery(query_data, resolved_schema, (err, res) => {
                    query = res;
                    error = err;
                    done();
                });
        });
    });

    it('expect the given result to be an instance of ResolvedQuery', function () {
        expect(query).to.be.instanceOf(ResolvedQuery);
    });
});

describe('When creating a Query instance as promise', function () {

    describe('with key / index mismatch or other error', function () {
        const schema = Joi.object().keys({
            foo: Joi.string(),
            bar: Joi.string(),
            buzz: Joi.string()
        });
        const index = ['foo', 'bar'];
        const query_data = {
            foo: 'foo',
            bar: 'ba*',
            buzz: 'bu**'
        };
        let error;

        before((done) => {
            resolveSchema(schema, {index: index})
                .then((resolved_schema) => {
                    resolveQuery(query_data, resolved_schema)
                        .then((resolved_query) => {
                        }).catch((err) => {
                            error = err;
                            done();
                        });
                });
        });

        it('should be rejected with QueryError', function(){
            expect(error).to.be.an.instanceOf(Errors.QueryError);
            expect(error.message).to.equal('invalid query: buzz is not part of resolved schema\'s index (foo, bar)');
        });
    });

    describe('with wrong type in query property for a number property of schema', function () {
        const schema = Joi.object().keys({
            foo: Joi.string(),
            bar: Joi.number(),
            buzz: Joi.string()
        });
        const index = ['foo', 'bar', 'buzz'];
        const query_data = {
            foo: 'foo',
            bar: {},
            buzz: 'bu**'
        };
        let error;

        before((done) => {
            resolveSchema(schema, {index: index})
                .then((resolved_schema) => {
                    resolveQuery(query_data, resolved_schema)
                        .then((resolved_query) => {
                        }).catch((err) => {
                        error = err;
                        done();
                    });
                });
        });

        it('should be rejected with QueryError', function(){
            expect(error).to.be.an.instanceOf(Errors.QueryError);
            expect(error.message).to.equal('query for "bar" must be a number or a string but was: object');
        });
    });

    describe('with valid string values', function () {
        const schema = Joi.object().keys({
            foo: Joi.string(),
            bar: Joi.string(),
            buzz: Joi.string(),
            str_regex: Joi.string(),
            regex: Joi.string()
        });
        const index = ['foo', 'bar', 'buzz', 'str_regex', 'regex'];
        const model = {
            foo: 'foo',
            bar: 'bar start',
            buzz: 'bu ?hkadh! z you!',
            str_regex: 'this is nothing',
            regex: 'this is nothing'
        };
        const query_data = {
            foo: 'foo',
            bar: 'ba*',
            buzz: 'bu*z',
            str_regex: '/s*\D*/gi',
            regex: /s*\D*/gi
        };

        let query, match, error;

        before(function (done) {
            resolveSchema(schema, {
                index: index
            }).then((resolved_schema) => {
                resolveQuery(query_data, resolved_schema)
                    .then((resolved_query) => {
                        query = resolved_query;
                        query.match(model, (err, res) => {
                            error = err;
                            match = res;
                            done();
                        });
                    })
                    .catch((err) => {
                        error = err;
                        done();
                    });
            });


        });

        it('expect the given result to be an instance of ResolvedQuery', function () {
            expect(query).to.be.instanceOf(ResolvedQuery);
        });

        it('expect...', function(){
            expect(query.isArray('foo')).to.be.false;
            expect(query.isNumber('foo')).to.be.false;
            expect(query.value('foo')).to.equal(query_data.foo);
            expect(query.expr('foo')).to.be.undefined;
            expect(query.value('foo')).to.be.a.string;
        });

        it('expect...', function(){
            expect(query.value('bar')).to.be.undefined;
            expect(query.expr('bar')).to.equal(query_data.bar);
        });

        it('expect...', function(){
            expect(query.value('buzz')).to.be.undefined;
            expect(query.expr('buzz')).to.equal(query_data.buzz);
        });

        it('expect...', function(){
            expect(query.value('str_regex')).to.be.undefined;
            expect(query.expr('str_regex')).to.equal(query_data.str_regex);

            expect(query.value('regex')).to.be.undefined;
            expect(query.expr('regex')).to.equal(query_data.regex);
        });

        it('expect the model to be matched with no errors', function () {
            expect(match).to.be.true;
            expect(error).to.be.null;
        });
    });

    describe('with valid array values', function () {
        const schema = Joi.object().keys({
            array_foo: Joi.array(),
            array_bar: Joi.array(),
            array_buzz: Joi.array()
        });
        const index = ['array_foo'];

        const model = {
            array_foo: ['foo1', 'foo3', 'foo4', 'foo2'],
            array_bar: [1, 2, 3, 4]
        };

        let query, match, error;

        before((done) => {
            resolveSchema(schema, {index: index})
                .then((resolved_schema) => {
                    resolveQuery({
                        array_foo: ['foo1', 'foo2', 'foo3']
                    }, resolved_schema)
                        .then((resolved_query) => {
                            query = resolved_query;
                            query.match(model, (err, res) => {
                                error = err;
                                match = res;
                                done();
                            });
                        })
                        .catch((err) => {
                            error = err;
                            done();
                        });
                });
        });

        it('should the query instance provide a correct exact search object', function () {
            expect(error).to.be.null;
            expect(match).to.be.true;

            expect(query.value('array_foo').length).to.be.an.array;
            expect(query.value('array_foo').length).to.equal(3);
        });
    });

    describe('with string values for an array property', function () {
        const schema = Joi.object().keys({
            array_foo: Joi.array(),
            array_bar: Joi.array(),
            array_buzz: Joi.array()
        });

        const index = ['array_foo', 'array_bar', 'array_buzz'];

        const model = {
            //array_foo: ['foo1', 'foo3', 'foo4', 'foo2'],
            array_bar: [1, 2, 3, 4]
            //array_buzz: []
        };

        let query, match, error;

        before((done) => {
            resolveSchema(schema, {index: index})
                .then((resolved_schema) => {
                    resolveQuery({
                        array_foo: ['foo1', 'foo2', 'foo3'],
                        array_bar: 'ba*',
                        array_buzz: 1.0000
                    }, resolved_schema)
                        .then((resolved_query) => {
                            query = resolved_query;
                            query.match(model, (err, res) => {
                                //error = err;
                                match = res;
                                done();
                            });
                        })
                        .catch((err) => {
                            error = err;
                            done();
                        });
                });
        });

        it('should return an error', function () {
            expect(error).to.be.an.error;
            expect(match).to.be.undefined;
        });

    });

    describe('with valid number values', function () {
        const schema = Joi.object().keys({
            number_foo: Joi.number(),
            number_bar: Joi.number().precision(0),
            number_buzz: Joi.number(),
            number_boom: Joi.number()
        });
        const index = ['number_foo', 'number_bar', 'number_buzz', 'number_boom'];
        const model = {
            number_foo: 1,
            number_bar: 1.002,
            number_buzz: 2,
            number_boom: 1.5
        };
        const query_data = {
            number_foo: 1,
            number_bar: ' < 1.003',
            number_buzz: '>=1',
            number_boom: '  > 1   <= 2'
        };
        let query, match, error;

        before((done) => {
            resolveSchema(schema, {index: index})
                .then((resolved_schema) => {
                    resolveQuery(query_data, resolved_schema)
                        .then((resolved_query) => {
                            query = resolved_query;
                            query.match(model, (err, res) => {
                                error = err;
                                match = res;
                                done();
                            });
                        })
                        .catch((err) => {
                            error = err;
                            done();
                        });
                });
        });


        it('should value and expr return the correct values', function () {
            expect(query.value('number_foo')).to.equal(1);
            expect(query.expr('number_foo')).to.be.undefined;
            expect(query.isNumber('number_foo')).to.be.true;

            expect(query.expr('number_bar')).to.equal(query_data.number_bar);
            expect(query.value('number_bar')).to.be.undefined;
            expect(query.isNumber('number_bar')).to.be.true;

            expect(query.expr('number_buzz')).to.equal(query_data.number_buzz);
            expect(query.value('number_buzz')).to.be.undefined;
            expect(query.isNumber('number_buzz')).to.be.true;

            expect(query.expr('number_boom')).to.equal(query_data.number_boom);
            expect(query.value('number_boom')).to.be.undefined;
            expect(query.isNumber('number_boom')).to.be.true;

            expect(error).to.be.null;
            expect(match).to.be.true;
        });
    });

});