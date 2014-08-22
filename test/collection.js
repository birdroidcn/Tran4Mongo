'use strict';
var should = require('should'),
    DB = require('../lib/db'),
    Server = require('mongodb').Server,
    Db = require('mongodb').Db,
    db = new Db('test', new Server('localhost', 27017), {
        w: 1
    }),
    instanceDb = null;

describe('Collection', function() {
    before(function(done) {
        db.open(function(err, db) {
            if (err) done(err);
            instanceDb = db;
            done();
        });
    });
    describe('#update()', function() {
        it('should ,with multi false ', function(done) {
            var db = new DB(instanceDb);
            db.beginTransaction(function(err, db) {
                if (err) throw err;
                db.collection('cats').update({
                        name: 'Zildjian1'
                    }, {
                        $inc: {
                            number: 20
                        }
                    }, {
                        multi: false
                    },
                    done);
            });
        });
    });

});