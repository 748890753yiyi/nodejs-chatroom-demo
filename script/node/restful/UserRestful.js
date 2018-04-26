var Restful = require("../Restful");
var config = require('../config');
var uuid = require('node-uuid');
var Dao = require("../dao");
var path = require('path');
var then = require('thenjs');
var util = require('../util');
var redis = require('../redisClient');
var cacheData = require('../cacheData');
var EventProxy = require('eventproxy');
var groupDao=require('../group/groupDao');


var UserRestful = module.exports = Restful.extend({
    initialize: function () {
        this.dao = Dao.new(config.dbUser);
        this.informationDao = Dao.new(config.dbInformation);
        this.companyDao = Dao.new(config.dbCompany);
		this.groupDao = Dao.new(config.dbGroup);

    },

    //注册
    preInsert: function (req, res, doc, callback) {
        var self = this;
		//判断用户是否已存在
        self.dao.findOne({"contactInformation": {"$elemMatch": {contactValue: doc.contactInformation[0].contactValue,
            registerTag: "true"}}}, function (doc1) {
            if (doc1) {
                res.writeHead(200, {"Content-Type": "text/html"});
                var returnValue = {status: 'failed', msg: '用户已存在'};
                var str = JSON.stringify(returnValue);
                res.end(str);
            } else {
                doc.id = uuid.v1();
                doc.basic.spell = util.transliterate(doc.basic.userName);
                var spell = doc.basic.spell.substring(0, 1);
                doc.basic.firstSpell = spell.toUpperCase();
                doc.validation.password = util.md5(doc.validation.password);
                callback(doc);
            }
        })
    },

   //注册成功后查看是否是被邀请加入的
    suffixInsert: function (req, res, doc, callback) {
        var self = this;
        var user = JSON.stringify(doc);
		//更新redis中的数据信息
        redis.newRedis(function (err, redisClient) {
            redisClient.hset('user', doc.id, user, function (error, res) {
                if (error) {
                    console.error(error);
                    return error;
                } else {
                    flag = true;
                }
                // 关闭链接
                redis.close(redisClient);
            });
        });
		//判断是否是被公司邀请加入平台的
        doc.contactInformation.forEach(function (file, i) {
            if (file.registerTag == "true") {
                self.informationDao.findOne({'basic.replyId': file.contactValue,'basic.type':"companyInvitation"}, function (doc1) {
                    if (!doc1) {
                        self.informationDao.findOne({'basic.replyId': file.contactValue,'basic.type':"groupInvitation"}, function (group) {
                            if(!group){
                                callback(doc);
                            }else{
                                self.groupDao.find({id:group.basic.groupId}, function (groupDoc) {
                                    var userGroup=[{
                                        id:groupDoc[0].id,
                                        basic:groupDoc[0].basic,
                                        roleExtend:{
                                            joinTime:new Date(),
                                            isFocusOn:'N',
                                            lastSpeakTime:new Date(),
                                            speakNumber:0,
                                            exitTime:new Date()
                                        },
                                        role:{
                                            id:'3',
                                            name:'成员',
                                            type:'member',
                                            typeLevel:'primary'
                                        }
                                    }];
                                    self.dao.updateArray({'id': doc.id}, {'$set': {'groupInformation': userGroup}}, function (docs) {
										var mainDoc = {};
										var parentDoc = {};
										var ep = new EventProxy();
										self.dao.findOne({'id': doc.id}, function (doc2) {
											//回复人的完整信息
											mainDoc.userName = doc2.basic.userName;
											mainDoc.userId = doc2.id;
											mainDoc.head = doc2.basic.head;
											mainDoc.remark = '';
											self.dao.updateArray({'id': group.basic.userId}, {'$push': {'personalAddress': mainDoc}}, function () {
												ep.emit('mainDoc', doc2);
											});
										});
										self.dao.findOne({'id': group.basic.userId}, function (doc1) {
											//自己的完整信息
											parentDoc.userName = doc1.basic.userName;
											parentDoc.userId = doc1.id;
											parentDoc.head = doc1.basic.head;
											parentDoc.remark = '';
											//修改回复人好友列表
											self.dao.updateArray({'id': doc.id}, {'$push': {'personalAddress': parentDoc}}, function () {
												ep.emit('parentDoc', parentDoc)
											});

										})
										ep.all('mainDoc', 'parentDoc', function (mainDoc, parentDoc) {
											//生成同意信息
											callback(doc);
										})                                     
                                    })
                                })
                            }
                        });
                    } else {
                        self.companyDao.findOne({id: doc1.basic.companyId}, function (doc3) {
                            if (doc3) {
                                var companyInformation = {};
                                companyInformation.userCompanyRole = {characterId: '3', characterName: '普通成员', characterType: 'member', status: 'true'};
                                companyInformation.userCompanyInformation = {};
                                companyInformation.userCompanyInformation.joinTime = new Date();
                                companyInformation.userCompanyInformation.exitTime = new Date();
                                companyInformation.basic = doc3.basic;
                                companyInformation.id = doc3.id;
                                companyInformation.dept = {};
                                self.dao.updateArrayHaveCallback({'id': doc.id}, {'$push': {'companyInformation': companyInformation}}, function (docs) {
                                    if (docs == '1') {
                                        cacheData.getUpdateUserCompanyRole(doc.id, doc3.id);
                                        var doc2 = {id: doc1.id, 'basic.replyId': doc.id, 'basic.state': 'agree'}
                                        self.informationDao.update(doc2, function (doc2) {
                                            callback(doc);
                                        })
                                    }
                                })
                            }

                        })
                    }
                })
            }
        })
    },

    /******************************好友添加 列表 删除****************************************/

    //查找好友
    findUser: function (req, res) {
        var self = this;
        var cookie = req.cookies;
        //var user = JSON.parse(cookie.user);
        var userId=cookie.userid;
        var contactValue = req.param('contactValue');
        console.log('contactValue',contactValue);
		//通过注册账号 昵称查找人
        self.dao.findOne({
            '$or': [{
                "contactInformation": {
                    "$elemMatch": {
                        contactValue: contactValue
                    }
                }
            }, {'basic.userNickName': contactValue}]
        }, function (doc) {
            if (doc) {
                var query = {
                    'head': doc.basic.head,
                    'userName': doc.basic.userName,
                    'contactValue': contactValue,
                    'id': doc.id
                };
                var result = {};
                if (doc.personalAddress.length > 0) {
                    doc.personalAddress.forEach(function (file, i) {
                        if (file.userId == userId) {
                            result.msg = '对方已经是你的好友';
                        }
                    })
                }

                result.status = 'success';
                result.list = query;
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(result);
                res.end(str);
            } else {
                util.returnV(res, 'failed', '该好友不在平台内');
            }
        });
        /*self.dao.findOne({"contactInformation": {"$elemMatch": {contactValue: contactValue,
            registerTag: "true"}}}, function (doc) {
            if (doc) {

                var query = {'head': doc.basic.head, 'userName': doc.basic.userName, 'contactValue': contactValue, 'id': doc.id};
                var result = {};
                if (doc.personalAddress.length > 0) {
                    doc.personalAddress.forEach(function (file, i) {
                        if (file.userId == userId) {
                            result.msg = '对方已经是你的好友';
                        }
                    })
                }

                result.status = 'success';
                result.list = query;
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(result);
                res.end(str);
            } else {
                util.returnV(res, 'failed', '该好友不在平台内');
            }
        })*/
    },
    //添加好友信息
    addInformation: function (req, res) {
        var self = this;
        var contactValue = req.param('contactValue');
        var replyId = req.param('userId');
        var nickName = req.param('nickName');
        var text = req.param('text');
        var cookie = req.cookies;
        //var user = JSON.parse(cookie.user);
        var userId=cookie.userid;
        //是否已经是好友判断
        self.dao.findOne({id: userId, "personalAddress": {"$elemMatch": {userId: replyId}}}, function (doc) {
            if (doc != null) {
                util.returnV(res, 'failed', '对方已经是你的好友');
            } else {
                //是否已经发送过未被处理的好友请求
                self.informationDao.findOne({'basic.type': {$in: ['friendInvitation', 'friendNotice']}, 'basic.userId': userId, 'basic.replyId': replyId, 'basic.state': 'wait'}, function (doc2) {
                    if (doc2) {
                        util.returnV(res, 'failed', '好友请求已存在');
                    } else {
                        self.informationDao.findOne({'basic.type': {$in: ['friendInvitation', 'friendNotice']}, 'basic.userId': replyId, 'basic.replyId': userId, 'basic.state': 'wait'}, function (doc3) {
                            if(doc3){
                                util.returnV(res, 'failed', '好友请求已存在');
                            }else{
                                var information = {
                                    'basic': {
                                        'publishTime': new Date(),
                                        'userId': '',
                                        'type': '',
                                        'replyId': '',
                                        'remark': '',
                                        'state': ''
                                    },
                                    'content': {
                                        'text': '',
                                        'notice': '请求添加你为好友'
                                    }
                                };
                                information.basic.type = 'friendInvitation';
                                information.basic.remark = nickName;
                                information.basic.userId = userId;
                                information.basic.replyId = replyId;
                                information.basic.state = 'wait';
                                information.content.text = text;
                                self.informationDao.insert(information, null, function (doc1) {
                                    util.returnV(res, 'success', '等待对方同意');
                                });
                            }
                        });
                    }
                })

            }

        })

    },
     //互相添加为好友
    addUser: function (req, res) {
        var self = this;
        var state = req.param('state');
        var informationId = req.param('id');
        var result = {};
        var notice = '';
        if (state == 'accept') {
            notice = '同意成为您的好友';
        } else {
            notice = '拒绝成为您的好友';
        }
		//将好有添加信息状态进行修改
        self.informationDao.updateArray({'id': informationId}, {'$set': {'basic.state': state}}, function (doc) {
        });
        //判断对方是否接受
        if (state == 'accept') {
            self.informationDao.findOne({'id': informationId}, function (doc) {
                var userId = doc.basic.userId;
                var replyId = doc.basic.replyId;
                var mainDoc = {};
                var parentDoc = {};
                var ep=new EventProxy();
                self.dao.findOne({'id': replyId}, function (doc2) {
                    //回复人的完整信息
                    mainDoc.userName=doc2.basic.userName;
                    mainDoc.userNickName=doc2.basic.userNickName;
                    mainDoc.userId=doc2.id;
                    mainDoc.head=doc2.basic.head;
                    mainDoc.remark = doc2.basic.userName;
                    if(doc.basic.remark){
                        mainDoc.remark = doc.basic.remark;
                    }
                    self.dao.updateArray({'id': userId}, {'$push': {'personalAddress': mainDoc}}, function (doc) {
                        ep.emit('mainDoc',doc2);
                    });
                });
                    self.dao.findOne({'id': userId}, function (doc1) {
						//自己的完整信息
                        parentDoc.userName=doc1.basic.userName;
                        parentDoc.userNickName=doc1.basic.userNickName;
                        parentDoc.userId=doc1.id;
                        parentDoc.head=doc1.basic.head;
                        parentDoc.remark = doc1.basic.userName;
						//修改回复人好友列表
                        self.dao.updateArray({'id': replyId}, {'$push': {'personalAddress': parentDoc}}, function (doc) {
                            ep.emit('parentDoc',parentDoc)
                        });

                    })
                ep.all('mainDoc','parentDoc',function (mainDoc,parentDoc) {
                    //生成同意信息
                    var friendNotice = {
                        'basic': {
                            'type': '',
                            'userId': '',
                            'replyId': '',
                            'publishTime': new Date()
                        },
                        'content': {
                            'text': '',
                            'notice': '同意成为您的好友'
                        }
                    }
                    friendNotice.basic.type = 'friendNotice';
                    friendNotice.basic.userId = replyId;
                    friendNotice.basic.replyId = userId;
                    friendNotice.content.text = '添加成功';
                    self.informationDao.insert(friendNotice, null, function (docs) {
                        result.status = 'success';
                        result.list = {'friendNoticeId': docs.id};
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(result);
                        res.end(str);
                    });
                })
                })
        } else {
            util.returnV(res, 'success', '拒绝添加');
        }
    },
	// 通知提醒
	showPagePrompt: function (req, res) {
        var self = this;
        var cookie = req.cookies;
        //var user = JSON.parse(cookie.user);
        var userId=cookie.userid;
        if(userId){
            self.dao.findOne({id:userId},function(user){
                if(user){
                    //展示信息类型查找条件
                    var query = {'basic.state':'wait','basic.type': {'$in': ['friendInvitation', 'groupInvite', 'friendNotice']}, 'basic.replyId': {"$in": [user.id, user.contactInformation[0].contactValue]}};
                    self.informationDao.total(query, function (count) {
                        var result = {};
                        result.status = 'success';
                        result.total = count;
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(result);
                        res.end(str);
                    })
                }else{
                    var result = {};
                    result.status = 'success';
                    result.total = 0;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(result);
                    res.end(str);
                }
            })
        }else{
            var result = {};
            result.status = 'success';
            result.total = 0;
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        }
    },
    //添加好友信息显示
    showPage: function (req, res) {
        var self = this;
        var cookie = req.cookies;
        //var user = JSON.parse(cookie.user);
        var userid=cookie.userid;
        var page = req.param("page");
        page = JSON.parse(page);
        var pageSize = page.pageSize;
        var pageNum = page.pageNo;

        self.dao.findOne({id:userid},function(user){
            if(user){
                //展示信息类型查找条件
                var query = {'basic.type': {'$in': ['friendInvitation', 'groupInvite', 'friendNotice']}, 'basic.replyId': {"$in": [user.id, user.contactInformation[0].contactValue]}};
                var sort = {'basic.publishTime': -1};
                self.informationDao.list(query, null, sort, null, null, function (docs) {
                    //判断是否有需要显示的信息
                    if (docs.length > 0) {
                        var thenObj = then(function (defer) {
                            var count = 0;
                            var list = [];
                            docs.forEach(function (file) {
                                self.dao.findOne({'id': file['basic']['userId']}, function (doc) {
                                    count++;
                                    if (doc) {
                                        list.push(doc);
                                    }
                                    if (count == docs.length) {
                                        defer(null, docs, list);
                                    }
                                })
                            })

                        }).then(function (defer, docs, list) {
                            for (var i = 0; i < docs.length; i++) {
                                for (var j = 0; j < list.length; j++) {
                                    //展示信息补全
                                    if (docs[i]['basic']['userId'] == list[j]['id']) {
                                        docs[i]['basic']['userName'] = list[j]['basic']['userName'];
                                        docs[i]['basic']['head'] = list[j]['basic']['head'];
                                    }
                                }
                            }
                            defer(null, docs);
                        }).then(function (defer, docs) {
                            docs.sort(getSortFun('desc', 'basic.publishTime'));
                            function getSortFun(order, sortBy) {
                                var ordAlpah = (order == 'asc') ? '>' : '<';
                                var sortFun = new Function('a', 'b', 'return a.' + sortBy + ordAlpah + 'b.' + sortBy + '?1:-1');
                                return sortFun;
                            }

                            var result = {};
                            result.total = docs.length;
                            var docs2 = docs.slice((pageNum - 1) * pageSize, pageNum * pageSize);
                            result.status = 'success';
                            result.list = docs2;
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var str = JSON.stringify(result);
                            res.end(str);
                        })
                    } else {
                        self.informationDao.total(query, function (count) {
                            var result = {};
                            result.status = 'success';
                            result.list = docs;
                            result.total = count;
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var str = JSON.stringify(result);
                            res.end(str);
                        })
                    }
                })
            }else{
                var result = {};
                result.status = 'success';
                result.list = [];
                result.total = 0;
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(result);
                res.end(str);
            }

        })
    },

    //根据条件查询好友列表
    friendQuery: function (req, res) {
        var self = this;
        var cookie = req.cookies;
        //var user = JSON.parse(cookie.user);
        var userid=cookie.userid;
        var page = req.param('page');
        var condition1 = req.param('conditions');
        var condition = JSON.parse(condition1);
        var spell = '';
        var userName = '';
        if (condition.spell) {
            spell = condition.spell.toUpperCase();
        }
        if (condition.userName) {
            userName = condition.userName;
        }
        page = JSON.parse(page);
        var pageSize = page.pageSize;
        var pageNum = page.pageNo;
        var sort = null;
        self.dao.findOne({id: userid}, function (doc) {
            var list = doc.personalAddress;
            var doc1 = list;
            var docs = [];
			//判断是否拥有好友
            if (doc1 && doc1.length > 0) {
                var count = 0;
                doc1.forEach(function (file, i) {

                    var query1;
                    var doc3 = {};
					/* 
                        好友搜索条件生成（有昵称时通过userName查询首先匹配昵称即remark）
                        分为四种情况
                        1.既有首字母也有用户名
                        2.通过首字母查询
                        3.通过用户名查询
                        4.用户好友列表
					*/
                    if (spell != '' && userName != '') {
                        var userName2 = new RegExp(userName, 'i');
                        var userName1 = util.transliterate(file.userName);
                        if (userName2.test(file.userName) && userName1.substring(0, 1).toUpperCase() == spell) {
                            query1 = {
                                id: file.userId,
                                'basic.userName': {
                                    $regex: userName
                                },
                                'basic.firstSpell': spell
                            };
                        }
                    }
                    if (spell != '' && userName == '') {
                        var userName1 = util.transliterate(file.userName);
                        if (userName1.substring(0, 1).toUpperCase() == spell) {
                            query1 = {
                                'id': file.userId,
                                'basic.firstSpell': spell
                            };
                        }
                    }
                    if (userName != '' && spell == '') {
                        var userName1 = new RegExp(userName, 'i');
                        if (userName1.test(file.userName)) {
                            query1 = {
                                id: file.userId,
                                'basic.userName': {
                                    $regex: userName
                                }
                            };
                        } else {
                            if (file.remark) {
                                if (userName1.test(file.remark)) {
                                    query1 = {
                                        id: file.userId
                                    };
                                }
                            }
                        }
                    }
                    if (spell == '' && userName == '') {
                        query1 = {
                            id: file.userId
                        };
                    }
                    self.dao.findOne(query1, function (doc2) {
                        if (query1 != undefined) {
                            count++;
                            doc3 = {
                                id: doc2.id,
                                head: doc2.basic.head,
                                userName: doc2.basic.userName,
                                remark: file.remark,
                                spell: doc2.basic.spell
                            };
                            doc2.contactInformation.forEach(function (file1, k) {

                               if (file1.contactType == 'register') {
                                    doc3.email = file1;
                                }
                                if (file1.contactType == 'email') {
                                    doc3.email = file1;
                                }
                                if (file1.contactType == 'phone') {
                                    doc3.mobileNO = file1;
                                }
                            });
                            docs.push(doc3);
                        } else {
                            count++;
                        }

                        if (count == doc1.length) {
                            if(page.pageNo){
                                var docs1 = docs.slice((pageNum - 1) * pageSize, pageNum * pageSize);
                            }
                            docs1.sort(util.getSortFun('asc', 'spell'));
                            res.writeHead(200, {
                                "Content-Type": "text/html"
                            });
                            var returnValue = {
                                status: 'success',
                                list: docs1,
                                total: docs.length
                            };
                            var str = JSON.stringify(returnValue);
                            res.end(str);
                        }

                    })

                })
            } else {
                res.writeHead(200, {
                    "Content-Type": "text/html"
                });
                var returnValue = {
                    status: 'success',
                    list: [],
                    total: docs.length
                };
                var str = JSON.stringify(returnValue);
                res.end(str);
            }
        })

    },
    //好友列表修改好友昵称
    updateNickName: function (req, res) {
        var self = this;
        var doc = req.body;
        self.dao.updateArray({id: doc.id, 'personalAddress.userId': doc.userId}, {'$set': {'personalAddress.$.remark': doc.nickName}}, function (doc1) {
            util.returnV(res, 'success', '修改成功');
        })
    },

    //删除好友
    delFriend: function (req, res) {
        var self = this;
        var cookie = req.cookies;
        var userid=cookie.userid;
        var userId = req.param('id');
        self.dao.updateArray({'id': userid}, {$pull: {personalAddress: {userId: userId}}}, function (doc) {
            self.dao.updateArray({'id': userId}, {$pull: {personalAddress: {userId:userid}}}, function (doc2) {
                util.returnV(res, 'success', '好友删除成功');
            })
        })
    },


    preGetMsg: function (req, res, id, callback) {
        callback(id);
    },


    suffixGetMsg: function (req, res, doc, callback) {
        if (doc) {
            var msg = {};
            msg.basic = {};
            msg.id = doc.id;
            msg.basic.head = doc.basic.head;
            msg.basic.userName = doc.basic.userName;
            doc.contactInformation.forEach(function (item) {
                msg[item.contactType] = item;
            });
            callback(msg);
        } else {
            callback(doc);
        }
    },
    /**********************redis中获取信息*********************************/
    //邀请多人加入
    inviteManyPerson: function (req,res) {
		var body=req.body;
		var count=0;
		var emailNum=body.contactValue;
		var ep1=new EventProxy();
			emailNum.forEach(function (file) {
				/*
				 * 发送邀请邮件
				 * */
				util.sendInviteEmail('', '', file.contactValue, function (status, captcha) {
					if (status == 'failed') {
						file.status='failed';
						file.msg='发送邀请失败！';
						count++;
						if(count==emailNum.length){
							ep1.emit('emailNum',emailNum);
						}
					} else {
						count++;
							if(count==emailNum.length){
								ep1.emit('emailNum',emailNum);
							}
					}
				});
			});
			ep1.all('emailNum', function (docs) {
				res.writeHead(200, {"Content-Type": "text/html"});
				var returnValue = {status: 'success', list: docs};
				var str = JSON.stringify(returnValue);
				res.end(str);
			})
	},
    //修改个人信息
    updateUserInfo:function(req,res){
        var self=this;
        var id=req.param('id');
        var head=req.body.head;
        var tempDoc={
            status:'failed',
            msg:"修改失败！"
        };
        then(function(defer){
            self.dao.updateArray({id:id},{'$set':{'basic.head':head}},function(doc){
                if(doc){
                    tempDoc.status="success";
                    tempDoc.msg="修改成功！";

                }
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(tempDoc);
                res.end(str);
                defer(null);
            })
        }).then(function(defer){
            self.dao.findOne({id:id},function(doc){
                if(doc){
                    cacheData.updateData(doc)
                }
            })
        });
    }
});
