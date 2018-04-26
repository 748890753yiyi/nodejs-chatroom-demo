var DB=require('../DBClient.js'),
    config=require('../config.js');

var groupDao=module.exports={
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
    get:function(query,condition,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                DB.findOne(collection,query,function(doc){
                    DB.close(db);
                    callBack(doc);
                });
            });
        });
    },
    update:function(query,condition,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.update(query ,condition,{upsert:true,multi:true},function(err,doc){
                    if(err){
                        console.error('update error: '+err);
                    }
                    callBack(doc);
                    DB.close(db);
                });
            });
        });
    },
    updateOnly:function(query,condition,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.update(query ,condition,{multi:true},function(err,doc){
                    if(err){
                        console.error('update error: '+err);
                    }
                    callBack(doc);
                    DB.close(db);
                });
            });
        });
    },
    aggregate:function(query,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.aggregate(query,{},function(err,doc){
                    if(err){
                        console.error('aggregate error: '+err);
                    }
                    callBack(doc);
                    DB.close(db);
                });
            });
        });
    },
    'delete':function(id,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.remove({id:id},{safe:true},function(err,doc){
                    if(err){
                        console.error('delete error: '+err);
                    }
                    callBack(doc);
                    DB.close(db);
                });
            });
        });
    },
    'dockDelete':function(query,Table,callBack){
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
    list1:function(query,fields,sorts,pageNo,pageSize,DBTable,callBack){
        var self=this;
        if(!query){
            query={};
        }
        var options={};
        if(sorts){
            options.sort=sorts;
        }
        if(fields){
            options.fields=fields;
        }
        DB.client(function(db){
            DB.collection(db,DBTable,function(collection){
                if(!pageNo){
                    collection.find(query,options).toArray(function(err,docs){
                        callBack(docs);
                        dbClient.close(db);
                    });
                }else{
                    collection.find(query,options).limit(pageSize).skip(pageSize*(pageNo-1)).toArray(function(err,docs){
                        callBack(docs);
                        DB.close(db);
                    });
                }
            });
        });
    },
	find:function(query,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.find(query).toArray(function(err,docs){
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
    },
	//组内成员列表
    'memberList':function(groupId,callback){
        var query=[{"$project":{_id:0,groupInformation:1}},{"$unwind":"$groupInformation"},
            {"$match":{"groupInformation.role.id":{"$ne":'3'},"groupInformation.id":groupId}}];
        dao.aggregate(query,config.dbUser,function(doc){
                callback(doc);
        })
    },
	'deleteAt':function(query,Table,callBack){
        DB.client(function(db){
            DB.collection(db,Table,function(collection){
                collection.remove(query,{safe:true,multi:true},function(err,doc){
                    if(err){
                        console.error('delete error: '+err);
                    }
                    callBack(doc);
                    DB.close(db);
                });
            });
        });
    }
};