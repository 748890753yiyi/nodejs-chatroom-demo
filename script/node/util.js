var transliteration = require('transliteration');
var config = require('./config');
var nodemailer = require('nodemailer');
var cacheData = require("./cacheData");
var SensitiveWordStorage = require('./group/gen-nodejs/SensitiveWordManager');
var thrift = require('./thriftClient');
var http=require('http');
var webService=require('./webService');

//md5加密
var crypto = require('crypto');

//邮件服务器
var transporter = nodemailer.createTransport({
    service: 'qq',
    secureConnection: true, // use SSL
    port: 465,
    auth: {
        user: config.emailServer,
        pass: config.emailPassword
    }
});
	
//日期格式化方法封装
Date.prototype.format = function(format){
    var o = {
        "M+" : this.getMonth()+1, //month
        "d+" : this.getDate(), //day
        "h+" : this.getHours(), //hour
        "m+" : this.getMinutes(), //minute
        "s+" : this.getSeconds(), //second
        "q+" : Math.floor((this.getMonth()+3)/3), //quarter
        "S" : this.getMilliseconds() //millisecond
    };

    if(/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
    }

    for(var k in o) {
        if(new RegExp("("+ k +")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
        }
    }
    return format;
};

var util = module.exports = {
    //md5加密
    md5 :function (str) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(str);
        str = md5sum.digest('hex');
        return str;
    },
    //汉语转拼音
    transliterate :function(str){
        return transliteration.transliterate(str);
    },
	
	mMd5:function(data) {
		 if(data){
			var Buffer = require("buffer").Buffer;    
			var buf = new Buffer(data);    
			var str = buf.toString("binary");    
			var crypto = require("crypto");    
			return crypto.createHash("md5").update(str).digest("hex");	 
		 }else{
			return null;
		 }
	},
	//汉语转拼音
	mTransliterate: function (str) {
		var str1=transliteration.transliterate(str);
		str1=str1.replace(/[ ]/g,"").toLocaleLowerCase();
		str1=str1.substr(0,1).toUpperCase()+str1.substr(1);
		return str1;
	},

	sendInviteEmail : function(invitePerson1,userId,emailNum,groupName,callBack){
        var invitePerson = "";
        groupName=groupName.indexOf("组")>-1?groupName:groupName+"组";
        if(invitePerson1){
            invitePerson = invitePerson1;
        }
        var mailOptions = {
            from : config.emailServer,
            to : emailNum,// 邮箱地址
            subject : '【互动交流平台】群组邀请主题',
            //html : '<div style="display: none;">'+new Date().format("yyyyMMdd")+'</div>'+'<b>'+'发起人: '+invitePerson+'</b>'+'<br/>'+"<b>" + "点击【"+'<a href='+config.regPath+'>'+'加入'+"</a>】"+"</b>"
            html : '<div style="display: none;">'+new Date().format("yyyyMMdd")+'</div>'+
            '<b>'+'【国家版权贸易基地】'+'</b>'+'<br/>'+
            '<b>'+invitePerson+'在互动交流平台邀请您加入'+groupName+',在这里您可以在线沟通，分享想法.'+'</b>'+'<br/>'+"<b>" + "点击【"+'<a href='+config.regPath+'>'+'加入'+"</a>】"+"</b>"
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.error("error: " + error);
                status = "failed";
            } else {
                //console.log(info);
                status = "success";
            }
            callBack(status);
        });
    },

    returnV: function (res, status, msg) {
        res.writeHead(200, {"Content-Type" : "text/html"});
        var returnValue = {status : status, msg : msg};
        var str = JSON.stringify(returnValue);//console.log(str)
        res.end(str);
    },
    getSortFun : function (order, sortBy) {
		var ordAlpah = (order == 'asc') ? '>' : '<';
		var sortFun = new Function('a', 'b', 'return a.' + sortBy + ordAlpah + 'b.' + sortBy + '?1:-1');
		return sortFun;
	},
	
	//检查敏感字
    checkSensitiveWord : function(text, callback){
        thrift.client(SensitiveWordStorage, 'SensitiveWord', function(connection,client){
            thrift.call(client, 'add', [text], function(tempText){
                callback(tempText);
                thrift.close(connection);
            });
        });

    },
    // 导出聊天记录，整理内容
	trimTxt : function(str, label){
		var self = this;
		str = str.replace(new RegExp("&nbsp;","gm")," ");
		// 查找网址开始位置
        var startIndex = str.indexOf("<"+label);

        if(startIndex > -1){
            // 如果不是从头开始，则取其之后子串
            var newStr = str;
            if(startIndex > 0){
                newStr = str.substring(startIndex);
            }
            // 查找网址结束位置
            var endIndex = str.indexOf(">", startIndex);
            var subStr = str.substring(startIndex, endIndex+1);
			if(label === "img"){
				str = str.replace(subStr,"[表情]");
			}else{
				str = str.replace(subStr,' ').replace("</"+label+">","");
			}

            return self.trimTxt(str, label);
        }else{
            return str;
        }
	},
	
	//通过统一用户用户信息组装copyright的user信息
	installUser : function(userid, userName, userFullName, userNickName, userGender, userAddress, status){
		var self = this;
		var user =
			{ 
				"id" : "", 
				"basic" : {
					"head" : config.userHead,
					"sex" : "", 
					"userName" : "", 
					"userNickName":"",
					"spell" : "", 
					"firstSpell" : "",

					"deleteState" : false,
                    "stopLogin" : "false"
				}, 
				"validation" : {
					"password" : ""
				}, 
				"contactInformation" : [
					{
						"contactType" : "phone",
						"contactValue" : "", 
						"registerTag" : "true"
					}
				], 
				"informationExtend" : {
					"registerArea" : "",
                    "registerTime" : new Date()
				}, 
				"companyInformation" : [
					{
						"id" : "", 
						"basic" : {
							"name" : ""
						}
					}
				], 
				"groupInformation" : [
					
				], 
				"personalAddress" : [

				]
			};
		user.id = userid;
		user.basic.userName = userNickName;
		user.basic.userFullName = userFullName;
		user.basic.sex = userGender;
		user.basic.spell = self.transliterate(user.basic.userName);
		user.basic.firstSpell = user.basic.spell.substring(0, 1).toUpperCase();
		user.basic.deleteState = status;
		user.contactInformation[0].contactValue = userName;
        if(userName.indexOf("@")>-1){
            user.contactInformation[0].contactType = "email";
        }
		user.informationExtend.registerArea = userAddress;
        if(userName.indexOf("@")>-1){
            user.contactInformation[0].contactType = "email";
        }
		return user;
	},
    installUser1 : function(obj){
        var self = this;
        var user =
        {
            "id" : obj.userid.toString(),
            "basic" : {
                "head" : config.userHead,
                "sex" : "",
                "userName" : obj.userName,
                "userNickName":obj.userName ,
                "userFullName":"",
                "spell" : "",
                "firstSpell" : "",

                "deleteState" :obj.status,
                "stopLogin" : "false"
            },
            "validation" : {
                "password" : ""
            },
            "contactInformation" : [

            ],
            "informationExtend" : {
                "registerArea" : "",
                "registerTime" : new Date()
            },
            "companyInformation" : [
                {
                    "id" : "",
                    "basic" : {
                        "name" : ""
                    }
                }
            ],
            "groupInformation" : [

            ],
            "personalAddress" : [

            ]
        };
        if(obj.imagepath){
            user.basic.head = obj.imagepath;
        }
        if(obj.userNickName){
            user.basic.userName = obj.userNickName;
        }
        if(obj.userFullName){
            user.basic.userFullName = obj.userFullName;
        }
        if(obj.userGender){
            user.basic.sex = obj.userGender;
        }
        if(obj.phone){
            user.contactInformation.push({
                "contactType" : "phone",
                "contactValue" : obj.phone
            });
        }
        if(obj.email){
            user.contactInformation.push({
                "contactType" : "email",
                "contactValue" : obj.email
            });
        }
        if(obj.userAddress){
            user.informationExtend.registerArea = obj.userAddress;
        }
        if(obj.company){
            user.companyInformation[0].basic.name = obj.company;
        }
        user.basic.spell = self.transliterate(user.basic.userName);
        user.basic.firstSpell = user.basic.spell.substring(0, 1).toUpperCase();
        return user;
    },
    //调用统一用户平台短信接口
    ucenterPhoneApi:function(phone,type,user,group,callback){
        webService.phoneApi(phone,type,user,group,function(str){
            callback(str);
        })
    },
	month:function (years) {
		var i;
		var c=[];
		for(i=1;i<=12;i++){
			var yearString=years+','+i;
			var a=new Date(yearString);
			c.push(a);
		}
		return c;
	},
	days: function (years,month) {
		var days=0;
		if(years%4==0&&month==2){
			days=29;
		}else if(month==2){
			days=28;
		}else if(month==1||month==3||month==5||month==7||month==8||month==10||month==12){
			days=31;
		}else{
			days=30;
		}
		var i;
		var dates=[]
		for( i=1;i<=days;i++){
			var daysString=years+','+month+','+i;
			dates.push(daysString)
		}
		return dates;
	}
};

