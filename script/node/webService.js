var http = require('http');
var config = require('./config');
//通过userId获取单个儿用户接口
exports.get = function(array, options, callback){
    var queryString="";
    var flag=true;
    for(var i = 0;i< array.length;i++){
        if(i == array.length-1){
            flag=false;
            queryString+=array[i];
        }
        if(flag){
            queryString+=array[i]+';';
        }

    }
    options.path = options.path+queryString;
    console.log(options.path);
    var req = http.request(options, function (res) {

        var full = "";
        res.on('data', function(chunk) {
            full += chunk.toString('utf8');
        });
        res.on('end', function() {
            var json = JSON.parse(full);
            callback(json);
        });
    });
    req.on('error', function (e) {
        console.error('problem with request: ' + e.message);
    });
    req.end();
    console.log('call ucenter getUserInfoById api end');
};

//长连接变短链接
exports.changeUrl = function(id, callback){
    //var tempUrl="http://api.t.sina.com.cn/short_url/shorten.json?source=3271760578&url_long=http://192.168.80.108:8080/uias/app/register.jsp?tourl=http://192.168.80.108:8080/uias/app/login.jsp?tourl=http://192.168.80.76:3001/loading.html?groupId=";
    var tempUrl = config.dealLongUrl;
    //console.log("看看长连接： "+tempUrl+id);
    var req = http.request(tempUrl+id, function (res) {
        var full = "";
        res.on('data', function(chunk) {
            full += chunk.toString('utf8');
        });
        res.on('end', function() {
            var obj = JSON.parse(full);
            callback(obj[0]);
        });
    });
    req.on('error', function (e) {
        console.error('problem with request: ' + e.message);
    });
    req.end();
    console.log('call ucenter getUserInfoById api end');
};

//短信接口
exports.phoneApi = function(phone,type,user,group, callback){
    //var tempUrl="http://api.t.sina.com.cn/short_url/shorten.json?source=3271760578&url_long=http://192.168.80.108:8080/uias/app/register.jsp?tourl=http://192.168.80.108:8080/uias/app/login.jsp?tourl=http://192.168.80.76:3001/loading.html?groupId=";
    var tempStr=group.substring(group.length-1,group.length);
    if(tempStr!="组"&&tempStr!="群"){
        group=group+"群组";
    }
    var tempUrl = config.phoneMsgUrl+"&phone="+phone+"&type="+type+"&params="+encodeURI(user+";"+group);
    var req = http.request(tempUrl, function (res) {
        var full = "";
        res.on('data', function(chunk) {
            full += chunk.toString('utf8');
        });
        res.on('end', function() {
            console.log(full);
            callback(full);
        });
    });
    req.on('error', function (e) {
        console.error('problem with request: ' + e.message);
    });
    req.end();
    console.log('call ucenter phoneMsg api end');
};

//调用登录接口
exports.loginApi = function(userName,password,callback){
    //&userName=参数&passWord=参数&tourl=参数
    //http://192.168.80.108:8080/uias/api/loginAppAction.do?method=ajaxLogin&userName=参数&passWord=参数&tourl=参数
    var tempUrl = config.loginApiUrl+"&userName="+userName+"&passWord="+password;
    var req = http.request(tempUrl, function (res) {
        var full = "";
        res.on('data', function(chunk) {
            full += chunk.toString('utf8');
        });
        res.on('end', function() {
            console.log(full);
            var tempObj=JSON.parse(full.substr(9));
            callback(tempObj);
        });
    });
    req.on('error', function (e) {
        console.error('problem with request: ' + e.message);
    });
    req.end();
    console.log('call ucenter 【loginApi】 api end');
};

exports.publicGet = function(url,callback){
    var req = http.request(url, function (res) {
        var full = "";
        res.on('data', function(chunk) {
            full += chunk.toString('utf8');
        });
        res.on('end', function() {
            callback(full);
        });
    });
    req.on('error', function (e) {
        console.error('problem with request: ' + e.message);
    });
    req.end();
    console.log('call ucenter 【publicGet】 api end');
};