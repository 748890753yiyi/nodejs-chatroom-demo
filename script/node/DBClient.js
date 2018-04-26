var config = require('./config');
var  mongodb = require('mongodb');
var serverAddrs=config.mongodbServerAddrs;
var poolModule = require('generic-pool');
var pool = poolModule.Pool({
    name     : 'mongoDB',
    create   : function(callback) {
        //集群Sever对象的集合
        var servers = [];
        for(var i in serverAddrs){
            servers.push(new mongodb.Server(serverAddrs[i].ip, serverAddrs[i].port,{poolSize:1,auto_reconnect:false,
                logger:{
//                    doDebug:true,
                    doError:true,
                    debug:function(msg,obj){
                        console.log('[debug]',msg);
                    },
                    log:function(msg,obj){
                        console.log('[log]',msg);
                    },
                    error:function(msg,obj){
                        console.log('[error]',msg);
                    }
                }
            }))

        }
        var replStat = new mongodb.ReplSet(servers, {});
        var  db = new mongodb.Db(config.db, replStat,{safe:true});
        db.open(function(err,db){
            if(err){
                console.error("DBClient-client-open-err: "+err);
            }
            callback(null, db);
        });
    },
    destroy  : function(db) {
        db.close(true,function (err, result) {
            if (err) {
               console.error("close db connection error:" + err);
            } else {
            }

        });
    },
    max      : 50,
    min      : 30,
    idleTimeoutMillis : 30000,
    log : false
});
exports.client=function(callBack){
    pool.acquire(function(err,db){
		var timer=setTimeout(function(){
			pool.release(db);
		},20000);
		db.checkDisconnect=timer;
        callBack(db);
    });
};

exports.collection=function(db,collectionName,callBack){
   db.collection(collectionName,{safe:true},function(err,collection){
       if(err) {
           console.error("DBClient-collection-err: " + err);
       }
      callBack(collection);
   });
};

exports.findOne=function(collection,query,callBack){
   collection.findOne(query,function(err, doc){
       if(err) {
           console.error("DBClient-findOne-err: " + err);
       }
      callBack(doc);
   });
};

exports.find=function(collection,query,callBack){
    collection.find(query).toArray(function(err,docs){
        if(err){
            console.error("DBClient-find-err: "+err);
        }
        callBack(docs);
    });
};

exports.close=function(db){
    if(db.checkDisconnect){
		var timer=db.checkDisconnect;
		clearTimeout(timer);
	}
    pool.release(db);
};