'use strict';
var Collection = function(transId, nativeDb, name) {
	this.transacCollection = nativeDb.collection('_transaction');
	this.targetCollection = nativeDb.collection(name);
	this.name = name;
	this.transId = transId;
};

function isUpateOpts(obj) {
	for (var key in obj) {
		var initial=key.charAt(0);
		return initial === '$';
	}
}
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

	this.transacCollection.update({
		_id: this.transId
	}, {
		$set: {
			status: 'pending'
		},
		$push: {
			update: this.name
		}
	}, function(err) {
		if (err) return callback(err);

		self.targetCollection[find](selector, function(err, result) {
			if (err || !result) return callback(err, result);
			if (result.pendingTransaction) return callback('隔离事务！');

            result  = result instanceof Array ? result : [result];
			var count = result.length,
				i = 0;
            
			result.forEach(function(dcmt) {
				var pendingTransaction = document.$set ? document.$set.pendingTransaction : document.pendingTransaction;
				pendingTransaction.pre = dcmt;

				self.targetCollection.update({
					_id: dcmt._id
				}, document, options, function() {
					if (err) {
						callback && callback(err);
						callback = null;
						return;
					}
					if (++i === count) callback(null, '');
				});
			});

		});
	});

};

Collection.prototype.insert = function(selector, document, options, callback) {

	document.$push = {
		pendingTransactions: [this.transId, JSON.stringify(document)]
	};
	this.nativeCollection.insert(selector, document, options, callback);
};

module.exports = function(name) {
	return new Collection(this.transId, this.nativeDb, name);
};