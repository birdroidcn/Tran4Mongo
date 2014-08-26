'use strict';
var collection = require('./collection');
var EventProxy = require('EventProxy');

var Db = function(db) {
	this.nativeDb = db;
	this.transacCollection = db.collection('_transaction');
	this.transId = null;
};
Db.prototype.beginTransaction = function(callback) {
	var self = this;
	this.transacCollection.insert({
		status: 'initial'
	}, {
		w: 1
	}, function(err, trans) {
		if (err) callback(err);
		self.transId = trans[0]._id;
		callback(null, self);
	});
};

Db.prototype.collection = collection;

Db.prototype._iteratorTrans = function(type, handler, callback) {
	var self = this;
	var errInfo = type + 'fail! transaction id:' + this.transId;
	this.transacCollection.findOne({
		_id: this.transId
	}, function(err, trans) {
		if (err) callback(errInfo);

		var ce = new EventProxy();
		ce.after('collectionRollback', trans.collections.length, callback.bind(null, null));
		ce.fail(callback);
		trans.collections.forEach(function(name) {

			self.nativeDb.collection(name).find({
				'pendingTransaction.id': self.transId
			}).toArray(function(err, result) {
				if (err) return callback(errInfo);
				var de = new EventProxy();
				de.after('documentRollback', result.length, ce.emit.bind(ce, 'collectionRollback'));
				de.fail(ce.emit.bind(ce, 'error'));
				result.forEach(handler.bind(null, name, de.done('documentRollback')));
			});

		});
	});

};

Db.prototype.rollback = function(callback) {
	var self = this;

	var handler = function(name, done, dcmt) {
		var opt = dcmt.pendingTransaction.opt;
		switch (opt) {
			case 'update':
				self.nativeDb.collection(name).update({
					_id: dcmt._id
				}, dcmt.pendingTransaction.document, done);
				break;
			case 'insert':
				self.nativeDb.collection(name).remove({
					_id: dcmt._id
				}, done);
				break;
			case 'remove':
				break;
		}
	};
	this._iteratorTrans('rollback', handler, callback);

};

Db.prototype.commit = function(callback) {
	var self = this;

	var handler = function(name, done, dcmt) {
		var opt = dcmt.pendingTransaction.opt;
		switch (opt) {
			case 'update':
			case 'insert':
				self.nativeDb.collection(name).update({
					'pendingTransaction.id': self.transId
				}, {
					$unset: {
						pendingTransaction: ''
					}
				}, {
					multi: true
				}, done);
				break;
			case 'remove':
				break;
		}
	};
	this._iteratorTrans('commit', handler, callback);

};
module.exports = Db;