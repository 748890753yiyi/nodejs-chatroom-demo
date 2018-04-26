var Restful = require("../Restful");
var config = require('../config');
var Dao = require("../dao");
var util=require('../util');
var EventProxy=require('eventproxy');
var GroupRestful = module.exports = Restful.extend({
    initialize: function () {
        this.dao = Dao.new(config.dbGroup);
        this.fileDao = Dao.new(config.dbFile);
        this.userDao = Dao.new(config.dbUser);
        this.informationDao = Dao.new(config.dbInformation);
    },

    //人数统计：用于统计组成员总数
    personCount: function (req,res) {
        var self=this;
        self.dao.list({},{id:1,basic:1},null,null,null, function (docs) {
            //var counter=0
            var list=[];
            docs.forEach(function (file) {
                self.userDao.total({'groupInformation.id':file.id}, function (count) {
                    var doc={name:file.basic.name,y:count};
                    list.push(doc);
                })
                list.sort(util.getSortFun('desc','y'));
                list=list.slice(0,9);
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(list);
                res.end(str);
            })
        })
    },

    //组列表
    groupList: function (req,res) {
        var self=this;
        var condition=JSON.parse(req.param('conditions'));
        var page = req.param("page");
        page = JSON.parse(page);
        var pageSize = page.pageSize;
        var pageNum = page.pageNo;

        var query1=[];
        var query2=[];
        var name=condition.name;
        if(name){
            query1=[{"$project":{_id:0,id:1,basic:1,groupInformation:1,contactInformation:1}} ,
                {"$unwind":"$groupInformation"},
                {"$match":{'$or':[{'basic.userName':{$regex:name},'groupInformation.role.id':'1'}
                    ,{'groupInformation.basic.name':{$regex:name},'groupInformation.role.id':'1'}
                    ,{'contactInformation':{'$elemMatch':{'contactValue':{$regex:name},'registerTag':'true'}}
                        ,'groupInformation.role.id':'1'}]}
                },
                {"$sort":{'groupInformation.basic.stopLogin':1,'groupInformation.basic.name':1,'groupInformation.basic.spell':1}},
                {"$skip":(pageNum-1)*pageSize},
                {"$limit":pageSize}
            ];
            query2=[{"$project":{_id:0,id:1,basic:1,groupInformation:1,contactInformation:1}} ,
                {"$unwind":"$groupInformation"},
                {"$match":{'$or':[{'basic.userName':{$regex:name},'groupInformation.role.id':'1'}
                    ,{'groupInformation.basic.name':{$regex:name},'groupInformation.role.id':'1'}
                    ,{'contactInformation':{'$elemMatch':{'contactValue':{$regex:name},'registerTag':'true'}}
                        ,'groupInformation.role.id':'1'}]}
                }
            ];
        }
        if(name){
            self.userDao.findDataByAggregate(query2, function (docs1) {
            self.userDao.findDataByAggregate(query1, function (docs) {
                if (docs.length > 0) {
                    var counts = 0;
                docs.forEach(function (file) {
                    file.id=file.groupInformation.id;
                    file.basic.name = file.groupInformation.basic.name;
                    file.basic.type = file.groupInformation.basic.type;
                    self.userDao.total({'groupInformation.id': file.id}, function (total) {
                        self.dao.findOne({id: file.groupInformation.id}, function (doc) {
                            file.basic.createTime = doc.extend.createTime;
                            file.basic.personCount = total;
                            if (total > 4) {
                                var initList = [];
                                var dd = new Date();
                                self.informationDao.find({'basic.groupId': file.id, 'basic.publishTime': {$gte: new Date(dd.getFullYear() + ',' + dd.getMonth() + ',' + (dd.getDate() - 30)), $lte: new Date()}/* , 'basic.type': 'groupChat' */}, function (total1) {
                                    for (var i = 0; i < total1.length; i++) {
                                        if (total1[i] == undefined) {
                                            continue;
                                        }
                                        var listOne = [];
                                        listOne.push(total1[i]);
                                        for (var j = i + 1; j < total1.length; j++) {
                                            if (total1[j] == undefined) {
                                                continue;
                                            }
                                            if (total1[i]['basic']['userId'] == total1[j]['basic']['userId'] && total1[i]['basic']['toId'] == total1[j]['basic']['toId']) {
                                                listOne.push(total1[j]);
                                                delete total1[j];
                                            }
                                        }
                                        initList.push(listOne);
                                    }

                                    if ((initList.length / total) >=0.4) {
                                        file.basic.liveness = '活跃';//活跃度
                                        counts++;
                                        if (counts == docs.length) {
                                            var returnValue = {'status': 'success', list: docs, total: docs1.length};
                                            res.writeHead(200, {"Content-Type": "text/html"});
                                            var str = JSON.stringify(returnValue);
                                            res.end(str);
                                        }
                                    } else {
                                        file.basic.liveness = '不活跃';//活跃度
                                        counts++;
                                        if (counts == docs.length) {
                                            var returnValue = {'status': 'success', list: docs, total: docs1.length};
                                            res.writeHead(200, {"Content-Type": "text/html"});
                                            var str = JSON.stringify(returnValue);
                                            res.end(str);
                                        }
                                    }
                                })
                            } else {
                                file.basic.liveness = '不活跃';//活跃度
                                counts++;
                                if (counts == docs.length) {
                                    var returnValue = {'status': 'success', list: docs, total: docs1.length};
                                    res.writeHead(200, {"Content-Type": "text/html"});
                                    var str = JSON.stringify(returnValue);
                                    res.end(str);
                                }
                            }
                        })
                    })
                })
            }else{
                var returnValue = {'status': 'success', list: docs, total: docs1.length};
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(returnValue);
                res.end(str);
            }
            })
        })
        }else{
            self.dao.total(query1, function (total) {
                self.dao.list(query1,{'basic':1,extend:1,id:1},{'basic.name':1},pageNum,pageSize, function (docs1) {
                    var counts = 0;
                    if (docs1.length>0) {
                        docs1.forEach(function (file) {
                            self.userDao.findOne({'groupInformation': {$elemMatch: {'id': file.id, 'role.id': '1'}}}, function (doc) {
                                if (doc) {
                                    self.userDao.total({'groupInformation.id': file.id}, function (count1) {
                                        file.basic.userName = doc.basic.userName;
                                        file.basic.personCount = count1;
                                        file.basic.createTime = file.extend.createTime;
                                        if (count1 >= 4) {
                                            var initList = [];
                                            var dd = new Date();
                                            self.informationDao.find({/* 'basic.type': 'groupChat', */'basic.groupId': file.id, 'basic.publishTime': {$gte: new Date(dd.getFullYear() + ',' + dd.getMonth() + ',' + (dd.getDate() - 30)), $lte: new Date()}}, function (docs) {
                                                if (docs.length > 0){
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
                                                if ((initList.length / count1) >= 0.4) {
                                                    file.basic.liveness = '活跃';//活跃度
                                                    counts++;
                                                    if (counts == docs1.length) {
                                                        var returnValue = {'status': 'success', list: docs1, total: total};
                                                        res.writeHead(200, {"Content-Type": "text/html"});
                                                        var str = JSON.stringify(returnValue);
                                                        res.end(str);
                                                    }
                                                } else {
                                                    file.basic.liveness = '不活跃';//活跃度
                                                    counts++;
                                                    if (counts == docs.length) {
                                                        var returnValue = {'status': 'success', list: docs, total: total};
                                                        res.writeHead(200, {"Content-Type": "text/html"});
                                                        var str = JSON.stringify(returnValue);
                                                        res.end(str);
                                                    }
                                                }
                                                }else {
                                                    file.basic.liveness = '不活跃';//活跃度
                                                    counts++;
                                                    if (counts == docs1.length) {
                                                        var returnValue = {'status': 'success', list: docs1, total: total};
                                                        res.writeHead(200, {"Content-Type": "text/html"});
                                                        var str = JSON.stringify(returnValue);
                                                        res.end(str);
                                                    }
                                                }
                                            })

                                        } else {
                                            file.basic.liveness = '不活跃';//活跃度
                                            counts++;
                                            if (counts == docs1.length) {
                                                var returnValue = {'status': 'success', list: docs1, total: total};
                                                res.writeHead(200, {"Content-Type": "text/html"});
                                                var str = JSON.stringify(returnValue);
                                                res.end(str);
                                            }
                                        }

                                    })
                                } else {
                                    counts++;
                                    if (counts == docs1.length) {
                                        var returnValue = {'status': 'success', list: docs1, total: total};
                                        res.writeHead(200, {"Content-Type": "text/html"});
                                        var str = JSON.stringify(returnValue);
                                        res.end(str);
                                    }
                                }
                            })

                        })
                    }else{
                        var returnValue = {'status': 'success', list: docs1, total: total};
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(returnValue);
                        res.end(str);
                    }
                })
            })
        }
    },

    //详细信息页面显示上部
    groupDetailTop: function (req,res) {
        var id=req.param('id');
        var ep=new EventProxy();
        var self=this;
        self.dao.findOne({id:id}, function (doc) {
            self.userDao.findOne({'groupInformation':{$elemMatch:{'id':doc.id,'role.id':'1'}}}, function (user) {
                doc.basic.userName=user.basic.userName;
                ep.emit('group',doc);
            })
        })
        self.fileDao.list({mainId:id,parentId:'-1'},{size:1},null,null,null, function (docs) {
            var sizes=0;
            for(var i=0;i<docs.length;i++){
                sizes+=docs[i]['size']
            }
            ep.emit('size',sizes)
        })
        ep.all('group','size', function (group,size) {
            self.userDao.total({'groupInformation.id':id}, function (count) {
                group.basic.personCount=count;
                group.basic.fileSize=size;
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(group);
                res.end(str);
            })

        })
    },

    //详细信息页面显示下部
    groupDetail: function (req,res) {
        var condition=JSON.parse(req.param('conditions'));
        var id=condition.id;
        var page = req.param("page");
        page = JSON.parse(page);
        var pageSize = page.pageSize;
        var pageNum = page.pageNo;
        var self=this;
        var query=[{"$project":{_id:0,id:1,basic:1,groupInformation:1,contactInformation:1}},
            {"$unwind":"$groupInformation"},
            {"$match":{'groupInformation.id':id}},
            {"$sort":{'groupInformation.role.id':1,'basic.spell':1,'basic.stopLogin':1}},
            {"$skip":(pageNum-1)*pageSize},
            {"$limit":pageSize}
        ];
        self.userDao.total({'groupInformation.id':id}, function (total) {
            self.userDao.findDataByAggregate(query, function (docs) {
                var counts=0;
                docs.forEach(function (file) {
                    self.informationDao.total({'basic.groupId':id,'basic.userId':file.id}, function (count) {
                        if(!file.groupInformation.roleExtend.isSpeak||file.groupInformation.roleExtend.isSpeak=='true'){
                            file.groupInformation.roleExtend.isSpeak = 'true';
                        }else if(file.groupInformation.roleExtend.isSpeak!='false'&&new Date(file.groupInformation.roleExtend.isSpeak)<new Date()){
                            self.userDao.updateArray({id:file.id,'groupInformation.id':file.groupInformation.id},{$set:{'groupInformation.$.roleExtend.isSpeak':'true'}}, function () {
                                file.groupInformation.roleExtend.isSpeak='true';
                            })
                        }else {
                            file.groupInformation.roleExtend.isSpeak = 'false';
                        }
                        counts++
                        file.basic.messageCount=count;
                        if(counts==docs.length){
                            var returnValue={'status':'success',list:docs,total:total}
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var str = JSON.stringify(returnValue);
                            res.end(str);
                        }
                    })

                })

            })
        })
    },
    //停用，启用组
    enableOrNotGroup: function (req,res) {
        var self=this;
        var id=req.param('id');
        var operate=req.param('operate');
        self.dao.updateArray({id:id},{$set:{'basic.stopLogin':operate}}, function (doc1) {


        self.userDao.updateArray({'groupInformation.id':id},{$set:{'groupInformation.$.basic.stopLogin':operate}}, function () {
            var returnValue={}
            if(operate=='true'){
                returnValue = {status: 'success', 'msg': '停用成功'}
            }else{
                returnValue = {status: 'success', 'msg': '启用成功'}
            }

            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(returnValue);
            res.end(str);
        })
        })
    },

    //移交管理员权限组
    removeRootGroup: function (req,res) {
        var rootId=req.param('rootId');
        var mainId=req.param('mainId');
        var groupOrCompany=req.param('id');
        var type=req.param('type');
        var self=this;
        var value={
            "id" : "3",
            "name" : "成员",
            "type" : "member",
            "typeLevel" : "primary",
            "status" : "true"
        };
        var    queryRoot={id:rootId,'groupInformation.id':groupOrCompany};
        var    setValueRoot={$set:{'groupInformation.$.role': value}}
        var    queryMain={id:mainId,'groupInformation.id':groupOrCompany};
        var    setValueMain={$set:{'groupInformation.$.role': {
            "id" : "1",
            "name" : "超级管理员",
            "type" : "super",
            "typeLevel" : "high",
            "status" : "true"
        }}}
        self.dao.updateArray(queryRoot,setValueRoot, function () {
            self.dao.updateArray(queryMain,setValueMain, function () {

                var returnValue={status:'success','role':value,'msg':'修改成功'}
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(returnValue);
                res.end(str);
            })
        })

    },
    //组人员列表
    groupPersonList: function (req,res) {
        var self=this;
        var condition=JSON.parse(req.param('conditions'));
        var id=condition.id;
        var name=condition.name;
        var query1={};
        if(id){
            query1['groupInformation'] ={"$elemMatch": {id: id,$or:[{'role.status': "true"},{'role.status':{$exists:false}}]}};
        }
        if(name){
            query1['basic.firstSpell']=name;
        }
        var page = req.param("page");
        page = JSON.parse(page);
        var pageSize = page.pageSize;
        var pageNum = page.pageNo;
        self.dao.total(query1, function (total) {
            self.dao.list(query1,{id:1,basic:1},{'basic.spell':1},pageNum,pageSize, function (docs) {
                var returnValue={status:'success','list':docs,total:total}
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(returnValue);
                res.end(str);
            })
        })
    }
})