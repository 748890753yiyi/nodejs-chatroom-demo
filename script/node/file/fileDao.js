var DB=require('../DBClient.js'),
    config=require('../config.js');

var fileDao=module.exports={
    insert:function(doc,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.insert(doc , {safe:true}, function(err,doc1){
                    if(err){
                        console.error('insert error: '+err);
                    }
                    callBack(doc1);
                    DB.close(db);
                });
            });
        });
    },
    update:function(query,condition,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.update(query ,condition,{upsert:true},function(err,doc){
                    if(err){
                        console.error('update error: '+err);
                    }
                    callBack(doc);
                    DB.close(db);
                });
            });
        });
    },
    'delete':function(query,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.remove(query,{safe:true},function(err,doc){
                    if(err){
                        console.error('delete error: '+err);
                    }
                    callBack(doc);
                    DB.close(db);
                });
            });
        });
    },
    'total':function(query,Table,callback){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.find(query).count(function(err,count){
				    callback(count);
					DB.close(db);
				});
            });
        });
    },
	list:function(query,condition,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.find(query,condition).toArray(function(err,docs){
                    if(err){
                        console.error('get error: '+err);
                    }
                    callBack(docs);
                    DB.close(db);
                });
            });
        });
    },
	'findOne':function(query,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                DB.findOne(collection,query,function(doc){
                    DB.close(db);
                    callBack(doc);
                });
            });
        });
    }

};