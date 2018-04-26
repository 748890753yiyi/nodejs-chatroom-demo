var config=module.exports = {
    host: '127.0.0.1',
    port: 3001,
    urlPreffix: '/resource',
    mUrlPreffix:'/manager',
    uploadTmpDir:'./upload/upload_tmp',
    uploadSizeLimit:'2048mb',
    highWaterMark: 30*1024*1024,  //文件最大存储流量
    sessionTime:30,
    isLog:false,
    //logPath:'log',
    mongodbServerAddrs:[          //数据库集群配置
        {ip:'192.168.80.90',port:27017},
        {ip:'192.168.80.90',port:27018}
    ],
    redisIP: '192.168.80.90',
    redisPort:7004,
    redisSocketIP: '192.168.80.91',
    redisSocketPort:7100,

   province:['北京','天津','重庆','上海','河北',
       '山西','辽宁','吉林','黑龙江','江苏','浙江','安徽','福建','江西',
       '山东','河南','湖北','湖南','广东','海南','四川','贵州','云南',
       '陕西','甘肃','青海','台湾','内蒙古自治区','广西','西藏','宁夏',
       '新疆'],

    thriftUserIP:'192.168.80.56',
    thriftUserPort:9799,
    thriftSensitiveWordIP:'192.168.80.56',
    thriftSensitiveWordPort:9798,
    thriftFileIP:'192.168.80.56',
    thriftFilePort:9797,
    thriftDockIP:'192.168.80.56',
    thriftDockPort:9796,
    thriftDockListIP:'192.168.80.56',
    thriftDockListPort:9795,

    chatShowStart:1,  //聊天页面初始化开始下标
    chatShowNO:10,    //聊天页面每页的显示个数
    db:'copyright',
    dbUser:'user',
    dbGroup:'group',
    dbMsg:'information',
    dbFile:'file',
    dbAt:'at',
    dbInformation:'information',
    directoryImageUrl:'images/wjj.png',
    groupHead:'/images/u9.png',
    userHead:'/images/profile.png',
	//emailServer:'3185361947@qq.com',   //邀请成员发送邮件的服务器
    //from: 'no-reply@banquanmaoyi.com', // sender address
	emailServer:'3185361947@qq.com',   //邀请成员发送邮件的服务器
	emailPassword:'ptkhkcidbzridgdf',
	apiOptions:{
        hostname: '192.168.80.133',
        port: 8080,
        path: '/uias/api/userApi.do?method=getUserInfoById&uid=',
        method: 'GET'
    },
	apiOptionsByName:{
        hostname: '192.168.80.133',
        port: 8080,
        path: '/uias/api/userApi.do?method=getUserInfoByName&uName=',
        method: 'GET'
    },
	cookieMax:60000*60*24*30,
	cookiePath:'/',
    //根据邀请注册的用户注册链接，tourl指copyright的域名,http://t.cn/R5kE0Or
    //regPath1:'http://t.cn/R5kE0Or',
    regPath1:"http://t.cn/R5kE0Or",
    regPath:"http://192.168.80.133:8080/uias/app/register.jsp?tourl=http://192.168.80.56:3001",
    fileSavePath:'E:/cfs/sns/',
    headFileSavePath:'E:/cfs/sns/head/',
    simplifyFileSavePath:'E:/cfs/sns/simplify/',
    originalFileSavePath:'E:/cfs/sns/original/',
    webmFileSavePath:'E:/cfs/sns/webm/',
    dealLongUrl:"http://api.t.sina.com.cn/short_url/shorten.json?source=3271760578&url_long=http://192.168.80.133:8080/uias/app/register.jsp?tourl=http://192.168.80.133:8080/uias/app/login.jsp?tourl=http://192.168.80.56:3001/loading.html?groupId=",
    phoneMsgUrl:"http://192.168.80.133:8080/uias/api/toolsApi.do?method=SendSMS",
    //phoneMsgUrl:"http://192.168.80.32:8081/api/toolsApi.do?method=SendSMS",
    loginApiUrl:"http://192.168.80.133:8080/uias/app/loginAppAction.do?method=ajaxLogin",
    //验证手机号
    checkPhoneApi:"http://192.168.80.133:8080/uias/app/userAddAction.do?method=isExistPhone&userPhone=",
    //验证用户名
    checkUserNameApi:"http://192.168.80.133:8080/uias/app/userAddAction.do?method=isExistUsername&username=",
    //验证邮箱号
    checkEmailApi:"http://192.168.80.133:8080/uias/app/userAddAction.do?method=isExistMail&userEmail=",
    //普通用户手机注册
    //phoneRegister:"http://192.168.80.32:8081/app/userAddAction.do?method=ajaxRegister&",
    phoneRegister:"http://192.168.80.133:8080/uias/app/userAddAction.do?method=ajaxRegister&",
    //普通用户邮箱注册
    emailRegister:"http://192.168.80.133:8080/uias/app/userAddAction.do?method=ajaxRegisterMail&",
    //手机验证码链接
    phoneCodeApi:"http://192.168.80.133:8080/uias/app/userAddAction.do?method=sendMessage&phone=",

    //调用统一用户登录接口
    ucenterLoginApi:"http://192.168.80.133:8080/uias/app/login.jsp?tourl=http://192.168.80.56:3001",

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