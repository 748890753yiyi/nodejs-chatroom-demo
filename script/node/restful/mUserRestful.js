var Restful = require("../Restful");
var config = require('../config');
var Dao = require("../dao");
var util=require('../util');
var EventProxy=require('eventproxy');
var cacheData = require('../cacheData');
var UserRestful = module.exports = Restful.extend({
    initialize: function () {
        this.dao = Dao.new(config.dbUser);
        this.fileDao = Dao.new(config.dbFile);
        this.groupDao = Dao.new(config.dbGroup);
        this.companyDao = Dao.new(config.dbCompany);
		this.informationDao = Dao.new(config.dbInformation);

    },

    //用户列表显示
    userList: function (req,res) {
        var self=this;
        var condition=JSON.parse(req.param('conditions'));
        var province=condition.province;
        var name=condition.name;
        var query1={};
        if(province){
             query1['informationExtend.registerArea']={$regex:province};
        }
        if(name){
             query1['$or']=[{'basic.userName':{$regex:name}},{'contactInformation.contactValue':{$regex:name}}];
        }
        var page = req.param("page");
        page = JSON.parse(page);
        var pageSize = page.pageSize;
        var pageNum = page.pageNo;
        self.dao.total(query1, function (total) {
        self.dao.list(query1,{'id':1,'basic':1,'contactInformation':1,'informationExtend':1},{'basic.firstSpell':1},pageNum,pageSize, function (docs) {
            var count=0;
            docs.forEach(function (file) {
                self.informationDao.total({'basic.type':'groupReport','basic.toId':file.id}, function (totals) {
                    file.basic.reportCount=totals;
                    count++;
                    if(count==docs.length){
                    var returnValue={status:'success',list:docs,total:total}
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(returnValue);
                    res.end(str);
                    }
                })

            })

        })
        })
    },

    //查看详情上部
    personalDetailTop: function (req,res) {
        var id=req.param('id');
        var self=this;
        var ep=new EventProxy();
        self.dao.findOne({id:id}, function (doc) {
            var returnValue={};
            returnValue.id=id;
            if(doc.basic){
                returnValue.basic=doc.basic;
            }
            returnValue.contactInformation=doc.contactInformation;
            returnValue.informationExtend=doc.informationExtend;
            ep.emit('user',returnValue);
        })
        self.fileDao.list({mainId:id,parentId:'-1'},null,null,null,null, function (docs) {
            var sizes=0;
            docs.forEach(function (file) {
                sizes+=file.size
            })
            ep.emit('sizes',sizes);
        })
        ep.all('user','sizes', function (user,size) {
            user.basic.size=size;
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(user);
            res.end(str);
        })
    },

    //查看详情下部
    personalDetail: function (req,res) {
        var conditions=JSON.parse(req.param('conditions'));
        var id=conditions.id;
        var type=conditions.type;
        var self=this;
        var page = req.param("page");
        page = JSON.parse(page);
        var pageSize = page.pageSize;
        var pageNum = page.pageNo;
        self.dao.findOne({id:id}, function (doc) {

            var returnValue=[];
            var total='';
            //初始化的时候初始化初始化组列表，
            if(type=='group'){
                if(doc.groupInformation){
					doc.groupInformation.forEach(function(item){
						if(!item.roleExtend.isSpeak||item.roleExtend.isSpeak=='true'){
							item.roleExtend.isSpeak = 'true';
						}else if(item.roleExtend.isSpeak!='false'&&new Date(item.roleExtend.isSpeak)<new Date()){
							item.roleExtend.isSpeak = 'true';
							 self.dao.updateArray({id:id,'groupInformation.id':item.id},{$set:{'groupInformation.$.roleExtend.isSpeak':'true'}}, function () {
                            })
						}else /*if(item.roleExtend.isSpeak!='false')*/{
							item.roleExtend.isSpeak = 'false';
						}
					})
                    returnValue=doc.groupInformation;
                    total=doc.groupInformation.length;
                }else{
                    returnValue=[];
                    total=0;
                }
            }else if(type=='company'){
                if(doc.companyInformation){
                    returnValue=doc.companyInformation;
                    total=doc.companyInformation.length;
                }else{
                    returnValue=[];
                    total=0;
                }
            }else if(type='personalAddress'){
                if(doc.personalAddress){
                    returnValue=doc.personalAddress;
                    total=doc.personalAddress.length;
                }else{
                    returnValue=[];
                    total=0;
                }
            }
            returnValue=returnValue.slice((pageNum - 1) * pageSize, pageNum * pageSize);
            var doc={status:'success',list:returnValue,total:total}
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(doc);
            res.end(str);
        })
    },


    //设置取消管理员，禁言
    setAdmin: function (req,res) {
        //var condition=JSON.parse(req.param('condition'));
        var userId=req.param('userId');
        var id=req.param('id');
        var type=req.param('type');
        var operate=req.param('operate');
        var self=this;
        var query={};
        var setValue={};
        var role={};
        var ep=new EventProxy();
        if(type=='role'){//组角色设置
            self.dao.total({id:userId,'groupInformation':{$elemMatch:{'id':id,'role.id':'1'}}}, function (total) {
          if(total==0){
            query={id:userId,'groupInformation.id':id};
            self.groupDao.findOne({id:id}, function (doc) {
                doc.roleSetting.forEach(function (file) {
                    if(file.basic.id==operate){
                        role=file.basic;
                        role.status='true';
                        setValue={$set:{'groupInformation.$.role':role}}
                        ep.emit('setValue',setValue);
                    }
                    ep.emit('query',query);
                })
            })
          }else{
              ep.emit('setValue',setValue);
              query=undefined;
              ep.emit('query',query);
          }
            })

        }else if(type=='userCompanyRole'){//公司管理员设置
            self.dao.total({id:userId,'companyInformation':{$elemMatch:{'id':id,'userCompanyRole.characterId':'1'}}}, function (total) {

                if(total==0){
                query = {id: userId, 'companyInformation.id': id};
                self.companyDao.findOne({id: id}, function (doc) {
                    doc.role.forEach(function (file) {
                        if (file.characterId == operate) {
                            role = file;
                            role.status = 'true';
                            setValue = {$set: {'companyInformation.$.userCompanyRole': role}}
                            ep.emit('setValue', setValue);
                        }
                        ep.emit('query', query);
                    })
                })
                }else{
                    ep.emit('setValue', setValue);
                    query=undefined;
                    ep.emit('query', query);
                }
            })
        }
        ep.all('query','setValue', function (query,setValue) {
            if(!query){
                var returnValue={status:'failed','msg':'当前数据已更新，请刷新数据'}
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(returnValue);
                res.end(str);
            }else{
                self.dao.updateArray(query,setValue, function (doc) {
                    if(type=='userCompanyRole'){
                        self.dao.findOne({id:userId}, function (doc) {
                            //修改redis里面员工的状态的信息
                            cacheData.updateUser(doc);
                            cacheData.getUpdateUserCompanyRole(userId,id);
                            var returnValue={status:'success','msg':'修改成功',role:role};
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var str = JSON.stringify(returnValue);
                            res.end(str);
                        })
                    }else{
                        var returnValue={status:'success','msg':'修改成功',role:role};
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(returnValue);
                        res.end(str);
                    }
                    //self.dao.findOne({id:userId}, function (doc) {
                    // cacheData.updateUser(doc);

                })

            }
        })
        // })

    },

    //禁言
    allowSpeak: function (req,res) {
        var userId=req.param('userId');
        var id=req.param('id');
        var type=req.param('type');
        var operate=req.param('operate');
        var isSpeak='';
        var self=this;
        if(operate=='3'){
            isSpeak=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+3);
        }else if(operate=='7'){
            isSpeak=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+7);
        }else if(operate=='1'){
            isSpeak='false';
        }else if(operate=='true'){
            isSpeak='true';
        }
        var query={id:userId,'groupInformation.id':id};
        var setValue={$set:{'groupInformation.$.roleExtend.isSpeak':isSpeak}}
        self.dao.updateArray(query,setValue, function () {
            var returnValue={status:'success','msg':'修改成功'}
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(returnValue);
            res.end(str);
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
		var superRole = {
			"id" : "1",
			"name" : "超级管理员",
			"type" : "super",
			"typeLevel" : "high",
			"status" : "true"
		};
        var    queryRoot={id:rootId,'groupInformation.id':groupOrCompany};
        var    setValueRoot={$set:{'groupInformation.$.role': value}}
        var    queryMain={id:mainId,'groupInformation.id':groupOrCompany};
        var    setValueMain={$set:{'groupInformation.$.role':superRole }}
        self.dao.findOne({id:rootId,'groupInformation':{$elemMatch:{'id':groupOrCompany,'role.id':'1'}}}, function (total) {
       if(!total){
           var returnValue = {status: 'failed', 'msg': '当前数据已更新，请刷新数据'}
           res.writeHead(200, {"Content-Type": "text/html"});
           var str = JSON.stringify(returnValue);
           res.end(str);
       }else{
        self.dao.updateArray(queryRoot,setValueRoot, function () {
            self.dao.updateArray(queryMain,setValueMain, function () {

                var returnValue={status:'success','role':value,'superRole':superRole,'msg':'修改成功'}
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(returnValue);
                res.end(str);
            })
        })
       }
        })
    },

    groupList: function (req,res) {
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
            self.dao.list(query1,{id:1,basic:1},{'basic.firstSpell':1},pageNum,pageSize, function (docs) {
                var returnValue={status:'success','list':docs,total:total}
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(returnValue);
                res.end(str);
            })
        })
    },

    yearMonthDay: function (req,res) {
        var self=this;
        var condition=JSON.parse(req.param('condition'));
        var years=condition.years;
        var dayOrMonth;
        var month;
        if(condition.month&&!condition.date){
            month=condition.month;
            dayOrMonth=util.days(years,month);
        }else if(condition.date){
            month=condition.month;
            var date=condition.date;
            dayOrMonth=[new Date(years+','+month+','+date)];
        }else{
            dayOrMonth=util.month(years);
        }
        var counts=0;
        var monthCount=[]
        dayOrMonth.forEach(function (file,j) {
            var querys={};
            if(condition.month&&!condition.date){
                if(j==(dayOrMonth.length-1)){
                    querys={'informationExtend.registerTime': {$gte: new Date(file), $lte: new Date(new Date(file).getFullYear(),new Date(file).getMonth()+1,1)}}
                }else if(j<dayOrMonth.length){
                    querys={'informationExtend.registerTime': {$gte: new Date(file), $lte: new Date(dayOrMonth[j + 1])}}
                }
            }else if(condition.date){
                querys={'informationExtend.registerTime': {$gte: new Date(file), $lte: new Date(new Date(file).getTime()+24*60*60*1000)}}
            }else{
                if(j==(dayOrMonth.length-1)){
                    querys={'informationExtend.registerTime': {$gte: new Date(file), $lte: new Date(new Date(file).getFullYear()+1,1,1)}}
                }else if(j<dayOrMonth.length){
                    querys={'informationExtend.registerTime': {$gte: new Date(file), $lte: new Date(dayOrMonth[j + 1])}}
                }
            }
            self.dao.total(querys, function (count) {
                if(count==null){
                    count=0;
                }
                if (!condition.month) {
                    var months = {};
                    months['name'] = new Date(file).getMonth() + 1 + '月';
                    months['y'] = count;
                    months['monthes'] = new Date(file).getMonth() + 1;
                    monthCount.push(months);
                    counts++;
                } else {
                    var months = {};
                    months['name'] = new Date(file).getDate() + '日';
                    months['y'] = count;
                    months['monthes'] = new Date(file).getDate();
                    monthCount.push(months);
                    counts++;
                }
                if (counts == dayOrMonth.length) {
                    monthCount.sort(util.getSortFun('asc','monthes'));
                    var returnValue = {status: 'success', 'list': monthCount};
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(returnValue);
                    res.end(str);
                }
            })
        })
    },

    //停用，启用人
    enableOrNot: function (req,res) {
        var self=this;
        var id=req.param('id');
        var operate=req.param('operate');
        self.dao.updateArray({id:id},{$set:{'basic.stopLogin':operate}}, function () {
        })
        var returnValue={}
        if(operate=='true'){
            returnValue = {status: 'success', 'msg': '停用成功'}
        }else{
            returnValue = {status: 'success', 'msg': '启用成功'}
        }

        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(returnValue);
        res.end(str);
    },


    //停用，启用人在某个组
    groupEnableOrNot: function (req,res) {
        var self=this;
        var id=req.param('id');
        var groupId=req.param('groupId');
        var operate=req.param('operate');
        self.dao.updateArray({id:id,'groupInformation.id':groupId},{'$set':{'groupInformation.$.role.status':operate}}, function () {
            var returnValue={}
            if(operate=='false'){
                returnValue = {status: 'success', 'msg': '停用成功'}
            }else{
                returnValue = {status: 'success', 'msg': '启用成功'}
            }
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(returnValue);
            res.end(str);
        })
    }
})

