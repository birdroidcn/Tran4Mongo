'use strict';
var transDb = require('.lib/db');
var Transaction = function(db){
    this.transDb = transDb(db);
};
Transaction.prototype.beginTransaction = function(callback){
     transDb.beginTransaction(callback);
};
module.exports = Transaction;