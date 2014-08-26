'use strict';
var should = require('should'),
    WrapDb = require('../lib/db'),
    Server = require('mongodb').Server,
    Db = require('mongodb').Db,
    db = new Db('test', new Server('localhost', 27017), {
        w: 1
    }),
    wrapDb = null;

describe('Collection', function() {

    before(function(done) {
        db.open(function(err, db) {
            if (err) done(err);
            wrapDb = new WrapDb(db);
            wrapDb.beginTransaction(function(err, db) {
                if (err) throw err;
                wrapDb = db;
                done();
            });
        });
    });

    describe('#update()', function() {
        it('should update with multi false successfully', function(done) {
            wrapDb.collection('cats').update({
                    name: 'Zildjian556'
                }, {
                    $inc: {
                        number: 20
                    }
                }, {
                    multi: false
                },
                done);
        });
        it('should update with {multi:true} successfully', function(done) {
            wrapDb.collection('cats').update({
                    name: 'Zildjian557'
                }, {
                    $inc: {
                        number: 20
                    }
                }, {
                    multi: true
                },
                done);
        });
    });

    describe('#insert()', function() {
        it('should insert one document successfully with transaction label', function(done) {
            wrapDb.collection('cats').insert({
                name: 'Zildjian1e'
            }, function(err, result) {
                if (err) done(err);
                result.forEach(function(dcmt) {
                    dcmt.pendingTransaction.opt.should.equal('insert');
                });
                done();
            });
        });
        it('should insert documents array successfully with transaction label', function(done) {
            wrapDb.collection('cats').insert([{
                name: 'Zildjian1c'
            }, {
                name: 'Zildjian1d'
            }], function(err, result) {
                if (err) done(err);
                result.forEach(function(dcmt) {
                    dcmt.pendingTransaction.opt.should.equal('insert');
                });
                done();
            });
        });
    });

});