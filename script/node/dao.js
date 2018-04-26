var IDao = require("./IDao");
var dbClient = require('./DBClient');
var uuid = require('node-uuid');
var Dao = module.exports = IDao.extend({
	initialize: function(DBTable) {
		this.DBTable = DBTable;
    },
	getDB:function(callBack){
		var self=this;
		dbClient.client(function(db){
			dbClient.collection(db,self.DBTable,function(collection){
			    callBack(db,collection);
			});
		});
	},
	releaseDB:function(db){
		dbClient.close(db);
	},
	total:function(query,callBack){
		var self=this;
		
		if(!query){
			query={};
		}
		dbClient.client(function(db){
			dbClient.collection(db,self.DBTable,function(collection){
			    collection.find(query).count(function(err,count){
                    if(err){
                        console.error('dao total error: '+err);
                    }
				    callBack(count);
					dbClient.close(db);
				});
			});
		});
		
	},
	list:function(query,fields,sorts,pageNo,pageSize,callBack){
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
	    dbClient.client(function(db){
			dbClient.collection(db,self.DBTable,function(collection){
				if(!pageNo){
					collection.find(query,options).toArray(function(err,docs){
                        if(err){
                            console.error('dao list error: '+err);
                        }
						callBack(docs);
						dbClient.close(db);
					});
				}else{	
					collection.find(query,options).limit(pageSize).skip(pageSize*(pageNo-1)).toArray(function(err,docs){
                        if(err){
                            console.error('dao list error: '+err);
                        }
                        callBack(docs);
						dbClient.close(db);
					});
			    }
			});
		});
	},
	listFlog:function(query,fields,sorts,startNo,startNum,callBack){
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
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
				collection.find(query,options).limit(startNum).skip(startNo).toArray(function(err,docs){
                    if(err){
                        console.error('dao listFlog error: '+err);
                    }
                    callBack(docs);

					dbClient.close(db);
				});
            });
        });
    },
	preInsert:function(db,doc,callBack){
		callBack(doc);
	},
	suffixInsert:function(db,doc,callBack){
		callBack(doc);
	},

	insert:function(doc,isHaveId,callBack){
		var self=this;
		if(!isHaveId){
			isHaveId=true;
		}
		dbClient.client(function(db){
			self.preInsert(db,doc,function(doc){
			    dbClient.collection(db,self.DBTable,function(collection){
                    if(!doc.id){
                    if(isHaveId=='exist'){

                    }else if(isHaveId){
                        doc.id=uuid.v1();
                    }
                    }

					collection.insert(doc , {safe:true}, function(err,result){
                        if(err){
                            console.error('dao insert error: '+err);
                        }
						self.suffixInsert(db,doc,function(result){
						    callBack(result);
						    dbClient.close(db);	
						});
					});	
				});	
			});			
		});
	},

	
    get:function(id,callBack){
		var self=this;
		dbClient.client(function(db){
			dbClient.collection(db,self.DBTable,function(collection){
			    collection.findOne({'id':id},function(err, doc){
					if(err) {
					   console.error("dao get error: " + err);
					}
					if(doc){
					    delete doc._id;	
					}
					
					callBack(doc);
					
					dbClient.close(db);
				});
			});
		});
	},
    getDocs:function(id,callBack){
        var self=this;
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
                collection.find({'id':id}).toArray(function(err, doc){
                    if(err) {
                        console.error("dao getDocs error: " + err);
                    }
                    if(doc){
                        delete doc._id;
                    }

                    callBack(doc);

                    dbClient.close(db);
                });
            });
        });
    },

	preUpdate:function(db,doc,callBack){
		callBack(doc);
	},
	suffixUpdate:function(db,doc,callBack){
		callBack(doc);
	},
    update:function(doc,callBack){
        var self=this;

		var id=doc.id;
		delete doc.id;
		delete doc._id;
		dbClient.client(function(db){
			self.preUpdate(db,doc,function(doc){
			    dbClient.collection(db,self.DBTable,function(collection){
					collection.update({"id":id},{'$set':doc} , {safe:true}, function(err,result){
                        if(err){
                            console.error('dao update error: '+err);
                        }
						doc.id=id;
                        self.suffixUpdate(db,doc,function(result){
                            callBack(result);
                            dbClient.close(db);
                        });
					}); 
				});	
			});
		});
	},

	preDelete:function(db,id,callBack){
		callBack(id);
	},
	suffixDelete:function(db,id,callBack){
		callBack(id);
	},
	'delete':function(id,callBack){
		var self=this;
		dbClient.client(function(db){
			self.preDelete(db,id,function(id){
			    dbClient.collection(db,self.DBTable,function(collection){
					collection.remove({id:id},{safe:true},function(err,result){
                        if(err){
                            console.error('dao delete error: '+err);
                        }
						self.suffixDelete(db,id,function(id){
						    callBack(id);
						    dbClient.close(db);	
						});
					});
				});	
			});
		});
	},
	insertArray:function(docs,callBack){
		var self=this;
		if(docs.length==0){
			callBack();
		}else{
			var count=800;
			if(docs.length<800){
				count=docs.length;
			}
			var f=[];
			for(var i=0;i<count;i++){
				var doc=docs[0];
				docs.splice(0,1);
				f.push(doc);		
			}
			dbClient.client(function(db){
				dbClient.collection(db,self.DBTable,function(collection){
					collection.insert(f , {safe:true,multi:true}, function(err,result){
                        if(err){
                            console.error('dao insertArray error: '+err);
                        }
							self.insertArray(docs,callBack);
							dbClient.close(db);	
					});	
				});			
			});
		}
		
	},
    find:function(query,callBack){
        var self=this;
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
                collection.find(query).toArray(function(err, doc){
                    if(err){
                        console.error('dao find error: '+err);
                    }
                    callBack(doc);
                    dbClient.close(db);
                });
            });
        });
    },
	findByOptions:function(query,option,callBack){
        var self=this;
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
                collection.find(query,option).toArray(function(err, doc){
                    if(err){
                        console.error('dao findByOption error: '+err);
                    }
                    callBack(doc);
                    dbClient.close(db);
                });
            });
        });
    },
	findOne:function(query,callBack){
		var self=this;
		dbClient.client(function(db){
			dbClient.collection(db,self.DBTable,function(collection){
			    collection.findOne(query,function(err, doc){
                    if(err){
                        console.error('dao findOne error: '+err);
                    }
					callBack(doc);
					dbClient.close(db);	
				});
			});
		});
	},

	updateArray:function(condition,setOption,callBack){
		var self=this;
		dbClient.client(function(db){
			dbClient.collection(db,self.DBTable,function(collection){
			    collection.update(condition,setOption, {safe:true,multi:true}, function(err,result){
                    if(err){
                        console.error('dao updateArray error: '+err);
                    }
                    callBack(result);
					dbClient.close(db);	
				}); 
			});
		});
	},
    //更新array
    updateArrayHaveCallback:function(condition,query,callBack){
        var self=this;
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
                collection.update(condition,query, {safe:true,multi:true}, function(err,result){
                    if(err){
                        console.error('dao updateArrayHaveCallback error: '+err);
                    }
                    callBack(result);
                    dbClient.close(db);
                });
            });
        });
    },
	deleteArray:function(condition,callBack){
		var self=this;
		dbClient.client(function(db){
			dbClient.collection(db,self.DBTable,function(collection){
			    collection.remove(condition,{safe:true,multi:true},function(err,result){
                    if(err){
                        console.error('dao deleteArray error: '+err);
                    }
					callBack();
					dbClient.close(db);	
				});
			});
		});
	},
    //按条件查找需要信息
    findByCondition:function(condition,callback){
        var self=this;
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
                collection.find(condition.query,condition.options).toArray(function(err,doc){
                    if(err){
                        console.error('dao findByCondition error: '+err);
                    }
                    callback(doc);
                    dbClient.close(db);
                })
            })
        })
    },
    findByMoreCondition:function(query,condition,option,callback){
        var self=this;
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
                collection.find(query,condition,option).toArray(function(err,doc){
                    if(err){
                        console.error('dao findByMoreCondition error: '+err);
                    }
                    callback(doc);
                    dbClient.close(db);
                })
            })
        })
    },
    //聚合取数据
    findDataByAggregate:function(query,callback){
        var self=this;
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
                collection.aggregate(query,{},function(err,doc){
                    if(err){
                        console.error('dao findDataByAggregate error: '+err);
                    }
                    callback(doc);
                    dbClient.close(db);
                });
            })
        });
    },

    //删除(主要用来删除收藏和at，需要返回doc判断是否已经删除)
    delMsg: function (condition,callback) {
        var self=this;
        dbClient.client(function(db){
            dbClient.collection(db,self.DBTable,function(collection){
                collection.remove(condition,{safe:true},function(err,result) {
                    if(err){
                        console.error('dao delMsg error: '+err);
                    }
                    callback(result);
                    dbClient.close(db);
                });
            })
        })
    }
	
	
});