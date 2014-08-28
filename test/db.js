'use strict';
var should = require('should'),
	WrapDb = require('../lib/db'),
	Db = require('mongodb').Db,
	Server = require('mongodb').Server,
	db = new Db('test', new Server('localhost', 27017), {
		w: 1
	}),
	openedDb = null,
	wrapDb = null;
before(function(done) {
	db.open(function(err, db) {
		if (err) done(err);
		openedDb = db;
		db.collection('cats').insert([{
			name: 'menger1',
			number: 10
		}, {
			name: 'menger2',
			number: 0
		}], done);
	});
});
describe('DB', function() {

	beforeEach(function(done) {
		wrapDb = new WrapDb(openedDb);
		wrapDb.beginTransaction(function(err, db) {
			if (err) throw err;
			wrapDb = db;
			wrapDb.collection('cats').update({
				name: 'menger1'
			}, {
				$inc: {
					number: -10
				}
			}, {
				multi: false
			}, function(err, result) {
				if (err) done(err);
				wrapDb.collection('cats').update({
					name: 'menger2'
				}, {
					$inc: {
						number: 10
					}
				}, {
					multi: false
				}, function(err, result) {
					if (err) done(err);
					wrapDb.collection('dogs').insert({
						name: 'bird',
						number: '1'
					}, done);
				});
			});
		});

	});

	describe('#rollback()', function() {
		it('should rollback successfully', function(done) {
			wrapDb.rollback(function(err) {
				if (err) done(err);
				wrapDb.collection('cats').findOne({
					name: 'menger1'
				}, function(err, result) {

					if (err) done(err);
					result.number.should.equal(10);
					wrapDb.collection('dogs').findOne({
						name: 'bird'
					}, function(err, result) {
						(result == null).should.be.ok;
						done();
					});
				});
			});
		});
	});

	describe('#commit()', function() {
		it('should commit successfully', function(done) {
			wrapDb.commit(function(err) {
				if (err) done(err);

				wrapDb.collection('cats').findOne({
					name: 'menger2'
				}, function(err, result) {
					if (err) done(err);
					result.number.should.equal(10);
					wrapDb.collection('dogs').findOne({
						name: 'bird'
					}, function(err, result) {
						result.should.have.properties('name', 'number');
						done();
					});
				});
			});
		});
	});
});