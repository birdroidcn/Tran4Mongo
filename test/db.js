'use strict';
var should = require('should'),
	DB = require('../lib/db'),
	Db = require('mongodb').Db,
	Server = require('mongodb').Server,
	db = new Db('test', new Server('localhost', 27017), {
		w: 1
	}),
	instanceDb = null;

describe('DB', function() {
	before(function(done) {
		db.open(function(err, db) {
			if (err) done(err);
			instanceDb = db;
			done();
		})
	});
	describe('#beginTransaction()', function() {
		it('should create transaction id', function(done) {
			var db = new DB(instanceDb);
			db.beginTransaction(function(err, db) {
				(err === null).should.be.true;
				db.transId.should.be.ok;
				done();
			});
		});
	});

	describe('#commit()', function() {
		it('should commit successfully', function(done) {
			var db = new DB(instanceDb);
			db.beginTransaction(function(err, db) {
				if (err) throw err;
				db.collection('cats').update({
					name: 'Zildjian99'
				}, {
					$inc: {
						number: 20
					}
				}, {
					multi: false
				}, function(err, result) {
					if (err) throw err;
					db.commit(done);
				});
			});
		});
	});

	describe('#rollback()', function() {
		it('should rollback successfully', function(done) {
			var db = new DB(instanceDb);
			db.beginTransaction(function(err, db) {
				if (err) throw err;
				db.collection('cats').update({
					name: 'Zildjian128'
				}, {
					$inc: {
						number: 20
					}
				}, {
					multi: false
				}, function(err, result) {
					if (err) throw err;
					db.rollback(done);
				});
			});
		});
	});

});