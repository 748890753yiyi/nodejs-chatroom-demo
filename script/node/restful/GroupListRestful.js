var Restful = require("../Restful");
var config = require('../config');
var uuid = require('node-uuid');
var Dao = require("../dao1");
var path = require('path');
var then = require('thenjs');
var util = require('../util');
var redis = require('../redisClient');
var cacheData = require('../cacheData');
var EventProxy = require('eventproxy');
var groupService=require('.././group/groupService');
var informationService=require('.././group/informationService');

var phoneGroupRestful = module.exports = Restful.extend({
    initialize: function () {
        this.userDao = Dao.new(config.dbUser);
        this.dao = Dao.new(config.dbInformation);
        this.groupDao = Dao.new(config.dbGroup);
    },
    //组列表
    groupList: function (req,res) {
        /*
         * 定义当前类
         * 获取cookie
         * 通过cookie获取当前用户信息
         * 建立组列表组
         */
        var self = this;
        var cookie = req.cookies;
        //var user = JSON.parse(cookie.user);
        var userId=cookie.userid;
        //获取前台搜索框内字段
        var str=req.param('groupName');
        /*
         * 从数据库中获取人对应的组信息
         * 获取组内发布的最后一条信息
         *
         */
        var query=[{"$project":{_id:0,id:1,groupInformation:1}},
            {"$unwind":"$groupInformation"},
            {"$match":{"groupInformation.role.status":{$nin:["false"]},
                "groupInformation.basic.stopLogin":{$nin:["true"]},"id":userId}},
            {'$sort':{'groupInformation.basic.isFocusOn':1}}
        ];
        if(str){
            query=[{"$project":{_id:0,id:1,groupInformation:1}},
                {"$unwind":"$groupInformation"},
                {"$match":{"groupInformation.basic.name":{$regex:str},
                    "groupInformation.role.status":{$nin:["false"]},
                    "groupInformation.basic.stopLogin":{$nin:["true"]},"id":userId}},
                {'$sort':{'groupInformation.basic.isFocusOn':1}}
            ];
        }
        var count=0;
        var  groupDocs=[];
        self.userDao.findDataByAggregate(query, function (doc) {
            if(doc.length>0) {
                doc.forEach(function (file) {
                    var msgQuery = {'basic.groupId': file.groupInformation.id, 'basic.undo':{'$ne':true}, 'basic.type': {'$in': ['groupCard','groupChat', 'remind', 'topic', 'activity', 'vote', 'announcement']}};
                    /*
                     * 获取未读信息
                     */
                    self.dao.total({'basic.groupId': file.groupInformation.id, 'basic.undo': false,
                        'basic.publishTime':{'$gt':file.groupInformation.roleExtend.exitTime}}, function (total) {
                        self.dao.list(msgQuery, null, {'basic.publishTime': -1}, 1, 1, function (docs) {
                            var oneGroup=file.groupInformation;
                            if(docs.length>0){
                                oneGroup.message = docs[0];
                            }else{
                                oneGroup.message = {"basic":{"publishTime":new Date(1990)}};
                            }
                            oneGroup.msgCount=total;
                            groupDocs.push(oneGroup);
                            count++;
                            if (count == doc.length) {
                                /*
                                 * 最后一条信息发布时间排序
                                 * 通过封装的排序方法依据关注
                                 * */
                                var arr=[];
                                var arr1=[];
                                for(var i=0;i<groupDocs.length;i++){
                                    if(groupDocs[i]['roleExtend']['isFocusOn']=='Y'){
                                        arr.push(groupDocs[i]);

                                    }else{
                                        arr1.push(groupDocs[i]);
                                    }
                                }
								
                                arr.sort(util.getSortFun('desc','roleExtend.level'));
                                arr1.sort(util.getSortFun('desc','message.basic.publishTime'));
                                for(var i=0;i<arr.length;i++){
                                    arr1.unshift(arr[i]);
                                }
                                groupDocs=arr1;
                                var counts=0;
                                groupDocs.forEach(function (files) {
									if(files.basic.head==config.groupHead){
										self.memberList(self,files.id, function (headDoc) {
											files.headDoc=headDoc;
											counts++
											if(counts==groupDocs.length){
												res.writeHead(200, {"Content-Type": "text/html"});
												var returnValue = {status: 'success', list: groupDocs,focusTotal:arr.length};
												var str = JSON.stringify(returnValue);
												res.end(str);
											}
										})
									}else{
										counts++;
										if(counts==groupDocs.length){
                                            res.writeHead(200, {"Content-Type": "text/html"});
                                            var returnValue = {status: 'success', list: groupDocs,focusTotal:arr.length};
                                            var str = JSON.stringify(returnValue);
                                            res.end(str);
                                        }
									}
                                    
                                })                             
                            }
                        })
                    })
                })
            }else{
                /*
                 * 如果没有组则返回空列表
                 **/
                res.writeHead(200, {"Content-Type": "text/html"});
                var returnValue = {status: 'success', list: []};
                var str = JSON.stringify(returnValue);
                res.end(str);
            }
        })
    },
    //获取组内成员头像
    memberList: function (self,groupId,callBack) {
        self.userDao.findDataByAggregate([{"$project":{_id:0,id:1,basic:1,groupInformation:1}},
            {"$unwind":"$groupInformation"},
            {"$match":{"groupInformation.id":groupId,
                "groupInformation.role.status":{$nin:["false"]},
                "groupInformation.basic.stopLogin":{$nin:["true"]}}},
            {'$sort':{'groupInformation.basic.isFocusOn':1}}
        ], function (docs) {
                var headDoc=[];
            if(docs.length>9){
                for(var i=0;i<9;i++){
                    headDoc.push(docs[i]['basic']['head'])
                }
                callBack(headDoc);
            }else{
                for(var i=0;i<docs.length;i++){
                    headDoc.push(docs[i]['basic']['head']);
                }
                callBack(headDoc);
            }
            
        })
    },
     
   


    //添加好友
    addCallUser: function (replyId,userId,self,type,callback) {
        var mainDoc = {};
        var parentDoc = {};
        var ep=new EventProxy();
		self.userDao.findOne({'id':userId,'personalAddress.userId':replyId.toString()}, function (userHave) {
            if(userHave){
                callback(userId);
			}else{
        self.userDao.findOne({'id': replyId.toString()}, function (doc2) {
            //回复人的完整信息
            mainDoc.userName=doc2.basic.userName;
            mainDoc.userId=doc2.id;
            mainDoc.head=doc2.basic.head;
            mainDoc.remark = '';
            self.userDao.updateArray({'id': userId}, {'$push': {'personalAddress': mainDoc}}, function (doc) {
                ep.emit('mainDoc',doc2);
            });
        });
        self.userDao.findOne({'id': userId}, function (doc1) {
            //自己的完整信息
            parentDoc.userName=doc1.basic.userName;
            parentDoc.userId=doc1.id;
            parentDoc.head=doc1.basic.head;
            parentDoc.remark = '';
            //修改回复人好友列表
            self.userDao.updateArray({'id': replyId.toString()}, {'$push': {'personalAddress': parentDoc}}, function (doc) {
                ep.emit('parentDoc',parentDoc)
            });

        })
        ep.all('mainDoc','parentDoc',function (mainDoc,parentDoc) {
            //生成同意信息
            var friendNotice = {
                'basic': {
                    'type': '',
                    'userId': '',
                    'replyId': [],
                    'publishTime': new Date()
                },
                'content': {
                    'text': '',
                    'notice': '同意成为您的好友'
                }
            }
            friendNotice.basic.type = 'friendNotice';
            friendNotice.basic.userId = replyId.toString();
            friendNotice.basic.replyId[0] = userId;
            friendNotice.content.text = '添加成功';
            if(type=='addUser'){
                self.dao.insert(friendNotice, null, function (docs) {
                    callback(docs);
                });
            }else{
                callback(userId);
            }

        })
		}
		});
    }, 
	//设置关注和取消关注
    setFocus: function (req,res) {
        /*
         * 获取当前对象
         * 获取cookie
         * 通过cookie获取用户id
         * 获取前端参数组id，关注状态
         */
        var self=this;
        var cookie=req.cookies;
        //var user=JSON.parse(cookie.user);
        var reqObj=req.body;
        var userId=cookie.userid;
        var groupId=reqObj.groupId;
        var isFocusOn=reqObj.isFocusOn;
        var focusNumber=reqObj.focusNumber;
		var level=reqObj.level;

        if(isFocusOn=="Y"){
            var query=[{"$unwind":"$groupInformation"},
                {"$match":{"id":userId,"groupInformation.roleExtend.isFocusOn":"Y"}}];
            self.userDao.findDataByAggregate(query,function(docs){
                var total=docs.length;
                if(total>=focusNumber){
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var returnValue = {status: 'failed',msg:'最多置顶'+focusNumber+'个群组'};
                    var str = JSON.stringify(returnValue);
                    res.end(str)
                }else{
                    self.userDao.updateArray({id:userId,'groupInformation':{"$elemMatch":{id:groupId}}},
                        {'$set':{'groupInformation.$.roleExtend.isFocusOn':isFocusOn,'groupInformation.$.roleExtend.level':total}},function(doc){
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var returnValue = {status: 'success'};
                            var str = JSON.stringify(returnValue);
                            res.end(str)
                        });
                }
            })
        }else{
            self.userDao.updateArray({id:userId,'groupInformation':{"$elemMatch":{id:groupId}}},
                {'$set':{'groupInformation.$.roleExtend.isFocusOn':isFocusOn,'groupInformation.$.roleExtend.level':''}},function(doc){
					self.userDao.updateArray({id:userId,'groupInformation':{"$elemMatch":{'roleExtend.level':{'$gt':level}}}},
                {'$inc':{'groupInformation.$.roleExtend.level':-1}},function(docs){
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var returnValue = {status: 'success'};
                    var str = JSON.stringify(returnValue);
                    res.end(str)
                });
				});
        }
    },

    //同意拒绝加入组
    agreeOrUpdate:function(req,res){
        var self=this;
        var userid=req.cookies.userid;
        //var user=JSON.parse(cookie.user);
        var body=req.body;
        var messageId=body.id;
        var type=body.state;
        var groupId=body.groupId;
        var replyId=body.userId;

        self.userDao.findOne({id:userid,'groupInformation.id':groupId}, function (userDo) {
            if(userDo){
                self.dao.updateArray({id:messageId},{$set:{'basic.state':type}},function(doc){ });
                res.writeHead(200, {"Content-Type": "text/html"});
                var returnObj={status:'exist',msg:"您已经是该组成员！"};
                var str = JSON.stringify(returnObj);
                res.end(str);
            }else{
                if(type=='agree'){
                    self.addCallUser(replyId,userid,self,'callUser', function (docs) {
                    });
                    var ef=new EventProxy();
                    self.userDao.findOne({id:userid}, function (single) {
                        ef.emit('single',single);
                    });
                    self.userDao.findOne({id:replyId}, function (user) {
                        ef.emit('user',user);
                    });
                    ef.all('single','user', function (single,user) {
                        var count=0;
                        var returnDoc=[];
                        groupService.get(groupId,replyId,function(doc){
                            var now=new Date();
                            var information={
                                id:uuid.v1(),
                                basic:{
                                    type:'groupInviteMemberAsk',
                                    userId:userid,
                                    replyId:[],
                                    groupId:groupId,
                                    companyId:"-1",
                                    publishTime:now
                                },
                                content:{
                                    text:'',
                                    notice:user.basic.userName+'邀请'+single.basic.userName+"加入"+doc.groupInformation.basic.name+"组"
                                }
                            };
                            var userGroup={
                                id:groupId,
                                basic:doc.groupInformation.basic,
                                roleExtend:{
                                    joinTime:now,
                                    isFocusOn:'N',
                                    lastSpeakTime:now,
                                    speakNumber:0,
                                    exitTime:now
                                },
                                role:{
                                    id:'3',
                                    name:'成员',
                                    type:'member',
                                    typeLevel:'primary'
                                }
                            };
                            if(doc.groupInformation.role.id!='3'){
                                informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':userid},function(docTemp){

                                    //管理员或者超级管理员邀请，直接加入组内，并且发送状态为完成的邀请信息
                                    var ep=new EventProxy();
                                    //user表中的group对象
                                    information.basic.state='agree';

                                    ep.all('userGroup','information','redis',function(doc,doc1,doc2){
                                        count++;
                                        var tempDoc={};
                                        if(doc.status=='success'&&doc1.status=='success'&&doc2.status=='success'){
                                            tempDoc.status='success';
                                            tempDoc.msg="加入组成功！";
                                        }else{
                                            tempDoc.status='failed';
                                            tempDoc.msg="加入组失败！";
                                        }
                                        tempDoc.id=single.id;
                                        tempDoc.userName=single.basic.userName;
                                        returnDoc.push(tempDoc);
                                        self.dao.updateArray({id:messageId},{$set:{'basic.state':type}},function(doc){ });
                                        res.writeHead(200, {"Content-Type": "text/html"});
                                        var returnObj={returnDoc:returnDoc};
                                        var str = JSON.stringify(tempDoc);
                                        res.end(str);

                                    })

                                    if(docTemp){
                                        var tempInformationId=docTemp.id;
                                        informationService.updateStates(tempInformationId,'agree',function(doc1){
                                            ep.emit('information',doc1);
                                        });
                                    }else{
                                        informationService.add(information,function(doc1){
                                            ep.emit('information',doc1);
                                        });
                                    }
                                    groupService.addUser(single.id,userGroup,function(doc){
                                        ep.emit('userGroup',doc);
                                    });

                                    cacheData.UpdateDirectGroupUserInfo('join',single.id,userGroup,function(doc2){
                                        ep.emit('redis',doc2);
                                    });
                                })

                            }else{
                                //组内一般成员邀请，发送状态为未完成的邀请信息
                                groupService.basic(groupId,function(basic){
                                    if(basic.isAudit=="Y"){
                                        //需要审核，生成一条请求加入组的information信息
                                        information.basic.state='wait';
                                        informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':userid},function(doc){
                                            if(doc){
                                                count++;
                                                //用户已经请求过加入状态
                                                var tempDoc={};
                                                tempDoc.status='failed';
                                                tempDoc.msg='您已经处在等待状态！';
                                                tempDoc.id=single.id;
                                                tempDoc.userName=single.basic.userName;
                                                returnDoc.push(tempDoc);
                                                self.dao.updateArray({id:messageId},{$set:{'basic.state':type}},function(doc){ });
                                                res.writeHead(200, {"Content-Type": "text/html"});
                                                var returnObj={returnDoc:returnDoc};
                                                var str = JSON.stringify(tempDoc);
                                                res.end(str);
                                            }else{

                                                self.dao.insert(information,'',function(doc){
                                                    count++;
                                                    var tempDoc={};
                                                    if(doc.length>0){
                                                        tempDoc.status="wait";
                                                        tempDoc.msg=single.basic.userName+"请求成功,等待管理员审核！";
                                                    }else{
                                                        tempDoc.status="failed";
                                                        tempDoc.msg=single.basic.userName+"请求失败！";
                                                    }
                                                    tempDoc.id=userid;
                                                    tempDoc.userName=single.basic.userName;
                                                    returnDoc.push(tempDoc);
                                                    self.dao.updateArray({id:messageId},{$set:{'basic.state':type}},function(doc){ });
                                                    res.writeHead(200, {"Content-Type": "text/html"});
                                                    var returnObj={returnDoc:returnDoc};
                                                    var str = JSON.stringify(tempDoc);
                                                    res.end(str);
                                                })
                                            }
                                        })

                                    }else if(basic.isAudit=='N'){
                                        //组不需要审核，
                                        informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':userid},function(docTemp){

                                            //管理员或者超级管理员邀请，直接加入组内，并且发送状态为完成的邀请信息
                                            var ep=new EventProxy();
                                            //user表中的group对象
                                            information.basic.state='agree';

                                            ep.all('userGroup','information','redis',function(doc,doc1,doc2){
                                                count++;
                                                var tempDoc={};
                                                if(doc.status=='success'&&doc1.status=='success'&&doc2.status=='success'){
                                                    tempDoc.status='success';
                                                    tempDoc.msg="邀请"+single.basic.userName+'发送成功！';
                                                }else{
                                                    tempDoc.status='failed';
                                                    tempDoc.msg="邀请"+single.basic.userName+'发送失败！';
                                                }
                                                tempDoc.id=userid;
                                                tempDoc.userName=single.basic.userName;
                                                self.dao.updateArray({id:messageId},{$set:{'basic.state':type}},function(doc){ });
                                                res.writeHead(200, {"Content-Type": "text/html"});
                                                var returnObj={returnDoc:returnDoc};
                                                var str = JSON.stringify(tempDoc);
                                                res.end(str);
                                            })

                                            if(docTemp){
                                                var tempInformationId=docTemp.id;
                                                informationService.updateStates(tempInformationId,'agree',function(doc1){
                                                    ep.emit('information',doc1);
                                                });
                                            }else{
                                                informationService.add(information,function(doc1){
                                                    ep.emit('information',doc1);
                                                });
                                            }
                                            groupService.addUser(userid,userGroup,function(doc){
                                                ep.emit('userGroup',doc);
                                            });

                                            cacheData.UpdateDirectGroupUserInfo('join',userid,userGroup,function(doc2){
                                                ep.emit('redis',doc2);
                                            });
                                        })
                                    }
                                })

                            }
                        })
                    })
                }else{
                    self.dao.updateArray({id:messageId},{$set:{'basic.state':type}},function(doc){ });
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var returnValue = {status: 'success',msg:'拒绝添加'};
                    var str = JSON.stringify(returnValue);
                    res.end(str)
                }
            }
        })


    },
	//置顶组列表
    stickGroups: function (req,res) {
        var self=this;
        var cookie=req.cookies;
        //var user=JSON.parse(cookie.user);
        var userId=cookie.userid;
        var query=[{"$project":{_id:0,id:1,groupInformation:1}},
            {"$unwind":"$groupInformation"},
            {"$match":{"groupInformation.role.status":{$nin:["false"]},
                "groupInformation.basic.stopLogin":{$nin:["true"]},"groupInformation.roleExtend.isFocusOn":"Y","id":userId}},
            {'$sort':{'groupInformation.basic.isFocusOn':1}}
        ];
        self.userDao.findDataByAggregate(query, function (doc) {
            if (doc.length > 0) {
                var count=0;
                var  groupDocs=[];
                doc.forEach(function (file) {
                    var msgQuery = {'basic.groupId': file.groupInformation.id, 'basic.undo': false};
                    /*
                     * 获取未读信息
                     */
                    self.dao.total({'basic.groupId': file.groupInformation.id, 'basic.undo': false,
                        'basic.publishTime': {'$gt': file.groupInformation.roleExtend.exitTime}}, function (total) {
                        self.dao.list(msgQuery, null, {'basic.publishTime': -1}, 1, 1, function (docs) {
                            var oneGroup = file.groupInformation;
                            if(docs.length>0){
                                oneGroup.message = docs[0];
                            }else{
                                oneGroup.message = {"basic":{"publishTime":new Date(1990)}};
                            }
                            oneGroup.msgCount=total;
                            groupDocs.push(oneGroup);
                            count++;
                            if (count == doc.length) {
                                var counts=0;
                                groupDocs.forEach(function (files) {
                                    if(files.basic.head==config.groupHead){
                                        self.memberList(self,files.id, function (headDoc) {
                                            files.headDoc=headDoc;
                                            counts++
                                            if(counts==groupDocs.length){
												groupDocs.sort(util.getSortFun('asc','roleExtend.level'));
                                                res.writeHead(200, {"Content-Type": "text/html"});
                                                var returnValue = {status: 'success', list: groupDocs};
                                                var str = JSON.stringify(returnValue);
                                                res.end(str);
                                            }
                                        })
                                    }else{
                                        counts++;
                                        if(counts==groupDocs.length){
                                            res.writeHead(200, {"Content-Type": "text/html"});
                                            var returnValue = {status: 'success', list: groupDocs};
                                            var str = JSON.stringify(returnValue);
                                            res.end(str);
                                        }
                                    }

                                })
                            }
                        })
                    })
                })
            }else{
                /*
                 * 如果没有组则返回空列表
                 **/
                res.writeHead(200, {"Content-Type": "text/html"});
                var returnValue = {status: 'success', list: []};
                var str = JSON.stringify(returnValue);
                res.end(str);
            }
        })
    },
	 //置顶组排序
    sortStick: function (req,res) {
        var self=this;
        var cookie=req.cookies;
        //var user=JSON.parse(cookie.user);
        var userId=cookie.userid;
        var bodys=req.body;
		var body=bodys.groupDocs;
        var count=0;
        body.forEach(function (file,i) {
            self.userDao.updateArray({id:userId,'groupInformation.id':file.id},{'$set':{'groupInformation.$.roleExtend.level':i}},
                function (doc) {
                    count++;
                    if(count==body.length){
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var returnValue = {status: 'success', msg: '修改成功'};
                        var str = JSON.stringify(returnValue);
                        res.end(str);
                    }
                })
        })
    },
	//分享群组的组列表
	listGroup: function (req,res) {
		var self=this;
        var userid=req.cookies.userid;
        self.userDao.findOne({id:userid}, function (doc) {
            res.writeHead(200, {"Content-Type": "text/html"});
            var returnValue = {status: 'success', list: doc.groupInformation};
            var str = JSON.stringify(returnValue);
            res.end(str);
        })
    }
});
