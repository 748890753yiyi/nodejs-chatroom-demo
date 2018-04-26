var DB = require('../DBClient');
var config = require('../config');
var then = require('thenjs');
var uuid = require('node-uuid');
var eventproxy=require('eventproxy');
var informationService=require('./informationService');
var dao=require('./groupDao');
var cacheData = require('../cacheData');

var vote=module.exports={
	//发布投票
	add:function(req,res){
		var cookie=req.cookies;
		//var user= JSON.parse(cookie.user);
        var userId=cookie.userid;
		var vote=req.body;
		vote.content.votes=[];
		for(var value in vote.select){
			var voteObject=vote.select[value];
			voteObject.voteCount=0;
			voteObject.voteUsers=[];
			vote.content.votes.push(voteObject);
		}
		delete vote.select;
		vote.id=uuid.v1();
		vote.basic.publishTime=new Date();
		vote.content.endTime=new Date(new Date(vote.content.endTime).getTime()+86400000);
		vote.basic.type='vote';
		vote.basic.userId=userId;
		vote.basic.count=0;
		informationService.add(vote,function(doc){
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
	//投票列表(全部，我发起的，我参与的(投过的))
	list:function(req,res){
		var cookie=req.cookies;
		//var user= JSON.parse(cookie.user);
        var userId=cookie.userid;
		var pageSize=parseInt(req.param('pageSize'));
		var pageNo=parseInt(req.param('pageNo'));
		var groupId=req.param('groupId');
		var type=req.param('type');
		var query={};
		var condition={'sort':{'basic.publishTime':-1},'skip':(pageNo-1)*pageSize,'limit':pageSize}
		if(type=='myVote'){
			//我发起的
			query={'basic.userId':userId,'basic.type':'vote','basic.groupId':groupId};
		}else if(type=='myParticipateVote'){
			//我参与的
			query={'basic.groupId':groupId,'basic.type':'vote','content.votes.voteUsers':{'$elemMatch':{'id':userId}}};
		}else if(type == 'allVote'){
			//所有的
			query={'basic.type':'vote','basic.groupId':groupId};
		}
		var tempCount=0;
		dao.total(query,config.dbInformation,function(count){
            dao.list(query,condition,config.dbInformation,function(docs){
				if(docs.length>0){					
					docs.forEach(function(term,i){
                        cacheData.getUser(term.basic.userId,function(tempUser){
                            term.basic.userName=tempUser.basic.userName;
                            term.basic.head=tempUser.basic.head;
                            term.isEnd=false;
                            term.isVote=false;
                            if(term.content.votes.length>0){
                                term.content.votes.forEach(function(tempTerm,i){
                                    tempTerm.isVote=false;
                                    if(tempTerm.voteUsers.length>0){
                                        tempTerm.voteUsers.forEach(function(it,m){
                                            if(it.id==userId){
                                                term.isVote=true;
                                                tempTerm.isVote=true;
                                            }
                                        })
                                    }
                                })
                            }

                            tempCount++;
                            if(term.content.endTime<new Date()){
                                term.isEnd=true;
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
	//最新投票
	latestVoteList:function(req,res){
		var n=parseInt(req.param('n'));
		var groupId=req.param('groupId');
		var tempCount=0;
		informationService.list({'basic.type':'vote','basic.groupId':groupId},{'sort':{'basic.publishTime':-1},'limit':n},function(docs){
			if(docs.length>0){					
				docs.forEach(function(term,i){
                    cacheData.getUser(term.basic.userId,function(user) {
                        term.basic.userName = user.basic.userName;
                        term.basic.head = user.basic.head;
                        tempCount++;
                        term.isEnd=false;//初始化结束属性
                        if(term.content.endTime<new Date()){
                            term.isEnd=true;
                        }
                        if(tempCount==docs.length){
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var str = JSON.stringify(docs);
                            res.end(str);
                        }
                    });

				})
			}else{

				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(docs);
				res.end(str);
			}
		});
	},
	//投票详情
	voteInfo:function(req,res){
		var voteId=req.param('id');
        var userId = req.cookies.userid;
		dao.findOne({id:voteId},config.dbInformation,function(doc){
			if(doc){
                cacheData.getUser(doc.basic.userId,function(user) {
                    doc.basic.userName = user.basic.userName;
                    doc.basic.head = user.basic.head;
                    doc.isEnd=false;
                    doc.isVote=false;
                    if(doc.content.votes.length>0){
                        doc.content.votes.forEach(function(term,i){
                            term.isVote=false;
                            if(term.voteUsers.length>0){
                                term.voteUsers.forEach(function(it,m){
                                    if(it.id==userId){
                                        doc.isVote=true;
                                        term.isVote=true;
                                    }
                                })
                            }
                        })
                    }

                    if(doc.content.endTime<new Date()){
                        doc.isEnd=true;
                    }
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(doc);
                    res.end(str);
                })

			}else{
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify({});
				res.end(str);
			}
		})
	},
	//投票
	vote:function(req,res){
		var cookie=req.cookies;
		//var user= JSON.parse(cookie.user);
        var userId=cookie.userid;
		var id=req.param('id');
		var selects=req.param('select');//投票每一项text数组
		var type=req.param('type');
		var now=new Date;
		var ep=new eventproxy();
		ep.after('select',selects.length,function(){
			dao.update({'id':id},{'$inc':{'basic.count':1}},config.dbInformation,function(doc){
				var tempDoc={};
				if(doc){
					tempDoc.status='success';
					tempDoc.msg='成功！';	
				}else{
					tempDoc.status='failed';
					tempDoc.msg='失败！';
				}
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(tempDoc);
				res.end(str);
			})			
		});
		//循环更新投票信息
		selects.forEach(function(select,i){
			dao.update({'id':id,'content.votes.text':select},{'$push':{'content.votes.$.voteUsers':{id:userId,voteTime:now}},'$inc':{'content.votes.$.voteCount':1}},config.dbInformation,function(doc){
				if(doc){
					ep.emit('select');
				}else{
					var tempDoc={};
					tempDoc.status='failed';
					tempDoc.msg='失败！';
					res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(tempDoc);
					res.end(str);
				}
			})
		})	
	},
    //管理员删除投票
    delVote:function(req,res){
        var id=req.param('id');
        var result={status:'success',msg:"删除成功"};
        dao.delete(id,config.dbInformation,function(doc){
            if(!doc){
                result={status:'failed',msg:"删除失败"};
            }
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        })
    },
    //停止投票
    stopVote:function(req,res){
        var id=req.param('id');
        dao.update({id:id},{"$set":{'basic.stopVote':true}},config.dbInformation,function(doc){
            var result={status:'failed',msg:'停止投票操作失败！'};
            if(doc){
                result.status="success";
                result.msg="停止投票操作成功！"
            }
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        })
    }
	
}