var DB = require('../DBClient');
var config = require('../config');
var then = require('thenjs');
var dao=require('./groupDao');
var eventproxy=require('eventproxy');
var redis = require('../redisClient');
/*定义group对象服务*/
var groupService=module.exports={
	insertInfo: function (message) {
       dao.insert(message,config.dbInformation, function (doc) {
       })
    },
    updateInfo: function (message) {
        dao.update({id:message.id},{'$set':{'basic.state':true}},config.dbInformation, function (doc) {
        })
    },
    //组的基本信息获取
    'basic':function(groupId,callBack){
        dao.get({id:groupId},{roleSetting:0,_id:0},config.dbGroup,function(doc){
            var obj={};
            obj.name=doc.basic.name;
            obj.type=doc.basic.type;
            obj.companyId=doc.basic.companyId;
            obj.head=doc.extend.head;
            obj.introduction=doc.extend.introduction;
            obj.createTime=doc.extend.createTime;
            obj.permission=doc.extend.permission;
            obj.isAudit=doc.extend.isAudit;
            callBack(obj);
        })
    }, 
    //用户添加组信息
    'addUser':function(id,group,callback){
        dao.update({id:id},{"$push":{groupInformation:group}},config.dbUser,function(doc){
            var tempDoc={};
            if(doc){
                tempDoc={status:'success'}
            }else{
                tempDoc={status:'failed'}
            }
            callback(tempDoc);
        });
    },
    //修改用户user表中具有groupId组的组名
    'updateUserGroup':function(id,basic,callback){
        dao.update({"groupInformation.id":id},{"$set":{'groupInformation.$.basic':basic}},config.dbUser,function(doc){
            callback(doc);
        });
    },
    
    //用户的组（公开组）
    'myGroupList':function(userId,isFocusOn,callback){
        var query;
        query=[{"$unwind":"$groupInformation"},{"$match":{"id":userId,"groupInformation.roleExtend.isFocusOn":isFocusOn}}];

        dao.aggregate(query,config.dbUser,function(docs){
            callback(docs);
        })
    },

    //模态框用户的组列表
    'modalGroupList':function(userId,pageNo,pageSize,searchName,callback){
        var query=[{"$unwind":"$groupInformation"},
            {"$match":{"id":userId}},{'$skip':(pageNo-1)*pageSize},{'$limit':pageSize}];
        var query1=[{"$unwind":"$groupInformation"},{"$match":{"id":userId}}];
        if(searchName!=""){
            query=[{"$unwind":"$groupInformation"},
                {"$match":{"id":userId,"groupInformation.basic.name":{'$regex':searchName}}},{'$skip':(pageNo-1)*pageSize},{'$limit':pageSize}];

            query1=[{"$unwind":"$groupInformation"},
                {"$match":{"id":userId,"groupInformation.basic.name":{'$regex':searchName}}}];
        }
        dao.aggregate(query1,config.dbUser,function(docs){
            var total=docs.length;
            dao.aggregate(query,config.dbUser,function(docs1){
                callback(docs1,total);
            })
        })
    },

	'myGroupListAndMsg':function(userId,companyId,type,callback){
		var query=[{"$unwind":"$groupInformation"},
			{"$match":{"id":userId,"groupInformation.basic.companyId":companyId,"groupInformation.basic.type":type,"groupInformation.roleExtend.isFocusOn":"Y"}}];
        dao.aggregate(query,config.dbUser,function(docs){
			var count = 0;
			var groupArray=[];
			if(docs.length>0){
				docs.forEach(function(item){
					var tempGroup={};
					tempGroup.name=item.groupInformation.basic.name;
					tempGroup.id=item.groupInformation.id;
					tempGroup.head=item.groupInformation.basic.head;
					tempGroup.companyId=item.groupInformation.basic.companyId;
					tempGroup.type=item.groupInformation.basic.type;
					tempGroup.joinTime=item.groupInformation.roleExtend.joinTime;
					tempGroup.msgCount=0;
					tempGroup.groupMsg={};//默认最后一条发言为空对象
					var msgQuery={'basic.groupId':item.groupInformation.id,'basic.type':'groupChat','basic.undo':false};
					var condition={'sort':{'basic.publishTime':-1},'limit':1};
					dao.list(msgQuery,condition,config.dbInformation,function(doc){
						count++;
						if(doc.length>0){
							tempGroup.groupMsg = doc[0];
						}
						groupArray.push(tempGroup);
						if(count==docs.length){
							callback(groupArray);
						}
					})
				})
			}else{
				callback(groupArray);
			}
        })
    },
	//用户在某个公司下所有的组（私有的以及公开的）
    allGroupList:function(userId,callback){
        var query=[{"$project":{_id:0,id:1,groupInformation:1}},{"$unwind":"$groupInformation"},
            {"$match":{"id":userId}}];
        dao.aggregate(query,config.dbUser,function(docs){
            callback(docs);
        })
    },
    //修改某人的某个组信息对应的最后发言时间和发言数
    'updateGroupChat':function(userId,groupId,callback){
        dao.update({"id":userId,"groupInformation.id":groupId},
            {'$set':{'groupInformation.$.roleExtend.lastSpeakTime':new Date()}, '$inc':{'groupInformation.$.roleExtend.lastSpeakTime':1}},config.dbUser,function(doc){
                
				callback(doc);
            })
    },
    //修改某用户对某个组的退出时间
    'updateUserExitTime':function(userId,groupId,callback){
        dao.update({id:userId,'groupInformation.id':groupId},{"$set":{"groupInformation.$.roleExtend.exitTime":new Date()}},config.dbUser,function(doc){
            callback(doc);
        });
    },
    //全部公司群组
    'allCompanyGroup':function(pageNum,pageSize,companyId,callback){
        dao.get({'group.basic.companyId':companyId},{'sort':'group.extend.createTime','skip':(pageNum-1)*pageSize,'limit':pageSize},config.dbGroup,function(docs){
            callback(docs);
        });
    },
    //组内成员个数
    'sum':function(groupId,Table,callback){
        dao.total({'groupInformation.id':groupId},Table,function(count){
            callback(count);
        })
    },
	//设置组为重点关注或者取消重点关注
    'focus':function(userId,groupId,isFocusOn,callback){
        dao.update({id:userId,'groupInformation.id':groupId},
            {'$set':{'groupInformation.$.roleExtend.isFocusOn':isFocusOn}},config.dbUser,function(doc){
                callback({status:'success'});
            });

    },
    //通过组id获取相应用户的组信息
    'get':function(groupId,userId,callback){
        var query=[{"$project":{_id:0,id:1,groupInformation:1}},{"$unwind":"$groupInformation"},
            {"$match":{"id":userId,"groupInformation.id":groupId}}];
        dao.aggregate(query,config.dbUser,function(doc){
            if(doc.length>0){				
                callback(doc[0]);
            }else{
                callback();
            }
        })
    },
    //通过组id获取相应用户的组信息
    'getContact':function(groupId,contactValue,callback){
        var query=[{"$project":{_id:0,contactInformation:1,groupInformation:1}},{"$unwind":"$groupInformation"},
            {"$match":{"groupInformation.id":groupId,'contactInformation.contactValue':contactValue,
                'contactInformation.registerTag':"true"}}];
        dao.aggregate(query,config.dbUser,function(doc){
            if(doc.length>0){
                callback(doc[0]);
            }else{
                callback();
            }
        })
    },
	//组列表
    list:function(query,condition,callback){
        dao.list(query,condition,config.dbGroup,function(docs){
            callback(docs);
        })
    },
	//group表中查出一个具体组
    findOne:function(query,callback){
        dao.findOne(query,config.dbGroup,function(doc){
            callback(doc);
        })
    },
	//组内管理员列表(分页)
    'memberListPage':function(groupId,pageNo,pageSize,name,firstSpell,array,callback){
		if(firstSpell!=null){
			var query=[{"$project":{_id:0,id:1,basic:1,contactInformation:1,groupInformation:1}},{"$unwind":"$groupInformation"},
				{"$match":{"basic.firstSpell":firstSpell,"groupInformation.role.id":{"$in":array},"groupInformation.id":groupId}},
					{'$sort':{'groupInformation.role.id':1}},{'$skip':(pageNo-1)*pageSize},{'$limit':pageSize}];
			var query1=[{"$project":{_id:0,basic:1,contactInformation:1,groupInformation:1}},{"$unwind":"$groupInformation"},
			{"$match":{"basic.firstSpell":firstSpell,"groupInformation.role.id":{"$in":array},"groupInformation.id":groupId}}];
		}else{
			if(name!=null){
				var query=[{"$project":{_id:0,id:1,basic:1,contactInformation:1,groupInformation:1}},{"$unwind":"$groupInformation"},
				{"$match":{"groupInformation.role.id":{"$in":array},"groupInformation.id":groupId,"basic.userName":{"$regex":name}}},
					{'$sort':{'groupInformation.role.id':1}},{'$skip':(pageNo-1)*pageSize},{'$limit':pageSize}];
				var query1=[{"$project":{_id:0,basic:1,contactInformation:1,groupInformation:1}},{"$unwind":"$groupInformation"},
				{"$match":{"groupInformation.role.id":{"$in":array},"groupInformation.id":groupId,"basic.userName":{"$regex":name}}}];
			}else{
				var query=[{"$project":{_id:0,id:1,basic:1,contactInformation:1,groupInformation:1}},{"$unwind":"$groupInformation"},
				{"$match":{"groupInformation.role.id":{"$in":array},"groupInformation.id":groupId}},
					{'$sort':{'groupInformation.role.id':1}},{'$skip':(pageNo-1)*pageSize},{'$limit':pageSize}];
				var query1=[{"$project":{_id:0,basic:1,contactInformation:1,groupInformation:1}},{"$unwind":"$groupInformation"},
				{"$match":{"groupInformation.role.id":{"$in":array},"groupInformation.id":groupId}}];
			}	
		}
		
        dao.aggregate(query1,config.dbUser,function(doc1){
			var total=doc1.length;
            dao.aggregate(query,config.dbUser,function(doc){
                callback(doc,total);
			})
        })
		
    },
	//组内管理员列表(不分页)
    'memberList':function(groupId,array,callback){
        var query=[{"$project":{_id:0,id:1,basic:1,groupInformation:1}},{"$unwind":"$groupInformation"},
            {"$match":{"groupInformation.role.id":{"$in":array},"groupInformation.id":groupId}}];
		
        dao.aggregate(query,config.dbUser,function(doc){
                callback(doc);
        })
		
    },
	//获取组详细信息(包括[组名，组简介]，组人数，管理员数组，创建者对象,我再组的角色)
	getGroup:function(user,groupId,callback){
        var self=this;
        var ep =new eventproxy();
        ep.all('count','group','admin','get','super','memberHead',function(count,group,adminDocs,role,superDocs,memberHead){
            group.count=count;
            group.adminList=adminDocs;
            group.creator=superDocs[0].basic;
            group.ownRole=role;
            if(group.basic.head === config.groupHead){
                group.memberHead=memberHead;
            }
            callback(group);
        })
        //组人数
        /*self.sum(groupId,config.dbUser,function(count){

            ep.emit('count',count);
        });*/
        dao.aggregate([{"$project":{_id:0,id:1,basic:1,groupInformation:1}},
            {"$unwind":"$groupInformation"},
            {"$match":{"groupInformation.id":groupId,
                "groupInformation.role.status":{$nin:["false"]}}}
        ],config.dbUser,function(docs){
            //docs为组内所有的人
            if(docs.length>0){
                var ids=[];
                docs.forEach(function(doc){
                    ids.push(doc.id);
                })
                dao.total({id:{"$in":ids},'basic.stopLogin':{"$nin":["true"]}},config.dbUser,function(count){
                    ep.emit('count',count);
                })
            }else{
                ep.emit('count',0);
            }

        })
        //组简介，组名称
        self.findOne({id:groupId},function(group){
            delete group._id;
            delete group.roleSetting;
            if(group['basic']['type']=='private'){
                dao.findOne({id:group['basic']['companyId']},config.dbCompany, function (doc1) {
                    group['basic']['companyName']=doc1.basic.name;
                    ep.emit('group',group);
                })
            }else{
                ep.emit('group',group);
            }
        });
        //管理员数组
        self.memberList(groupId,['2'],function(adminDocs){
            if(adminDocs.length>0){
                for(var i=0;i<adminDocs.length;i++){
                    delete adminDocs[i].groupInformation;
                }
            }
            ep.emit('admin',adminDocs);
        });

        //我的角色
        self.get(groupId,user.id,function(doc){
            var role;
            if(doc){
                role=doc.groupInformation.role;
                role.isFocusOn=doc.groupInformation.roleExtend.isFocusOn;
                role.level=doc.groupInformation.roleExtend.level;
                if(doc.groupInformation.roleExtend.exitTime){
                    role.exitTime=doc.groupInformation.roleExtend.exitTime;
                }
                if(doc.groupInformation.roleExtend.isSpeak){
                    if(doc.groupInformation.roleExtend.isSpeak!='false'&&(new Date(doc.groupInformation.roleExtend.isSpeak)<new Date())){
                        dao.update({id:user.id,'groupInformation.id':doc.groupInformation.id},{$set:{'groupInformation.$.roleExtend.isSpeak':'true'}},config.dbUser, function () {
                            doc.groupInformation.roleExtend.isSpeak='true';
                            role.isSpeak='true';
                        })
                    }else{
                        role.isSpeak=doc.groupInformation.roleExtend.isSpeak;
                    }
                }else{
                    role.isSpeak='true';
                }
                delete doc.id;
            }
            ep.emit('get',role);
        })
            //创建者对象
            self.memberList(groupId,['1'],function(superDocs){
                if(superDocs.length>0){
                    for(var i=0;i<superDocs.length;i++){
                        delete superDocs[i].groupInformation;
                    }
                }
                ep.emit('super',superDocs);
            });
        self.memberHead(groupId, function (docs) {
            ep.emit('memberHead',docs);
        })
    },
    memberHead: function (groupId,callBack) {
        dao.aggregate([{"$project":{_id:0,id:1,basic:1,groupInformation:1}},
            {"$unwind":"$groupInformation"},
            {"$match":{"groupInformation.id":groupId,
                "groupInformation.role.status":{$nin:["false"]},
                "groupInformation.basic.stopLogin":{$nin:["true"]}}},
            {'$sort':{'groupInformation.basic.isFocusOn':1}}
        ],config.dbUser,function (docs) {
            var headDoc=[];
            if(docs.length>9){
                for(var i=0;i<9;i++){
                    headDoc.push(docs[i]['basic']['head'])
                }
                callBack(headDoc);
            }else{
                for(var i=0;i<docs.length;i++){
                    headDoc.push(docs[i]['basic']['head'])
                }
                callBack(headDoc);
            }

        })
    },
	//组内一般成员退出群组
    'memberExit':function(userId,groupId,callback){
        dao.update({"id":userId},{"$pull":{'groupInformation':{'id':groupId}}},config.dbUser,function(doc){
            callback(doc);
        });
    },
    //组内超级管理员设置管理员权限
    'addAdmin':function(userId,groupId,callback){
        var role={'id':'2','name':'管理员','type':'admin','typeLevel':'middle'};
        dao.update({"id":userId,'groupInformation.id':groupId},{"$set":{'groupInformation.$.role':{'id':'2','name':'管理员','type':'admin','typeLevel':'middle'}}},config.dbUser,function(doc){
            callback(doc,role);
        });
    },
    //组内超级管理员移除管理员权限
    'removeAdmin':function(userId,groupId,callback){
        var role={'id':'3','name':'成员','type':'member','typeLevel':'primary'};
        dao.update({"id":userId,'groupInformation.id':groupId},{"$set":{'groupInformation.$.role':{'id':'3','name':'成员','type':'member','typeLevel':'primary'}}},config.dbUser,function(doc){
            callback(doc,role);
        });
    },
    //组内超级管理员或者管理员审核
    'audit':function(userId,groupId,callback){
        dao.update({"id":userId,'groupInformation.id':groupId},{"$set":{'groupInformation.$.role':{'id':'3','name':'成员','type':'member','typeLevel':'primary'}}},config.dbUser,function(doc){
            callback(doc);
        });
    },
	//组内成员列表
	'atList':function(query,condition,Table,callback){
        dao.list(query,condition,Table,function(docs){
            callback(docs);
        })
    },

    'groupMember':function(groupId,callback){
        var query=[{"$project":{_id:0,id:1,contactInformation:1,basic:1,groupInformation:1}},{"$unwind":"$groupInformation"},
            {"$match":{"basic.stopLogin":{"$nin":["true"]},"groupInformation.id":groupId,"groupInformation.role.status":{"$nin":["false"]}}},{'$sort':{'groupInformation.role.id':1}}];

        dao.aggregate(query,config.dbUser,function(doc){
            callback(doc);

        })

    },
	//具体用户所有组的未读消息提醒
    'unReadMsgCount':function(userId,groupId,callback){     
        var ep=new eventproxy();
		var exitTime;
        ep.all('exitTime','msgs',function(exitTime,msgs){
			var count=0;
            if(exitTime!=undefined&&msgs.length>0){
				
                msgs.forEach(function(msg,j){
                    if(msg.basic.publishTime>exitTime){
                        count++;
                    }
					if(j==msgs.length-1){
						callback(count);
					}
                });
            }else{
				callback(count);
			}
            
        })
        redis.newRedis(function(err,redisClient) {
            redisClient.hget('user', userId, function (error, res) {
                if (error) {
                    console.error(error);
                } else {
                    if(res){
                        var tempJson = JSON.parse(res);
                        if(tempJson.groupInformation!=null&&tempJson.groupInformation.length>0){
                            var len=tempJson.groupInformation.length;

                            tempJson.groupInformation.forEach(function(term,i){
                                if(term.id==groupId){
                                    exitTime=term.roleExtend.exitTime;
                                }
                                if(i==len-1){
                                    ep.emit('exitTime',exitTime);
                                }

                            })
                        }else{
                            ep.emit('exitTime',exitTime);
                        }
                    }else{
                        ep.emit('exitTime',exitTime);
                    }

                }
                redis.close(redisClient);
            });
        });
        redis.newRedis(function(err,redisClient) {
			redisClient.llen('groupChat_' + groupId, function (err, len) {
				var msgs = [];
				if(len>=1){
					redisClient.lrange('groupChat_' + groupId, 0, len-1, function (err, data) {
						data.forEach(function (reply, i) {
							var msg = JSON.parse(reply);
							msgs.push(msg);
							if(i==len-1){
								ep.emit('msgs',msgs);
								redis.close(redisClient);
							}
						});
						
					});
				}else{
					ep.emit('msgs',msgs);
                    redis.close(redisClient);
				}				
			});
		})
    },
	//at我的列表,公司重点关注私有组的最新at我的提醒条数
    focusGroupAtList:function(userId,companyId,callback){
        var query=[{"$project":{_id:0,id:1,basic:1,groupInformation:1}},{"$unwind":"$groupInformation"},
            {"$match":{"id":userId,"groupInformation.basic.companyId":companyId,
            "groupInformation.basic.type":"private",
            "groupInformation.roleExtend.isFocusOn":"Y"}}
			];	
			var counter=0;
        dao.aggregate(query,config.dbUser,function(groupDocs){
			var groupDocsLength=groupDocs.length;
            //重点关注的组的数组
            if(groupDocs.length>0){
                groupDocs.forEach(function(groupDoc){
                    var groupId=groupDoc.groupInformation.id;
					redis.newRedis(function(err,redisClient) {
						redisClient.hget('user', userId, function (error, res) {
							if (error) {
								console.error(error);
							} else {
                                if(res){
                                    var tempJson = JSON.parse(res);
                                    var exitTime;
                                    if(tempJson&&tempJson.groupInformation&&tempJson.groupInformation.length>0){
                                        tempJson.groupInformation.forEach(function(term,i){
                                            if(term.id==groupId){
                                                exitTime=term.roleExtend.exitTime;
                                                i=tempJson.groupInformation.length-1;
                                            }
                                        })
                                    }
                                    var messageIds=[];
                                    var inArray=[];
                                    inArray.push(userId);
                                    inArray.push('allId');
                                    dao.list({userId:{"$in":inArray},informationType:'groupAt'},{_id:0},config.dbAt,function(docs){

                                        if(docs.length>0){
                                            docs.forEach(function(doc){
                                                messageIds.push(doc.informationId);
                                            })
                                            dao.total({id:{"$in":messageIds},'basic.undo':false,'basic.groupId':groupId,'basic.type':'groupChat','basic.publishTime':{"$gte":new Date(exitTime)}},config.dbInformation,function(count){
                                                groupDoc.count=count;
                                                counter++;
                                                if(counter==groupDocsLength){
                                                    callback(groupDocs);
                                                }
                                            })
                                        }else{
                                            groupDoc.count=0;
                                            counter++;
                                            if(counter==groupDocsLength){
                                                callback(groupDocs);
                                            }
                                        }
                                    })
                                }else{
                                    var tempGroupDocs1=[];
                                    callback(tempGroupDocs1);
                                }

							}
							redis.close(redisClient);
							
						});
					})
                    
                    
                })
            }else{
                var tempGroupDocs=[];
                callback(tempGroupDocs);
            }
        })
    },
    userPermission:function(userId,callback){
        dao.findOne({id:userId},config.dbUser,function(doc){
            if(doc){
                callback(doc.basic.stopLogin);
            }else{
                callback(null);
            }
        })
    }
};