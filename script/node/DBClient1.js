var config = require('./config');
var  mongodb = require('mongodb');
var serverAddrs=config.mongodbServerAddrs;
exports.client1=function(callBack){
    var servers=[];
    for(var i in serverAddrs){
        servers.push(new mongodb.Server(serverAddrs[i].ip, serverAddrs[i].port,{}))
    }
    var replStat = new mongodb.ReplSet(servers,{});
    var  db = new mongodb.Db(config.db, replStat,{safe:true});
    db.open(function(err,db){
        if(err){
            console.log("DBClient1-client-open-err: "+err);
        }
        callBack(db);
    });
}


exports.close1=function(db){
    db.close(true,function (err, result) {
        if (err) {
            console.log("close1 db connection error:" + err);
        } else {
            // console.log("close db connection success!");
        }

    });
}; 

