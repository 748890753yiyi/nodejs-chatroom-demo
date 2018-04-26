var config = require('./config');
var webService=require('./webService');

exports.loginFilter = function(req, res, next){
    var url = req.originalUrl;
	var sign=true;
	if(url.indexOf('.')>0){
	    urlArray=url.split('?');
	    url=urlArray[0];
	    if(url.indexOf('.')>0){
            if(url&& url.match(/^(.*)(\.)(.{1,8})$/)!=null){
                var postfix = url.match(/^(.*)(\.)(.{1,8})$/)[3].toLowerCase();
                if(postfix == "ico" ||postfix == "js"||postfix == "map" || postfix == "css"|| postfix == "png" || postfix == "jpg" || postfix == "gif"|| postfix == "jpeg"|| postfix == "woff"|| postfix == "tff"|| postfix == "woff2" ){
                    sign=false;
                }
            }
	    }
	}
	
	if(sign){
        // 交流平台
        if(url=='/' || url=="/login.html"){
            if(req.cookies.userid){
                return res.redirect("/index.html");
            }
            //return res.redirect("/login.html");
            return res.redirect(config.ucenterLoginApi);
            //return res.redirect("/loading.html");

        }
		if(url == "/manage/index.html"){
			if(!req.cookies.user){
				return res.redirect("/manage/login.html");
			}
		}
        // 平台管理
        //由于互动交流平台管理端与前端已经分开，暂且将这里相关url的判断注释掉
/*        if(url=='/manage' || url=='/manage/'){
            return res.redirect("/manage/login.html");
        }*/
	}

    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With,pragma");
    res.header("Access-Control-Allow-Methods","PUT,GET,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", true);
    if (req.method === 'OPTIONS') {
        return res.send(200);
    } else {
        return next();
    }
	//next();
};
exports.permissionFilter = function(req, res, next){
    var self=req.session.self;
	var url = req.originalUrl;
	
	if(url.indexOf(config.urlPreffix)==0){
		var verifyUrl=req.session.self.verifyUrl;
		var sign=false;
		for(var i=config.verifyUrlDigit;i>=2;i--){
			var newUrl=splitAndMerge(url,'/',i);
			if(verifyUrl[newUrl]){
				sign=true;
				break;
			}
		}
		if(!sign){
			if(req.headers.accept.indexOf('/json')>=0){
				var returnValue={status:"fail",msg:'no permission'};
				res.writeHead(200, {"Content-Type": "text/html"});
				var str = JSON.stringify(returnValue);
				res.end(str);
				return;
			}else{
		//		return res.redirect("/login.html");  
			}
			
		}
	}
	
	next();
};

exports.userCheck=function(req,res){
    var userId=req.param('userId');
    var toId=req.param('toId');
    var userName=req.param('userName');
    var toName=req.param('toName');
    var ids=[userId,toId];
    var options = JSON.parse(JSON.stringify(config.apiOptions));
    webService.get(ids,options,function(data){
        var users = data.userInfo;
        if(users&&users.length>0){
            if(users.length==2){
                if((users[0].userid==userId&&users[0].userNickName==userName&&users[1].userid==toId&&users[1].userNickName==toName)||
                    (users[1].userid==userId&&users[1].userNickName==userName&&users[0].userid==toId&&users[0].userNickName==toName)){
                    var tempDoc1={
                        status:'success',
                        msg:"验证成功"
                    };
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str1 = JSON.stringify(tempDoc1);
                    res.end(str1);
                }else{
                    //参数异常
                    var tempDoc2={
                        status:'failed',
                        msg:"参数异常"
                    };
                    res.writeHead(200, {"Content-Type": "text/html"});
                    var str2 = JSON.stringify(tempDoc2);
                    res.end(str2);
                }
            }else{
                //接口异常
                var tempDoc3={
                    status:'failed',
                    msg:"参数异常"
                };
                res.writeHead(200, {"Content-Type": "text/html"});
                var str3 = JSON.stringify(tempDoc3);
                res.end(str3);
            }
        }else{
            //接口异常
            var tempDoc={
                status:'failed',
                msg:"参数异常"
            };
            res.writeHead(200, {"Content-Type": "text/html"});
            var str = JSON.stringify(tempDoc);
            res.end(str);
        }
    })
};

function splitAndMerge(url,splitCharacter,Digit){
	var urlArray=url.split(splitCharacter);
	var newUrl="";
	for(var i=0;i<=Digit;i++){
		var u=urlArray[i];
		newUrl+=u+"/";
	}
	return newUrl;
}