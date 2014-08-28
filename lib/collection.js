'use strict';
var EventProxy = require('EventProxy');
var Collection = function(transId, nativeDb, name) {
	this.transacCollection = nativeDb.collection('_transaction');
	this.targetCollection = nativeDb.collection(name);
	this.name = name;
	this.transId = transId;
};

function isUpateOpts(obj) {
	for (var key in obj) {
		var initial = key.charAt(0);
		return initial === '$';
	}
}

Collection.prototype._beforeOperation = function(dcmts, callback) {
	var collection = null;
	if (dcmts instanceof Function) {
		callback = dcmts;
		collection = this.name;
	} else {
		collection = {
			name: this.name,
			documents: dcmts
		};
	}

	this.transacCollection.update({
		_id: this.transId
	}, {
		$set: {
			status: 'pending'
		},
		$push: {
			collections: collection
		}
	}, callback);
};

Collection.prototype.insert = function(documents, options, callback) {
	var self = this;
	documents = documents instanceof Array ? documents : [documents];
	documents.forEach(function(document) {
		document.pendingTransaction = {
			id: self.transId,
			opt: 'insert'
		};
	});
	this._beforeOperation(function(err) {
		if (err) return callback(err);
		self.targetCollection.insert(documents, options, callback);
	});
};

Collection.prototype.remove = function(selector, options, callback) {
	var self = this;
	var single = options instanceof Function ? false : options.single;
	var find = single ? 'findOne' : 'find';
	this._find(find, selector, function(err, result) {
		if (err) callback(err);
		self._beforeOperation(result, function(err) {
			if (err) return callback(err);
			self.targetCollection.remove(selector, options, callback);
		});
	});
};
Collection.prototype._find = function(type, selector, callback) {
	this.targetCollection[type](selector, function(err, result) {
		if (err) callback(err);
		if (result === null) {
            callback(null);
		} else if (result.toArray instanceof Function) {
			result.toArray(err, callback);
		} else {
			callback(null, [result]);
		}
	});
};
Collection.prototype.update = function(selector, document, options, callback) {
	var self = this;

	var multi = options instanceof Function ? false : options.multi;
	var find = multi ? 'find' : 'findOne';

	if (isUpateOpts(document)) {
		document.$set || (document.$set = {});
		document.$set.pendingTransaction = {
			id: self.transId
		};
	} else {
		document.pendingTransaction = {
			id: self.transId
		};
	}

	this._beforeOperation(function(err) {
		if (err) return callback(err);

		self._find(find, selector, function(err, result) {
			if (err || !result) return callback(err, result);
			if (result.pendingTransaction) {
				return callback('同一个dcument不能同时有多个事务！');
			}
			var ue = new EventProxy();
			ue.after('update', result.length, callback.bind(null, null));
			ue.fail(callback);
			result.forEach(function(dcmt) {
				var pendingTransaction = document.$set ? document.$set.pendingTransaction : document.pendingTransaction;
				pendingTransaction.opt = 'update';
				pendingTransaction.document = dcmt;

				self.targetCollection.update({
					_id: dcmt._id
				}, document, options, ue.done('update'));
			});

		});
	});

};
var ops = ['find', 'findOne'];
ops.forEach(function(op) {
	Collection.prototype[op] = function(d, callback) {
		this.targetCollection[op](d, callback);
	};
});

module.exports = function(name) {
	return new Collection(this.transId, this.nativeDb, name);
};