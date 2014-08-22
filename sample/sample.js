var Db = require('mongodb').Db,
    Server = require('mongodb').Server,
    db = new Db('test', new Server('localhost', 27017),{w:1}),
    Transaction = require('./index');

    db.open(function(err,db){
        
        var t = new Transaction(db);
        t.beginTransaction(function(err, db){
        	 if (err) throw err;
                db.collection('cats').update({
                        name: 'Zildjian1'
                    }, {
                        $inc: {
                            number: 20
                        }
                    }, {
                        multi: false
                    }, function(){
                    	
                    });
        });
    })