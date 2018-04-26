var DB = require('./DBClient');
var config = require('./config');
var then = require('thenjs');
var redis = require('./redisClient');
var eventproxy=require('eventproxy');
var later = require('later');
function delCaptcha1(str,contactValue){
    redis.newRedis(function(err,redisClient){
        redisClient.hdel(str+contactValue,contactValue, function (error, res) {
            console.log("执行删除验证码操作"+res);
            if (error) {
                console.log(error);
            } else {
                console.log('del res: '+res);

            }
            redis.close(redisClient);
        });
    })
}
var cacheData=module.exports={
	//初始化redis
	init:function(){
		redis.newRedis(function(err,redisClient){
			DB.client(function(db) {
				var thenObj = then(function (defer) {
					var num = 0;
					 var nodes = redisClient.nodes;
					for (var index in nodes) {
						nodes[index].link.flushdb(function () {
							num++;
							if (num == nodes.length) {
								defer(null);
							}
						});
					}
                    defer(null);
				}).then(function (defer) {
					DB.collection(db, config.dbInformation, function (collection) {
						collection.find({'basic.type':{"$in":['groupChat','remind','vote']}}, {"sort": {"basic.publishTime": -1}})
							.toArray(function (err, docs) {
                                if(err){
                                    console.error('cacheData init 2 error: '+err);
                                    defer(null);
                                }
								if(docs.length > 0){
									var num = 0;
									for (var i = 0; i < docs.length; i++) {
										var msg = docs[i];
										var groupId = msg.basic.groupId;
										var msg = JSON.stringify(msg);
										redisClient.rpush('groupChat_' + groupId, msg, function (error, res) {
											if (error) {
												console.error(error);
											} else {
												//console.log(res);
											}
											num++;
											if (num == docs.length) {
												defer(null);
											}
										});
									}
								}else{
									defer(null);
								}
							});
					});
				}).then(function (defer) {
					DB.collection(db, config.dbUser, function (collection) {
						collection.find({}, {})
							.toArray(function (err, docs) {
                                if(err){
                                    console.error('cacheData init 3 error: '+err);
                                    defer(null);
                                }
								if(docs.length > 0){
									var num = 0;
									for (var i = 0; i < docs.length; i++) {
										var user = docs[i];
										var userId = user.id;
										user.groupOnline = '';
										var user = JSON.stringify(user);
										redisClient.hset('user', userId, user, function (error, res) {
											if (error) {
												console.error("cacheData init hset error:" + error);
											} else {
												//console.log(res);
											}
											num++;
											if (num == docs.length) {
												defer(null);
											}
										});
									}
								}else{
									defer(null);
								}
							});
					});
				}).then(function (defer) {
					redis.close(redisClient);
					DB.close(db);
					defer();
				});
			});
		});
	},
	//缓存添加message
	add:function(message){
		var groupId=message.basic.groupId;
		redis.newRedis(function(err,redisClient) {
            if(err){
                console.error('cacheData add newRedis error: '+err);
            }
			var msg = JSON.stringify(message);
			redisClient.lpush('groupChat_' + groupId, msg, function (error, res) {
				if (error) {
					console.error('cacheData add groupChat_ error：'+error);
				}
				// 关闭链接
				redis.close(redisClient);
			});
		});
	},
	//缓存中获取信息列表
	interval:function(groupId,startIndex,endIndex){
		var redisClient = null;
		var msgs = [];
		var thenObj=then(function (defer) {
			redis.newRedis(function(err,client) {
                if(err){
                    console.error('cacheData interval newRedis error: '+err);
                }
				redisClient = client;
                //redis.close(client);
				defer(null);
			})
		}).then(function (defer) {
			redisClient.llen('groupChat_' + groupId, function (err, len) {
                if(err){
                    console.error('cacheData interval groupChat_ error: '+err);
                }
				defer(null, len);
			});
		}).then(function (defer, len) {
			if (len == 1&&startIndex==1) {
				redisClient.lrange('groupChat_' + groupId, 0, 0, function (err, data) {
                    if(err){
                        console.error('cacheData interval groupChat_ error: '+err);
                    }
					var msg = JSON.parse(data);
					msgs.push(msg);
					defer(null, msgs);
				});
			} else if (len > 1 && len > startIndex) {
				var realStartIndex = startIndex - 1;
				var realEndIndex = endIndex - 1;
				if (len < endIndex) {
					realEndIndex = len - 1;
				}
				redisClient.lrange('groupChat_' + groupId, realStartIndex, realEndIndex, function (err, data) {
                    if(err){
                        console.error('cacheData interval groupChat_ error: '+err);
                    }
					data.forEach(function (reply, i) {
						var msg = JSON.parse(reply);
						msgs.push(msg);
					});
					defer(null, msgs);
				});
			} else {
				defer(null, msgs);
			}
		}).then(function (defer, msgs) {
			if(msgs.length>0){
                redisClient.hgetall("user", function (err, data) {
                    if(err){
                        console.error('cacheData interval user error: '+err);
                    }
                    msgs.forEach(function (msg, i) {
                        var userId = msg.basic.userId;
                        var user = JSON.parse(data[userId]);
                        msg.basic.userName = user.basic.userName;
                        msg.basic.head = user.basic.head;
                    });
                    defer(null, msgs);
                });
            }else{
                defer(null, msgs);
            }
		}).then(function (defer, msgs) {
			redis.close(redisClient);
			defer(null, msgs);
		});
		return thenObj;
	},
	//更新缓存中的用户
	updateUser:function(user){
		var userId=user.id;
		var flag=false;
		var thenObj=then(function(defer){
			redis.newRedis(function(err,redisClient) {
				redisClient.hget('user', userId, function (error, res) {
					if (error) {
                        redis.close(redisClient);
						console.error(error);
						return error;
					}
					if (res) {
						var tempJson = JSON.parse(res);
						user.groupOnline = tempJson.groupOnline;
					} else {
						user.groupOnline = 'false';
					}
					redis.close(redisClient);
					defer(null)
				});
			});
		}).then(function(defer) {
			var userJson = JSON.stringify(user);
			redis.newRedis(function (err, redisClient) {
				redisClient.hset('user', userId, userJson, function (error, res) {
					if (error) {
                        redis.close(redisClient);
						console.error(error);
						return error;
					} else {
						flag = true;
						// console.log(res);
					}
					// 关闭链接
					redis.close(redisClient);
					defer(null, flag);
				});
			})
		});
		return thenObj;
	},
	//获取缓存中更新以后的用户
	getUpdateUser:function(userId,type,callback){
		redis.newRedis(function(err,redisClient) {
			var thenObj = then(function (defer) {
				redisClient.hget('user', userId, function (error, res) {
					if (error) {
						console.error('cacheData getUpdateUser user error: '+error);
                        redis.close(redisClient);
					}
                    if(res){
                        defer(null, res);
                    }
                    else {
                        redis.close(redisClient);
                        callback({status:'failed'});
					}
				});
			}).then(function (defer, res) {
				var resJson = JSON.parse(res);
                resJson.groupOnline =type;
				var tempUser = JSON.stringify(resJson);
                redisClient.hdel('user',userId, function (error, res) {
                    if (error) {
                        redis.close(redisClient);
                        console.error('cacheData getUpdateUser user error: '+error);
                    } else {
                        defer(null,tempUser);
                    }
                });

			}).then(function(defer,tempUser){
                redisClient.hset('user', userId, tempUser, function (error, res) {
                    if (error) {
                        redis.close(redisClient);
                        console.error('cacheData getUpdateUser user error: '+error);
                    } else {
                        defer(null,res);
                    }
                });
            }).then(function (defer,tempRes) {
                redis.close(redisClient);
				if(tempRes==1){
					callback({status:'success'});
				}else{
					callback({status:'failed'});
				}
			})
		})
	},
	//设置用户在线离线状态
	addOnlineUser:function(user,type){
		var userId=user.id;
		if(type=='login'){
			user.isOnline='true';
		}else{
			user.isOnLine='false';
		}
		var user=JSON.stringify(user);
		redis.newRedis(function(err,redisClient) {
			redisClient.hset('user', userId, user, function (error, res) {
				if (error) {
					console.log(error);
				} else {
					//console.log(res);
				}
				// 关闭链接
				redis.close(redisClient);
			});
		})
	},
	//用户离开组时修改缓存中离开组时间
	updateUserExitTime:function(userId,groupId,callback){
		redis.newRedis(function(err,redisClient) {
			var thenObj = then(function (defer) {
				redisClient.hget('user', userId, function (error, res) {
					if (error) {
                        redis.close(redisClient);
						console.error("cacheData updateUserExitTime user error: "+error);
					}
                    if(res){
                        defer(null, res);
                    }
                    else {
                        redis.close(redisClient);
                        callback({status:'failed'});
					}
				});
			}).then(function (defer, res) {
				var tempJson = JSON.parse(res);
				if(tempJson.groupInformation&&tempJson.groupInformation.length>0){
					var len=tempJson.groupInformation.length;
						tempJson.groupInformation.forEach(function(term,i){
							if(term.id==groupId){
								term.roleExtend.exitTime=new Date();
								i==len-1;
								
							}
					})
				}
				var tempJson1 = JSON.stringify(tempJson);
				redisClient.hset('user', userId, tempJson1, function (error, res) {
					
					if (error) {
                        redis.close(redisClient);
						console.error("cacheData updateUserExitTime user error: "+error);
					} else {
						defer(null);
					}
				});
			}).then(function (defer) {
                redis.close(redisClient);
				callback({status:'success'});
			})
		})
	},
	UpdateDirectGroupUserInfo:function(type,userId,groupInformation,callback){
        redis.newRedis(function(err,redisClient) {
            if(err){
                console.error('cacheData UpdateDirectGroupUserInfo error: '+err);
            }
            then(function (defer) {
                redisClient.hget('user',userId, function (error, res) {
                    if (error) {
                        redis.close(redisClient);
                        console.error('cacheData UpdateDirectGroupUserInfo error: '+error);
                    } else {
                        defer(null, res);
                    }
                });
            }).then(function (defer, res) {
                var tempJson = JSON.parse(res);
                if(type=='join'){
                    if(tempJson.groupInformation==undefined){
                        tempJson.groupInformation=[];
                    }
                    tempJson.groupInformation.push(groupInformation);
                }else if(type=='remove'){
                    tempJson.groupInformation.forEach(function(group,i){
                        if(group.id==groupInformation.id){
                            tempJson.groupInformation.splice(i,1);
                            i--;
                        }
                    })
                }

                var tempJson1 = JSON.stringify(tempJson);
                redisClient.hdel('user',userId, function (error, res) {

                    if (error) {
                        redis.close(redisClient);
                        console.error('cacheData UpdateDirectGroupUserInfo error: '+error);
                    } else {
                        //console.log('del res: '+res);
                        defer(null,tempJson1);
                    }
                });

            }).then(function(defer,tempJson1){
                redisClient.hset('user',userId, tempJson1, function (error, res) {

                    if (error) {
                        redis.close(redisClient);
                        console.error('cacheData UpdateDirectGroupUserInfo error: '+error);
                    } else {
                        //console.log('res: '+res);
                        defer(null,res);
                    }
                });
            }).then(function (defer,res1) {
                redis.close(redisClient);
                if(res1==1){
                    callback({status:'success'});
                }else{
                    callback({status:'failed'});
                }
            })
        })
    },
    //放公司角色到redis里面
    getUpdateUserCompanyRole:function(userId,companyId) {
        var self=this;
        var thenObj=then(function(defer){
            //从数据库取出user的company数据
            DB.client(function(db){
                DB.collection(db,config.dbUser,function(collection){
                    collection.findOne({id:userId},{id:1,companyInformation:1,_id:0},function(err,doc){
                        //console.log('company取出的doc是什么:'+JSON.stringify(doc));
                        //判断是否取出有公司信息,倘若有就取出，没有就设置为空
                        if(doc&&doc.companyInformation&&doc.companyInformation.length>0){
                            doc.companyInformation.forEach(function(company,i){
                                if(company.id==companyId){
                                    var companyInUser={companyId:companyId,role:company.userCompanyRole.characterId,userId:userId,status:company.userCompanyRole.status};
                                    defer(null,companyInUser);
                                }
                            })
                        }else{
                            var companyInUserNull={companyId:companyId,role:'',userId:userId,status:'false'};
                            defer(null,companyInUserNull);
                        }
                        DB.close(db);
                    })
                })
            })

        }).then(function(defer,companyInUser){
            //将上面取出的数据放在redis里面
            redis.newRedis(function(err,redisClient){
                var user = JSON.stringify(companyInUser);
                redisClient.hset('userRole'+userId,companyId ,user,function(err,doc){
                    if (err) {
                        console.error("hset:" + err);
                    } else {
                        
                    }
                    redis.close(redisClient);
                })
            })
        })
    },
    //定时刷新redis里面的内容 (在company里面)
    updateUserCompanyRoleByTime:function(userId,companyId) {
        var self=this;
        //马上将信息存储到redis里面
        self.getUpdateUserCompanyRole(userId,companyId);
        //设置时间
        var composite = [
            {h: [0], m: [10]}
        ];
        var sched = {
            schedules:composite
        };
        later.date.localTime();
        //定时调用刷新
        t = later.setInterval(function() {
            self.getUpdateUserCompanyRole(userId,companyId);
        }, sched);
    },
    //获取redis里面的关于公司角色的信息
    getUpdateUserCompanyRoleInRedis:function(userId,companyId,callback){
        redis.newRedis(function(err,redisClient){
            redisClient.hget('userRole'+userId,companyId ,function(err,doc){
                if (err) {
                    //console.log("hget:" + err);
                } else {
                    callback(doc);
                }
                redis.close(redisClient);
            })
        })
    },

    //获取redis数据 str:transmitMessage
    getTransmitNum:function(str,messageId,callback){
        redis.newRedis(function(err,redisClient){
            redisClient.hget(str+messageId,messageId ,function(err,doc){
                if (err) {
                    redis.close(redisClient);
                    console.error("hget:" + err);
                } else {
                    redis.close(redisClient);
                    callback(doc);
                }
            })
        })
    },

    //从redis获取点赞和转发次数
    getMsgInRedis:function(messageId,callback){
        var self=this;
        var ep=new eventproxy();
        ep.all('likeMember','transmitNum',function(likeMember,transmitNum){
            callback(likeMember,transmitNum);
        });
        //从redis里面取出对应信息的点赞的人的集合的内容
        redis.newRedis(function(err,redisClient){
            redisClient.smembers(messageId,function(err,doc){
                ep.emit('likeMember',doc);
                redis.close(redisClient);
            })

        });
        //取出信息的转发的次数
        self.getTransmitNum('transmitMessage',messageId,function(doc){
            if(doc){
                ep.emit('transmitNum',doc);
            }else{
                ep.emit('transmitNum',0);
            }
        });
    },
    //redis里面的点赞、转发次数定时更新到mongodb数据库  需要设置定时器
    setMsgInRedisToMongo:function(messageId){
        var self=this;
        self.getMsgInRedis(messageId,function(likeMember,transmitNum){
            var updates={};
            if(likeMember.length>0&&transmitNum){
                updates={'$set':{'basic.count':likeMember,'basic.transmitNumber':transmitNum}};
            }else if(likeMember.length>0){
                updates={'$set':{'basic.count':likeMember}};
            }else if(transmitNum){
                updates={'$set':{'basic.transmitNumber':transmitNum}};
            }
            //将取出的数组放入mongodb
            DB.client(function(db){
                DB.collection(db, config.dbInformation, function (collection) {
                    collection.update({id:messageId} ,updates, {safe:true,multi:true}, function(err,result){
                        DB.close(db);
                    });
                })
            })
        });
    },

	//获取个人user
    getUser:function(userId,callback){
        redis.newRedis(function(err,redisClient) {
            redisClient.hget('user', userId, function (error, res) {
                if (error) {
                    redis.close(redisClient);
                    console.error(error);
                    return error;
                }
                if (res) {
                    var tempJson = JSON.parse(res);
                    redis.close(redisClient);
                    callback(tempJson);
                }

            });
        })
    },
	//@定位获取相应的@数据，以及他的下标
    atPositionInformation:function(req,res){
        var informationId=req.param('informationId');
        var groupId=req.param('groupId');
        var pageNo=parseInt(req.param('pageNo'));
        var redisClient = null;
        var msgs = [];
        var thenObj=then(function (defer) {
            redis.newRedis(function(err,client) {
                redisClient = client;
                defer(null);
            })
        }).then(function (defer) {
            redisClient.llen('groupChat_' + groupId, function (err, len) {
				
                defer(null, len);
            });
        }).then(function (defer, len) {
            if (len == 1) {
				
                defer(null, 0,0);
            } else if (len > 1 ) {
				var index=0;
                var realStartIndex = 0;
                var realEndIndex = len - 1;
                redisClient.lrange('groupChat_' + groupId, realStartIndex, realEndIndex, function (err, data) {
                    for(var m=0;m<data.length;m++){
						
						index++;
						var tempMsg=data[m];
                        var msg = JSON.parse(tempMsg);
                        if(msg.id==informationId){
                            break;
							
                        }
                    }
					
                    defer(null, index-1,index+pageNo-1);
                });
            }
        }).then(function(defer,realStartIndex,realEndIndex){
            redisClient.lrange('groupChat_' + groupId, realStartIndex, realEndIndex, function (err, data) {
                data.forEach(function (reply, i) {
                    var msg = JSON.parse(reply);
                    msgs.push(msg);
                });
                defer(null, msgs,realStartIndex);
            });
        }).then(function (defer, msgs,index) {
            redisClient.hgetall("user", function (err, data) {
                msgs.forEach(function (msg, i) {
                    var userId = msg.basic.userId;
                    var user = JSON.parse(data[userId]);
                    msg.basic.userName = user.basic.userName;
                    msg.basic.head = user.basic.head;
                });
                defer(null, msgs,index);
            });
        }).then(function (defer, msgs,index) {
            var tempDoc={};
            tempDoc.list=msgs;
            tempDoc.index=index;
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            redis.close(redisClient);
            res.end(str);
        });

    },

    //定时清空redis中用户的验证码对象
    delCaptcha:function(str,contactValue){
        redis.newRedis(function(err,redisClient){
            redisClient.hdel(str+contactValue,contactValue, function (error, res) {
                if (error) {
                    console.error(error);
                }
                redis.close(redisClient);
            });
        })
    },
    //copyright添加用户
    addData:function(user){
        redis.newRedis(function(err,redisClient) {
            then(function(defer){
                var tempUser=JSON.stringify(user);
                redisClient.hset('user', user.id, tempUser, function (error, res) {

                    if (error) {
                        redis.close(redisClient);
                        console.error(error);
                    } else {
                        defer(null,res);
                    }
                });
            }).then(function (defer,tempRes) {

                redis.close(redisClient);
            })
        })
    },
    //copyright修改用户
    updateData:function(user){
        var userId=user.id;
        redis.newRedis(function(err,redisClient) {
            var thenObj = then(function (defer) {
                var tempUser = JSON.stringify(user);
                redisClient.hdel('user',userId, function (error, res) {
                    if (error) {
                        redis.close(redisClient);
                        console.error(error);
                    } else {
                        defer(null,tempUser);
                    }
                });
            }).then(function(defer,tempUser){
                redisClient.hset('user', userId, tempUser, function (error, res) {

                    if (error) {
                        redis.close(redisClient);
                        console.error(error);
                    } else {
                        defer(null,res);
                    }
                });
            }).then(function (defer,tempRes) {
                redis.close(redisClient);
            })
        })
    },
    //copyright删除用户
    delData:function(userId){
        redis.newRedis(function(err,redisClient) {
            redisClient.hdel('user',userId, function (error, res) {
                if (error) {
                    console.error(error);
                }
                redis.close(redisClient);
            });
        })
    },
    //设置redis中的存储用户验证码的对象
    setCaptcha:function(contactValue,obj,callback){
        console.log("存放验证码操作");
        var self=this;
        var str="";
        if(obj.type=="register"){
            str="registerObj";
        }else if(obj.type=="recover"){
            str="recoverObj";
        }
        var tempObj = JSON.stringify(obj);
        redis.newRedis(function(err,redisClient){
            redisClient.hset(str+contactValue,contactValue ,tempObj,function(err,doc){
                if (err) {
                    console.log("hset:" + err);
                    return error;
                } else {
                    console.log("存放");
                    /*if(doc){
                        setTimeout(function(){
                            delCaptcha1(str,contactValue);
                        },10*60*1000)
                    }*/
                    callback(doc);
                }
                redis.close(redisClient);
            })
        })
    },
    //获取redis中的存储用户验证码的对象
    getCaptcha:function(type,contactValue,callback){
        console.log("获取验证码操作");
        var str="";
        if(type=="register"){
            str="registerObj";
        }else if(type=="recover"){
            str="recoverObj";
        }
        redis.newRedis(function(err,redisClient) {
            redisClient.hget(str+contactValue, contactValue, function (error, res) {
                if (error) {
                    console.log(error);
                    return error;
                }
                if (res) {
                    console.log("查看获取的验证码数据： "+res);
                    var tempJson = JSON.parse(res);
                    callback(tempJson);
                }else{
                    callback(null);
                }
                redis.close(redisClient);
            });
        })
    },
    //定时清空redis中用户的验证码对象
    delCaptcha2:function(type,contactValue){
        var str="";
        if(type=="register"){
            str="registerObj";
        }else if(type=="recover"){
            str="recoverObj";
        }
        redis.newRedis(function(err,redisClient){
            redisClient.hdel(str+contactValue,contactValue, function (error, res) {
                console.log("执行删除验证码操作"+res);
                if (error) {
                    console.log(error);
                } else {
                    console.log('del res: '+res);

                }
                redis.close(redisClient);
            });
        })
    }

}
