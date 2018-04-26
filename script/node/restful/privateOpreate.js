var Restful = require("../Restful");
var config = require('../config');
var uuid = require('node-uuid');
var Dao = require("../dao1");
var path = require('path');
var then = require('thenjs');
var redis = require('../redisClient');
var cacheData = require('../cacheData');
var EventProxy = require('eventproxy');
var DB = require('../DBClient');
var groupDao=require('../group/groupDao');
var groupService=require('../group/groupService');

var privateOperate = module.exports = Restful.extend({
    initialize: function () {
        this.dao = Dao.new(config.dbUser);
        this.informationDao = Dao.new(config.dbInformation);

    },


    messageList: function (req,res) {
        var self = this;
        var cookie = req.cookies;
        //var user = JSON.parse(cookie.user);
        var userid=cookie.userid;
        var query = {'basic.toId': userid,'basic.state':false};
        var ep = new EventProxy();
        var initList = [];
        self.informationDao.find(query, function (docs) {
            for (var i = 0; i < docs.length; i++) {
                if (docs[i] == undefined) {
                    continue;
                }
                var listOne = [];
                listOne.push(docs[i]);
                for (var j = i + 1; j < docs.length; j++) {
                    if (docs[j] == undefined) {
                        continue;
                    }
                    if (docs[i]['basic']['userId'] == docs[j]['basic']['userId'] && docs[i]['basic']['toId'] == docs[j]['basic']['toId']) {
                        listOne.push(docs[j]);
                        delete docs[j];
                    }
                }
                initList.push(listOne);
            }
            ep.emit('initList', initList);
        })
        ep.all('initList', function (initList) {
            var list=[];
            redis.newRedis(function (err, redisClient) {
                redisClient.hgetall("user", function (err, data) {
                    initList.forEach(function (msg, i) {
                        var total={};
                        var userId = msg[0]['basic']['fromId'];
                        var user = JSON.parse(data[userId]);
                        total['id'] = user.id;
                        total['userName'] = user.basic.userName;
                        total['head'] = user.basic.head;
                        total['count']=msg.length;
                        list.push(total);
                    });
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var returnValue = {status: 'success', list: list};
                    var str = JSON.stringify(returnValue);
                    res.end(str);
                    redis.close(redisClient);
                })
            })
        })

    },


    //��Ϣ�б�
    message: function (req,res) {
        var self = this;
        var userId = req.param("fromId");
        var toId = req.param("toId");
        var startNo = parseInt(req.param('startNO'));
        var startNum = parseInt(req.param('number'));
        var query={$or:[{'basic.userId':userId,'basic.toId':toId},{'basic.userId':toId,'basic.toId':userId}]};
        //�鿴�ظ�
        self.informationDao.listFlog(query, null, {'basic.publishTime':-1}, startNo, startNum, function (docs) {
			if(docs.length>0){
				redis.newRedis(function (err, redisClient) {
                    redisClient.hgetall("user", function (err, data) {
                        docs.forEach(function (msg, i) {
                            var userId = msg.basic.fromId;
                            var user = JSON.parse(data[userId]);
                            msg.basic.userName = user.basic.userName;
                            msg.basic.head = user.basic.head;                          
						})
						res.writeHead(200, {"Content-Type": "text/html"});
						var str = JSON.stringify(docs);
						res.end(str);
					})							
					redis.close(redisClient);
				});
			}else{
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify([]);
				res.end(str);
			}
			
           
        })
    },


    //��Ϣ״̬�޸�

    updateMessageState: function (req,res) {
        var self = this;
        var userId = req.param("userId");
        var toId = req.param("toId");
        self.informationDao.updateArray({'basic.userId':userId,'basic.toId':toId},{$set:{'basic.state':true}}, function (doc) {
            res.writeHead(200, {"Content-Type": "text/html"});
            var returnValue = {status: 'success', msg: '�Ѷ�'};
            var str = JSON.stringify(returnValue);
            res.end(str);
        })
    },


	findNoReadMsgCount: function(req,res){
		var cookie=req.cookies;
		//var userMsg=JSON.parse(cookie.user);
        var userId=cookie.userid;
		var query={'basic.toId':userId,'basic.state':false};
		groupDao.total(query,config.dbInformation,function(count){
			var returnValue={status:"success",count:count,msg:'�ɹ�'};
			res.writeHead(200, {"Content-Type": "text/html"});
			var str = JSON.stringify(returnValue);
			res.end(str);
		})
	},
	//��ҳ��Ϣ�б�
    firstPageList: function (req,res) {
        var cookie=req.cookies;
        //var user=JSON.parse(cookie.user);
        var userid=cookie.userid;
        var companyId=req.param('companyId');
        var self = this;
        var query = {'basic.toId': userid,'basic.state':false};
        var thenObj = then(function (defer) {
            var ep = new EventProxy();
            var initList = [];
            self.informationDao.find(query, function (docs) {
                if(docs.length>0){
                for (var i = 0; i < docs.length; i++) {
                    if (docs[i] == undefined) {
                        continue;
                    }
                    var listOne = [];
                    listOne.push(docs[i]);
                    for (var j = i + 1; j < docs.length; j++) {
                        if (docs[j] == undefined) {
                            continue;
                        }
                        if (docs[i]['basic']['userId'] == docs[j]['basic']['userId'] && docs[i]['basic']['toId'] == docs[j]['basic']['toId']) {
                            listOne.push(docs[j]);
                            delete docs[j];
                        }
                    }
                    initList.push(listOne);
                }
                ep.emit('initList', initList);
                }else{
                    ep.emit('initList', initList);
                }
            })
            ep.all('initList', function (initList) {
                var list=[];
                redis.newRedis(function (err, redisClient) {
                    redisClient.hgetall("user", function (err, data) {
                        initList.forEach(function (msg, i) {
                            var total={};
                            var userId = msg[0]['basic']['fromId'];
                            var user = JSON.parse(data[userId]);
                            total['id'] = user.id;
                            total['userName'] = user.basic.userName;
                            total['head'] = user.basic.head;
                            total['count']=msg.length;
                            list.push(total);
                        });
                        defer(null.list);
                    })
                })
            })

        }).then(function (defer, list) {
            groupService.allGroupList(userid,companyId,function(docs){
                var counter=0;
                if(docs.length>0){
                    var tempLength=docs.length;
                    docs.forEach(function(doc){
                        var groupId=doc.groupInformation.id;
                        groupService.unReadMsgCount(userid,groupId,function(count){
                            counter++;
                            doc.count=count;
                            if(counter==tempLength){
                                res.writeHead(200, {"Content-Type": "text/html"});
                                docs=docs.concat(list);
                                var str = JSON.stringify(docs);
                                res.end(str);
                                redis.close(redisClient);
                            }
                        })
                    })
                }else{
                    res.writeHead(200, {"Content-Type": "text/html"});
                    docs=docs.concat(list);
                    var str = JSON.stringify(docs);
                    res.end(str);
                    redis.close(redisClient);
                }
            });
        })

    }
	
})