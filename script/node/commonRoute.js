var config = require('./config');
var dbClient = require('./DBClient');
var fileSystem = require("fs");
var path = require('path');
var util=require('./util');
var cacheData=require('./cacheData');
var webService=require('./webService');
var then = require('thenjs');
var uuid = require('node-uuid');
var eventproxy=require('eventproxy');
var groupService=require('./group/groupService');
var dao=require('./group/groupDao');
var clientIp=require('client-ip');
var DB=require('./DBClient');

exports.fileConmmon = function(request, response){
    var scriptName = request.url;
    var scriptNameArray=scriptName.split('?');
    scriptName=scriptNameArray[0];
    var requestdFilePath = path.join(process.cwd(), scriptName);
    if(!fileSystem.existsSync(requestdFilePath)){
        response.writeHead(404);
        response.end();
        return;
    }

    if(requestdFilePath.indexOf('.css')>0)
        response.writeHead(200, {"Content-Type": "text/css"});
    else if(requestdFilePath.indexOf('.js')>0)
        response.writeHead(200, {"Content-Type": "application/x-javascript"});
    else if(requestdFilePath.indexOf('.png')>=0)
        response.writeHead(200,{"Content-Type":"image/png"});
    else if(requestdFilePath.indexOf('.gif')>=0)
        response.writeHead(200,{"Content-Type":"image/gif"});
    else if(requestdFilePath.indexOf('.jpg')>=0)
        response.writeHead(200,{"Content-Type":"image/jpeg"});
    else if(requestdFilePath.indexOf('.mp4')>=0||requestdFilePath.indexOf('.MP4')>=0)
        response.writeHead(200,{"Content-Type":"video/mp4"});
    else if(requestdFilePath.indexOf('.webm')>=0||requestdFilePath.indexOf('.WEBM')>=0)
        response.writeHead(200,{"Content-Type":"video/webm"});
    else
        response.writeHead(200, {"Content-Type": "text/html"});

    var readstream = fileSystem.createReadStream(requestdFilePath);
    readstream.on('data', function(chunk) {
        response.write(chunk);
    });
    readstream.on('error', function(error) {
        console.error('commonRoute error: '+error);
    });
    readstream.on('end', function() {
        response.end();
    });
};
exports.login1= function (req,res) {
    var loginName=req.param('contactValue');
    var password=req.param('password');
    var check=req.param('check');//true or false
    dbClient.client( function (db) {
        dbClient.collection(db,config.dbUser, function (collection) {
            dbClient.findOne(collection,{"contactInformation":{"$elemMatch":{contactValue:loginName,
                registerTag:"true"}}},function (doc) {
				if(doc){
					if(doc.validation.password==util.md5(password)){
						delete doc._id;
						delete doc.validation;
						delete doc.informationExtend;
						delete doc.groupInformation;
						res.clearCookie('company');
						if(doc.companyInformation&&doc.companyInformation.length>0){
							for(var i=0;i<doc.companyInformation.length;i++){							
							if(doc.companyInformation[i]['userCompanyRole']['status']=='true'){
									var doc1 = {};
									doc1.id=doc.companyInformation[i].id;
									doc1.name=doc.companyInformation[i].basic.name;
									delete doc.companyInformation;
									var json=JSON.stringify(doc1);
									res.cookie('company', json, {maxAge:60000*60*24*30, path:'/'});
									cacheData.updateUserCompanyRoleByTime(doc.id,doc1.id);
									break;
								}							
							}
						}							
						delete doc.contactInformation;
						delete doc.personalAddress;
						if(doc.callUser){
							delete doc.callUser;	
						}
						doc.contactValue = loginName;
						var json1=JSON.stringify(doc);
						if(req.cookies.user){
							res.clearCookie('user');
						}
						if(req.cookies.userLogin){
							res.clearCookie('userLogin');
						}
                        if(check){
                            res.cookie('userLogin', json1, {maxAge:60000*60*24*30, path:'/'});
                        }
                        res.cookie('user', json1, {maxAge:60000*60*24*30, path:'/'});
                        res.cookie('isLogin', 'true', {maxAge:600000,  path:'/'});
						
						util.returnV(res,'success','登录成功');
					}else{
						util.returnV(res,"failed",'密码错误');
					}
				}else{
					util.returnV(res,"failed",'该用户不存在');

				}
				dbClient.close(db);
            })
        })
    })

};
exports.invisible=function(req,res){
    var cookie=req.cookies;
    var user=JSON.parse(cookie.user);
    var userId=user.id;
    cacheData.getUpdateUser(userId,'invisible',function(){
        socket.emit('updateOnlineUsers',tempUserId);
        io.of('/groupConnect').emit('updateOnlineUsers',tempUserId);
    })
};
exports.loginOut=function(req, res){
    res.clearCookie('userid');
    res.clearCookie('userid',{ domain: '.banquanmaoyi.com'});
    res.writeHead(200, {"Content-Type": "text/html"});
    var returnValue={status:"success",msg:'登出成功'};
    var str = JSON.stringify(returnValue);
    res.end(str);
};

exports.sendPhoneMsg=function(req,res){
    var phoneNO=req.param('phone');
    //var url="http://192.168.80.32:8081/app/userAddAction.do?method=sendMessage&phone="+phoneNO;
    //var url="http://192.168.80.133:8080/uias/app/userAddAction.do?method=sendMessage&phone="+phoneNO;
    var url=config.phoneCodeApi+phoneNO;
    var result={};
    webService.publicGet(url,function(tempStr){
        if(tempStr){
            console.log('手机验证码');
            console.log(tempStr);
            var tempObj=JSON.parse(tempStr);

            if(tempObj&&tempObj.status&&tempObj.code){
                cacheData.setCaptcha(phoneNO,{type:"register",code:tempObj.code,publishTime:new Date()},function(doc){
                    if(doc){
                        result.status="success";
                        result.msg=tempObj.message;
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(result);
                        res.end(str);
                    }else{
                        result.status="failed";
                        result.msg="系统异常";
                        res.writeHead(200, {"Content-Type": "text/html"});
                        var str = JSON.stringify(result);
                        res.end(str);
                    }
                })
            }else{
                result.status="failed";
                result.msg=tempObj.message;
                res.writeHead(200, {"Content-Type": "text/html"});
                var str = JSON.stringify(result);
                res.end(str);
            }

        }else{
            result.status="failed";
            result.msg="接口异常";
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        }
    })
};
//验证注册表单信息
exports.checkInputInfo=function(req,res){
    var type=req.param('type');
    var value=req.param('value');
    var url="";
    if(type=="phoneCheck"){
        url=config.checkPhoneApi+value;
    }else if(type=="userName"){
        url=config.checkUserNameApi+value;
    }else{
        url=config.checkEmailApi+value;
    }
    webService.publicGet(url,function(tempStr){
        if(tempStr){
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(tempStr);
        }else{
            var result={status:"failed",msg:"接口异常"};
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(result);
            res.end(str);
        }
    })
};
//普通用户注册接口
exports.registerApi=function(req,res){
    var type=req.body.type;//手机注册还是邮箱注册
    var userName="",password="",source="1002",url="";
    if(type==="phone"){
        userName=req.body.uname;
        password=util.md5(req.body.password);
        var code=req.body.code;
        var phone=req.body.phone;
        url=config.phoneRegister+"phone="+phone+"&uname="+encodeURI(userName)+"&password="+password+"&code="+code+"&source="+source
    }
    if(type==="email"){
        userName=req.body.name;
        password=util.md5(req.body.password);
        var email=req.body.email;
        url=config.emailRegister+"email="+email+"&name="+encodeURI(userName)+"&password="+password+"&source="+source
        //url="http://192.168.80.43:8081/app/userAddAction.do?method=ajaxRegisterMail&email=lhy31lyq@qq.com&name=1231&password=12345&source=%E5%8F%82%E6%95%B0&tourl=%E5%8F%82%E6%95%B0"
    }
    webService.publicGet(url,function(tempStr){
        console.log(tempStr);
        var tempObj=JSON.parse(tempStr);
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(tempObj);
        res.end(str);

    })

}

//验证验证码
exports.getUserCaptcha=function(req,res){
    var type=req.param("type");
    var phoneNo=req.param("phoneNo");
    var code=req.param("code");
    console.log("getUserCaptcha---"+type+"---"+phoneNo+"---"+code);
    cacheData.getCaptcha(type,phoneNo,function(doc){
        var result={};
        if(doc){
            if(doc.code==code){
                result.status="success";
                result.msg="验证码正确";
            }else{
                result.status="diff";
                result.msg="验证码不匹配";
            }

        }else{
            result.status="failed";
            result.msg="请输入正确的验证码"
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(result);
        console.log("getUserCaptcha-end---"+str);
        res.end(str);
    })

};

//检查验证码是否存在
exports.codeIsExist=function(req,res){
    var type=req.param('type');
    var phoneNo=req.param('phoneNo');
    var now=new Date();
    console.log("codeIsExist---"+type+"---"+phoneNo);
    cacheData.getCaptcha(type,phoneNo,function(doc){
        var result={};
        if(doc){
            //判断验证码是否过期
            console.log(JSON.stringify(doc));
            var tempTime=now.getTime()-new Date(doc.publishTime).getTime();
            console.log("看看时间差： "+tempTime);
            if(tempTime>10*60*1000){
                cacheData.delCaptcha2("register",phoneNo);
                result.status="no";
            }else{
                result.status="exist";
            }

        }else{
            result.status="no";
        }
        res.writeHead(200, {"Content-Type": "text/html"});
        var str = JSON.stringify(result);
        console.log("codeIsExist-end"+str);
        res.end(str);
    })
}

exports.loginApi=function(req,res){
    var userName=req.param('userName');
    var password=req.param('password');
    var ep = new eventproxy();
    password=util.md5(password);
    var type=req.body.type; // 如果存在，是生产环境，则不需要存放cookie
    var tempDoc={};
    var ids=[];
    var urlOne=req.param('groupId');
    webService.loginApi(userName,password,function(tempUser){
        if(tempUser&&tempUser.status=='sucess'){
            //登录成功
            var userId=tempUser.userid;
            ids.push(userId);
            var options = JSON.parse(JSON.stringify(config.apiOptions));
            if(!type){
                res.cookie('userid',userId, {maxAge:config.cookieMax, path:config.cookiePath});
            }
            res.cookie('userid',userId,{ domain: '.banquanmaoyi.com',maxAge:4*60*60*1000, path:"/"});
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
        }else{
            //登录失败
            tempDoc.status="failed";
            tempDoc.msg="请输入正确的帐号和密码";
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        }
    })
};

function getClientIp(req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
}
exports.mLogin=function(req, res){
	var loginName=req.param('contactValue');
	var password=req.param('password');
	//var ip = req.connection.remoteAddress;
    var ip=clientIp(req);
    if(ip.length>15){
        ip=ip.substr(7,ip.length)
    }
	var result={};
	 if((loginName == 'admin' && password=='wjs654321')||(loginName == 'audit' && password=='wjs654321')){
		var doc={loginName:loginName};
		var json=JSON.stringify(doc);
		res.cookie('user', json, {path:'/'});
        DB.client(function (db) {
            DB.collection(db, config.dbInformation, function (collection) {
                collection.insert({basic:{name: loginName,ip:ip,loginTime:new Date(),state:'登陆成功',type:'loginMonitor'}}, function (doc) {
                    var result = {};
                    result.status='success';
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(result);
                    res.end(str);
                   DB.close(db);
                });
            });
        })
	}else{
        DB.client(function (db) {
            DB.collection(db, config.dbInformation, function (collection) {
                collection.insert({basic:{type:'loginMonitor',name: loginName,ip:ip,loginTime:new Date(),state:'登陆失败'}}, function (doc) {
                    var result = {};
                    result.status='failed';
                    result.msg='登陆失败';
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str = JSON.stringify(result);
                    res.end(str);
                    DB.close(db);

                });
            });
        })
    }
};
exports.mLoginOut=function(req, res){
	res.clearCookie('user');
	var result={};
	result.state='success';
	res.writeHead(200, {"Content-Type": "text/html"});
	var str = JSON.stringify(result);
	res.end(str);
};
