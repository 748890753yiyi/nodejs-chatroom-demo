var DB = require('../DBClient');
var config = require('../config');
var then = require('thenjs');
var uuid = require('node-uuid');
var eventproxy=require('eventproxy');
var groupService=require('./groupService');
var cacheData = require('../cacheData');
var informationService=require('./informationService');
var dao=require('./groupDao');

var activity=module.exports={
	//发布活动
    add:function(req,res){
        var cookie=req.cookies;
        var userId=cookie.userid;
        var activity=req.body;
        activity.id=uuid.v1();
        activity.basic.publishTime=new Date();
        activity.basic.userId=userId;
        activity.basic.type='activity';
        activity.content.memberCount=0;
		activity.content.startTime=new Date(activity.content.startTime);
		activity.content.endTime=new Date(activity.content.endTime);
        informationService.add(activity,function(doc){
            var tempDoc=doc;
            if(doc.status=='success'){
                tempDoc.msg="添加成功！"
            }else{
                tempDoc.msg="添加失败！"
            }
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        })
    },
    //活动具体信息
    activityInfo:function(req,res){
        var activityId=req.param('id');
		var ep = new eventproxy();	
		ep.all('activity','member',function(activity,users){
			var tempDoc={};
            if(activity){
                cacheData.getUser(activity.basic.userId,function(user){
                    activity.basic.userName=user.basic.userName;
                    activity.basic.head=user.basic.head;
                    tempDoc=activity;
                    tempDoc.member=users;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                })

            }

		});
        dao.get({id:activityId},{},config.dbInformation,function(activity){
            ep.emit('activity',activity);
        })
		dao.list({informationId:activityId,type:'activity'},{},config.dbAt,function(docs){
			var ids=[];
			if(docs.length>0){
				docs.forEach(function(doc){
					ids.push(doc.userId);
				})
			}
			dao.list({id:{"$in":ids}},{_id:0,id:1,basic:1},config.dbUser,function(users){
				ep.emit('member',users);
			})
		})
    },
    //初始化列表
    initList:function(req,res){
        var type=req.param('type');
        var groupId=req.param('groupId');
        var number=req.param('number');
        var query={};
        var condition={};
        if(type=='hot'){
            query={'basic.groupId':groupId,'basic.type':'activity'};
            condition={'sort':{'content.memberCount':-1},'limit':number};
        }else if(type=='new'){
            query={'basic.groupId':groupId,'basic.type':'activity'};
            condition={'sort':{'basic.publishTime':-1},'limit':number};
        }else if(type=='end'){
            query={'basic.groupId':groupId,'basic.type':'activity','content.endTime':{'$lt':new Date()}};
            condition={'sort':{'content.endTime':-1},'limit':number};
        }
        dao.list(query,condition,config.dbInformation,function(docs){
            var counter=0;
			if(docs.length>0){
                docs.forEach(function(doc,i){
                    var tempUserId=doc.basic.userId;
                    cacheData.getUser(tempUserId,function(user){
                        counter++;
                        doc.basic.userName=user.basic.userName;
                        doc.basic.head=user.basic.head;
                       if(counter==docs.length){
                           res.writeHead(200, {"Content-Type": "text/html"});
                           var str = JSON.stringify(docs);
                           res.end(str);
                       }
                    })
                })
            }else{
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(docs);
                res.end(str);
            }

        })

    },
    //点击更多时的活动列表
    moreList:function(req,res){
        var type=req.param('type');
        var groupId=req.param('groupId');
        var pageSize=parseInt(req.param('pageSize'));
        if(req.param('pageNo')){
            var pageNo=parseInt(req.param('pageNo'));
        }
        var query={};
        var condition={};
        if(type=='hot'){
            query={'basic.groupId':groupId,'basic.type':'activity'};
            condition={'sort':{'content.memberCount':-1},'skip':(pageNo-1)*pageSize,'limit':pageSize};
        }else if(type=='new'){
            query={'basic.groupId':groupId,'basic.type':'activity'};
            condition={'sort':{'basic.publishTime':-1},'skip':(pageNo-1)*pageSize,'limit':pageSize};
        }else if(type=='end'){
            query={'basic.groupId':groupId,'basic.type':'activity','content.endTime':{'$lt':new Date()}};
            condition={'sort':{'content.endTime':-1},'skip':(pageNo-1)*pageSize,'limit':pageSize};
        }else if(type=='will'){
            query={'basic.groupId':groupId,'basic.type':'activity','content.startTime':{'$gt':new Date()}};
            condition={'sort':{"content.startTime":1},'limit':pageSize}
        }
        dao.total(query,config.dbInformation,function(count){
            dao.list(query,condition,config.dbInformation,function(docs){
                var counter=0;
                if(docs.length>0){
                    docs.forEach(function(doc,i){
                        var tempUserId=doc.basic.userId;
                        cacheData.getUser(tempUserId,function(user){
                            counter++;
                            doc.basic.userName=user.basic.userName;
                            doc.basic.head=user.basic.head;
                            if(counter==docs.length){
                                var tempDoc={};
                                tempDoc.list=docs;
                                tempDoc.total=count;
                                res.writeHead(200, {"Content-Type": "text/html"});
                                var str = JSON.stringify(tempDoc);
                                res.end(str);
                            }
                        })
                    })
                }else{
                    var tempDoc={};
                    tempDoc.list=docs;
                    tempDoc.total=count;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                }


            })
        })

    },
    //活动报名
    registration:function(req,res){
        var activityId=req.param('id');
        var cookie=req.cookies;
        var userId=cookie.userid;
        var ep=new eventproxy();
        ep.all('information','at',function(doc,doc1){
            var tempDoc={};
            if(doc&&doc1){
                tempDoc.status='success';
                tempDoc.mag="报名成功！";
            }else{
                tempDoc.status='failed';
                tempDoc.mag="报名失败！"
            }
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        });
        dao.update({id:activityId},{'$inc':{'content.memberCount':1}},config.dbInformation,function(doc){
            ep.emit('information',doc);
        });
        dao.insert({informationId:activityId,type:'activity',userId:userId},config.dbAt,function(doc1){
            ep.emit('at',doc1);
        })
    },
    
	//最近几天的活动（包括三天,七天）
	recentDayList:function(req,res){
		var groupId=req.param('id');
		var pageNo=parseInt(req.param('pageNo'));
		var pageSize=parseInt(req.param('pageSize'));
		var n=parseInt(req.param('n'));//几天
		var startDate=new Date();
		var endDate=new Date(Date.parse(new Date().toString()) + 86400000*n);
		var query={'basic.groupId':groupId,'basic.type':'activity',"$and":[{"content.startTime":{"$gte":startDate}},{"content.startTime":{"$lte":endDate}}]}
		var condition={'sort':{'basic.publishTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize};
		dao.total(query,config.dbInformation,function(count){
            dao.list(query,condition,config.dbInformation,function(docs){
                var counter=0;
                if(docs.length>0){
                    docs.forEach(function(doc,i){
                        var tempUserId=doc.basic.userId;
                        cacheData.getUser(tempUserId,function(user){
                            counter++;
                            doc.basic.userName=user.basic.userName;
                            doc.basic.head=user.basic.head;
                            if(counter==docs.length){
                                var tempDoc={};
                                tempDoc.list=docs;
                                tempDoc.total=count;
                                res.writeHead(200, {"Content-Type": "text/html"});
                                var str = JSON.stringify(tempDoc);
                                res.end(str);
                            }
                        })
                    })
                }else{
                    var tempDoc={};
                    tempDoc.list=docs;
                    tempDoc.total=count;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                }
            })
        })
	},
	//周末活动列表
	weekendList:function(req,res){
		var groupId=req.param('id');
		var pageNo=parseInt(req.param('pageNo'));
		var pageSize=parseInt(req.param('pageSize'));
		var query={'basic.groupId':groupId,'basic.type':'activity',"$or":[{"content.dayOfWeek":0},{"content.dayOfWeek":6}]};
		var condition={'sort':{'basic.publishTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize};
		dao.total(query,config.dbInformation,function(count){
            dao.list(query,condition,config.dbInformation,function(docs){
                var counter=0;
                if(docs.length>0){
                    docs.forEach(function(doc,i){
                        var tempUserId=doc.basic.userId;
                        cacheData.getUser(tempUserId,function(user){
                            counter++;
                            doc.basic.userName=user.basic.userName;
                            doc.basic.head=user.basic.head;
                            if(counter==docs.length){
                                var tempDoc={};
                                tempDoc.list=docs;
                                tempDoc.total=count;
                                res.writeHead(200, {"Content-Type": "text/html"});
                                var str = JSON.stringify(tempDoc);
                                res.end(str);
                            }
                        })
                    })
                }else{
                    var tempDoc={};
                    tempDoc.list=docs;
                    tempDoc.total=count;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                }
            })
        })
	},
	//时间段查询活动列表
	selectDayList:function(req,res){
		var groupId=req.param('id');
		var pageNo=parseInt(req.param('pageNo'));
		var pageSize=parseInt(req.param('pageSize'));
		var query={};
		var condition={'sort':{'basic.publishTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize};
		if(req.param('startTime')&&req.param('endTime')){
			query={'basic.groupId':groupId,'basic.type':'activity',"$and":[{"content.startTime":{"$gte":new Date(req.param('startTime'))}},
					{"content.startTime":{"$lte":new Date(req.param('endTime'))}}]};
			
		}else if(req.param('startTime')&&!req.param('endTime')){
			query={'basic.groupId':groupId,'basic.type':'activity',"content.startTime":{"$gte":new Date(req.param('startTime'))}};
		}else if(!req.param('startTime')&&req.param('endTime')){
			query={'basic.groupId':groupId,'basic.type':'activity',"content.startTime":{"$lte":new Date(req.param('endTime'))}};
		}else if(!req.param('startTime')&&!req.param('endTime')){
			query={'basic.groupId':groupId,'basic.type':'activity'};
		}
		dao.total(query,config.dbInformation,function(count){
            dao.list(query,condition,config.dbInformation,function(docs){
                var counter=0;
                if(docs.length>0){
                    docs.forEach(function(doc,i){
                        var tempUserId=doc.basic.userId;
                        cacheData.getUser(tempUserId,function(user){
                            counter++;
                            doc.basic.userName=user.basic.userName;
                            doc.basic.head=user.basic.head;
                            if(counter==docs.length){
                                var tempDoc={};
                                tempDoc.list=docs;
                                tempDoc.total=count;
                                res.writeHead(200, {"Content-Type": "text/html"});
                                var str = JSON.stringify(tempDoc);
                                res.end(str);
                            }
                        })
                    })
                }else{
                    var tempDoc={};
                    tempDoc.list=docs;
                    tempDoc.total=count;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                }
            })
        })
	},
	//评论(评论里有userName,head,replyName)
    comment:function(req,res){
        var cookie=req.cookies;
        var userId=cookie.userid;
        var comment=req.body;
		comment.id=uuid.v1();
		comment.basic.userId=userId;
		comment.basic.publishTime=new Date();
		informationService.add(comment,function(doc){
            var tempDoc={};
            if(doc.status=='success'){
                tempDoc.status='success';
				tempDoc.msg='添加成功！'
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(tempDoc);
				res.end(str);
				
            }else{
                tempDoc.status='failed';
				tempDoc.msg='添加失败！'
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(tempDoc);
				res.end(str);
            }
        })
        
    },
	//活动详情里边的评论列表
	commentList:function(req,res){
		var activityId=req.param('activityId');
		var pageNo=parseInt(req.param('pageNo'));
		var pageSize=parseInt(req.param('pageSize'));
		var query={'basic.activityId':activityId,'basic.type':'activityReply'};
		var condition={'sort':{'basic.publishTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize};
		dao.total(query,config.dbInformation,function(count){
            dao.list(query,condition,config.dbInformation,function(docs){
                var counter=0;
                if(docs.length>0){
                    docs.forEach(function(doc,i){
                        var tempUserId=doc.basic.userId;
						var tempReplyId=doc.basic.replyId;
						if(tempReplyId){
							cacheData.getUser(tempReplyId,function(user1){                           
								doc.basic.replyName=user1.basic.userName;
								cacheData.getUser(tempUserId,function(user){
									counter++;
									doc.basic.userName=user.basic.userName;
									doc.basic.head=user.basic.head;
									if(counter==docs.length){
										var tempDoc={};
										tempDoc.list=docs;
										tempDoc.total=count;
										res.writeHead(200, {"Content-Type": "text/html"});
										var str = JSON.stringify(tempDoc);
										res.end(str);
									}
								})
							})
						}else{
							cacheData.getUser(tempUserId,function(user){
								counter++;
								doc.basic.userName=user.basic.userName;
								doc.basic.head=user.basic.head;
								if(counter==docs.length){
									var tempDoc={};
									tempDoc.list=docs;
									tempDoc.total=count;
									res.writeHead(200, {"Content-Type": "text/html"});
									var str = JSON.stringify(tempDoc);
									res.end(str);
								}
							})
						}
                        
                    })
                }else{
                    var tempDoc={};
                    tempDoc.list=docs;
                    tempDoc.total=count;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                }
            })
        })
	},
	//删除活动评论
	delComment:function(req,res){
		var commentId=req.param('id');
		dao.delete(commentId,config.dbInformation,function(doc){
			var tempDoc={};
			if(doc){
				tempDoc.status='success';
				tempDoc.msg='删除成功！'
			}else{
				tempDoc.status='failed';
				tempDoc.msg='删除失败！'
			}
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(tempDoc);
			res.end(str);
		})
	},
	//热门活动组织者
	hotOrganizer:function(req,res){
		var groupId=req.param('id');//id为组的id
		var n=req.param('n');
		groupService.memberList(groupId,['1','2','3'],function(docs){
			if(docs.length>0){
				then(function(defer){
					docs.forEach(function(term,i){
						dao.total({'basic.userId':term.id,'basic.type':'activity'},config.dbInformation,function(count){
							term.count=count;
							delete term.groupInformation;
							if(i==docs.length-1){
								defer(null);
							}
						})
					});
				}).then(function(defer){
					for(var i=0;i<docs.length;i++){
						for(var j=i;j<docs.length;j++){
							if(docs[i].count<docs[j].count){
								var temp=docs[i];
								docs[i]=docs[j];
								docs[j]=temp;
							}
						}
					}
					docs=docs.slice(0,n);
					res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(docs);
					res.end(str);					
				})				
			}else{
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify([]);
				res.end(str);		
			}
			
		})
		
	},
    //管理员删除活动
    delActivity:function(req,res){
        var id=req.param('id');
        var ids=[];
        dao.find({"basic.type":"activityReply","basic.activityId":id},config.dbInformation,function(docs){
            if(docs&&docs.length){
                for(var i=0;i<docs.length;i++){
                    ids.push(docs[i].id);
                }
                //删除活动评论
                dao.deleteAt({id:{"$in":ids}},config.dbInformation,function(){
                    console.log("删除活动评论");
                })

            }
            //删除活动at
            dao.deleteAt({informationId:id, type:'activity'},config.dbAt,function(){
                console.log("删除活动at");
            })
            //删除活动
            dao.delete(id,config.dbInformation,function(){
                console.log("删除活动");
            })
            var result={status:'success',msg:"删除成功"};
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        })
    }
}