var later = require('later');
var fs = require("fs");
var redis = require('./redisClient');
var DB=require('./DBClient');

function clearMsg(){

    DB.client(function(db){
        DB.collection(db,"group",function(collection){
            collection.find({},{id:1,_id:0}).toArray(function(err,groupDocs){
                if(groupDocs&&groupDocs.length>0){
                    groupDocs.forEach(function(group){
                        var count=0;
                        redis.newRedis(function(err,redisClient) {
                            redisClient.llen('groupChat_' + group.id, function (err, len) {
                                if(err){
                                    console.error('cacheData interval groupChat_ error: '+err);
                                }
                                redisClient.lrange('groupChat_' + group.id, 0, len, function (err, data) {
                                    if(err){
                                        console.error('cacheData interval groupChat_ error: '+err);
                                    }
                                    data.forEach(function(info){
                                        var tempInfo=JSON.parse(info);
                                        count++;
                                        if(tempInfo&&tempInfo.basic&&tempInfo.basic.publishTime&&new Date(tempInfo.basic.publishTime)<new Date(new Date().getTime()-7*24*60*60*1000)){
                                            redis.newRedis(function(err,redisClient1) {
                                                redisClient1.lrem('groupChat_' + group.id, 0, info, function (err, res) {
                                                    if(err){
                                                        console.error('cacheData interval groupChat_ error: '+err);
                                                    }
                                                    redis.close(redisClient1);
                                                });
                                            })

                                        }
                                        if(count==data.length){
                                            redis.close(redisClient);
                                        }
                                    })
                                });
                            });

                        })
                    })
                }

            })
        })
    })
}

exports.clearRedisMsg = function(){
    var composite = [
        {h: [1], m: [10]}
    ];
    var sched = {
        schedules:composite
    };

    later.date.localTime();
    t1 = later.setInterval(function() {
        clearMsg();
    }, sched);
};

exports.clearUrl = function(){
    var composite = [
		{h: [0], m: [10]}
	];
	var sched = {
		schedules:composite
	};

	later.date.localTime();
    t = later.setInterval(function() {
        clearFile();
    }, sched);
};

function getDirectory(path, handle) {  
    fs.readdir(path, function(err, files) {
        if (err) {  
            console.error('read dir error'+err);
        } else {  
            files.forEach(function(item) {  
                var tmpPath = path + '/' + item;  
                fs.stat(tmpPath, function(err1, stats) {  
                    if (err1) {  
                        console.error('stat error'+err1);
                    } else {  
                        if (stats.isDirectory()) {  
                            handle(tmpPath);  
                        } 
                    }  
                })  
            });  
  
        }  
    });  
}


function deleteFolderRecursive(path) {

    var files = [];

    if( fs.existsSync(path) ) {

        files = fs.readdirSync(path);

        files.forEach(function(file,index){

            var curPath = path + "/" + file;

            if(fs.statSync(curPath).isDirectory()) {

                deleteFolderRecursive(curPath);

            } else {

                fs.unlinkSync(curPath);

            }

        });

        fs.rmdirSync(path);

    }

};


function clearFile(){
    var now = new Date();
    var currentDate = now.format("yyyyMMdd");
    clearUploadFile(currentDate);
    clearTempFile();
}


function clearUploadFile(currentDate){
    getDirectory('upload/upload', function(path){
		
	    var file_name = path.replace("upload/upload/", "");
		if(!isNaN(file_name)){
			console.log(file_name);
			if(parseInt(file_name) < currentDate){
			   console.log('delete ' + file_name);
			   
               deleteFolderRecursive(path);
		    }
		}
	});
}

function clearTempFile() {
    var files = [];
    var path = 'upload/upload_tmp';
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            fs.unlinkSync(curPath);
        });
    }
}


