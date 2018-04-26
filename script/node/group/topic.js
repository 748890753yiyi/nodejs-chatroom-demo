var DB = require('../DBClient');
var config = require('../config');
var then = require('thenjs');
var uuid = require('node-uuid');
var eventproxy=require('eventproxy');
var fileService=require('./fileService');
var atService=require('./atService');
var cacheData = require('../cacheData');
var informationService=require('./informationService');
var dao=require('./groupDao');

var topic=module.exports={
	//发布话题
	add:function(req,res){
		var cookie=req.cookies;
		//var user= JSON.parse(cookie.user);
        var userId=cookie.userid;
		var topic=req.body;
		topic.id=uuid.v1();
		topic.basic.enjoyCount=0;
		topic.basic.publishTime=new Date();
		topic.basic.userId=userId;
		topic.content.isTop='0';
		topic.basic.type='topic';
		then(function(defer){
			if(topic.content.file.length>0){
				//对topic.content.file[]进行处理
				var ep = new eventproxy();
				var files=topic.content.file;
				ep.after('got_file', files.length, function (list) {
					//上传完图片以后处理消息list=[[file1],[file2],[file3]];
					var tempFiles=[];
					for(var n=0;n<list.length;n++){
						var file={};
						file.id=list[n].id;
						file.url=list[n].url;
						file.imageUrl=list[n].imageUrl;
						file.type=list[n].type;
						file.name=list[n].name;
						file.messageId=topic.id;
						file.classify=list[n].classify;
						file.createTime=list[n].createTime;
						tempFiles.push(file);
					}
					topic.content.file=tempFiles;
					defer(null,topic);
				});
				files.forEach(function(tempFile,i){
					var tempId=uuid.v1();
					tempFile.id=tempId;
					tempFile.messageId=topic.id;
					tempFile.mainId=topic.basic.groupId;
					tempFile.parentId=topic.basic.groupId;
					tempFile.userId=topic.basic.userId;	
					tempFile.createTime=new Date();
					fileService.addChatFile(tempFile,function(doc){
						ep.emit('got_file',tempFile)
					})
				})		
			}else{
				defer(null,topic);
			}
		}).then(function(defer,topic){
			informationService.add(topic,function(doc){
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
		})
		
	},
	//最新，最热话题列表（每一条具体信息中包括最新的评论时间）
	list:function(req,res){
		var type=req.param('type');
        var groupId=req.param('groupId');
        var pageSize=parseInt(req.param('pageSize'));
        var pageNo=parseInt(req.param('pageNo'));
        var query={};
        var condition={};
        if(type=='hot'){
            query={'basic.groupId':groupId,'basic.type':'topic'};
            condition={'sort':{'content.isTop':-1,'basic.enjoyCount':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize};
        }else if(type=='new'){
            query={'basic.groupId':groupId,'basic.type':'topic'};
            condition={'sort':{'content.isTop':-1,'basic.publishTime':-1},'skip':(pageNo-1)*pageSize,'limit':pageSize};
        }
		var tempCount=0;
        dao.total(query,config.dbInformation,function(count){
            dao.list(query,condition,config.dbInformation,function(docs){
				if(docs.length>0){
					docs.forEach(function(term,i){
                        cacheData.getUser(term.basic.userId,function(user){
                            term.basic.userName=user.basic.userName;
                            term.basic.head=user.basic.head;
                            dao.list({'basic.type':'topicReply','basic.topicId':term.id},{'sort':{'basic.publishTime':-1}},config.dbInformation,function(docs1){
                                tempCount++;
                                if(docs1.length>0){
                                    term.replyCount=docs1.length;
                                    term.publishTime=docs1[0].basic.publishTime;
                                }else{
                                    term.replyCount=0;
                                    term.publishTime=term.basic.publishTime;
                                }
                                if(tempCount==docs.length){
                                    var tempDoc={};
                                    tempDoc.list=docs;
                                    tempDoc.total=count;
                                    res.writeHead(200, {"Content-Type": "text/html"});
                                    var str = JSON.stringify(tempDoc);
                                    res.end(str);
                                }
                            })
                        })

					})
				}else{
					var tempDoc={};
					tempDoc.list=[];
					tempDoc.total=0;
					res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(tempDoc);
					res.end(str);
				}              
            })
        })

    },
	//话题详情
	topicInfo:function(req,res){
		var cookie=req.cookies;
		//var user= JSON.parse(cookie.user);
		var userId=cookie.userid;
		var topicId=req.param('topicId');
		dao.findOne({'id':topicId,'basic.type':'topic'},config.dbInformation,function(doc){
			if(doc){
                cacheData.getUser(doc.basic.userId,function(user){
                    doc.basic.userName=user.basic.userName;
                    doc.basic.head=user.basic.head;
                    doc.isEnjoy=false;//初始化喜欢属性
                    dao.findOne({'type':'topicEnjoy',userId:userId,'informationId':topicId},config.dbAt,function(doc1){
                        if(doc1){
                            doc.isEnjoy=true;
                        }
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(doc);
                        res.end(str);
                    })
                })

			}else{
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify({});
				res.end(str);
			}
		})
	},
	//点击喜欢话题
	enjoy:function(req,res){
		var cookie=req.cookies;
		//var user= JSON.parse(cookie.user);
        var userId=cookie.userid;
		var topicId=req.param('id');
		var information={
			userId:userId,
			informationId:topicId,
			type:'topicEnjoy',
			publishTime:new Date()
		}
		var ep =new eventproxy();
		ep.all('information','at',function(doc,doc1){
			var tempDoc={};
			if(doc&&doc1){
				tempDoc.status='success';
				tempDoc.msg='成功！';
			}else{
				tempDoc.status='failed';
				tempDoc.msg='失败！';
			}
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(tempDoc);
			res.end(str);
		});
		//修改喜欢数
		dao.update({id:topicId},{"$inc":{'basic.enjoyCount':1}},config.dbInformation,function(doc){
			ep.emit('information',doc)
		})
		//at表添加新信息
		atService.add(information,function(doc1){
			ep.emit('at',doc1);			
		})
	},
	//话题下的评论以及喜欢，转发列表
	infoList:function(req,res){
		var topicId=req.param('topicId');
		var type=req.param('type');
        var pageSize=parseInt(req.param('pageSize'));
        var pageNo=parseInt(req.param('pageNo'));
        var query={};
        var condition={};
		if(type=='reply'){
			//回复列表
			if(req.param('userId')){
				//我回复的
				var userId=req.param('userId');
				query={'basic.topicId':topicId,'basic.type':'topicReply','basic.userId':userId};
			}else{
				//所有回复的
				 query={'basic.topicId':topicId,'basic.type':'topicReply'};
			}
			condition={'sort':{'basic.publishTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize};
			dao.total(query,config.dbInformation,function(count){
				dao.list(query,condition,config.dbInformation,function(docs){

                    var counter=0;
                    if(docs.length>0){
                        docs.forEach(function(doc,i){
							//获取列表上需要显示的用户信息
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
		}else if(type=='enjoy'){
			//喜欢列表
			query={'informationId':topicId,'type':'topicEnjoy'};
			condition={'sort':{'publishTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize};
			dao.total(query,config.dbAt,function(count){
				dao.list(query,condition,config.dbAt,function(docs){
					if(docs.length>0){
						docs.forEach(function(term,i){
							//获取需要显示的用户信息
							dao.findOne({'id':term.userId},config.dbUser,function(doc){
								if(doc){
									term.head=doc.basic.head;
									term.userName=doc.basic.userName;
								}else{
									term.head='';
									term.userName='';
								}
								if(i==docs.length-1){
									var tempDoc={};
									tempDoc.list=docs;
									tempDoc.total=count;
									res.writeHead(200, {"Content-Type": "text/html"});
									var str = JSON.stringify(tempDoc);
									res.end(str);
								}
								
							});
						})
					}else{
						var tempDoc={};
						tempDoc.list=docs;
						tempDoc.total=0;
						res.writeHead(200, {"Content-Type": "text/html"});
						var str = JSON.stringify(tempDoc);
						res.end(str);
					}
					
					
				})
			})
		}else if(type=='transmit'){
			
		}
		
	},
	//评论(评论里有userName,head,replyName)
    comment:function(req,res){
        var cookie=req.cookies;
        //var user= JSON.parse(cookie.user);
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
	//删除话题评论
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
	//话题置顶
	toTop:function(req,res){
		var n=parseInt(req.param('n'));
		var groupId=req.param('groupId');
		var topicId=req.param('id');
		dao.total({'basic.groupId':groupId,'basic.type':'topic','content.isTop':'1'},config.dbInformation,function(count){
			//判断当前的置顶数
			if(count>=n){
				var tempDoc={};
				tempDoc.status='failed';
				tempDoc.msg='置顶数已最大！'
				tempDoc.topCount=count;
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(tempDoc);
				res.end(str);
			}else{
				dao.update({id:topicId},{"$set":{'content.isTop':'1'}},config.dbInformation,function(doc){
					var tempDoc={};
					if(doc){
						tempDoc.status='success';
						tempDoc.msg='操作成功！'
					}else{
						tempDoc.status='failed';
						tempDoc.msg='操作失败！'
					}
					res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(tempDoc);
					res.end(str);
				})
			}
		});
		
	},
	//取消置顶
	cancelToTop:function(req,res){
		var topicId=req.param('id');
		dao.update({id:topicId},{"$set":{'content.isTop':'0'}},config.dbInformation,function(doc){
			var tempDoc={};
			if(doc){
				tempDoc.status='success';
				tempDoc.msg='取消成功！';
			}else{
				tempDoc.status='failed';
				tempDoc.msg='取消失败！';
			}
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(tempDoc);
			res.end(str);
		})
	},
    //管理员删除话题
    delTopic:function(req,res){
        var id=req.param('id');
        var ids=[];
        dao.find({"basic.type":"topicReply","basic.topicId":id},config.dbInformation,function(docs){
            if(docs&&docs.length){
                for(var i=0;i<docs.length;i++){
                    ids.push(docs[i].id);
                }
                //删除话题的评论
                dao.deleteAt({id:{"$in":ids}},config.dbInformation,function(){
                    console.log("删除话题评论");
                })

            }
            //删除喜欢信息
            dao.deleteAt({informationId:id, type:'topicEnjoy'},config.dbAt,function(){
                console.log("删除话题喜欢");
            })
            //删除话题
            dao.delete(id,config.dbInformation,function(){
                console.log("删除话题");
            })
            var result={status:'success',msg:"删除成功"};
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        })
    }
};
	
