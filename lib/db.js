'use strict';
var collection = require('./collection');
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

Db.prototype.rollback = function(callback) {
	var self = this;
	var errInfo = 'rollback fail! transaction id:' + this.transId;
	this.transacCollection.findOne({
		_id: this.transId
	}, function(err, trans) {
		if (err) callback(errInfo);
		
		['update'].forEach(function(opt) {
			if (!trans[opt]) return;
			switch (opt) {
				case 'update':
					trans[opt].forEach(function(name) {
						self.nativeDb.collection(name).find({
							'pendingTransaction.id': self.transId
						}).toArray(function(err, result) {
							if (err) return callback(errInfo);
							var count = result.length,
								i = 0;
							result.forEach(function(dcmt) {

								self.nativeDb.collection(name).update({
									_id: dcmt._id
								}, dcmt.pendingTransaction.pre, function(err) {
									console.log(i);
									if (err) {
										callback && callback(err);
										callback = null;
										return;
									}
									if (++i === count) callback(null, 'success');
								});
							});
						});
					});
					break;
			}

		});
	});
};

Db.prototype.commit = function(callback) {
	var self = this;
	var errInfo = 'commit fail! transaction id:' + this.transId;

	this.transacCollection.findOne({
		_id: this.transId
	}, function(err, trans) {
		if (err) return callback(errInfo);
		['update'].forEach(function(opt) {
			if (!trans[opt]) return;
			switch (opt) {
				case 'update':
					trans[opt].forEach(function(name) {
						self.nativeDb.collection(name).update({
							'pendingTransaction.id': self.transId
						}, {
							$unset: {
								pendingTransaction: ''
							}
						}, {
							multi: true
						}, callback);
					});
					break;
			}
		});
	});

};
module.exports = Db;