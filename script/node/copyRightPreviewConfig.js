var config=module.exports = {
    host: '127.0.0.1',
    port: 3001,
    urlPreffix: '/resource',
    mUrlPreffix:'/manager',
    uploadTmpDir:'./upload/upload_tmp',
    uploadSizeLimit:'2048mb',
    highWaterMark: 30*1024*1024,  //文件最大存储流量
    sessionTime:30,
    isLog:true,
    logPath:'log',
    mongodbServerAddrs:[          //数据库集群配置
        {ip:'129.1.0.141',port:27017},
        {ip:'129.1.0.141',port:27018}
    ],
    province:['北京','天津','重庆','上海','河北',
        '山西','辽宁','吉林','黑龙江','江苏','浙江','安徽','福建','江西',
        '山东','河南','湖北','湖南','广东','海南','四川','贵州','云南',
        '陕西','甘肃','青海','台湾','内蒙古自治区','广西','西藏','宁夏',
        '新疆'],
    redisIP: '129.1.0.142',
    redisPort:7004,
    redisSocketIP: '129.1.0.142',
    redisSocketPort:7004,

    thriftSensitiveWordIP:'127.0.0.1',
    thriftSensitiveWordPort:9798,
    thriftFileIP:'127.0.0.1',
    thriftFilePort:9797,
    thriftDockIP:'127.0.0.1',
    thriftDockPort:9796,
    thriftDockListIP:'127.0.0.1',
    thriftDockListPort:9795,

    chatShowStart:1,  //聊天页面初始化开始下标
    chatShowNO:10,    //聊天页面每页的显示个数
    db:'copyRightPreview',
    dbUser:'snsUser',
    dbGroup:'snsGroup',
    dbMsg:'snsInformation',
    dbFile:'snsFile',
    dbAt:'snsAt',
    dbInformation:'snsInformation',
    directoryImageUrl:'images/wjj.png',
    groupHead:'/images/u9.png',
    userHead:'/images/profile.png',
	emailServer:'3185361947@qq.com',   //邀请成员发送邮件的服务器
	emailPassword:'ptkhkcidbzridgdf',
    //sns.banquanmaoyi.com:28080/uias/....
	apiOptions:{
        hostname: '129.1.0.144',
        port: 8080,
        path: '/uias/api/userApi.do?method=getUserInfoById&uid=',
        method: 'GET'
    },
	apiOptionsByName:{
        hostname: '129.1.0.144',
        port: 8080,
        path: '/uias/api/userApi.do?method=getUserInfoByName&uName=',
        method: 'GET'
    },
	cookieMax:60000*60*24*30,
	cookiePath:'/',
    //根据邀请注册的用户注册链接，tourl指copyright的域名
    //regPath:'http://129.1.0.144:8080/uias/app/register.jsp?tourl=http://129.1.0.144:8080/uias/app/login.jsp?tourl=http://129.1.0.141:3001/loading.html',
    regPath:'http://ucenter.banquanmaoyi.com:28080/uias/app/register.jsp?tourl=http://sns.banquanmaoyi.com:3001',
    fileSavePath:'/cfs/sns/',
	headFileSavePath:'/cfs/sns/head/',
    simplifyFileSavePath:'/cfs/sns/simplify/',
    originalFileSavePath:'/cfs/sns/original/',
    webmFileSavePath:'/cfs/sns/webm/',
    //fileSavePath:'E:\\cfs\\sns\\'
    dealLongUrl:"http://api.t.sina.com.cn/short_url/shorten.json?source=3271760578&url_long=http://ucenter.banquanmaoyi.com:28080/uias/app/register.jsp?tourl=http://ucenter.banquanmaoyi.com:28080/uias/app/login.jsp?tourl=http://sns.banquanmaoyi.com:28080/loading.html?groupId=",
    phoneMsgUrl:"http://ucenter.banquanmaoyi.com:28080/uias/api/toolsApi.do?method=SendSMS",
    loginApiUrl:"http://ucenter.banquanmaoyi.com:28080/uias/app/loginAppAction.do?method=ajaxLogin",
    //验证手机号
    checkPhoneApi:"http://ucenter.banquanmaoyi.com:28080/uias/app/userAddAction.do?method=isExistPhone&userPhone=",
    //验证用户名
    checkUserNameApi:"http://ucenter.banquanmaoyi.com:28080/uias/app/userAddAction.do?method=isExistUsername&username=",
    //验证邮箱号
    checkEmailApi:"http://ucenter.banquanmaoyi.com:28080/uias/app/userAddAction.do?method=isExistMail&userEmail=",
    //普通用户手机注册
    phoneRegister:"http://ucenter.banquanmaoyi.com:28080/uias/app/userAddAction.do?method=ajaxRegister&",
    //普通用户邮箱注册
    emailRegister:"http://ucenter.banquanmaoyi.com:28080/uias/app/userAddAction.do?method=ajaxRegisterMail&",

    //调用统一用户登录接口
    ucenterLoginApi:"http://ucenter.banquanmaoyi.com:28080/uias/app/login.jsp?tourl=http://sns.banquanmaoyi.com:28080",

    logConfigObj:{
        levels:['info'],
        appenders: [
            {
                type: 'dateFile',
                filename: 'log/',//log日志文件所在文件夹目录
                pattern:'yyyy-MM-dd.log',
                alwaysIncludePattern: true,
                maxLogSize: 1024*1024*50,
                backups:3,
                category: 'console'
            }
        ],
        replaceConsole: true
    }
};
