var config = require('../config');
var DB = require('../DBClient');
var cacheData = require('../cacheData');
var then = require('thenjs');
var redis = require('../redisClient');
var thrift = require('../thriftClient');
var groupService=require('./groupService');
var chatService=require('./chatService');
var fileService1=require('./fileService');
var fileService=require('../file/fileService');
var fileDao=require('../file/fileDao');
var informationService=require('./informationService');
var atService=require('./atService');
var eventproxy=require('eventproxy');
var uuid = require('node-uuid');
var FileStorage = require('../file/gen-nodejs/FileManager.js');
var fileTypes = require('../file/gen-nodejs/FileManager_types');
var util = require('../util');
var fileSystem=require('fs');
var http=require('http');

var socket1 = null;
var socket2=null;
var users=[];

var Chat = function (server) {
    var io = require('socket.io').listen(server);
    var redisSocket = require('socket.io-redis');
    io.adapter(redisSocket({ host: config.redisSocketIP, port: config.redisSocketPort }));
	
	io.of('/groupConnect').on('connection',function(socket){
		socket.emit('welcome');
        
        socket.on('error',function(err){
            console.error('socket groupConnect error: '+err);
        });
		socket.on('init',function(data){
            var groupId = data.groupId;
            var userId=data.userId;
            socket.groupId=groupId;
            socket.userId=userId;
			
            socket.join(groupId,function(){
				socket.emit('updateOnlineUsers',userId);
				socket1 = socket;
			});
        });
		//发送消息
        socket.on ('distributeMessage',function(message) {
            //接收到的message信息格式
			
            message.id = uuid.v1();
            message.basic.publishTime=new Date();
            message.basic.undo=false;
            return sendMessage(io,socket,message);
        });
        // 刷新成员组列表
        socket.on('refreshGroup', function (data) {
            io.of("/loginConnect").emit('groupRefresh'+data.userId);
        });
		//请求撤销
        socket.on('askForUndo',function(messageId) {
            return  undo(io,socket,messageId);
        });
		
		//发表投票
		socket.on('distributeVote',function(vote) {
            return  doVote(io,socket,vote);
        });

		//发布活动
        socket.on('distributeActivity',function(activity) {
            return  doActivity(io,socket,activity);
        });

		//发表话题
        socket.on('distributeTopic',function(topic) {
            return  doTopic(io,socket,topic);
        });
		
		socket.on('distributeAnnouncement',function(announcement) {
            return  doAnnouncement(io,socket,announcement);
        });
		 //发布群组邀请
        socket.on('distributeGInvite', function (groupList) {
            return  groupInvite(io,socket,groupList);
        });
		
		//组成员改变
		socket.on('memberChange',function() {
			var groupId=socket.groupId;
			socket.emit('updateOnlineUsers',groupId);
            socket.broadcast.to(groupId).emit('updateOnlineUsers',groupId);
        });
		//组成员角色
		socket.on('roleChange',function(data) {
			var groupId=socket.groupId;
            socket.broadcast.to(groupId).emit('changeRole'+data.userId,data.role);
        });
		//组成员禁言
		socket.on('speakChange',function(data) {
			var groupId=socket.groupId;
            socket.broadcast.to(groupId).emit('changeSpeak'+data.userId,data.isSpeak);
        });
		//发送语音消息
        socket.on ('distributeAudioMessage',function(message) {
            //接收到的message信息格式
            message.id = uuid.v1();
            message.basic.publishTime=new Date();
            message.basic.undo=false;
            return sendAudioMessage(io,socket,message);
        });
        //断开组
        socket.on("exitGroup",function(tempGroupId){
            var userId=socket.userId;
            var groupId=socket.groupId;
		   socket.leave(tempGroupId,function(){
			   disconnected(groupId,userId);
				socket1 = null;
		   }); 
			
            
        });
		socket.on('disconnect',function(){
            var userId=socket.userId;
            var groupId=socket.groupId;
            disconnected(groupId,userId);
                socket.leaveAll();
				socket1 = null;
        });
	})
    //用户连接
    io.of('/loginConnect').on('connection',function(socket){
        socket.emit('login');
        //隐身或者在线
        socket.on("invisible",function(data){
            var tempUserId=data.userId;
            var type=data.state.type;
            cacheData.getUpdateUser(tempUserId,type,function(){
                var doc={userId:tempUserId,state:data.state};
                socket.emit('updateUserState',doc);
                io.of('/groupConnect').emit('updateOnlineUsers',doc);
            })
        })

        //在线
        socket.on('newUser',function(data){
            var tempUserId=data.userId;
			var flag=false;
            var user={userId:tempUserId,count:1,time:new Date()};
            for(var i=0;i<users.length;i++){
                    if(users[i].userId==tempUserId){
						flag=true;
                        users[i].count+=1;
                        break;
                    }
                }
			if(!flag){
				users.push(user);
			}
            if(socket.tempUserId){
                socket.tempUserId=tempUserId;
            }
            socket.tempUserId=tempUserId;
			socket.join('login');
            cacheData.getUpdateUser(tempUserId,'login',function(){
                socket2=socket;
				socket.emit('updateOnlineUsers',tempUserId);
                io.of('/groupConnect').emit('updateOnlineUsers',tempUserId);
            })

        });
        // 个人修改信息后通知组
        socket.on('userUpdate',function(data){
            io.of('/groupConnect').emit('receiveUpdateUser',data);
        });
        socket.on('error',function(err){
            console.error("socket error: "+err);
        });
		
        socket.on('disconnect',function(){
            var tempUserId=socket.tempUserId;
            for(var i=0;i<users.length;i++){
                    if(users[i].userId==tempUserId){
                        users[i].count-=1;
                        if(!users[i].count){
                            users.splice(i,1);
                            cacheData.getUpdateUser(tempUserId,"logout",function(){
                                io.of('/groupConnect').emit('updateOnlineUsers',tempUserId);
								socket.leave('login');
                            })
                        }
                    }
                }
        });
    });
	// 私聊
	io.of('/privateConnection').on('connection',function(socket){
        socket.emit('welcomeP2P');
        socket.on('p2pSendMessage',function(data){
            var fromId=data.fromId;//发起私聊的用户即登录的用户id
            var toId=data.toId;//发起者外的另一用户id
            data.id = uuid.v1();
            data.basic.publishTime=new Date();
            data.basic.undo=false;
            data.basic.state=false;
			return p2pSendMessage(io, socket, data);
        })
        socket.on('p2pUpdateMessage',function(message){
             updateInformation(message);
        })
        socket.on('disconnect',function() {

        })
    });
    // 临时聊天
    io.of('/tradeConnect').on('connection',function(socket){
        socket.emit('welcomeTrade');//服务器发送验证消息
        socket.on('error',function(err){
            console.error('trade connect error: '+err);
        });
        socket.on('tradeSendMessage',function(data){
            data.id = uuid.v1();
            data.basic.publishTime=new Date();
            data.basic.undo=false;
            data.basic.state=false;
            return tradeSendMessage(io, socket, data);
        });
        socket.on('tradeUpdateMessage',function(message){
            updateInformation(message);
        });
        socket.on('disconnect',function() {
            console.log("close");
        })

    })
	
};

tradeSendMessage=function(io,socket,message){
    var keyIdStr = message.keyId;
    delete message.keyId;
    util.checkSensitiveWord(message.content.text, function(data){
        message.content.text = data;
        insertInformation(message);
        var message1=JSON.parse(JSON.stringify(message));
        //消息内文件的处理
        if(message.content.file.length>0){
            //对message.content.file[]进行处理
            var ep = new eventproxy();
            var files=message.content.file;
            ep.all('fs', function (docs) {
                //console.log('files全部执行完');
                if(docs.length>0){
                    var tempFiles=[];
                    for(var n=0;n<docs.length;n++){
                        //console.log('重新组装文件');
                        var file={};
                        file.id=docs[n].id;
                        file.url=docs[n].url;
                        file.size=docs[n].size;
                        file.imageUrl=docs[n].imageUrl;
                        file.type=docs[n].type;
                        file.classify=docs[n].classify;
                        file.format=docs[n].format;
                        file.name=docs[n].name;
                        file.messageId=message.id;
                        tempFiles.push(file);
                    }
                    message.content.file=tempFiles;

                }
                message1.keyId = keyIdStr;  //返回keyId
                socket.emit('to'+message1.basic.userId,message1);
                socket.broadcast.emit('to'+message1.basic.toId,message1);

            });


            var messageId=message.id;
            var userId=message.basic.userId;
            //处理聊天框文件存储
            var tempFiles=[];
            var len=files.length;
            var count=0
            files.forEach(function (file, i) {
                var tempTime=new Date();
                file.id=uuid.v1();
                file.mainId=userId;
                file.parentId=userId;
                file.toId=message.basic.toId;
                file.createTime=tempTime;
                file.updateTime=tempTime;
                file.createUserId=userId;
                file.updateUserId=userId;
                file.createUserName="";
                file.updateUserName="";

                //数据库存储文件
                fileService1.addChatFile(file,function(){
                    count++;
                    if(count==len){
                        fileDao.list({messageId:messageId,userId:userId},{},config.dbFile,function(docs){
                            ep.emit('fs',docs);
                        })

                    }
                })

            });
        }else{
            message1.keyId = keyIdStr;  //返回keyId
            socket.emit('to'+message1.basic.userId,message1);
            socket.broadcast.emit('to'+message1.basic.toId,message1);
        }
    })
};

exports.receiveUpdateUser =function(user){
    if(socket1!=null){
        socket1.emit('receiveUpdateUser',user);
        socket1.broadcast.to(socket1.groupId).emit('receiveUpdateUser',user);
    }
};


exports.start = function(server){
    var chat=Chat(server);
};



groupInvite= function (io,socket,groupList) {
    groupService.findOne({id:groupList.id}, function (doc) {
       groupList.groupList.forEach(function (file) {
           var information={
               id:uuid.v1(),
			   basic:{}
           };
		   
		   information.basic.userId=groupList.userId;
           information.basic.groupHead=doc.basic.head;
           information.basic.groupName=doc.basic.name;
           information.basic.type='groupCard';
		   information.basic.wasGroup=groupList.id;
           information.basic.groupId=file.id;
           information.basic.publishTime=new Date();
           informationService.add(information, function () {
			   cacheData.add(information);
			   redis.newRedis(function(err,redisClient) {
					redisClient.hget('user', information.basic.userId, function (error, res) {
						if (error) {
                            redis.close(redisClient);
							console.error(error);
							return error;
						}
						if (res) {
							var tempJson = JSON.parse(res);
							information.basic.head = tempJson.basic.head;
							information.basic.userName = tempJson.basic.userName;
						}
						findFirstMsg(io,socket,information);
                        socket.broadcast.to(file.id).emit('receiveMessage',information);

						redis.close(redisClient);
					});
				});
           })
       })
    });
};

sendAudioMessage=function(io,socket,message){
    var keyIdStr = message.keyId;
    delete message.keyId;

    //数据库处理音频文件
	var temp_name=message.basic.userId+(new Date().getTime());
    var url='/server/'+message.basic.groupId+'/'+temp_name;
    var tempSize=message.content.buf.size;
	var timeSize=message.content.buf.timeSize;

    var base64 = message.content.buf.binaryStr.replace(/^data:audio\/wav;base64,|^data:audio\/ogg;base64,|^data:audio\/webm;base64,/, ''),
        buf = new Buffer(base64, 'base64');

    var writeStream1 = fileSystem.createWriteStream(config.originalFileSavePath+message.basic.groupId+'/'+temp_name);
    writeStream1.write(buf);
    writeStream1.end();
    delete message.content.buf;

    //消息中文件的处理
    var tempFiles=[];
    var file={};
    file.url=url;
    file.size=tempSize;
    file.type="audio";
    file.classify="sound";
    file.format="wav";
    file.name=temp_name;
    file.messageId=message.id;
    file.timeSize=timeSize;
    tempFiles.push(file);
    message.content.file=tempFiles;
    var message1=JSON.parse(JSON.stringify(message));

    //数据库和redis操作message
    chatService.add(message,function(doc){
        fileDao.update({"id":message.basic.userId,"groupInformation.id":message.basic.groupId},
            {"$set":{"groupInformation.$.roleExtend.lastSpeakTime":message.basic.publishTime},
                "$inc":{"groupInformation.$.roleExtend.speakNumber":1}},config.dbUser,function(){
            })
        cacheData.add(message);
        redis.newRedis(function(err,redisClient) {
            redisClient.hget('user', message1.basic.userId, function (error, res) {
                if (error) {
                    redis.close(redisClient);
                    console.error('redis 获取用户信息: '+error);
                    return error;
                }
                if (res) {
                    var tempJson = JSON.parse(res);
                    message1.basic.head = tempJson.basic.head;
                    message1.basic.userName = tempJson.basic.userName;
                }
                message1.keyId = keyIdStr;  //返回keyId
                findFirstMsg(io,socket,message1);
                setTimeout(function(){
                    socket.emit('receiveMessage',message1);
                    socket.broadcast.to(socket.groupId).emit('receiveMessage',message1);
                    redis.close(redisClient);
                },1000)

            });
        });
    })
};

doVote=function(io,socket,vote){
    vote.content.votes=[];
    vote.select.forEach(function(item,i){
        var voteObject={};
        voteObject.text=item.text;
        voteObject.voteCount=0;
        voteObject.voteUsers=[];
        vote.content.votes.push(voteObject);
    })
    delete vote.select;
    vote.id=uuid.v1();
    vote.basic.publishTime=new Date();
	vote.basic.userId=socket.userId;
    vote.content.endTime=new Date(new Date(vote.content.endTime).getTime()+86400000);
    vote.basic.type='vote';
    vote.basic.count=0;
    informationService.add(vote,function(doc){
        if(doc.status=='success'){
            cacheData.add(vote);
            var tempUserId=vote.basic.userId;
			//获取发布人头像和userName
            cacheData.getUser(tempUserId,function(user){
                vote.basic.userName=user.basic.userName;
                vote.basic.head=user.basic.head;
                findFirstMsg(io,socket,vote);
                socket.emit('receiveMessage',vote);
                socket.broadcast.to(socket.groupId).emit('receiveMessage',vote);
            })

        }else{
            socket.emit('receiveMessagefailed',{msg:'失败'});
        }
    })
}

doAnnouncement=function(io,socket,announcement){
    announcement.id=uuid.v1();
    announcement.basic.publishTime=new Date();
    announcement.basic.userId=socket.userId;
    announcement.basic.type='announcement';
    informationService.add(announcement,function(doc){
        if(doc.status=='success'){
            cacheData.add(announcement);
            var tempUserId=announcement.basic.userId;
			//获取发布人头像和userName
            cacheData.getUser(tempUserId,function(user){
                announcement.basic.userName=user.basic.userName;
                announcement.basic.head=user.basic.head;
                findFirstMsg(io,socket,announcement);
                socket.emit('receiveMessage',announcement);
                socket.broadcast.to(socket.groupId).emit('receiveMessage',announcement);
            })
        }else{
            socket.emit('receiveAnnouncementfailed',{msg:'失败'});
        }
    })
}

doActivity=function(io,socket,activity){
    activity.id=uuid.v1();
    activity.basic.publishTime=new Date();
    activity.basic.userId=socket.userId;
    activity.basic.type='activity';
    activity.content.memberCount=0;
    activity.content.startTime=new Date(activity.content.startTime);
    activity.content.endTime=new Date(activity.content.endTime);

    informationService.add(activity,function(doc){
        if(doc.status=='success'){
            cacheData.add(activity);
			//获取发布人头像和userName
            var tempUserId=activity.basic.userId;
            cacheData.getUser(tempUserId,function(user){
                activity.basic.userName=user.basic.userName;
                activity.basic.head=user.basic.head;
                findFirstMsg(io,socket,activity);
                socket.emit('receiveMessage',activity);
                socket.broadcast.to(socket.groupId).emit('receiveMessage',activity);
            })

        }else{
            socket.emit('receiveActivityfailed',{msg:'失败'});
        }
    })

}


doTopic=function(io,socket,topic){
    topic.id=uuid.v1();
    topic.basic.enjoyCount=0;
    topic.basic.publishTime=new Date();
    topic.basic.userId=socket.userId;
    topic.content.isTop='0';
    topic.basic.type='topic';
    then(function(defer){
        if(topic.content.file.length>0){
            //对topic.content.file[]进行处理
            var ep = new eventproxy();
            var files=topic.content.file;
            ep.after('got_file', files.length, function (list) {
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
					file.updateTime=list[n].updateTime;
                    tempFiles.push(file);
                }
                topic.content.file=tempFiles;
                defer(null,topic);
            });
            files.forEach(function(tempFile,i){
				var now=new Date();
                var tempId=uuid.v1();
                tempFile.id=tempId;
                tempFile.messageId=topic.id;
                tempFile.mainId=topic.basic.groupId;
                tempFile.parentId=topic.basic.groupId;
                tempFile.userId=topic.basic.userId;
                tempFile.createTime=now;
				tempFile.updateTime=now;
                tempFile.downloadCount=0;
                fileService1.addChatFile(tempFile,function(doc){
                    ep.emit('got_file',tempFile)
                })
            })
        }else{
            defer(null,topic);
        }
    }).then(function(defer,topic){
        informationService.add(topic,function(doc){
            if(doc.status=='success'){
                cacheData.add(topic);
                var tempUserId=topic.basic.userId;
				//获取发布人头像和userName
                cacheData.getUser(tempUserId,function(user){
                    topic.basic.userName=user.basic.userName;
                    topic.basic.head=user.basic.head;
                    findFirstMsg(io,socket,topic);
                    socket.emit('receiveMessage',topic);
                    socket.broadcast.to(socket.groupId).emit('receiveMessage',topic);
                })

            }else{
                socket.emit('receiveTopicfailed',{msg:'失败'});
            }
        })
    })
}
	
	

undo =function(io,socket,messageId){
    var thenObj=cacheData.interval(socket.groupId,1,30);
    thenObj.then(function (defer,msgs) {
		var flag=false;
		msgs.forEach(function(msg,i){
			if(msg.basic.userId==socket.userId){
                if(msg.id==messageId){
					flag=true;
                    msg.basic.undo=true;
                    redis.newRedis(function(err,redisClient) {
                        var msgJson = JSON.stringify(msg);
                        redisClient.lset('groupChat_' + socket.groupId, i, msgJson, function (error, res) {
							redis.close(redisClient);
                        });
                    });
					informationService.updateUndo(msg.id,true,function(doc){
					});
					fileService.abandonMessageFiles(msg.id,function(msg){
					});
					
					//删除聊天消息中的at用户信息
					atService.del(messageId,function(doc){
					})
                    socket.emit('undo',msg);
                    socket.broadcast.to(socket.groupId).emit('undo',msg);
                    io.of("/loginConnect").emit('undo',{groupId:socket.groupId,messageId:messageId});
                }
            }
		})
		if(!flag){
			socket.emit('undoFail',msg.id);
		}
    });
};


p2pSendMessage=function(io,socket,message){
    var keyIdStr = message.keyId;
    delete message.keyId;
	util.checkSensitiveWord(message.content.text, function(data){
		message.content.text = data;
        insertInformation(message);
		var message1=JSON.parse(JSON.stringify(message));
		//消息内文件的处理
		if(message.content.file.length>0){
			//对message.content.file[]进行处理
			var ep = new eventproxy();
			var files=message.content.file;
			ep.all('fs', function (docs) {
				//console.log('files全部执行完');
				if(docs.length>0){
					var tempFiles=[];
					for(var n=0;n<docs.length;n++){
						//console.log('重新组装文件');
						var file={};
						file.id=docs[n].id;
						file.url=docs[n].url;
						file.size=docs[n].size;
						file.imageUrl=docs[n].imageUrl;
						file.type=docs[n].type;
						file.classify=docs[n].classify;
						file.format=docs[n].format;
						file.name=docs[n].name;
						file.messageId=message.id;
						tempFiles.push(file);
					}
					message.content.file=tempFiles;

				}
				redis.newRedis(function(err,redisClient) {
					redisClient.hget('user', message1.basic.userId, function (error, res) {
						if (error) {
                            redis.close(redisClient);
							console.error(error);
							return error;
						}
						if (res) {
							var tempJson = JSON.parse(res);
							message1.basic.head = tempJson.basic.head;
							message1.basic.userName = tempJson.basic.userName;
						}
                        message1.keyId = keyIdStr;  //返回keyId
						socket.emit('to'+message1.basic.userId,message1);
						socket.broadcast.emit('to'+message1.basic.toId,message1);
						io.of("/loginConnect").emit('messageRemind'+message1.basic.toId,message1);

						redis.close(redisClient);
					});
				});

			});


			var messageId=message.id;
			var userId=message.basic.userId;
			//处理聊天框文件存储
			var tempFiles=[];
			var len=files.length;
			var count=0
			cacheData.getUser(userId,function(tempDoc){
				files.forEach(function (file, i) {
					var tempTime=new Date();
					file.id=uuid.v1();			
					file.mainId=userId;
					file.parentId=userId;
					file.toId=message.basic.toId;
					file.createTime=tempTime;
					file.updateTime=tempTime;
					file.createUserId=userId;
					file.updateUserId=userId;
					file.createUserName="";
					file.updateUserName="";
					if(tempDoc){
						file.createUserName=tempDoc.basic.userName;
						file.updateUserName=tempDoc.basic.userName;
					}
					
					//数据库存储文件
					fileService1.addChatFile(file,function(){
						count++;
						if(count==len){
							fileDao.list({messageId:messageId,userId:userId},{},config.dbFile,function(docs){
								ep.emit('fs',docs);
							})
							
						}
					})
					
				});
				
			})
		}else{
			redis.newRedis(function(err,redisClient) {
				redisClient.hget('user', message1.basic.userId, function (error, res) {
					if (error) {
                        redis.close(redisClient);
						console.error(error);
						return error;
					}
					if (res) {
						var tempJson = JSON.parse(res);
						message1.basic.head = tempJson.basic.head;
						message1.basic.userName = tempJson.basic.userName;
					}
                    message1.keyId = keyIdStr;  //返回keyId
					socket.emit('to'+message1.basic.userId,message1);
					socket.broadcast.emit('to'+message1.basic.toId,message1);
					io.of("/loginConnect").emit('messageRemind'+message1.basic.toId,message1);
					redis.close(redisClient);
				});
				
			});
		}
	})
}


sendMessage=function(io,socket,message){
    var keyIdStr = message.keyId;
    delete message.keyId;
	util.checkSensitiveWord(message.content.text, function(data){
		message.content.text = data;
		var message1=JSON.parse(JSON.stringify(message));
		var tempAtMembers=message.atMembers;
		if(message.atMembers.length>0){
			message.atMembers.forEach(function(term,i){
				term.informationId=message.id;
				term.informationType='groupAt';
				term.groupId=socket.groupId;
				term.replyId=socket.userId;
				term.publishTime=new Date();
				atService.add(term,function(doc){
				});
				
			})
		}
		
		//消息内文件的处理
		if(message.content.file.length>0){
			//对message.content.file[]进行处理
			var ep = new eventproxy();
			var files=message.content.file;
			ep.all('fs', function (docs) {
				if(docs.length>0){
					var tempFiles=[];
					for(var n=0;n<docs.length;n++){
						var file={};
						file.id=docs[n].id;
						file.url=docs[n].url;
						file.size=docs[n].size;
						file.imageUrl=docs[n].imageUrl;
						file.type=docs[n].type;
						file.classify=docs[n].classify;
						file.format=docs[n].format;
						file.name=docs[n].name;
						file.messageId=message.id;
						tempFiles.push(file);
					}
					message.content.file=tempFiles;
					//上传信息
					delete message.atMembers;

				}else{
					delete message.atMembers;
				}
				chatService.add(message,function(doc){
                    fileDao.update({"id":message.basic.userId,"groupInformation.id":message.basic.groupId},
                        {"$set":{"groupInformation.$.roleExtend.lastSpeakTime":message.basic.publishTime},
                            "$inc":{"groupInformation.$.roleExtend.speakNumber":1}},config.dbUser,function(){
                        })
					cacheData.add(message);
					
					redis.newRedis(function(err,redisClient) {
						redisClient.hget('user', message1.basic.userId, function (error, res) {
							if (error) {
                                redis.close(redisClient);
								console.error(error);
								return error;
							}
							if (res) {
								var tempJson = JSON.parse(res);
								message1.basic.head = tempJson.basic.head;
								message1.basic.userName = tempJson.basic.userName;
								message1.atMembers=tempAtMembers;
							}
                            message1.keyId = keyIdStr;  //返回keyId
                            findFirstMsg(io,socket,message1);
							socket.emit('receiveMessage',message1);
							socket.broadcast.to(socket.groupId).emit('receiveMessage',message1);
							redis.close(redisClient);
						});
					});
				})
			});
			
			
			var messageId=message.id;
			var companyId=message.basic.companyId;
			var userId=message.basic.userId;
			
			then(function(defer){
				var tempFiles=[];
				var len=files.length;
				var count=0
				files.forEach(function (file, i) {	
					file.mainId=message.basic.groupId;
					file.parentId=message.basic.groupId;
					
					var fileRemote = new fileTypes.File(file);
					tempFiles.push(fileRemote);
					count++
					if(count==len){
						defer(null,tempFiles);
					}
				});
				
			}).then(function(defer,tempFiles){
				thrift.client(FileStorage,'File',function(connection,client){
					thrift.call(client,'addMessageFiles',[messageId,companyId,userId,tempFiles],function(msg){
						if(msg=='success'){
							fileDao.list({companyId:companyId,messageId:messageId,userId:userId},{},config.dbFile,function(docs){
								ep.emit('fs',docs);
							})
						}else{
							ep.emit('fs',[]);
						}
						thrift.close(connection);
					});
				});
			})
			
		}else{
			delete message.atMembers;
			chatService.add(message,function(doc){
                fileDao.update({"id":message.basic.userId,"groupInformation.id":message.basic.groupId},
                    {"$set":{"groupInformation.$.roleExtend.lastSpeakTime":message.basic.publishTime},
                        "$inc":{"groupInformation.$.roleExtend.speakNumber":1}},config.dbUser,function(){
                    })
				cacheData.add(message);
				redis.newRedis(function(err,redisClient) {
					redisClient.hget('user', message1.basic.userId, function (error, res) {
						if (error) {
                            redis.close(redisClient);
							console.error(error);
							return error;
						}
						if (res) {
							var tempJson = JSON.parse(res);
							message1.basic.head = tempJson.basic.head;
							message1.basic.userName = tempJson.basic.userName;
							message1.atMembers=tempAtMembers;
						} 
                        message1.keyId = keyIdStr;  //返回keyId
                        findFirstMsg(io,socket,message1);
						socket.emit('receiveMessage',message1);
						socket.broadcast.to(socket.groupId).emit('receiveMessage',message1);
						redis.close(redisClient);
					});
				});

			});
		}
    })

};

//退出组
disconnected=function(groupId,userId){
	var ep=new eventproxy();
	ep.all('doc','doc1',function(doc,doc1){
		
		if(doc&&doc1.status=='success'){
		}else{
		}
	})
    groupService.updateUserExitTime(userId,groupId,function(doc){
		ep.emit('doc',doc);
    })
	cacheData.updateUserExitTime(userId,groupId,function(doc1){
		ep.emit('doc1',doc1);
    })
};


//通过id找msg
exports.findMsgById=function(req,res){
    var id=req.param('id');
    DB.client(function(db){
        DB.collection(db,config.dbMsg,function(collection){
            collection.find({id:id}).toArray(function(err,doc){
                var result={};
                result.msg='success';
                result.list=doc;
                res.writeHead(200, {"Content-Type": "text/html"});
                var s = JSON.stringify(result);
                res.end(s);
                DB.close(db);
            });
        });
    });
};


//组成员列表（包括是否在线，在线人数，全部人数）
exports.groupMember=function(req,res){	
	var groupId=req.param('groupId');
	groupService.groupMember(groupId,function(docs){
		if(docs&&docs.length>0){
			var onlineCount=0;
			redis.newRedis(function(err,redisClient) {
				redisClient.hgetall("user", function (err, data) {
					//console.log('缓存中的data：'+JSON.stringify(data));
					//console.log('数据库中的docs：'+JSON.stringify(docs));
					docs.forEach(function (doc, i) {
						doc.groupOnline="";
                        if(doc.contactInformation&&doc.contactInformation.length>0){
                            doc.contactInformation.forEach(function(item){
                                if(item.registerTag=='true'){
                                    doc.contactValue=item.contactValue;
                                }
                            })
                            delete doc.contactInformation;
                        }
						var userId = doc.id;
                        if(data[userId]){
                            var user = JSON.parse(data[userId]);
                            if(user.groupOnline){
                                doc.groupOnline=user.groupOnline;
                                if(user.groupOnline=='login'){
                                    onlineCount++;
                                }
                            }

                        }

					});
					var tempDoc={};
					tempDoc.list=docs;
					tempDoc.onlineCount=onlineCount;
					tempDoc.count=docs.length;
					res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(tempDoc);
                    redis.close(redisClient);
					res.end(str);
				});
			})
		}else{
			var tempDoc={};
			tempDoc.list=[];
			tempDoc.onlineCount=0;
			tempDoc.count=0;
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(tempDoc);
			res.end(str);
		}
	})
}
//数据入库
insertInformation= function (message) {
    groupService.insertInfo(message);
}
updateInformation= function (message) {
    groupService.updateInfo(message);
}

//下载聊天记录到txt文本中
exports.downloadMessage = function(req,res){
    var groupId=req.param('groupId');
    var groupName = req.param('groupName');
	var startTime = new Date(req.param('startTime'));
	var endTime = new Date(new Date(req.param('endTime')).getTime() + 86400000);
	
    var groupNameStr = decodeURIComponent(req.param('groupName'));
    var userAgent = (req.headers['user-agent']||'').toLowerCase();

    if(userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0) {
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(groupNameStr)+'.txt');
    } else if(userAgent.indexOf('firefox') >= 0) {
        res.setHeader('Content-Disposition', 'attachment; filename*="utf8\'\'' + encodeURIComponent(groupNameStr)+'.txt"');
    } else {
        /* safari等其他非主流浏览器只能自求多福了 */
        res.setHeader('Content-Disposition', 'attachment; filename=' + new Buffer(groupNameStr).toString('binary')+'.txt');
    }
	var query = {'basic.groupId':groupId,'basic.type':{'$in':['groupChat','remind','vote','topic','activity','announcement']},'$and':[{'basic.publishTime':{'$gt':startTime}},{'basic.publishTime':{'$lt':endTime}}]};
	var option = {'sort':{'basic.publishTime':-1}};
	fileDao.list(query,option,config.dbInformation,function(docs){
		if(docs.length>0){
			redis.newRedis(function(err,redisClient) {
				redisClient.hgetall("user", function (err, data) {
                    docs.forEach(function (msg, i) {
                        var userId = msg.basic.userId;
                        var user = JSON.parse(data[userId]);
                        msg.basic.userName = user.basic.userName;
                        msg.basic.head = user.basic.head;
                    });
					// 处理数据
					var jsonObj = docs;
					var newLine = '\r\n';
					var chunks = [];
					var length = 0;
					var value = '组名称:' + groupName + newLine
						+"===========================================" + newLine + newLine;
					var buffer1 = new Buffer(value);
					chunks.push(buffer1);
					length += buffer1.length;
					//循环聊天记录
					for(var i=0,size=jsonObj.length;i<size;i++){
						var one = jsonObj[i];
						var tempValue = '';
						//时间
						tempValue = new Date(one.basic.publishTime).format('yyyy-MM-dd hh:mm:ss');
						//人名
						tempValue = tempValue + "   " + one.basic.userName + newLine;
						if(one.basic.type == 'vote'){
							tempValue = tempValue + '[投票]';
						}else if(one.basic.type == 'topic'){
							tempValue = tempValue + '[话题]';
						}else if(one.basic.type == 'activity'){
							tempValue = tempValue + '[活动]';
						}else if(one.basic.type == 'announcement'){
							tempValue = tempValue + '[公告]';
						}else if(one.basic.type == 'remind'){
							//系统提醒（人员加入信息 和 工作邀请信息）
							tempValue = tempValue + '系统消息：' + one.content.text;
						}else{
							//消息
							if(one.basic.undo == true){
								//撤销的消息
								tempValue = tempValue+ '系统消息：此条消息已删除';
							}else{
                                //未撤销的消息
                                one.content.text = one.content.text.replace(new RegExp("\r","gm"),"");
                                one.content.text = util.trimTxt(one.content.text,"div");
                                one.content.text = util.trimTxt(one.content.text,"a");
                                one.content.text = util.trimTxt(one.content.text,"span");
                                one.content.text = util.trimTxt(one.content.text,"img");
                                tempValue = tempValue + one.content.text;
                                if(one.content.file.length>0){
                                    tempValue = tempValue + '[附件]';
                                }
							}
						}
						tempValue += newLine + newLine;
						var buffer = new Buffer(tempValue);
						chunks.push(buffer);
						length += buffer.length;
					}
					var resultBuffer = new Buffer(length);
					for(var j=0,size1=chunks.length,pos=0;j<size1;j++){
						chunks[j].copy(resultBuffer,pos);
						pos += chunks[j].length;
					}

					res.end(resultBuffer);
					
                    redis.close(redisClient);
                });
			});
            
        }else{
            var newLine = '\r\n';
            var value = '组名称:' + groupName + newLine
                +"===========================================" + newLine + newLine+"无记录";
            var buffer1 = new Buffer(value);
            res.end(buffer1);
        }
	});
};
//查询是不是第一条组内消息
findFirstMsg=function(io,socket,message){
    then(function(defer){//取出所有在线用户的id
        groupService.groupMember(message.basic.groupId,function(docs){
            var onLineUserIds=[];
            if(docs.length>0){
                var onlineCount=0;
                redis.newRedis(function(err,redisClient) {
                    redisClient.hgetall("user", function (err, data) {
                        var count=0;
                        docs.forEach(function (doc, i) {
                            doc.groupOnline=0;
                            count++;
                            doc.contactInformation.forEach(function(item){
                                if(item.registerTag=='true'){
                                    doc.contactValue=item.contactValue;
                                    onLineUserIds.push(doc.id);
                                }
                            })
                            delete doc.contactInformation;
                            var userId = doc.id;
                            if(data[userId]){
                                var user = JSON.parse(data[userId]);
                                if(user.groupOnline&&user.groupOnline=='login'){
                                    onlineCount++;
                                    onLineUserIds.push(userId);
                                    doc.groupOnline=1;
                                }
                            }
                            if(count==docs.length){
                                redis.close(redisClient);
                                defer(null,onLineUserIds);
                            }
                        });
                    });
                })
            }else{
                defer(null,[]);
            }
        })
    }).then(function(defer,onLineUserIds){
        if(onLineUserIds.length>0){
            //去重
            for(var i=0;i<onLineUserIds.length;i++){
                for(var j=i+1;j<onLineUserIds.length;j++){
                    if(onLineUserIds[i]==onLineUserIds[j]){
                        onLineUserIds.splice(j,1);
                        j--;
                    }
                }
            }
            var messageTemp={};
            messageTemp.message=message;
            messageTemp.groupInformation={};
            groupService.basic(message.basic.groupId,function(group){
                messageTemp.groupInformation.basic=group;
                messageTemp.groupInformation.id=message.basic.groupId;
                onLineUserIds.forEach(function(userId){
                    io.of("/loginConnect").emit('receiveMessage'+userId,messageTemp);
                })
            })
        }
    })
};