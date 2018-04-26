var DB = require('../DBClient');
var config = require('../config');
var util = require('../util');
var redis = require('../redisClient');
var cacheData = require('../cacheData');
var then = require('thenjs');
var uuid = require('node-uuid');
var eventproxy=require('eventproxy');
var groupService=require('./groupService');
var companyService=require('./companyService');
var plateService=require('./plateService');
var informationService=require('./informationService');
var dao=require('./groupDao');
var webService=require('../webService');
var fs=require('fs');
var qr = require('qr-image');

//新建组(公开组以及私有组)
preAdd=function(req,res,user,callback){
    //前台页面接收值包括组名(groupName,)，加入权限permission（是否允许直接加入），
    //是否审核isAudit（审核后加入）,公开组或者私有组(type),公司id(companyId)
    var reqObj=req.body;//{groupName,permission,isAudit,type}
    var id=uuid.v1();
    //判断是否存在此组
    var query={'basic.name':reqObj.basic.name};
    dao.get(query,{},config.dbGroup,function(doc){
        if(doc){
            callback();
        }else{
            //group表中group对象
            var time=new Date();
            var roleSetting=[],setting1={},setting2={},setting3={},basic1={},basic2={},basic3={},informationControl={};
            reqObj.id=id;
            reqObj.extend.createTime=time,
            basic1.id='1',basic1.name='超级管理员',basic1.type='super',basic1.typeLevel='high';
            basic2.id='2',basic2.name='管理员',basic2.type='admin',basic2.typeLevel='middle';
            basic3.id='3',basic3.name='成员',basic3.type='member',basic3.typeLevel='primary';
            informationControl.allowSpeak="1";
            setting1.basic=basic1,setting1.informationControl=informationControl;
            roleSetting.push(setting1);
            setting2.basic=basic2,setting2.informationControl=informationControl;
            roleSetting.push(setting2);
            setting3.basic=basic3,setting3.informationControl=informationControl;
            roleSetting.push(setting3);
            reqObj.roleSetting=roleSetting;
            reqObj.basic.stopLogin="false";
            //user表中的group对象
            var userGroup={
                id:id,
                basic:reqObj.basic,
                roleExtend:{
                    joinTime:time,
                    isFocusOn:'N',
                    lastSpeakTime:time,
                    speakNumber:0,
					exitTime:time
                },
                role:basic1
            }
            userGroup.basic.stopLogin="false";
            userGroup.role.status="true";
            //file表中的组文件夹
            var file={
                mainId:id,
                id:id,
                name:"临时文件夹",
                size:0,
                createTime:time,updateTime:time,
                userId:user.id,createUserName:user.basic.userName,updateUserName:user.basic.userName,
                parentId:"-1",
                type:"D",
                imageUrl:config.directoryImageUrl,
                url:id
            };

            callback(reqObj,userGroup,file);
        }
    })
}

//新建组
exports.add=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userid=cookie.userid;
    dao.findOne({id:userid},config.dbUser,function(user){
        preAdd(req,res,user,function(reqObj,userGroup,file){
            if(reqObj&&userGroup&&file){
                webService.changeUrl(reqObj.id,function(urlDoc){
                    if(urlDoc){
                        if(!fs.existsSync(config.headFileSavePath)){
                            fs.mkdirSync(config.headFileSavePath , 0777);
                        }
                        var tempUrl=urlDoc.url_short;
                        var img = qr.image(tempUrl,
                            { type: 'png', ec_level: 'H', size: 2, margin: 0 });
                        img.pipe(fs.createWriteStream(config.headFileSavePath+userGroup.id+".png"));
                        /*var img1 = qr.image(tempUrl,
                            { type: 'png', ec_level: 'H', size: 5, margin: 0 });
                        img1.pipe(fs.createWriteStream(config.headFileSavePath+userGroup.id+".png"));
                        var img2 = qr.image(tempUrl,
                            { type: 'png', ec_level: 'H', size: 10, margin: 0 });
                        img2.pipe(fs.createWriteStream(config.headFileSavePath+userGroup.id+".png"));*/
                    }
                })

                //"url"='/server/'+temp_name
                var ep = new eventproxy();
                ep.all(['group', 'userGroup','file','redis'], function (doc4,doc5,doc6,doc7) {
                    var doc={};
                    if(doc4.length>0&&doc5==1&&doc6.length>0&&doc7.status=='success'){
                        doc.groupId=doc4[0].id;
                        doc.status='success';
                        doc.msg='添加成功！';
                    }else{
                        doc.status='failed';
                        doc.msg='添加失败！';
                    }
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(doc);
                    res.end(str);

                });
                //group表中添加新组
                reqObj.extend.qrCodeUrl='/server/'+userGroup.id+".png";
                dao.insert(reqObj,config.dbGroup,function(doc4){
                    ep.emit('group', doc4);
                });
                //更新用户表中组信息
                dao.update({id:user.id},{"$push":{groupInformation:userGroup}},config.dbUser,function(doc5){
                    ep.emit('userGroup', doc5);
                });
                //file表中添加新文件
                dao.insert(file,config.dbFile,function(doc6){
                    ep.emit('file', doc6);
                });
                //缓存中更新用户的信息
                cacheData.UpdateDirectGroupUserInfo('join',user.id,userGroup,function(doc7){
                    ep.emit('redis', doc7);
                })


            }else{
                var doc={};
                doc.status='failed';
                doc.msg='组名已存在！';
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(doc);
                res.end(str);
            }
        })
    })

};

/*主动请求加入组，
 整合需要生成的information信息以及user表中需要更新的组信息*/
preDirect=function(req,res,groupId,user,company,callback){
    var ep = new eventproxy();
    ep.all(['group', 'user'], function (doc1,doc2) {
        if(doc1&&doc2){
            var doc={};
            doc.status="failed";
            doc.msg="你已经是该组成员了！";
            callback(doc,{status:'failed'});
        }else{
			var now=new Date();
            var userGroupBasic=doc1.basic;
            var userGroupRoleBasic={};
                userGroupRoleBasic.id='3';
                userGroupRoleBasic.name='成员';
                userGroupRoleBasic.type='member';
                userGroupRoleBasic.typeLevel='primary';
            var userGroupRoleExtend={};
                userGroupRoleExtend.joinTime=now;
                userGroupRoleExtend.isFocusOn="N";
                userGroupRoleExtend.speakNumber=0;
                userGroupRoleExtend.lastSpeakTime=now;
				userGroupRoleExtend.exitTime=now;
            var groupInformation={};
                groupInformation.id=doc1.id;
                groupInformation.basic=userGroupBasic;
                groupInformation.basic.stopLogin="false";
                groupInformation.role=userGroupRoleBasic;
                groupInformation.role.status="true";
                groupInformation.roleExtend=userGroupRoleExtend;
                groupInformation.status='success';
            var groupName=doc1.basic.name;
            var information={
                id:uuid.v1(),
                basic:{
                    type:'groupInviteMemberAsk',
                    userId:user.id,
                    groupId:groupId,
                    companyId:'-1',
                    publishTime:now,
					replyId:[]
                },
				
                content:{
                    text:'',
                    notice:user.basic.userName+'主动请求加入'+groupName
                },
                status:'success'
            }
			if(company!=null){
					information.basic.companyId=company.id;
				}
            callback(groupInformation,information);
        }

    });
	//获取组信息
    dao.get({id:groupId},{},config.dbGroup,function(doc1){
        ep.emit('group', doc1);
    });
	//获取用户信息
    dao.get({id:user.id,"groupInformation.id":groupId},{},config.dbUser,function(doc2){
        ep.emit('user', doc2);
    });
};
/*主动请求加入组，需要审核的生成一条等待状态的information信息即可，
  不需要审核的生成一条完成状态的information以及user表中更新组*/
exports.direct=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
	var userid=cookie.userid;
    dao.findOne({id:userid},config.dbUser,function(user){
        var company=null;
        var groupId=req.param("groupId");
        preDirect(req,res,groupId,user,company,function(doc,doc1){
            if(doc["status"]=='failed'&&doc1["status"]=='failed'){
                var tempDoc={};
                tempDoc.status="failed";
                tempDoc.msg="加入失败！";
                if (doc.msg){
                    tempDoc.msg=doc.msg;
                }
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(tempDoc);
                res.end(str);
            }else{
                delete doc.status;
                delete doc1.status;
                groupService.basic(groupId,function(basic){
                    if(basic.permission=='I'){
                        //组权限为邀请进组，不能直接请求加入组
                        var tempDoc={};
                        tempDoc.status="failed";
                        tempDoc.msg="禁止直接加入该组！";
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(tempDoc);
                        res.end(str);
                    }else if(basic.permission=='D'){
                        //可以直接请求加入该组
                        var groupInformation=doc;
                        var information=doc1;
                        if(basic.isAudit=="Y"){
                            //需要审核，生成一条请求加入组的information信息
                            information.basic.state='wait';
                            informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':user.id},function(doc){
                                if(doc){
                                    //用户已经请求过加入状态
                                    var tempDoc={};
                                    tempDoc.status='failed';
                                    tempDoc.msg='用户已经处在等待状态！';
                                    res.writeHead(200, {"Content-Type": "text/html"});
                                    var str = JSON.stringify(tempDoc);
                                    res.end(str);
                                }else{
                                    //用户新请求加入该组
                                    dao.insert(information,config.dbInformation,function(doc){
                                        var tempDoc={};
                                        if(doc.length>0){
                                            tempDoc.status="wait";
                                            tempDoc.msg="请求成功,等待管理员审核！";
                                        }else{
                                            tempDoc.status="failed";
                                            tempDoc.msg="请求失败！";
                                        }
                                        res.writeHead(200, {"Content-Type": "text/html"});
                                        var str = JSON.stringify(tempDoc);
                                        res.end(str);
                                    })
                                }
                            })

                        }else if(basic.isAudit=='N'){
                            //组不需要审核，
                            then(function(defer){
                                informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':user.id},function(doc){
                                    if(doc){
                                        //改变用户已经发过的请求信息的状态
                                        var tempInformationId=doc.id;
                                        informationService.updateState(tempInformationId,'agree',function(doc1){
                                            if(doc1){
                                                defer(null)
                                            }else{
                                                var tempDoc={};
                                                tempDoc.status="failed";
                                                tempDoc.msg="请求失败！";
                                                res.writeHead(200, {"Content-Type": "text/html"});
                                                var str = JSON.stringify(tempDoc);
                                                res.end(str);
                                            }
                                        });
                                    }else{
                                        information.basic.state='agree';
                                        //用户新请求加入该组
                                        dao.insert(information,config.dbInformation,function(doc){
                                            if(doc){
                                                defer(null)
                                            }else{
                                                var tempDoc={};
                                                tempDoc.status="failed";
                                                tempDoc.msg="请求失败！";
                                                res.writeHead(200, {"Content-Type": "text/html"});
                                                var str = JSON.stringify(tempDoc);
                                                res.end(str);
                                            }
                                        })
                                    }
                                })
                            }).then(function(defer){
                                cacheData.UpdateDirectGroupUserInfo('join',user.id,doc,function(tempDoc){
                                    if(tempDoc.status=='success'){
                                        defer(null);
                                    }else{
                                        var tempDoc={};
                                        tempDoc.status="failed";
                                        tempDoc.msg="请求失败！";
                                        res.writeHead(200, {"Content-Type": "text/html"});
                                        var str = JSON.stringify(tempDoc);
                                        res.end(str);
                                    }
                                })
                            }).then(function(defer){
                                dao.update({id:user.id},{"$push":{groupInformation:groupInformation}},config.dbUser,function(doc){
                                    var tempDoc={};
                                    tempDoc.status="success";
                                    tempDoc.msg="请求成功，您已经加入该组！";
                                    res.writeHead(200, {"Content-Type": "text/html"});
                                    var str = JSON.stringify(tempDoc);
                                    res.end(str);
                                })
                            })
                        }
                    }
                })
            }
        })
    })
};

exports.initGroup=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    dao.list({"basic.type":{"$in":["activity","topic","vote","announcement","groupChat"]}},{"sort":{"basic.publishTime":-1}},config.dbInformation,function(docs){
        then(function(defer){
            var result={};
            if(docs.length>0){
                var groupId="";
                groupService.modalGroupList(userId,1,10000,"",function(tempDocs,total){
                    if(tempDocs.length>0){
                        st:for(var i=0; i<docs.length; i++){
                            for(var j=0; j<tempDocs.length; j++){
                                if(docs[i].basic.groupId==tempDocs[j].groupInformation.id){
                                    groupId=docs[i].basic.groupId;
                                    break st;
                                }
                            }
                        }

                    }
                    result.id=groupId;
                    defer(null,result);
                });

            }else{
                groupService.myGroupList(userId,"Y",function(docs){
                    if(docs&&docs.length>0){
                        groupId=docs[0].groupInformation.id;
                        result.id=groupId;
                        defer(null,result);
                    }else{
                        groupService.myGroupList(userId,"N",function(docs){
                            if(docs&&docs.length>0){
                                groupId=docs[0].groupInformation.id;
                                result.id=groupId;
                                defer(null,result);
                            }else{
                                result.id="";
                                defer(null,result);
                            }
                        })
                    }

                })
            }
        }).then(function(defer,result){
            res.writeHead(200, {"Content-Type": "text/html"});
            var str=JSON.stringify(result);
            res.end(str);
        })
    })
}


//修改更新组信息
exports.update=function(req,res){
    var reqObj=req.body;//{id,head,name,introduction,permission,isAudit}
    var groupId=reqObj.id;
    var ep = new eventproxy();
    ep.all('basic', 'userGroupBasic', function (doc1,doc2) {
        var doc={};
        if(doc1&&doc2){
            doc.status='success';
            doc.msg='修改成功！';
        }else{
            doc.status='failed';
            doc.msg='修改失败！';
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(doc);
        res.end(str);

    });
	//修改group表组信息
    dao.update({id:groupId},{"$set":{basic:reqObj.basic,extend:reqObj.extend}},config.dbGroup,function(doc1){
        ep.emit('basic', doc1);
    });
	//修改用户相关组信息
    groupService.updateUserGroup(groupId,reqObj.basic,function(doc2){
        ep.emit('userGroupBasic', doc2);
    })
};


//我的群组列表（包括关注和未关注）
exports.myGroupList=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var isFocusOn=req.param('isFocusOn');
    then(function(defer){
        groupService.myGroupList(userId,isFocusOn,function(docs){
            var groups=[];
            if(docs&&docs.length>0){
                for(var i=0;i<docs.length;i++){
                    var group={};
                    group.name=docs[i].groupInformation.basic.name;
                    group.id=docs[i].groupInformation.id;
                    group.head=docs[i].groupInformation.basic.head;
                    group.isFocusOn=docs[i].groupInformation.roleExtend.isFocusOn;
                    group.updateSpeakNum=0;//暂时默认更新的发言数为0
                    groups.push(group);
                }
            }

            defer(null,groups);
        })
    }).then(function(defer,groups){
        var tempDoc={};
        tempDoc.list=groups;
        tempDoc.total=groups.length;
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(tempDoc);
        res.end(str);
    })
};

//我的群组列表（包括关注和未关注）
exports.modalGroupList=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var pageNo=parseInt(req.param('pageNo'));
    var pageSize=parseInt(req.param('pageSize'));
    var searchName=req.param('searchName');
    if(!searchName){
        searchName='';
    }
    then(function(defer){
        groupService.modalGroupList(userId,pageNo,pageSize,searchName,function(docs,total){
            var groups=[];
            if(docs&&docs.length>0){
                for(var i=0;i<docs.length;i++){
                    var group={};
                    group.name=docs[i].groupInformation.basic.name;
                    group.id=docs[i].groupInformation.id;
                    group.head=docs[i].groupInformation.basic.head;
                    group.isFocusOn=docs[i].groupInformation.roleExtend.isFocusOn;
                    group.updateSpeakNum=0;//暂时默认更新的发言数为0
                    groups.push(group);
                }
            }

            defer(null,groups,total);
        })
    }).then(function(defer,groups,total){
        var tempDoc={};
        tempDoc.list=groups;
        tempDoc.total=total;
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(tempDoc);
        res.end(str);
    })
};
// 首页显示关注群组的信息（群组信息、最后一条消息内容）
exports.mainShowGroupList=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var type=req.param('type');
    var companyId=req.param('companyId');
	then(function(defer){
		groupService.myGroupListAndMsg(userId,companyId,type,function(docs){
			defer(null,docs);
		})
	}).then(function(defer,groups){
		res.writeHead(200, {"Content-Type": "text/html"});
		var str = JSON.stringify(groups);
		res.end(str);
	})
};


//重点关注
exports.setFocus=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var reqObj=req.body;
    var userId=cookie.userid;
    var groupId=reqObj.groupId;
    var isFocusOn=reqObj.isFocusOn;
    groupService.focus(userId,groupId,isFocusOn,function(doc){
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(doc);
        res.end(str);
    });
};
//通过groupId获取组信息（包括名称，头像，角色，人数）
//获取当前组的总人数
preGet=function(req,res,groupId,callback){
    groupService.sum(groupId,config.dbUser,function(count){
        callback(count);
    })
}

//组内成员邀请用户进组
exports.passiveDirect=function(req,res){
    //post接收数据{user,groupId}
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userid=cookie.userid;
    var groupId=req.param('groupId');
    var reqObj=req.body;//有被邀请user信息
    dao.findOne({id:userid},config.dbUser,function(user){
        groupService.get(groupId,reqObj.id,function(doc){
            if(doc){
                var tempDoc={};
                tempDoc.status='failed';
                tempDoc.msg='用户已经存在！';
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(tempDoc);
                res.end(str);
            }else{
                //邀请逻辑，如果是管理员邀请则直接加入组，
                // 如果是组员邀请，判断是否需要审核，不需要审核直接加入组，需要审核的发邀请信息
                groupService.get(groupId,user.id,function(doc){
                    //console.log('管理员邀请用户...');
                    var now=new Date();
                    var information={
                        id:uuid.v1(),
                        basic:{
                            type:'groupInviteMemberAsk',
                            userId:reqObj.id,
                            replyId:[],
                            groupId:groupId,
                            companyId:"-1",
                            publishTime:now
                        },
                        content:{
                            text:'',
                            notice:user.basic.userName+'邀请'+reqObj.userName+"加入"+doc.groupInformation.basic.name+"组"
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
                            typeLevel:'primary',
                            status:"true"
                        }
                    };
                    userGroup.basic.stopLogin="false";
                    if(cookie.company){
                        var company=JSON.parse(cookie.company);
                        information.basic.companyId=company.id;
                    }
                    if(doc.groupInformation.role.id!='3'){
                        informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':reqObj.id},function(docTemp){

                            //管理员或者超级管理员邀请，直接加入组内，并且发送状态为完成的邀请信息
                            var ep=new eventproxy();
                            //user表中的group对象
                            information.basic.state='agree';

                            ep.all('userGroup','information','redis',function(doc,doc1,doc2){
                                var tempDoc={};
                                if(doc.status=='success'&&doc1.status=='success'&&doc2.status=='success'){
                                    tempDoc.status='success';
                                    tempDoc.msg='发送邀请成功！';
                                }else{
                                    tempDoc.status='failed';
                                    tempDoc.msg='发送邀请失败！';
                                }
                                res.writeHead(200, {"Content-Type": "text/html"});
                                var str = JSON.stringify(tempDoc);
                                res.end(str);
                            })

                            if(docTemp){
                                var tempInformationId=docTemp.id;
                                informationService.updateState(tempInformationId,'agree',function(doc1){
                                    ep.emit('information',doc1);
                                });
                            }else{
                                informationService.add(information,function(doc1){
                                    ep.emit('information',doc1);
                                });
                            }
                            groupService.addUser(reqObj.id,userGroup,function(doc){
                                ep.emit('userGroup',doc);
                            });

                            cacheData.UpdateDirectGroupUserInfo('join',reqObj.id,userGroup,function(doc2){
                                ep.emit('redis',doc2);
                            });
                        })

                    }else{
                        //console.log('一管理员邀请用户...');
                        //组内一般成员邀请，发送状态为未完成的邀请信息
                        groupService.basic(groupId,function(basic){
                            if(basic.isAudit=="Y"){
                                //需要审核，生成一条请求加入组的information信息
                                information.basic.state='wait';
                                informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':user.id},function(doc){
                                    if(doc){
                                        //用户已经请求过加入状态
                                        var tempDoc={};
                                        tempDoc.status='failed';
                                        tempDoc.msg='用户已经处在等待状态！';
                                        res.writeHead(200, {"Content-Type": "text/html"});
                                        var str = JSON.stringify(tempDoc);
                                        res.end(str);
                                    }else{

                                        dao.insert(information,config.dbInformation,function(doc){
                                            var tempDoc={};
                                            if(doc.length>0){
                                                tempDoc.status="wait";
                                                tempDoc.msg="请求成功,等待管理员审核！";
                                            }else{
                                                tempDoc.status="failed";
                                                tempDoc.msg="请求失败！";
                                            }
                                            res.writeHead(200, {"Content-Type": "text/html"});
                                            var str = JSON.stringify(tempDoc);
                                            res.end(str);
                                        })
                                    }
                                })

                            }else if(basic.isAudit=='N'){
                                //组不需要审核，
                                informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':reqObj.id},function(docTemp){

                                    //管理员或者超级管理员邀请，直接加入组内，并且发送状态为完成的邀请信息
                                    var ep=new eventproxy();
                                    //user表中的group对象
                                    information.basic.state='agree';

                                    ep.all('userGroup','information','redis',function(doc,doc1,doc2){
                                        var tempDoc={};
                                        if(doc.status=='success'&&doc1.status=='success'&&doc2.status=='success'){
                                            tempDoc.status='success';
                                            tempDoc.msg='发送邀请成功！';
                                        }else{
                                            tempDoc.status='failed';
                                            tempDoc.msg='发送邀请失败！';
                                        }
                                        res.writeHead(200, {"Content-Type": "text/html"});
                                        var str = JSON.stringify(tempDoc);
                                        res.end(str);
                                    })

                                    if(docTemp){
                                        var tempInformationId=docTemp.id;
                                        informationService.updateState(tempInformationId,'agree',function(doc1){
                                            ep.emit('information',doc1);
                                        });
                                    }else{
                                        informationService.add(information,function(doc1){
                                            ep.emit('information',doc1);
                                        });
                                    }
                                    groupService.addUser(reqObj.id,userGroup,function(doc){
                                        ep.emit('userGroup',doc);
                                    });

                                    cacheData.UpdateDirectGroupUserInfo('join',reqObj.id,userGroup,function(doc2){
                                        ep.emit('redis',doc2);
                                    });
                                })
                            }
                        })

                    }
                })
            }
        })
    })
};

//组内待审核列表
exports.handleGroupWait=function(req,res){
    var cookie=req.cookies;
    var groupId=req.param('groupId');
    var pageNo=parseInt(req.param('pageNo'));
    var pageSize=parseInt(req.param('pageSize'));
	dao.total({'basic.groupId':groupId,'basic.state':'wait','basic.type':'groupInviteMemberAsk'},config.dbInformation,function(count){
        informationService.list({'basic.groupId':groupId,'basic.state':'wait','basic.type':'groupInviteMemberAsk'},
			{'sort':{'basic.publishTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize},function(docs){
				if(docs.length>0){
					docs.forEach(function(doc,i){
					var userId=doc.basic.userId;
					dao.get({id:userId},{'_id':0,'basic':1},config.dbUser,function(doc1){
						if(doc1){
							doc.basic.userName=doc1.basic.userName;
							doc.basic.userHead=doc1.basic.head;
							
						}
						if(i==docs.length-1){
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
};
//全部公开组和公司全部私有组
exports.publicList=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
	var pageNo=req.param('pageNo');
	var pageSize=req.param('pageSize');
	var sortType=req.param('sortType');
	var type=req.param('type');
	var query={};
	var searchName=req.param('searchName');  
	var tempCount=0;
	//公开组
	if(type=='public'){
		query={'basic.type':'public'}
	}else if(type=='private'){
		//私有组
		var company=JSON.parse(cookie.company);
		query={'basic.type':'private','basic.companyId':company.id}
	}
	//有搜索值
	if(searchName){
        query['basic.name']={'$regex':searchName}
    }
	var condition;
	//按照组员个数排序
	if(sortType=='number'){
		condition={};
	}else if(sortType=='createTime'){
		//按照创建时间倒序排序
		condition={'sort':{'extend.createTime':-1},'skip':(pageNo-1)*pageSize,'limit':pageSize}
	}
    dao.total(query,config.dbGroup,function(groupCount){
		groupService.list(query,condition,function(docs){
			if(docs.length>0){
				
				docs.forEach(function(term,m){
					var groupId=term.id;
					var ep=new eventproxy();
					ep.all('count','role','creator',function(count,role,creator){
						tempCount++;
						term.count=count;
						term.ownRole=role;
						term.creator=creator;
						var tempDoc={};
						if(tempCount==docs.length){
							if(sortType=='number'){
								//截取
								for(var i=0;i<docs.length;i++){
									for(var j=i;j<docs.length;j++){
										if(docs[i].count<docs[j].count){
											var temp=docs[i];
											docs[i]=docs[j];
											docs[j]=temp;
										}
									}
								}
								docs=docs.slice((pageNo-1)*pageSize,(pageNo*pageSize));
								
							}							
							tempDoc.list=docs;
							tempDoc.total=groupCount;
							res.writeHead(200, {"Content-Type": "text/html"});
							var str = JSON.stringify(tempDoc);
							res.end(str);
							
						}
					})
					groupService.sum(groupId,config.dbUser,function(count){
						ep.emit('count',count);
					});
					groupService.get(groupId,userId,function(doc){
						var role;
						if(doc){
							role=doc.groupInformation.role;
						}
						ep.emit('role',role);
					});

					dao.aggregate([{"$project":{_id:0,id:1,basic:1,groupInformation:1}},{"$unwind":"$groupInformation"},
						{"$match":{"groupInformation.role.id":'1',"groupInformation.id":groupId}}],config.dbUser,function(doc){
						
						var creator;
							if(doc.length>0){
								creator=doc[0].basic.userName;
							}
						ep.emit('creator',creator);
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
	
};
//获取组详细信息(包括[组名，组简介]，组人数，管理员数组，创建者对象,我再组的角色)
exports.get=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userid=cookie.userid;
    var groupId=req.param('id');

    dao.findOne({id:userid},config.dbUser,function(user){
        groupService.getGroup(user,groupId,function(group){
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(group);
            res.end(str);
        })
    })
};
//组内成员管理，超级管理员或者管理员审核同意或者失败
exports.audit=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
	if(cookie.company){
		var company=JSON.parse(cookie.company);
	}
    
    var groupId=req.param('groupId');
    var reqObj=req.body;//informationId,userId,type,
	//点击同意操作
	dao.get({'id':reqObj.userId,"groupInformation.id":groupId},{},config.dbUser,function(tempDoc1){
		if(tempDoc1){
			informationService.updateState(reqObj.informationId,"agree",function(doc11){
				var tempDoc={};
				if(doc11){
					tempDoc.status='success';
					tempDoc.msg='用户已在组内,请求信息处理成功！';
				}else{
					tempDoc.status='failed';
					tempDoc.msg='用户已在组内,请求信息处理失败！';
				}
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(tempDoc);
				res.end(str);
			});
		}else{
			if(reqObj.type=="agree"){
				dao.get({id:groupId},{},config.dbGroup,function(doc1){
					var ep=new eventproxy();
					ep.all('userGroup','information','redis',function(doc,doc1,doc2){
						var tempDoc={};
						if(doc.status=='success'&&doc1&&doc2.status=='success'){
							tempDoc.status='success';
							tempDoc.msg='点击同意成功! ';

						}else{
							tempDoc.status='failed';
							tempDoc.msg='点击同意失败! ';
						}
						res.writeHead(200, {"Content-Type": "text/html"});
						var str = JSON.stringify(tempDoc);
						res.end(str);
					})

					var now=new Date();
					var userGroupBasic=doc1.basic;
					var userGroupRoleBasic={};
					userGroupRoleBasic.id='3';
					userGroupRoleBasic.name='成员';
					userGroupRoleBasic.type='member';
					userGroupRoleBasic.typeLevel='primary';
					var userGroupRoleExtend={};
					userGroupRoleExtend.joinTime=now;
					userGroupRoleExtend.isFocusOn="N";
					userGroupRoleExtend.speakNumber=0;
					userGroupRoleExtend.lastSpeakTime=now;
					userGroupRoleExtend.exitTime=now;
					var groupInformation={};
					groupInformation.id=doc1.id;
					groupInformation.basic=userGroupBasic;
                    groupInformation.basic.stopLogin="false";
					groupInformation.role=userGroupRoleBasic;
                    groupInformation.role.status="true";
					groupInformation.roleExtend=userGroupRoleExtend;
					groupService.addUser(reqObj.userId,groupInformation,function(doc){
						ep.emit('userGroup',doc);
					});
					informationService.updateState(reqObj.informationId,reqObj.type,function(doc1){
						ep.emit('information',doc1);
					});
					cacheData.UpdateDirectGroupUserInfo('join',reqObj.userId,groupInformation,function(doc2){
						ep.emit('redis',doc2)
					})
				})
			}else if(reqObj.type=="refuse"){
				//点击拒绝操作
				informationService.updateState(reqObj.informationId,reqObj.type,function(doc1){
					var tempDoc={};
					if(doc1){
						tempDoc.status='success';
						tempDoc.msg='点击拒绝成功！';
					}else{
						tempDoc.status='failed';
						tempDoc.msg='点击拒绝失败！';
					}
					res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(tempDoc);
					res.end(str);
				})
			}
		}
	})
    
};


//组成员列表管理中的所有人列表
exports.groupMemberList=function(req,res){
    var groupId=req.param('groupId');
    var pageNo=parseInt(req.param('pageNo'));
    var pageSize=parseInt(req.param('pageSize'));
    var fname=req.param('name');
    //fname为搜索值
    if(!fname){
        fname=null;
    }
    //firstSpell首字母
    var firstSpell=req.param('firstSpell');
    if(!firstSpell){
        firstSpell=null;
    }
    groupService.memberListPage(groupId,pageNo,pageSize,fname,firstSpell,['1','2','3'],function(docs,total){
        var tempDoc={};
        var count=0;
        if(docs.length==0){
            tempDoc.list=[];
            tempDoc.total=0;
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
            return;
        }
        docs.forEach(function (file) {
            if(!file.groupInformation.roleExtend.isSpeak||file.groupInformation.roleExtend.isSpeak=='true'){
                file.groupInformation.roleExtend.isSpeak='true';
                count++;
            }else if(file.groupInformation.roleExtend.isSpeak!='false'&&(new Date(file.groupInformation.roleExtend.isSpeak)<new Date())){
                dao.update({id:file.id,'groupInformation.id':file.groupInformation.id},{$set:{'groupInformation.$.roleExtend.isSpeak':'true'}},config.dbUser, function () {
                    file.groupInformation.roleExtend.isSpeak='true';
                    count++;
                })
            }else if(file.groupInformation.roleExtend.isSpeak!='false'){
                file.groupInformation.roleExtend.isSpeak='false';
                count++;
            }else{
                count++;
            }
            if(count==docs.length){
                tempDoc.list=docs;
                tempDoc.total=total;
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(tempDoc);
                res.end(str);
            }
        })
    })
}


//组内成员管理，成员member退出群组
preMemberExit=function(req,res,callback){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var groupId=req.param('groupId');
    callback(userId,groupId);
};
exports.memberExit=function(req,res){
    preMemberExit(req,res,function(userId,groupId){
		then(function(defer){
			groupService.memberExit(userId,groupId,function(doc){
				if(doc){
					var groupInformation={id:groupId};
					defer(null,groupInformation);
				}else{
					var tempDoc={};
					tempDoc.status='failed';
					tempDoc.msg='退出失败！';
					res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(tempDoc);
					res.end(str);
				}
			});
		}).then(function(defer,groupInformation){
			cacheData.UpdateDirectGroupUserInfo('remove',userId,groupInformation,function(tempDoc){
				var tempDoc1={};
				if(tempDoc.status=='success'){
					tempDoc1.status='success';
					tempDoc1.msg='退出成功！';
					
				}else{
					tempDoc1.status='failed';
					tempDoc1.msg='退出失败！';
				}
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(tempDoc1);
				res.end(str);
			})
		})
    })
};


//组内成员管理,管理员或者超级管理员移除一般用户
preRemoveUser=function(req,res,callback){
    var userId=req.param('userId');
    var groupId=req.param('groupId');
    callback(userId,groupId);
};
function removeRedisUser(userId,groupInformation,callback){
    cacheData.UpdateDirectGroupUserInfo('remove',userId,groupInformation,function(tempDoc){
        var tempDoc1={};
        if(tempDoc.status=='success'){
            tempDoc1.status='success';
            tempDoc1.msg='移除用户成功！';
            callback(tempDoc1);
        }else{
            removeRedisUser(userId,groupInformation,callback);
        }
    })
}
exports.removeUser=function(req,res){
    preRemoveUser(req,res,function(userId,groupId){
		then(function(defer){
			groupService.memberExit(userId,groupId,function(doc){
				if(doc){
					var groupInformation={id:groupId}
					defer(null,groupInformation);
				}else{
					var tempDoc={};
					tempDoc.status='failed';
					tempDoc.msg='退出失败！';
					res.writeHead(200, {"Content-Type": "text/html"});
					var str = JSON.stringify(tempDoc);
					res.end(str);
				}
				
			});
		}).then(function(defer,groupInformation){
            removeRedisUser(userId,groupInformation,function(doc){
                defer(null);
            });
		}).then(function(defer){
            dao.findOne({id:userId},config.dbUser,function(doc){
                if(doc){
                    var tempValue=doc.contactInformation[0].contactValue;
                    var tempArr=[];
                    tempArr.push(tempValue);
                    tempArr.push(userId);
                    dao.find({'basic.replyId':{"$in":tempArr},'basic.groupId':groupId},config.dbInformation,function(docs){
                        if(docs.length>0){
                            docs.forEach(function(doc){
                                dao.deleteAt({'id':doc.id},config.dbInformation,function(){

                                })
                            })

                        }
                    })
                }
                defer(null);
            })
        }).then(function(defer){
            var tempdoc={
                status:'success',
                msg:'用户移除成功！'
            };
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempdoc);
            res.end(str);
        })
    })
};


//组内成员管理，超级管理员给一般用户赋管理员权限
preAddAdmin=function(req,res,callback){
    var groupId=req.param('groupId');
    var userId=req.param('userId');
    callback(userId,groupId);
};
exports.addAdmin=function(req,res){
    preAddAdmin(req,res,function(userId,groupId){
        groupService.addAdmin(userId,groupId,function(doc,role){
            var tempDoc={};
			if(doc){
                tempDoc.role=role;
				tempDoc.status='success';
				tempDoc.msg='修改成功！';
			}else{
				tempDoc.status='failed';
				tempDoc.msg='修改失败！';
			}
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        })
    })
};


//组内成员管理，超级管理员取消管理员权限
preRemoveAdmin=function(req,res,callback){
    var groupId=req.param('groupId');
    var userId=req.param('userId');
    callback(userId,groupId);
};
exports.removeAdmin=function(req,res){
    preRemoveAdmin(req,res,function(userId,groupId){
        groupService.removeAdmin(userId,groupId,function(doc,role){
            var tempDoc={};
			if(doc){
                tempDoc.role=role;
				tempDoc.status='success';
				tempDoc.msg='移除管理员权限成功！';
			}else{
				tempDoc.status='failed';
				tempDoc.msg='移除管理员权限失败！';
			}
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        })
    })
};

//组内聊天信息显示列表
exports.chatInformationList = function(req, res){
     var groupId=req.param('groupId');
	 var startNO=parseInt(req.param('startNO'));
	 var number=parseInt(req.param('number'))||10;
	 var thenObj=cacheData.interval(groupId,startNO+1,startNO+number);
	 thenObj.then(function (defer,docs) {
		    res.writeHead(200, {"Content-Type": "text/html"});
			 var str = JSON.stringify(docs);
			 res.end(str);
    });
};

//私聊信息显示列表
exports.p2pChatInformationList = function(req, res){
     var fromId=req.param('fromId');
	 var toId=req.param('toId');
	 var startNO=parseInt(req.param('startNO'));
	 var number=parseInt(req.param('number'))||10;
	 var thenObj=cacheData.p2pInterval(fromId,toId,startNO+1,startNO+number);
	 thenObj.then(function (defer,docs) {
		    res.writeHead(200, {"Content-Type": "text/html"});
			 var str = JSON.stringify(docs);
			 res.end(str);
    });
};


//组内@用户列表
exports.atList=function(req,res){
	var groupId=req.param('groupId');
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var list=[];
    var count=0;
    var ep=new eventproxy();
    var query={groupId:groupId,informationType:'groupAt',replyId:userId,userId:{'$ne':'allId'}};
    groupService.atList(query,{"sort":{'publishTime':-1}},config.dbAt,function(docs){

        if(docs.length>0){
            var thenObj=then(function(defer){
         for(var i=0;i<docs.length;i++){
             for(var j=i+1;j<docs.length;j++){
                 if(docs[i]['userId']==docs[j]['userId']){
                     docs.splice(j,1);
                 }
             }
         }
                defer(null,docs);
            }).then(function(defer,docs){
        docs.forEach(function (file,i) {
            groupService.atList({id:file.userId},{_id:0,id:1,basic:1,contactInformation:1},config.dbUser,function(doc){
                list.push(doc[0]);
                count++
                if(count==docs.length){
                    ep.emit('list',list);
                }
            })
        })
        })
        }else{
            ep.emit('list',null);
        }

    })
    groupService.atList({'groupInformation.id':groupId},{_id:0,id:1,basic:1,contactInformation:1},config.dbUser,function(docs){
        ep.emit('docs',docs);
    })
    ep.all('list', 'docs', function (list, docs) {
        var ep1=new eventproxy();
        if(list&&list.length>0) {
            list.reverse();
           var count=0;
            list.forEach(function (file,i) {
                docs.unshift(file);
            })
            var thenObj=then(function(defer) {
                for(var i=0;i<docs.length;i++){
                    for(var j=i+1;j<docs.length;j++){
                        if(docs[i]['id']==docs[j]['id']){
                            docs.splice(j,1)
                        }
                    }
                }
                defer(null,docs);
            }).then(function(defer,docs){
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(docs);
                res.end(str);
            })
        }else{
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(docs);
            res.end(str);
        }
    })
};

//组内信息收藏
exports.collectMsg=function(req,res){
	var cookie=req.cookies;
	//var user= JSON.parse(cookie.user);
    var userId=cookie.userid;
	var messageId=req.param('id');
    dao.findOne({id:userId},config.dbUser,function(user){
        dao.findOne({'basic.userId':userId,'basic.originalId':messageId,'basic.type':'groupchatCollection'},config.dbInformation,function(doc){
            if(doc){
                var tempDoc={};
                tempDoc.status='failed';
                tempDoc.msg='此信息已经收藏！';
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(tempDoc);
                res.end(str);
            }else{
                var information={
                    id:uuid.v1(),
                    basic:{
                        userId:user.id,
                        type:'groupchatCollection',
                        userName:user.basic.userName,
                        head:user.basic.head,
                        originalId:messageId,
                        publishTime:new Date()
                    }
                }
                informationService.add(information,function(doc){
                    var tempDoc=doc;
                    if(doc.status=='success'){
                        tempDoc.msg="收藏成功！"
                    }else{
                        tempDoc.msg="收藏失败！"
                    }
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                })
            }
        })
    })
}

//组内未读消息提醒
exports.unReadMsg=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var groupId=req.param('id');
    groupService.unReadMsgCount(userId,groupId,function(count){
        var tempDoc={};
        tempDoc.count=count;
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(tempDoc);
        res.end(str);
    })
}

//组内@我的提醒消息详情
exports.unReadAtMsg=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var tempTime=new Date(req.param('exitTime'));
    var groupId=req.param('id');
    var messageIds=[];
	var inArray=[];
    dao.findOne({id:userId},config.dbUser,function(user){
        if(user){
            inArray.push(user.id);
            inArray.push('allId');
            dao.list({userId:{"$in":inArray},informationType:'groupAt'},{_id:0},config.dbAt,function(docs){
                var ep=new eventproxy();
                ep.all('tempDocs',function(tempDocs){
                    var tempDoc={};
                    tempDoc.list=tempDocs;
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                })
                if(docs.length>0){
                    docs.forEach(function(doc){
                        messageIds.push(doc.informationId);
                    })
                    dao.list({id:{"$in":messageIds},'basic.undo':false,'basic.groupId':groupId,'basic.type':'groupChat','basic.publishTime':{"$gte":tempTime}},{"sort":{'basic.publishTime':-1}},config.dbInformation,function(tempDocs){

                        if(tempDocs.length>0){
                            redis.newRedis(function(err,redisClient) {
                                redisClient.hgetall("user", function (err, data) {
                                    tempDocs.forEach(function(tempDoc){
                                        var tempUserId=tempDoc.basic.userId;
                                        var user = JSON.parse(data[tempUserId]);
                                        tempDoc.basic.userName = user.basic.userName;
                                        tempDoc.basic.head = user.basic.head;
                                    });
                                    redis.close(redisClient);
                                    ep.emit('tempDocs',tempDocs);

                                });
                            });
                        }else{
                            var tempArray=[];
                            ep.emit('tempDocs',tempArray);
                        }
                    })
                }else{
                    var tempArray=[];
                    ep.emit('tempDocs',tempArray);
                }
            })
        }else{
            var tempDoc={};
            tempDoc.list=[];
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        }

    })

};

//at我的列表，公司内重点关注的私有组最新at我的提醒的条数
exports.focusGroupAtList=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
	var userId=cookie.userid;
	var companyId=req.param('companyId');
    groupService.focusGroupAtList(userId,companyId,function(docs){
        if(docs.length>0){
            for(var i=0; i<docs.length;i++){
                if(docs[i].count==0){					
                    docs.splice(i,1);
                    i--;
                }
            }
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(docs);
        res.end(str);
    })
}

//组内待审核列表个数提醒
exports.handleGroupWaitCount=function(req,res){
    var groupId=req.param('id');

        dao.total({'basic.groupId':groupId,'basic.state':'wait','basic.type':'groupInviteMemberAsk'},config.dbInformation,function(count){
		var tempDoc={};
		tempDoc.count=count;
		res.writeHead(200, {"Content-Type": "text/html"});
		var str = JSON.stringify(tempDoc);		
		res.end(str); 
    })   
};

//用户所有组未读消息提醒
exports.allUnReadMsg=function(req,res){
    var cookie=req.cookies;
    var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    groupService.allGroupList(userId,function(docs){
        var counter=0;
        if(docs.length>0){
            var tempLength=docs.length;
            docs.forEach(function(doc){
                var groupId=doc.groupInformation.id;
                groupService.unReadMsgCount(userId,groupId,function(count){
                    counter++;
                    doc.count=count;
                    if(counter==tempLength){
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

    });
}

//首页推荐群组
exports.recommendGroup=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var pageNo=parseInt(req.param('pageNo'));//当前第几页
    var pageSize=parseInt(req.param('pageSize'));//显示个数
    var query=[{"$project":{_id:0,id:1,groupInformation:1}},{"$unwind":"$groupInformation"},{"$match":{"id":userId}}];
    var inIds=[];//用户当前所在组的id集合数组
    var tempCount=0;
    var maxPage;//最大页
    var ep=new eventproxy();
    ep.all('docs',function(tempDocs){
        var result={};
        if(tempDocs.length>0){
            var length1=tempDocs.length;
            for(var m= 0;m<length1;m++){
                for(var n=m;n<length1;n++){
                    if(tempDocs[m].count<tempDocs[n].count){
                        var temp=tempDocs[m];
                        tempDocs[m]=tempDocs[n];
                        tempDocs[n]=temp;
                    }
                }
            }
			//计算最大页码
            if(length1%pageSize ===0){
                maxPage = parseInt(length1/pageSize);
            }else{
                maxPage = parseInt(length1/pageSize) + 1;
            }
			
            if(pageNo<maxPage){
				//非最后一页
                result.list=tempDocs.slice((pageNo-1)*pageSize,pageNo*pageSize);
                result.pageNum=pageNo+1;
                result.total=length1;
            }else{
				//最后一页
                result.list=tempDocs.slice(-pageSize);
                result.pageNum=maxPage;
                result.total=length1;
            }
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(result);
        res.end(str);
    })
    dao.aggregate(query,config.dbUser,function(inDocs){
		for(var i= 0; len=inDocs.length,i<len;i++){
			inIds.push(inDocs[i].groupInformation.id);
		}
		//查询不在组的列表
		groupService.list({id:{'$nin':inIds},'basic.type':'public'},{id:1,_id:0,basic:1},function(ninDocs){
			if(ninDocs.length>0){
				var ninLen=ninDocs.length;
				ninDocs.forEach(function(doc,j){
					var groupId=doc.id;
					dao.total({'groupInformation.id':groupId},config.dbUser,function(count){
						tempCount++;
						doc.count=count;
						if(tempCount==ninLen){
							ep.emit('docs',ninDocs);
						}
					})
					
				})
			}else{
				ep.emit('docs',ninDocs);
			}
		})
    })
};

//公司内@我的提醒（包括组内@我的，工作邀请@我的）
exports.companyAtMeRemind=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var tempUserId=cookie.userid;
    var companyId=req.param('companyId');
    var flag=false;
    var ep=new eventproxy();
    ep.all('groupAt','workInvitationAt',function(groupFlag,invitationFlag){
        var result={};
		result.flag=flag;
        if(groupFlag=='ok'||invitationFlag=='isHave'){
            flag=true;
            result.flag=flag;
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str=JSON.stringify(result);
        res.end(str);
    });
	
	
	
	//工作邀请@我的提醒
        dao.list({'informationType': 'invitationAt',userId:tempUserId},{},config.dbAt, function (docs) {
			var invitationFlag='noHave';
            if (docs.length > 0) {
                var count = 0;
                var isReturn = false;
                docs.forEach(function (file, i) {
                    dao.list({'basic.status':'unRead','id': file.informationId}, {}, config.dbInformation, function (commentDao) {
						count++;
                        if (commentDao.length > 0 && !isReturn) {
                            invitationFlag="isHave";
                            ep.emit('workInvitationAt',invitationFlag);
                            isReturn = true;
                        }					 
                        if (count == docs.length && !isReturn) {
                            ep.emit('workInvitationAt',invitationFlag);
                        }
                    })
                })
            } else {
                ep.emit('workInvitationAt',invitationFlag);
            }
    })

    //组内at我的提醒
    groupService.focusGroupAtList(tempUserId,companyId,function(docs){
        var groupFlag='no';
        if(docs.length>0){
            for(var i=0; i<docs.length;i++){
                if(docs[i].count>0){
                    groupFlag='ok';
                    break;
                }
            }
        }
        ep.emit('groupAt',groupFlag);
    })
}


exports.getAllGroupFile=function(req,res){
    var groupId=req.param('groupId');
    var type=req.param('type');
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var query={},condition={},options={};
    if(type=='group'){
        query={mainId:groupId,type:'F',classify:'image'};
        condition={'sort':{'createTime':-1}};
        options={url:1,imageUrl:1};

    }else{
        //查找私人对话信息
        query={'$or':[{mainId:groupId,toId:userId,type:'F',classify:'image'},{mainId:userId,toId:groupId,type:'F',classify:'image'}]};
        condition={'sort':{'createTime':-1}};
        options={url:1,imageUrl:1};
    }
    DB.client(function(db){
        DB.collection(db,config.dbFile,function(collection){
            collection.find(query,options,condition).toArray(function(err,docs){
                if(err){
                    console.error('get error: '+err);
                }
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(docs);
                res.end(str);
                DB.close(db);
            });
        });
    })

};

//首页消息列表
exports.firstPageList= function (req,res) {
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userid=cookie.userid;
    dao.findOne({id:userid},config.dbUser,function(user){
        var usersId=user.id;
        var companyId=req.param('companyId');
        var self = this;
        var query = {$or:[{'basic.toId': user.id},{'basic.userId':user.id}],'basic.state':false,'basic.type':'privateChat'};
        var query1 = {$or:[{'basic.toId': user.id},{'basic.userId':user.id}],'basic.state':true,'basic.type':'privateChat'};
        var thenObj = then(function (defer) {
            var ep = new eventproxy();
            var initList = [];
            var readList = [];
            dao.find(query,config.dbInformation, function (docs) {
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
                        listOne.count=listOne.length;
                        initList.push(listOne);
                    }
                    ep.emit('initList', initList);
                }else{
                    ep.emit('initList', initList);
                }
            })
            dao.find(query1,config.dbInformation, function (docs) {
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
                        readList.push(listOne);
                    }
                    ep.emit('readList', readList);
                }else{
                    ep.emit('readList', readList);
                }
            })
            ep.all('initList','readList', function (initList,readList) {
                var list=[];
                initList=initList.concat(readList);
                redis.newRedis(function (err, redisClient) {
                    redisClient.hgetall("user", function (err, data) {
                        initList.forEach(function (msg, i) {
                            var total={};
                            var userId = msg[0]['basic']['fromId'];
                            if(userId!=usersId){
                                var user = JSON.parse(data[userId]);
                                total['id'] = user.id;
                                total['userName'] = user.basic.userName;
                                total['head'] = user.basic.head;
                                list.push(total);
                            }
                        });
                        redis.close(redisClient);
                        defer(null,list);
                    })
                })
            })

        }).then(function (defer, list) {
            groupService.allGroupList(user.id,companyId,function(docs){
                var counter=0;
                if(docs.length>0){
                    var tempLength=docs.length;
                    docs.forEach(function(doc){
                        var groupId=doc.groupInformation.id;
                        groupService.unReadMsgCount(user.id,groupId,function(count){
                            doc.count=count;
                            dao.list({'basic.groupId':groupId},{'sort':{'basic.publishTime':-1},'limit':1},config.dbInformation, function (doc1) {
                                if(doc1.length>0){
                                    counter++;
                                    doc.message=doc1[0];
                                }else{
                                    counter++;
                                }
                                if(counter==tempLength){
                                    var counters=0;
                                    if(list.length>0){
                                        list.forEach(function(file){
                                            dao.list({'basic.type':'privateChat',$or:[{'basic.userId':file.id,'basic.toId':usersId},{'basic.userId':usersId,'basic.toId':file.id}]},{'sort':{'basic.publishTime':-1},'limit':1},config.dbInformation,function(doc2){
                                                if(doc2.length>0){
                                                    counters++;
                                                    file.message=doc2[0];
                                                }else{
                                                    counters++;
                                                }
                                                if(counters==list.length){
                                                    res.writeHead(200, {"Content-Type": "text/html"});
                                                    docs=docs.concat(list);
                                                    var str = JSON.stringify(docs);
                                                    res.end(str);
                                                }
                                            })
                                        })
                                    }else{
                                        res.writeHead(200, {"Content-Type": "text/html"});
                                        docs=docs.concat(list);
                                        var str = JSON.stringify(docs);
                                        res.end(str);
                                    }
                                }
                            })


                        })
                    })
                }else{
                    res.writeHead(200, {"Content-Type": "text/html"});
                    docs=docs.concat(list);
                    var str = JSON.stringify(docs);
                    res.end(str);
                }
            });
        })
    })
};

exports.groupAtList=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var pageNo=parseInt(req.param('pageNo'));
    var pageSize=parseInt(req.param('pageSize'));
    var informationId=[];
    var counter=0;
    var groupIds=[];
    dao.aggregate([{"$unwind":"$groupInformation"},{"$match":{"id":userId}}],config.dbUser,function(ugdocs){
        ugdocs.forEach(function(doc){
            groupIds.push(doc.groupInformation.id)
        })
        dao.list({userId:{"$in":["allId",userId]},groupId:{"$in":groupIds},informationType:"groupAt"},{},config.dbAt,function(docs){
            if(docs.length>0){
                docs.forEach(function(doc){
                    informationId.push(doc.informationId);
                })
            }
            dao.total({id:{"$in":informationId}},config.dbInformation,function(count){
                if(count>0){
                    dao.list({id:{"$in":informationId}},{"sort":{'basic.publishTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize},config.dbInformation,function(informationDocs){
                        informationDocs.forEach(function(doc){
                            var groupId=doc.basic.groupId;
                            var userId=doc.basic.userId;
                            var ep = new eventproxy();
                            ep.all(['userBasic', 'groupName'], function (userBasic,groupBasic) {
                                counter++;
                                doc.basic.userName=userBasic.userName;
                                doc.basic.groupHead=groupBasic.head;
                                doc.basic.name=groupBasic.name;
                                doc.basic.head=userBasic.head;
                                if(counter==informationDocs.length){
                                    var result={
                                        status:'success',
                                        list:informationDocs,
                                        total:count
                                    }
                                    res.writeHead(200, {"Content-Type": "text/html"});
                                    var str = JSON.stringify(result);
                                    res.end(str);
                                }

                            });
                            //userName
                            dao.findOne({id:userId},config.dbUser,function(userDoc){
                                var userBasic=userDoc.basic;
                                ep.emit('userBasic', userBasic);
                            });
                            dao.findOne({id:groupId},config.dbGroup,function(groupDoc){
                                var groupBasic=groupDoc.basic;
                                ep.emit('groupName', groupBasic);
                            });
                        })
                    })
                }else{
                    var result={
                        status:'success',
                        list:[],
                        total:0
                    }
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(result);
                    res.end(str);
                }
            })

        })
    })

}



//移交管理员权限组
exports.removeRootGroup= function (req,res) {
    var rootId=req.param('rootId');
    var mainId=req.param('mainId');
    var groupOrCompany=req.param('id');
    var self=this;
    var value={
        "id" : "3",
        "name" : "成员",
        "type" : "member",
        "typeLevel" : "primary",
        "status" : "true"
    };
    var  superRole={
        "id" : "1",
        "name" : "超级管理员",
        "type" : "super",
        "typeLevel" : "high",
        "status" : "true"
    };
    var    queryRoot={id:rootId,'groupInformation.id':groupOrCompany};
    var    setValueRoot={$set:{'groupInformation.$.role': value}}
    var    queryMain={id:mainId,'groupInformation.id':groupOrCompany};
    var    setValueMain={$set:{'groupInformation.$.role': superRole}}
    dao.update(queryRoot,setValueRoot,config.dbUser, function () {
        dao.update(queryMain,setValueMain,config.dbUser, function () {
            var returnValue={status:'success','role':value,superRole:superRole,'msg':'修改成功'}
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(returnValue);
            res.end(str);
        })
    })
};


//设置取消管理员
exports.setAdmin= function (req,res) {
    var userId=req.param('userId');
    var id=req.param('id');
    var operate=req.param('operate');
    var role
    if(operate=='true'){
        role= {"id" : "3","name" : "成员","type" : "member", "typeLevel" : "primary", "status" : "true" };
    }else{
        role= {"id" : "2","name" : "管理员", "type" : "admin","typeLevel" : "middle", "status" : "true" };
    }
    dao.update({'id':userId,'groupInformation.id':id},{$set:{'groupInformation.$.role':role}}, function () {
        var returnValue={status:'success','msg':'修改成功',role:role}
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(returnValue);
        res.end(str);
    })
};

//禁言

exports.stopSpeak= function (req,res) {
    var userId=req.param('userId');
    var id=req.param('id');
    var operate=req.param('operate');
    var isSpeak='';
    if(operate=='3'){
        isSpeak=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+3);
    }else if(operate=='7'){
        isSpeak=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+7);
    }else if(operate=='1'){
        isSpeak='false';
    }else if(operate=='true'){
        isSpeak='true';
    }
    dao.update({id:userId,'groupInformation.id':id},{$set:{'groupInformation.$.roleExtend.isSpeak':isSpeak}},config.dbUser, function (doc) {
        var returnValue={status:'success','msg':'修改成功',role:isSpeak}
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(returnValue);
        res.end(str);
    })
};

//at我的列表提醒
exports.atRemind=function(req,res){
    var cookie=req.cookies;
    //var user=JSON.parse(cookie.user);
    var userId=cookie.userid;
    var result={flag:false};
    var query=[{"$project":{_id:0,id:1,basic:1,groupInformation:1}},{"$unwind":"$groupInformation"},
        {"$match":{"id":userId}}];
    var counter=0;
    dao.aggregate(query,config.dbUser,function(groupDocs){
        var groupDocsLength=groupDocs.length;
        if(groupDocs.length>0){
            groupDocs.forEach(function(groupDoc){
                var groupId=groupDoc.groupInformation.id;
                redis.newRedis(function(err,redisClient) {
                    redisClient.hget('user', userId, function (error, res1) {
                        if (error) {
                            redis.close(redisClient);
                            console.error(error);
                        } else {
                            if(res1){
                                var tempJson = JSON.parse(res1);
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
                                                for(var i=0; i<groupDocs.length;i++){
                                                    if(groupDocs[i].count>0){
                                                        result.flag=true;
                                                        break;

                                                    }
                                                }
                                                res.writeHead(200, {"Content-Type": "text/html"});
                                                var str = JSON.stringify(result);
                                                res.end(str);
                                                redis.close(redisClient);
                                            }
                                        })
                                    }else{
                                        groupDoc.count=0;
                                        counter++;
                                        if(counter==groupDocsLength){
                                            for(var i=0; i<groupDocs.length;i++){
                                                if(groupDocs[i].count>0){
                                                    result.flag=true;
                                                    break;

                                                }
                                            }
                                            res.writeHead(200, {"Content-Type": "text/html"});
                                            var str = JSON.stringify(result);
                                            res.end(str);
                                            redis.close(redisClient);
                                        }
                                    }
                                })
                            }else{
                                res.writeHead(200, {"Content-Type": "text/html"});
                                var str = JSON.stringify(result);
                                res.end(str);
                                redis.close(redisClient);
                            }

                        }

                    });
                })


            })
        }else{
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        }
    })
}

//组内邀请人员时显示的人员列表
exports.dbUserList=function(req,res){
    var groupId=req.param("groupId");
    var pageNo=parseInt(req.param("pageNo"));
    var pageSize=parseInt(req.param("pageSize"));
    var firstSpell=req.param("firstSpell");
    var query={"groupInformation.id":{"$ne":groupId}};
    if(firstSpell){
        query={"groupInformation.id":{"$ne":groupId},"basic.firstSpell":firstSpell};
    }
    dao.total(query,config.dbUser,function(count){
        dao.list(query,{"skip":(pageNo-1)*pageSize,"limit":pageSize},config.dbUser,function(docs){
            var result={
                status:"success",
                list:docs,
                total:count
            }
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        })
    })

}

//禁言

exports.stopSpeak= function (req,res) {
    var userId=req.param('userId');
    var id=req.param('id');
    var operate=req.param('operate');
    var isSpeak='';
    if(operate=='3'){
        isSpeak=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+3);
    }else if(operate=='7'){
        isSpeak=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+7);
    }else if(operate=='1'){
        isSpeak='false';
    }else if(operate=='true'){
        isSpeak='true';
    }
    dao.update({id:userId,'groupInformation.id':id},{$set:{'groupInformation.$.roleExtend.isSpeak':isSpeak}},config.dbUser, function (doc) {
        var returnValue={status:'success','msg':'修改成功',role:isSpeak}
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(returnValue);
        res.end(str);
    })
};

//举报
exports.tip= function (req,res) {
    var doc=req.body;
    doc.id=uuid.v1();
    doc.basic.publishTime=new Date();
    dao.insert(doc,config.dbInformation, function (doc1) {
        var tempDoc={};
        tempDoc.doc=doc;
        if(doc1){
            tempDoc.msg="举报成功！";
            tempDoc.status='success';
        }else{
            tempDoc.msg="举报失败！"
            tempDoc.status='failed';
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(tempDoc);
        res.end(str);
    })
}

//举报列表
exports.tipList= function (req,res) {
    var condition=JSON.parse(req.param('conditions'));
    var id=condition.id;
    var page = req.param("page");
    page = JSON.parse(page);
    var pageSize = page.pageSize;
    var pageNum = page.pageNo;
    var query={'basic.type':'groupReport','basic.groupId':id};
    dao.total(query, config.dbInformation,function (total) {
        dao.list1(query,{},{'basic.publishTime':-1},pageNum,pageSize,config.dbInformation, function (doc) {
            redis.newRedis(function (err, redisClient) {
                redisClient.hgetall("user", function (err, data) {
                    doc.forEach(function (msg, i) {
                        var userId = msg.basic.userId;
                        var user = JSON.parse(data[userId]);
                        msg.basic.userName = user.basic.userName;
                        msg.basic.head = user.basic.head;
                    });
                    var returnValue={status:'success',list:doc,total:total}
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(returnValue);
                    res.end(str);
                    redis.close(redisClient);
                });
            });

        })
    })


}

exports.getUserRole= function (req,res) {
    var groupId=req.param('groupId');
    var userId=req.param('userId');
    var query=[{"$project":{_id:0,id:1,basic:1,groupInformation:1}},{"$unwind":"$groupInformation"},
        {"$match":{id:userId,"groupInformation.id":groupId}}]
    dao.aggregate(query,config.dbUser,function(doc){
        if(doc.length>0){
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(doc[0]);
            res.end(str);
        }else{
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify({msg:'您已经被移出群组！'});
            res.end(str);
        }

    })
};

//进入copyright群子模块
/*exports.initIndex=function(req,res){
    var userId=req.body.cookieId;
    var type=req.body.type; // 如果存在，是生产环境，则不需要存放cookie
    if(!type){
        res.cookie('userid',userId, {maxAge:config.cookieMax, path:config.cookiePath});
    }
    var tempDoc={};
    var ids=[];
    ids.push(userId);
    var options = JSON.parse(JSON.stringify(config.apiOptions));
    var urlOne=req.param('groupId');
    webService.get(ids,options,function(user){
        if(user){
            var obj=user.userInfo[0];
            if (urlOne){
                var information={
                    id:uuid.v1(),
                    basic:{
                        type:'groupInviteMemberAsk',
                        userId:userId,
                        groupId:urlOne,
                        state:'agree',
                        publishTime:new Date(),
                        replyId:[]
                    },

                    content:{
                        text:'',
                        notice:obj.userFullName+'主动请求加入组'
                    }
                };
                dao.find({'basic.userId':userId,'basic.groupId':urlOne,'basic.type':'groupInviteMemberAsk','basic.state':{$in:['wait','agree']}},config.dbInformation,function(doc1){
                    if (doc1.length==0){
                        dao.insert(information,config.dbInformation, function () {
                        })
                    }
                })

            }
            //判断copyright数据库是否有这个用户，有则修改，无则添加
            var query={id:userId};
            dao.findOne(query,config.dbUser,function(doc){

                if(doc){
                    if(req.cookies.newUser){
                        res.clearCookie('newUser');
                    }
                    if(doc.basic.stopLogin!=="true"){
                        //修改用户信息
                        dao.update(query,{"$set":{"basic.userName":obj.userNickName,
                                "basic.userFullName":obj.userFullName,
                                "basic.sex":obj.userGender,
                                "informationExtend.registerArea":obj.userAddress,
                                "basic.deleteState":obj.status,
                                "basic.stopLogin":"false"}},
                            config.dbUser,function(){
                                dao.findOne(query,config.dbUser,function(tempUser){
                                    if(tempUser){
                                        cacheData.updateData(tempUser);
                                    }

                                    tempDoc.status="success";
                                    res.writeHead(200, {"Content-Type": "text/html"});
                                    var str = JSON.stringify(tempDoc);
                                    res.end(str);
                                })


                            });
                    }else{
                        tempDoc.status="failed";
                        tempDoc.msg="用户处于停用状态,请联系管理员...";
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(tempDoc);
                        res.end(str);
                    }
                }else{
                    res.cookie('newUser', userId, {path:'/'});
                    //通过cookie整理相应的user信息
                    var user=util.installUser(userId,obj.userName,obj.userFullName,obj.userNickName,obj.userGender,obj.userAddress,obj.status);
                    dao.insert(user,config.dbUser,function(doc){
                        //console.log("新添加用户信息！");
                        cacheData.addData(user);

                        tempDoc.status="success";
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(tempDoc);
                        res.end(str);
                    })



                }
            })
        }else{
            tempDoc.status="failed";
            tempDoc.msg="获取用户信息失败！";
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        }
    })

}*/
//批量邀请用户进组
massPassiveDirectCom=function(req,arr,callback){
    var ep1=new eventproxy();
    var userId=req.cookies.userid;
    dao.findOne({id:userId},config.dbUser,function(doc){
        if(doc){
            ep1.emit('user',doc);
        }else{
            ep1.emit('user',null);
        }

    });

    ep1.all('user', function (user) {
        var groupId=req.param('groupId');
        var users=arr;
        var count= 0,returnDoc=[];
        var tempInvName="";
        if(user!=null){
            tempInvName=user.basic.userName;
        }
        if(users&&users.length>0){
            users.forEach(function(userSingle){
                groupService.get(groupId,userSingle.userid,function(doc){
                    if(doc){
                        //console.log('用户存在，步骤1');
                        count++;
                        var tempDoc={};
                        tempDoc.status='failed';
                        tempDoc.msg='用户'+userSingle.userName+'已经存在！';
                        tempDoc.id=userSingle.userid;
                        tempDoc.userName=userSingle.userName;
                        returnDoc.push(tempDoc);
                        if(count==users.length){
                            var returnObj= {'status':'success',returnDoc:returnDoc};
                            callback(returnObj);
                        }
                    }else{
                        //邀请逻辑，如果是管理员邀请则直接加入组，
                        // 如果是组员邀请，判断是否需要审核，不需要审核直接加入组，需要审核的发邀请信息
                        groupService.get(groupId,userId,function(doc){
                            var now=new Date();

                            var information={
                                id:uuid.v1(),
                                basic:{
                                    type:'groupInviteMemberAsk',
                                    userId:userSingle.userid,
                                    replyId:[],
                                    groupId:groupId,
                                    companyId:"-1",
                                    publishTime:now
                                },
                                content:{
                                    text:'',
                                    notice:tempInvName+'邀请'+userSingle.userName+"加入"+doc.groupInformation.basic.name+"组"
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
                            userGroup.basic.stopLogin="false";
                            userGroup.role.status="true";
                            dao.findOne({id:userSingle.userid}, config.dbUser,function (userDoc) {
                                if(userDoc){
                                    if(doc.groupInformation.role.id!='3'){
                                        informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':userSingle.userid},function(docTemp){

                                            //管理员或者超级管理员邀请，直接加入组内，并且发送状态为完成的邀请信息
                                            var ep=new eventproxy();
                                            //user表中的group对象
                                            information.basic.state='agree';

                                            ep.all('userGroup','information','redis',function(doc,doc1,doc2){
                                                count++;
                                                var tempDoc={};
                                                if(doc.status=='success'&&doc1.status=='success'&&doc2.status=='success'){
                                                    tempDoc.status='success';
                                                    tempDoc.msg="邀请"+userSingle.userName+'发送成功！';
                                                }else{
                                                    tempDoc.status='failed';
                                                     tempDoc.msg="邀请"+userSingle.userName+'发送失败！';
                                                }
                                                tempDoc.id=userSingle.userid;
                                                tempDoc.userName=userSingle.userName;
                                                returnDoc.push(tempDoc);
                                                if(count==users.length){
                                                    var returnObj= {'status':'success',returnDoc:returnDoc};
                                                    callback(returnObj);
                                                }
                                            });

                                            if(docTemp){
                                                var tempInformationId=docTemp.id;
                                                informationService.updateState(tempInformationId,'agree',function(doc1){
                                                    ep.emit('information',doc1);
                                                });
                                            }else{
                                                informationService.add(information,function(doc1){
                                                    ep.emit('information',doc1);
                                                });
                                            }
                                            groupService.addUser(userSingle.userid,userGroup,function(doc){
                                                ep.emit('userGroup',doc);
                                            });

                                            cacheData.UpdateDirectGroupUserInfo('join',userSingle.userid,userGroup,function(doc2){
                                                ep.emit('redis',doc2);
                                            });
                                        })

                                    }else{
                                        //console.log('一管理员邀请用户...');
                                        //组内一般成员邀请，发送状态为未完成的邀请信息
                                        groupService.basic(groupId,function(basic){
                                            if(basic.isAudit=="Y"){
                                                //需要审核，生成一条请求加入组的information信息
                                                information.basic.state='wait';
                                                informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':user.id},function(doc){
                                                    if(doc){
                                                        count++;
                                                        //用户已经请求过加入状态
                                                        var tempDoc={};
                                                        tempDoc.status='failed';
                                                        tempDoc.msg='用户'+userSingle.userName+'已经处在等待状态！';
                                                        tempDoc.id=userSingle.userid;
                                                        tempDoc.userName=userSingle.userName;
                                                        returnDoc.push(tempDoc);
                                                        if(count==users.length){
                                                            var returnObj= {'status':'success',returnDoc:returnDoc};
                                                            callback(returnObj);
                                                        }
                                                    }else{

                                                        dao.insert(information,config.dbInformation,function(doc){
                                                            count++;
                                                            var tempDoc={};
                                                            if(doc.length>0){
                                                                tempDoc.status="wait";
                                                                tempDoc.msg=userSingle.userName+"请求成功,等待管理员审核！";
                                                            }else{
                                                                tempDoc.status="failed";
                                                                tempDoc.msg=userSingle.userName+"请求失败！";
                                                            }
                                                            tempDoc.id=userSingle.userid;
                                                            tempDoc.userName=userSingle.userName;
                                                            returnDoc.push(tempDoc);
                                                            if(count==users.length){
                                                                var returnObj= {'status':'success',returnDoc:returnDoc};
                                                                callback(returnObj);
                                                            }
                                                        })
                                                    }
                                                })

                                            }else if(basic.isAudit=='N'){
                                                //组不需要审核，
                                                informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':userSingle.userid},function(docTemp){

                                                    //管理员或者超级管理员邀请，直接加入组内，并且发送状态为完成的邀请信息
                                                    var ep=new eventproxy();
                                                    //user表中的group对象
                                                    information.basic.state='agree';

                                                    ep.all('userGroup','information','redis',function(doc,doc1,doc2){
                                                        count++;
                                                        var tempDoc={};
                                                        if(doc.status=='success'&&doc1.status=='success'&&doc2.status=='success'){
                                                            tempDoc.status='success';
                                                            tempDoc.msg="邀请"+userSingle.userName+'发送成功！';
                                                        }else{
                                                            tempDoc.status='failed';
                                                            tempDoc.msg="邀请"+userSingle.userName+'发送失败！';
                                                        }
                                                        tempDoc.id=userSingle.userid;
                                                        tempDoc.userName=userSingle.userName;
                                                        returnDoc.push(tempDoc);
                                                        if(count==users.length){
                                                            var returnObj= {'status':'success',returnDoc:returnDoc};
                                                            callback(returnObj);
                                                        }
                                                    })

                                                    if(docTemp){
                                                        var tempInformationId=docTemp.id;
                                                        informationService.updateState(tempInformationId,'agree',function(doc1){
                                                            ep.emit('information',doc1);
                                                        });
                                                    }else{
                                                        informationService.add(information,function(doc1){
                                                            ep.emit('information',doc1);
                                                        });
                                                    }
                                                    groupService.addUser(userSingle.userid,userGroup,function(doc){
                                                        ep.emit('userGroup',doc);
                                                    });

                                                    cacheData.UpdateDirectGroupUserInfo('join',userSingle.userid,userGroup,function(doc2){
                                                        ep.emit('redis',doc2);
                                                    });
                                                })
                                            }
                                        })

                                    }
                                }else{
                                    if(user!=null){

                                    }
                                    information.basic.state='wait';
                                    information.basic.type='groupInvite';
                                    information.basic.userId=userId;
                                    information.basic.replyId.push(userSingle.userName);
                                    information.content.notice=tempInvName+"邀请你加入"+req.body.groupName+"组";

                                    /*util.sendInviteEmail(tempInvName,'123',userSingle.userName, function () {
                                        //console.log('发送 成功');
                                    });*/
                                    if(userSingle.userName.indexOf('@') > -1){
                                        util.sendInviteEmail(tempInvName,'123',userSingle.userName, req.body.groupName,function () {
                                            //console.log('发送 成功');
                                        });
                                    }else{
                                        util.ucenterPhoneApi(userSingle.userName,"2001",tempInvName,req.body.groupName,function(str1){
                                            //console.log('看看发短信返回的数据： '+str1)
                                        })
                                    }
                                    //util.ucenterPhoneApi(userSingle.userName,"2001",tempInvName.toString('utf8'),req.body.groupName.toString('utf8'),function(str1){

                                    informationService.add(information, function () {
                                        count++;
                                        var tempDoc={};
                                        tempDoc.status='success';
                                        tempDoc.msg="邀请"+userSingle.userName+'发送成功！';
                                        returnDoc.push(tempDoc);
                                        var returnObj= {'status':'success',returnDoc:returnDoc};
                                        callback(returnObj);
                                    })
                                }
                            })

                        })
                    }
                })
            })
        }

    });

};

//批量邀请用户加入组
exports.massInsert2= function (req,res) {
    var self=this;
    var body=req.body;
    var userId=req.cookies.userid;
    var groupId=req.param('groupId');
    var users=body.users;
    var str=users.join(';');
    var ep=new eventproxy();
    var count=0;
    users.forEach(function (files) {
        inviteHave(req,userId,groupId,files, function (msg) {
            count++;
            if(count==users.length){
                ep.emit('docs',{'status':'success',msg:'邀请发送成功'});
                ep.emit('success','success');
            }
        })
    });
    ep.all('success','docs', function (success,docs) {
        if(docs&&success=='success'){
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(docs);
            res.end(str);
        }else{
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify({status:'failed'});
            res.end(str);
        }

    })

};
//邀请是否已经发送判断
inviteHave= function (req,userId,groupId,files,callback) {
    var tempName='';
    if(req.body.userName){
        tempName=req.body.userName;
    }
    groupService.getContact(groupId,files,function(doc) {
        if (!doc||doc.length<1) {
            informationService.get({'basic.type':'groupInvite','basic.state':{$ne:'refuse'},'basic.replyId':files,'basic.groupId':groupId,'basic.userId':userId}, function (infomationDoc) {
                if(!infomationDoc){
                    psize(files, function (docs) {
                      var  arr=JSON.parse(docs).userInfo;
                      if(arr.length>0){
                          massPassiveDirectCom(req,arr, function (docs) {
                             callback({'status':'success',msg:'邀请发送成功'})
                          })
                      }else{
                          if(files.indexOf('@') > -1){
                              util.sendInviteEmail(tempName,'123',files,req.body.groupName, function (status) {
                              });
                          }else{
                              util.ucenterPhoneApi(files,'2001',req.body.userName,req.body.groupName,function(str1){
                                  //console.log('看看发短信返回的数据111： '+str1)
                              });
                          }
                          /*util.sendInviteEmail(tempName,'123',files, function (status) {
                          });*/
                          //util.ucenterPhoneApi(files,'2001',req.body.userName.toString('utf8'),req.body.groupName.toString('utf8'),function(str1){
                          util.ucenterPhoneApi(files,'2001',req.body.userName,req.body.groupName,function(str1){
                              //console.log('看看发短信返回的数据111： '+str1)
                          });
                          var now=new Date();
                          var information={
                              id:uuid.v1(),
                              basic:{
                                  type:'groupInvite',
                                  userId:userId,
                                  replyId:[files],
                                  groupId:groupId,
                                  state:"wait",
                                  publishTime:now
                              },
                              content:{
                                  text:'',
                                  notice:req.body.userName+"邀请你加入"+req.body.groupName+"组"
                              }
                          };
                          informationService.add(information, function () {});
                          callback({'status':'success',msg:'邀请发送成功'})
                      }
                    });

                }else{
                    callback({'status':'failed',msg:'邀请已存在'});
                }
            })

        }else{
            callback({'status':'failed',msg:'用户已存在该组'});
        }
    })
}


var http=require('http');
psize=function(str,callback){
    var options=JSON.parse(JSON.stringify(config.apiOptionsByName));
    options.path=options.path+str;
    var req= http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {

            callback(chunk);
        });
    });
    req.on('error', function (e) {
        callback(e.message);
    });
    req.end();
};

//批量邀请用户进组
exports.massPassive=function(req,res){
    var ep1=new eventproxy();
    var userId=req.cookies.userid;
    dao.findOne({id:userId},config.dbUser,function(doc){
        ep1.emit('user',doc);
    });
    ep1.all('user', function (user) {
        var groupId=req.param('groupId');
        var reqObj=req.body;//有被邀请user信息
        var users=reqObj.user;
        if(users&&users.length>0){
            var count= 0,returnDoc=[];
            users.forEach(function(userSingle){
                groupService.get(groupId,userSingle.userId,function(doc){
                    if(doc){
                        count++;
                        var tempDoc={};
                        tempDoc.status='failed';
                        tempDoc.msg='用户'+userSingle.userName+'已经存在！';
                        tempDoc.id=userSingle.userId;
                        tempDoc.userName=userSingle.userName;
                        returnDoc.push(tempDoc);
                        if(count==users.length){
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var returnObj={returnDoc:returnDoc};
                            var str = JSON.stringify(returnObj);
                            res.end(str);
                        }
                    }else{
                        //邀请逻辑，如果是管理员邀请则直接加入组，
                        // 如果是组员邀请，判断是否需要审核，不需要审核直接加入组，需要审核的发邀请信息
                        groupService.get(groupId,userId,function(doc){
                            var now=new Date();
                            var information={
                                id:uuid.v1(),
                                basic:{
                                    type:'groupInviteMemberAsk',
                                    userId:userSingle.userId,
                                    replyId:[],
                                    groupId:groupId,
                                    companyId:"-1",
                                    publishTime:now
                                },
                                content:{
                                    text:'',
                                    notice:user.basic.userName+'邀请'+userSingle.userName+"加入"+doc.groupInformation.basic.name+"组"
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
                            userGroup.basic.stopLogin="false";
                            userGroup.role.status="true";
                            if(doc.groupInformation.role.id!='3'){
                                informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':userSingle.userId},function(docTemp){

                                    //管理员或者超级管理员邀请，直接加入组内，并且发送状态为完成的邀请信息
                                    var ep=new eventproxy();
                                    //user表中的group对象
                                    information.basic.state='agree';

                                    ep.all('userGroup','information','redis',function(doc,doc1,doc2){
                                        count++;
                                        var tempDoc={};
                                        if(doc.status=='success'&&doc1.status=='success'&&doc2.status=='success'){
                                            tempDoc.status='success';
                                            tempDoc.msg="邀请"+userSingle.userName+'发送成功！';
                                        }else{
                                            tempDoc.status='failed';
                                            tempDoc.msg="邀请"+userSingle.userName+'发送失败！';
                                        }
                                        tempDoc.id=userSingle.userId;
                                        tempDoc.userName=userSingle.userName;
                                        returnDoc.push(tempDoc);
                                        if(count==users.length){
                                            res.writeHead(200, {"Content-Type": "text/html"});
                                            var returnObj={returnDoc:returnDoc};
                                            var str = JSON.stringify(returnObj);
                                            res.end(str);
                                        }
                                    })

                                    if(docTemp){
                                        var tempInformationId=docTemp.id;
                                        informationService.updateState(tempInformationId,'agree',function(doc1){
                                            ep.emit('information',doc1);
                                        });
                                    }else{
                                        informationService.add(information,function(doc1){
                                            ep.emit('information',doc1);
                                        });
                                    }
                                    groupService.addUser(userSingle.userId,userGroup,function(doc){
                                        ep.emit('userGroup',doc);
                                    });

                                    cacheData.UpdateDirectGroupUserInfo('join',userSingle.userId,userGroup,function(doc2){
                                        ep.emit('redis',doc2);
                                    });
                                })

                            }else{
                                //组内一般成员邀请，发送状态为未完成的邀请信息
                                groupService.basic(groupId,function(basic){
                                    if(basic.isAudit=="Y"){
                                        //需要审核，生成一条请求加入组的information信息
                                        information.basic.state='wait';
                                        informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':userId},function(doc){
                                            if(doc){
                                                count++;
                                                //用户已经请求过加入状态
                                                var tempDoc={};
                                                tempDoc.status='failed';
                                                tempDoc.msg='用户'+userSingle.userName+'已经处在等待状态！';
                                                tempDoc.id=userSingle.userId;
                                                tempDoc.userName=userSingle.userName;
                                                returnDoc.push(tempDoc);
                                                if(count==users.length){
                                                    res.writeHead(200, {"Content-Type": "text/html"});
                                                    var returnObj={returnDoc:returnDoc};
                                                    var str = JSON.stringify(returnObj);
                                                    res.end(str);
                                                }
                                            }else{

                                                dao.insert(information,config.dbInformation,function(doc){
                                                    count++;
                                                    var tempDoc={};
                                                    if(doc.length>0){
                                                        tempDoc.status="wait";
                                                        tempDoc.msg=userSingle.userName+"请求成功,等待管理员审核！";
                                                    }else{
                                                        tempDoc.status="failed";
                                                        tempDoc.msg=userSingle.userName+"请求失败！";
                                                    }
                                                    tempDoc.id=userSingle.userId;
                                                    tempDoc.userName=userSingle.userName;
                                                    returnDoc.push(tempDoc);
                                                    if(count==users.length){
                                                        res.writeHead(200, {"Content-Type": "text/html"});
                                                        var returnObj={returnDoc:returnDoc};
                                                        var str = JSON.stringify(returnObj);
                                                        res.end(str);
                                                    }
                                                })
                                            }
                                        })

                                    }else if(basic.isAudit=='N'){
                                        //组不需要审核，
                                        informationService.get({'basic.groupId':groupId,'basic.state':'wait','basic.userId':userSingle.userId},function(docTemp){

                                            //管理员或者超级管理员邀请，直接加入组内，并且发送状态为完成的邀请信息
                                            var ep=new eventproxy();
                                            //user表中的group对象
                                            information.basic.state='agree';

                                            ep.all('userGroup','information','redis',function(doc,doc1,doc2){
                                                count++;
                                                var tempDoc={};
                                                if(doc.status=='success'&&doc1.status=='success'&&doc2.status=='success'){
                                                    tempDoc.status='success';
                                                    tempDoc.msg="邀请"+userSingle.userName+'发送成功！';
                                                }else{
                                                    tempDoc.status='failed';
                                                    tempDoc.msg="邀请"+userSingle.userName+'发送失败！';
                                                }
                                                tempDoc.id=userSingle.userId;
                                                tempDoc.userName=userSingle.userName;
                                                returnDoc.push(tempDoc);
                                                if(count==users.length){
                                                    res.writeHead(200, {"Content-Type": "text/html"});
                                                    var returnObj={returnDoc:returnDoc};
                                                    var str = JSON.stringify(returnObj);
                                                    res.end(str);
                                                }
                                            })

                                            if(docTemp){
                                                var tempInformationId=docTemp.id;
                                                informationService.updateState(tempInformationId,'agree',function(doc1){
                                                    ep.emit('information',doc1);
                                                });
                                            }else{
                                                informationService.add(information,function(doc1){
                                                    ep.emit('information',doc1);
                                                });
                                            }
                                            groupService.addUser(userSingle.userId,userGroup,function(doc){
                                                ep.emit('userGroup',doc);
                                            });

                                            cacheData.UpdateDirectGroupUserInfo('join',userSingle.userId,userGroup,function(doc2){
                                                ep.emit('redis',doc2);
                                            });
                                        })
                                    }
                                })

                            }
                        })
                    }
                })
            })
        }
    });

};



//搜索平台中全部群组
/*exports.queryGroups=function(req,res){
 var ep=new eventproxy();
 var searchName=req.param('searchName');
 var pageNo=req.param('pageNo');
 var pageSize=req.param('pageSize');
 dao.total({'basic.name': {$regex: searchName}},config.dbGroup,function(count){
 dao.list({'basic.name': {$regex: searchName}},
 {'sort':{'extend.createTime':-1},"skip":(pageNo-1)*pageSize,"limit":pageSize},
 config.dbGroup,function(docs){
 var tempDoc={};
 tempDoc.list=docs;
 tempDoc.total=count;
 res.writeHead(200, {"Content-Type": "text/html"});
 var str = JSON.stringify(tempDoc);
 res.end(str);
 })
 })
 };*/
exports.queryGroups=function(req,res){
    var ep=new eventproxy();
    var searchName=req.param('searchName');
    var pageNo=req.param('pageNo');
    var pageSize=req.param('pageSize');
    var list=[];
    var count=0;
    var count1=0;
    ep.all('group','user',function(docs1,docs2){
        var total=0;
        list=list.concat(docs1).concat(docs2);
        if(list.length>0){
            for(var m=0;m<list.length;m++){
                for(var n=m+1;n<list.length;n++){
                    if(list[m].id==list[n].id){
                        console.log('去重');
                        list.splice(n,1);
                        n--;
                    }
                }
            }
            for(var i=0;i<list.length;i++){
                for(var j=i;j<list.length;j++){
                    if(list[i].extend.createTime<list[j].extend.createTime){
                        var temp=list[i];
                        list[i]=list[j];
                        list[j]=temp;
                    }
                }
            }
            // console.log('全部群组: '+JSON.stringify(list));
            total=list.length;
            list=list.slice((pageNo-1)*pageSize,(pageNo*pageSize));
        }
        var tempDoc={};
        tempDoc.list=list;
        tempDoc.total=total;
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(tempDoc);
        // console.log('结果： '+str);
        res.end(str);
    })
    dao.find({'basic.name': {$regex: searchName}},config.dbGroup,function(groupDocs){
        //list.concat(docs);
        if(groupDocs.length>0){
            groupDocs.forEach(function(doc){
                dao.aggregate([{"$project":{_id:0,id:1,basic:1,groupInformation:1}},{"$unwind":"$groupInformation"},
                    {"$match":{'groupInformation.id':doc.id,"groupInformation.role.id":'1'}}],config.dbUser,function(docs2){
                    count1++;
                    if(docs2.length>0){
                        doc.userName=docs2[0].basic.userName;
                    }
                    if(count1==groupDocs.length){
                        ep.emit('group',groupDocs);
                    }
                })
            })
        }else{
            ep.emit('group',groupDocs);
        }
    });
    dao.aggregate([{"$project":{_id:0,id:1,basic:1,groupInformation:1}},{"$unwind":"$groupInformation"},
        {"$match":{'basic.userName': {$regex: searchName},"groupInformation.role.id":'1'}}],config.dbUser,function(docs1){
        var list1=[];
            if(docs1.length>0){
            docs1.forEach(function(doc){
                dao.findOne({id:doc.groupInformation.id},config.dbGroup,function(tempDoc){
                    count++;
                    if(tempDoc){
                        tempDoc.userName=doc.basic.userName;
                        list1.push(tempDoc);
                    }
                    if(count==docs1.length){
                        ep.emit('user',list1);
                    }
                })
            })
        }else{
            ep.emit('user',list1);
        }
    })
}

informationHave= function (userId,userName,groupId,callback) {
    informationService.get({'basic.userId':userId,'basic.replyId':userName,'basic.groupId':groupId,'basic.state':{$ne:'refuse'}}, function (doc) {
        if(doc){
            callback('1')
        }else{
            callback('0');
        }
    })
}

//返回用户是否禁止登陆
exports.getUserPermission=function(req,res){
    var tempDoc={};
    var userId=req.param('userId');
    groupService.userPermission(userId,function(str){
        if(str!=null){
            tempDoc.status='success';
            tempDoc.permission=str;
        }else{
            tempDoc.status='failed';
            tempDoc.permission="true";
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(tempDoc);
        res.end(str);
    })
}

//检查二维码是否存在
exports.checkQrCode=function(req,res){
    var groupId=req.param('groupId');
    var tempDoc={};
    dao.findOne({id:groupId,"extend.qrCodeUrl": { "$exists": false }},config.dbGroup,function(doc){
        if(doc){
            var qrCodeUrl="/server/"+groupId+".png";
            dao.update({id:groupId},{"$set":{"extend.qrCodeUrl":qrCodeUrl}},config.dbGroup,function(){
                if(!fs.existsSync(config.headFileSavePath)){
                    fs.mkdirSync(config.headFileSavePath , 0777);
                }
                var url=config.headFileSavePath+groupId+".png";
                if(!fs.existsSync(url)){
                    webService.changeUrl(groupId,function(urlDoc){
                        if(urlDoc){
                            var tempUrl=urlDoc.url_short;
                            var img = qr.image(tempUrl,{ type:'png',ec_level:'H',size:2,margin:0});
                            img.pipe(fs.createWriteStream(url));

                        }
                        tempDoc.status='success';
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(tempDoc);
                        res.end(str);
                    })
                }else{
                    tempDoc.status='success';
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                }
            })

        }else{
            tempDoc.status='success';
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        }
    })

};


//进入copyright群子模块
exports.initIndex=function(req,res){
    var ep = new eventproxy();
    var userId=req.body.cookieId;
    var type=req.body.type; // 如果存在，是生产环境，则不需要存放cookie
    if(!type){
        res.cookie('userid',userId, {maxAge:config.cookieMax, path:config.cookiePath});
    }
    var tempDoc={};
    var ids=[];
    ids.push(userId);
    var options = JSON.parse(JSON.stringify(config.apiOptions));
    var urlOne=req.param('groupId');
    webService.get(ids,options,function(user){
        if(user&&user.status==="1"){
            var obj=user.userInfo[0];
            if (urlOne){
                dao.find({'basic.userId':userId,'basic.groupId':urlOne,'basic.type':'groupInviteMemberAsk','basic.state':{$in:['wait','agree']}},config.dbInformation,function(doc1){
                    if (doc1.length==0){
                        var information={
                            id:uuid.v1(),
                            basic:{
                                type:'groupInviteMemberAsk',
                                userId:userId,
                                groupId:urlOne,
                                state:'agree',
                                publishTime:new Date(),
                                replyId:[]
                            },
                            content:{
                                text:'',
                                notice:obj.userFullName+'主动请求加入组'
                            }
                        };
                        groupService.basic(urlOne,function(basicDoc){
                            if(basicDoc&&basicDoc.isAudit=="Y"){
                                information.basic.state="wait";
                            }
                            dao.find({'basic.userId':userId,'basic.groupId':urlOne,'basic.type':'groupInviteMemberAsk','basic.state':{$in:['wait','agree']}},config.dbInformation,function(doc1){
                                if (doc1.length==0){
                                    dao.insert(information,config.dbInformation, function () {
                                    })
                                }
                            })
                        })
                    }
                })
            }
            //判断copyright数据库是否有这个用户，有则修改，无则添加
            var query={id:userId};
            dao.findOne(query,config.dbUser,function(doc){
                if(doc){
                    if(req.cookies.newUser){
                        res.clearCookie('newUser');
                    }
                    if(doc.basic.stopLogin!=="true"){
                        //修改用户信息
                        var tempStr="";
                        if(obj.userNickName){
                            tempStr=obj.userNickName;
                        }else{
                            tempStr=obj.userName;
                        }
                        dao.update(query,{"$set":{"basic.userName":tempStr,
                                "basic.userFullName":obj.userFullName,
                                "basic.userNickName":obj.userName,
                                "basic.sex":obj.userGender,
                                "informationExtend.registerArea":obj.userAddress,
                                "companyInformation[0].basic.name":obj.company,
                                "basic.deleteState":obj.status,
                                "basic.stopLogin":"false"}},
                            config.dbUser,function(){
                                dao.findOne(query,config.dbUser,function(tempUser){
                                    if(tempUser){
                                        cacheData.updateData(tempUser);
                                    }
                                    if(urlOne){
                                        groupService.basic(urlOne,function(basicDoc){
                                            if(basicDoc&&basicDoc.isAudit=="N"){
                                                dao.get({id:urlOne},{},config.dbGroup,function(doc1){
                                                    var now=new Date();
                                                    var userGroupBasic=doc1.basic;
                                                    var userGroupRoleBasic={};
                                                    userGroupRoleBasic.id='3';
                                                    userGroupRoleBasic.name='成员';
                                                    userGroupRoleBasic.type='member';
                                                    userGroupRoleBasic.typeLevel='primary';
                                                    var userGroupRoleExtend={};
                                                    userGroupRoleExtend.joinTime=now;
                                                    userGroupRoleExtend.isFocusOn="N";
                                                    userGroupRoleExtend.speakNumber=0;
                                                    userGroupRoleExtend.lastSpeakTime=now;
                                                    userGroupRoleExtend.exitTime=now;
                                                    var groupInformation={};
                                                    groupInformation.id=doc1.id;
                                                    groupInformation.basic=userGroupBasic;
                                                    groupInformation.basic.stopLogin="false";
                                                    groupInformation.role=userGroupRoleBasic;
                                                    groupInformation.role.status="true";
                                                    groupInformation.roleExtend=userGroupRoleExtend;
                                                    groupService.addUser(userId,groupInformation,function(doc){
                                                        ep.emit('groupUser');
                                                    });

                                                    cacheData.UpdateDirectGroupUserInfo('join',userId,groupInformation,function(doc2){
                                                        ep.emit('group');
                                                    })
                                                })
                                            }
                                        })
                                    }else{
                                        ep.emit('groupUser');
                                        ep.emit('group');
                                    }
                                })
                            });
                    }else{
                        tempDoc.status="failed";
                        tempDoc.msg="用户处于停用状态,请联系管理员...";
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(tempDoc);
                        res.end(str);
                    }
                }else{
                    res.cookie('newUser', userId, {path:'/'});
                    //通过cookie整理相应的user信息
                    //var user=util.installUser(userId,obj.userName,obj.userFullName,obj.userNickName,obj.userGender,obj.userAddress,obj.status);
                    var user=util.installUser1(obj);
                    dao.insert(user,config.dbUser,function(doc){
                        //console.log("新添加用户信息！");
                        cacheData.addData(user);
                        if(urlOne){
                            groupService.basic(urlOne,function(basicDoc){
                                if(basicDoc&&basicDoc.isAudit=="N"){
                                    dao.get({id:urlOne},{},config.dbGroup,function(doc1){
                                        var now=new Date();
                                        var userGroupBasic=doc1.basic;
                                        var userGroupRoleBasic={};
                                        userGroupRoleBasic.id='3';
                                        userGroupRoleBasic.name='成员';
                                        userGroupRoleBasic.type='member';
                                        userGroupRoleBasic.typeLevel='primary';
                                        var userGroupRoleExtend={};
                                        userGroupRoleExtend.joinTime=now;
                                        userGroupRoleExtend.isFocusOn="N";
                                        userGroupRoleExtend.speakNumber=0;
                                        userGroupRoleExtend.lastSpeakTime=now;
                                        userGroupRoleExtend.exitTime=now;
                                        var groupInformation={};
                                        groupInformation.id=doc1.id;
                                        groupInformation.basic=userGroupBasic;
                                        groupInformation.basic.stopLogin="false";
                                        groupInformation.role=userGroupRoleBasic;
                                        groupInformation.role.status="true";
                                        groupInformation.roleExtend=userGroupRoleExtend;
                                        groupService.addUser(userId,groupInformation,function(doc){
                                            ep.emit('groupUser');
                                        });
                                        cacheData.UpdateDirectGroupUserInfo('join',userId,groupInformation,function(doc2){
                                            ep.emit('group');
                                        })
                                    })
                                }

                            })
                        }else{
                            tempDoc.status="success";
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var str = JSON.stringify(tempDoc);
                            res.end(str);
                        }
                    })
                }
                ep.all('groupUser','group',function(){
                    tempDoc.status="success";
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                })
            })

        }else{
            tempDoc.status="failed";
            tempDoc.msg="获取用户信息失败！";
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        }
    })
};

//获取聊天框中点击活动等查看详情
exports.checkInfo=function(req,res){
    var id=req.param('id');
    var type = req.param('type');
    var query={id:id,'basic.type':type};
    var result={status:'success'};
    dao.findOne(query,config.dbInformation,function(doc){
        if(!doc){
            result.status='failed';
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(result);
        res.end(str);
    })
};

//联系卖家初始化消息列表方法
exports.tradeInitMsgList=function(req,res){
    var userId=req.param('fromId'),
        toId=req.param('toId'),
        startNo=req.param('startNO'),
        pageSize=req.param('pageSize');
    dao.list({'$or':[{'basic.userId':userId,'basic.toId':toId},{'basic.userId':toId,'basic.toId':userId}],'basic.type':'tradeChat'},
        {'sort':{'basic.publishTime':-1},"skip":startNo,"limit":pageSize},
        config.dbInformation,function(docs){
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(docs);
            res.end(str);
        })
};
//联系卖家初始化左侧未读列表消息个数
exports.tradeInitUnreadCount=function(req,res){
    var userId=req.param('userId'),
        toId=req.param('toId');
    var tempArr=[];
    var tempDoc={};
    var counter=0;
    DB.client(function(db){
        DB.collection(db,config.dbInformation,function(collection){
            collection.distinct("basic.userId" ,{'basic.type':'tradeChat','basic.toId':userId,'basic.state':false},function(err, docs){
                if(docs.length>0){
                    docs.forEach(function(doc){
                        dao.list({'basic.userId':doc,'basic.type':'tradeChat','basic.toId':userId,'basic.state':false},
                            {sort:{'basic.publishTime':-1}},config.dbInformation,function(docs1){
                                counter++;
                                if(docs1&&docs1.length>0){
                                    tempDoc.count=docs1.length;
                                    tempDoc.id=docs1[0].basic.userId;
                                    tempDoc.userName=docs1[0].basic.userName;
                                    tempArr.push(tempDoc);
                                }
                                if(counter==docs.length){
                                    res.writeHead(200, {"Content-Type": "text/html"});
                                    var str = JSON.stringify(tempArr);
                                    res.end(str);
                                    DB.close(db);
                                }
                            })
                    })
                }else{
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempArr);
                    res.end(str);
                    DB.close(db);
                }
            });
        });
    });
};
// 修改未读为已读
exports.updateTradeState = function (req,res) {
    var self = this;
    var userId = req.param("userId");
    var toId = req.param("toId");
    dao.updateOnly({'basic.userId':userId,'basic.toId':toId,'basic.type':"tradeChat"},{$set:{'basic.state':true}},config.dbInformation,function(){
        res.writeHead(200, {"Content-Type": "text/html"});
        var returnValue = {status: 'success', msg: '成功'};
        var str = JSON.stringify(returnValue);
        res.end(str);
    })
};

exports.tradeUnReadMsgCount=function(req,res){
    var userId=req.param('id');
    dao.total({'basic.type':'tradeChat','basic.toId':userId,'basic.state':false},config.dbInformation,function(count){
        res.writeHead(200, {"Content-Type": "text/html"});
        var count1=0;
        if(count){
            count1=count;
        }
        var str2 = JSON.stringify({count:count1});
        res.end(str2);
    });

};

//列表调用验证好友接口
exports.checkFriend=function(req,res){
    var userId=req.param('userId'),
        toId=req.param('toId');
    dao.findOne({id:userId,'personalAddress':{'$elemMatch':{userId:toId}}},config.dbUser,function(doc){
        if(doc){
            //是好友
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify({"status":"1"});
            res.end(str);
        }else{
            //非好友，查找information
            dao.findOne({'$or':[{'basic.type':'friendInvitation','basic.userId':userId,'basic.replyId':toId,'basic.state':'wait'},
                {'basic.type':'friendInvitation','basic.userId':toId,'basic.replyId':userId,'basic.state':'wait'}]},config.dbInformation,function(doc1){
                if(doc1){
                    //已经请求过加好友
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str1 = JSON.stringify({"status":"2"});
                    res.end(str1);
                }else{
                    //没有发起过请求
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str2 = JSON.stringify({"status":"3"});
                    res.end(str2);
                }
            })

        }
    })

};

//添加好友接口
exports.addFriend=function(req,res){
    var userId=req.body.userId,
        toId=req.body.toId;
    var ep = new eventproxy();
    var tempDoc={};
    var ids=[];
    dao.findOne({id:userId},config.dbUser,function(doc){
        //邀请者在互动交流平台存在
        if(doc){
            ep.emit('userExist',true);
        }else{
            ep.emit('userExist',false);
        }
    });
    dao.findOne({id:toId},config.dbUser,function(doc1){
        //邀请者在互动交流平台存在
        if(doc1){
            ep.emit('toExist',true);
        }else{
            //邀请者不存在互动交流平台上
            ep.emit('toExist',false);
        }
    });
    ep.all('userExist','toExist',function(userExist,toExist){
        then(function(defer){
            if(userExist&&toExist){
                //双方都存在于互动交流平台上，但不是好友，执行加好友操作
                defer(null);
            }else if(userExist&&!toExist){
                //被动者不在互动交流平台上，平台添加被动者，然后互加好友
                ids.push(toId);
            }else if(!userExist&&toExist){
                //主动者不在互动平台，平台添加主动者，互加好友
                ids.push(userId);
            }else if(!userExist&&!toExist){
                //双方都不在互动平台，平台添加双方，然后互加好友
                ids.push(userId);
                ids.push(toId);
            }
            var options = JSON.parse(JSON.stringify(config.apiOptions));
            webService.get(ids,options,function(user){
                if(user&&user.status==="1"){
                    var objs=user.userInfo;
                    //判断copyright数据库是否有这个用户，有则修改，无则添加
                    var counter=0;
                    objs.forEach(function(obj){
                        var user=util.installUser1(obj);
                        //var user=util.installUser(obj.userid,obj.userName,obj.userFullName,obj.userNickName,obj.userGender,obj.userAddress,obj.status);
                        dao.insert(user,config.dbUser,function(doc){
                            //console.log("新添加用户信息！");
                            counter++;
                            cacheData.addData(user);
                            if(counter==objs.length){
                                defer(null);
                            }

                        })
                    })
                }else{
                    tempDoc.status="failed";
                    tempDoc.errorCode='1';
                    tempDoc.msg="获取用户信息失败！";
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(tempDoc);
                    res.end(str);
                }
            })

        }).then(function(defer){
            //执行加好友操作
            var information = {
                id:uuid.v1(),
                'basic': {
                    'publishTime': new Date(), 'userId': userId,'type': 'friendInvitation',
                    'replyId': toId, 'remark': '','state': 'wait'
                },
                'content': {
                    'text': '', 'notice': '请求添加你为好友'
                }
            };
            dao.insert(information, config.dbInformation, function (doc1) {
                if(doc1&&doc1.length>0){
                    tempDoc.status="success";
                    tempDoc.msg="操作成功";
                }else{
                    tempDoc.status="failed";
                    tempDoc.errorCode='2';
                    tempDoc.msg="操作失败";
                }
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(tempDoc);
                res.end(str);
            });
        })

    });
};


//版权贸易对接消息列表
/*
exports.allMsgList=function(req,res){
    var userId=req.param('userId');
    var tempArr=[];
    var unReadArr=[];
    var residueArr=[];
    var resultDoc={};
    var tempDoc={};
    var counter=0;
    DB.client(function(db){
        DB.collection(db,config.dbInformation,function(collection){
            collection.distinct("basic.userId" ,{'basic.type':'tradeChat','basic.toId':userId,'basic.state':false},function(err, docs){
                if(docs.length>0){
                    redis.newRedis(function(err,redisClient) {
                        if(docs.length>=20){
                            //未读信息对方人数大于规定最大值，全部显示的是未读消息列表
                            docs.forEach(function(doc){
                                dao.list({'basic.userId':doc,'basic.type':'tradeChat','basic.toId':userId,'basic.state':false},
                                    {sort:{'basic.publishTime':-1}},config.dbInformation,function(docs1){
                                        counter++;
                                        if(docs1&&docs1.length>0){
                                            tempDoc.online=false;
                                            redisClient.hget('user', doc, function (error, res) {
                                                if (error) {

                                                    console.error("cacheData getUserOnline error: "+error);
                                                }
                                                if(res){
                                                    tempDoc.online=true;
                                                }
                                                else {
                                                    redis.close(redisClient);
                                                }
                                                tempDoc.count=docs1.length;
                                                tempDoc.id=docs1[0].basic.userId;
                                                tempDoc.userName=docs1[0].basic.userName;
                                                unReadArr.push(tempDoc);
                                            });

                                        }
                                        if(counter==docs.length){
                                            resultDoc.unReadArr=unReadArr;
                                            resultDoc.residueArr=[];
                                            DB.close(db);
                                            redis.close(redisClient);
                                            res.writeHead(200, {"Content-Type": "text/html"});
                                            var str = JSON.stringify(resultDoc);
                                            res.end(str);

                                        }
                                    })
                            })
                        }else{
                            //不够最大值，需要找最近聊天的几个
                            var tempCount=20-docs.length;


                        }
                    })
                }else{
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(resultDoc);
                    res.end(str);
                    DB.close(db);
                }
            });
        });
    });
}*/

exports.allMsgList=function(req,res){
    var userId=req.param('id');
    var totalArr=[];
    var unReadArr=[];
    var unReadArr1=[];
    var residueArr=[];
    var residueArr1=[];
    var resultDoc={};
    var counter=0;
    var counter1=0;
    var counter2=0;
    var ep=new eventproxy();
    console.log("id: "+userId);
    DB.client(function(db){
        DB.collection(db,config.dbInformation,function(collection){
            collection.distinct("basic.userId" ,{'basic.type':'tradeChat','basic.toId':userId,'basic.state':false},function(err, docs){
                console.log('docs length：'+docs.length);
                if(docs.length>0){
                    redis.newRedis(function(err,redisClient) {
                        if(docs.length>=20){
                            //未读信息对方人数大于规定最大值，全部显示的是未读消息列表
                            console.log('111');
                            docs.forEach(function(doc){
                                dao.list({'basic.userId':doc,'basic.type':'tradeChat','basic.toId':userId,"basic.state":false},
                                {'basic':1,id:1,"_id":0,sort:{'basic.publishTime':-1},limit:1},config.dbInformation,function(docs1){
                                    counter++;
                                    if(docs1&&docs1.length>0){
                                        unReadArr.push(docs1[0]);
                                    }
                                    if(counter==docs.length){
                                        if(unReadArr.length>0){
                                            console.log('222');
                                            unReadArr.sort(util.getSortFun('desc', 'basic.publishTime'));
                                            unReadArr.forEach(function(doc11){
                                                redisClient.hget('user', doc11.basic.userId, function (error, res1) {
                                                    counter1++;
                                                    var tempDoc={};
                                                    tempDoc.online=false;
                                                    if (error) {
                                                        console.error("cacheData getUserOnline error: "+error);
                                                    }
                                                    if(res1&&res1.groupOnline=="login"){
                                                        tempDoc.online=true;
                                                    }
                                                    tempDoc.id=doc11.basic.userId;
                                                    unReadArr1.push(tempDoc);

                                                    if(counter1==unReadArr.length){
                                                        console.log('333');
                                                        resultDoc.unReadArr=unReadArr1;
                                                        resultDoc.residueArr=[];
                                                        DB.close(db);
                                                        redis.close(redisClient);
                                                        res.writeHead(200, {"Content-Type": "text/html"});
                                                        var str = JSON.stringify(resultDoc);
                                                        console.log(str);
                                                        res.end(str);

                                                    }
                                                });

                                            })
                                        }
                                    }
                                })
                            })
                        }else{
                            //不够最大值，需要找最近聊天的几个
                            var tempCount=20-docs.length;
                            console.log("tempCount: "+tempCount);
                            console.log('aaa');
                            collection.distinct("basic.userId" ,{'basic.type':'tradeChat','basic.toId':userId},function(err, allDocs){
                                allDocs.forEach(function(doc){
                                    dao.list({'basic.userId':doc,'basic.type':'tradeChat','basic.toId':userId},
                                        {'basic':1,id:1,"_id":0,sort:{'basic.publishTime':-1},limit:1},config.dbInformation,function(docs1){
                                            counter++;
                                            if(docs1&&docs1.length>0){
                                                totalArr.push(docs1[0]);
                                                console.log(JSON.stringify(totalArr));
                                            }
                                            if(counter==allDocs.length){
                                                console.log('bbb');
                                                var flag=false;
                                                for(var i=0;i<totalArr.length;i++){
                                                    if(totalArr[i].basic.state){
                                                        residueArr.push(totalArr[i]);
                                                    }else{
                                                        unReadArr.push(totalArr[i])
                                                    }
                                                }
                                                ep.all(["residue","unRead"],function(residue,unRead){
                                                    if(residue===null){
                                                        residue=[];
                                                    }
                                                    if(unRead===null){
                                                        unRead=[];
                                                    }
                                                    console.log('eee');
                                                    resultDoc.unReadArr=unRead;
                                                    resultDoc.residueArr=residue;
                                                    DB.close(db);
                                                    redis.close(redisClient);
                                                    res.writeHead(200, {"Content-Type": "text/html"});
                                                    var str = JSON.stringify(resultDoc);
                                                    console.log(str);
                                                    res.end(str);
                                                })
                                                if(residueArr.length>0){
                                                    console.log('ccc');
                                                    residueArr.sort(util.getSortFun('desc', 'basic.publishTime'));
                                                    residueArr=residueArr.slice(0,tempCount);
                                                    residueArr.forEach(function(doc11){
                                                        redisClient.hget('user', doc11.basic.userId, function (error, res1) {
                                                            counter1++;
                                                            var tempDoc={};
                                                            tempDoc.online=false;
                                                            if (error) {
                                                                console.error("cacheData getUserOnline error: "+error);
                                                            }
                                                            if(res1&&res1.groupOnline=="login"){
                                                                tempDoc.online=true;
                                                            }
                                                            tempDoc.id=doc11.basic.userId;
                                                            residueArr1.push(tempDoc);

                                                            if(counter1==residueArr.length){
                                                                console.log('ccc111');
                                                                ep.emit("residue",residueArr1);

                                                            }
                                                        });

                                                    })

                                                }else{
                                                    console.log('ccc333');
                                                    ep.emit("residue",null);
                                                }
                                                if(unReadArr.length>0){
                                                    console.log('ddd');
                                                    unReadArr.sort(util.getSortFun('desc', 'basic.publishTime'));
                                                    unReadArr.forEach(function(doc12){
                                                        redisClient.hget('user', doc12.basic.userId, function (error, res2) {
                                                            counter2++;
                                                            var tempDoc={};
                                                            tempDoc.online=false;
                                                            if (error) {
                                                                console.error("cacheData getUserOnline error: "+error);
                                                            }
                                                            if(res2&&res2.groupOnline=="login"){
                                                                tempDoc.online=true;
                                                            }
                                                            else {
                                                                redis.close(redisClient);
                                                            }
                                                            tempDoc.id=doc12.basic.userId;
                                                            unReadArr1.push(tempDoc);
                                                            if(counter2==unReadArr.length){
                                                                console.log('ddd111');
                                                                ep.emit("unRead",unReadArr1);

                                                            }
                                                        });

                                                    })
                                                }else{
                                                    ep.emit("unRead",null);
                                                }


                                            }

                                        })
                                })
                            })
                        }
                    })
                }else{
                    console.log('fff');
                    collection.distinct("basic.userId" ,{'basic.type':'tradeChat','basic.toId':userId,'basic.state':true},function(err, allDocs){
                        if(allDocs.length>0){
                            allDocs.forEach(function(doc){
                                dao.list({'basic.userId':doc,'basic.type':'tradeChat','basic.toId':userId,'basic.state':true},
                                    {'basic':1,id:1,"_id":0,sort:{'basic.publishTime':-1},limit:1},config.dbInformation,function(docs1){
                                        counter++;
                                        if(docs1&&docs1.length>0){
                                            residueArr.push(docs1[0]);
                                        }
                                        if(counter==allDocs.length){
                                            console.log('fff111');

                                            if(residueArr.length>0){
                                                console.log('fff222');
                                                residueArr.sort(util.getSortFun('desc', 'basic.publishTime'));
                                                residueArr=residueArr.slice(0,20);
                                                redis.newRedis(function(err,redisClient) {
                                                    residueArr.forEach(function(doc11){
                                                        redisClient.hget('user', doc11.basic.userId, function (error, res1) {
                                                            counter1++;
                                                            var tempDoc={};
                                                            tempDoc.online=false;
                                                            if (error) {
                                                                console.error("cacheData getUserOnline error: "+error);
                                                            }
                                                            if(res1&&res1.groupOnline=="login"){
                                                                tempDoc.online=true;
                                                            }
                                                            tempDoc.id=doc11.basic.userId;
                                                            residueArr1.push(tempDoc);

                                                            if(counter1==residueArr.length){
                                                                console.log('fff333');
                                                                console.log('fff444');
                                                                resultDoc.unReadArr=[];
                                                                resultDoc.residueArr=residueArr1;
                                                                DB.close(db);
                                                                redis.close(redisClient);
                                                                res.writeHead(200, {"Content-Type": "text/html"});
                                                                var str = JSON.stringify(resultDoc);
                                                                console.log(str);
                                                                res.end(str);

                                                            }
                                                        });

                                                    })
                                                })


                                            }
                                        }
                                    })
                            })
                        }else{
                            console.log('ppp');
                            resultDoc.unReadArr=[];
                            resultDoc.residueArr=[];
                            DB.close(db);
                            res.writeHead(200, {"Content-Type": "text/html"});
                            var str = JSON.stringify(resultDoc);
                            console.log(str);
                            res.end(str);
                        }
                    })
                }
            });
        });
    });
};