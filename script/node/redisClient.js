var config = require('./config');
var RedisCluster = require('redis-cluster').clusterClient;
var firstLink = config.redisIP+':'+config.redisPort;

var poolModule = require('generic-pool');
/*var pool = poolModule.Pool({
    name     : 'redis',
    create   : function(callback) {
        new RedisCluster.clusterInstance(firstLink, function (err, client) {
            if (err) throw err;
            callback(err,client);
        });
    },
    destroy  : function(client) {
        try{
            client.quit();
            var nodes=client.nodes;
            for(var index in nodes){
                nodes[index].link.end();
            }
        }catch(e){
            console.error('redis close error: '+e);
        }

    },
    max      : 50,
    min      : 5,
    idleTimeoutMillis : 3000,
    log : false
});*/
var pool = {
    create   : function(callback) {
        new RedisCluster.clusterInstance(firstLink, function (err, client) {
            if (err) throw err;
            callback(err,client);
        });
    },
    destroy  : function(client) {
        try{
            client.quit();
            var nodes=client.nodes;
            for(var index in nodes){
                nodes[index].link.end();
            }
        }catch(e){
            console.error('redis close error: '+e);
        }

    }
};

exports.newRedis = function(callback){
    pool.create(function(err,client){
        if(err){
            console.error('redis newRedis error: '+err);
        }
        var timer=setTimeout(function(){
            pool.destroy(client);
        },10000);
        client.checkDisconnect=timer;
        callback(err,client);
    });
};

exports.close=function(client){
    if(client.checkDisconnect){
        var timer=client.checkDisconnect;
        clearTimeout(timer);
    }
    pool.destroy(client);
};