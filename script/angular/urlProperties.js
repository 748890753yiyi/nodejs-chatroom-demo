var path = window.location.host.replace(':', '\\:');
//console.log(path);

// 需修改
var cookieUrl = "http://192.168.80.133:8080/uias/api/userApi.do?method=getUserCookie";
//var loginHtml = "http://127.0.0.1:3001";
var loginHtml = "http://192.168.80.133:8080/uias/app/login.jsp?tourl=http://127.0.0.1:3001";
var regPath = 'http://192.168.80.133:8080/uias/app/register.jsp?tourl=http://127.0.0.1:3001';
var homeHtml = "http://www.banquanmaoyi.com/";
var tradeHtml = "http://trade.banquanmaoyi.com/";
var protectionHtml = "http://protection.banquanmaoyi.com/";
var clearingHtml = "http://clearing.banquanmaoyi.com/";
var ucenterHtml = "http://ucenter.banquanmaoyi.com/";
var shareHtml = "http://192.168.80.133:8080/uias/app/register.jsp?tourl=http://192.168.80.133:8080/uias/app/login.jsp?" +
    "tourl=http://192.168.80.56:3001/loading.html?groupId=";
var envCheck = false;  // 标记是否生产环境（生产环境为true, 测试环境为false）


// 静态图片路径
var imageUrl = "public/images";
// 粘贴图片的上传
var pasteuploadUrl = "upload-image-by-paste";

// socket服务器地址
var socketUrl = ":3001/";


//人的js路径 和 html路径
var prefixUserUrl = "/resource/user";
//var prefixUserHtml="route/user";

//通知的js路径 和 html路径
var prefixNoticeUrl = "/resource/notice";

//组的js路径 和 html路径
var prefixGroupUrl = "/resource/group";
var prefixGroupHtml = "route";

//文件的js路径 和 html路径
var prefixFileUrl = "/resource/file";
var prefixFileHtml = "route/file";

//活动的js路径 和 html路径
var prefixActivityUrl = "/resource/activity";
var prefixActivityHtml = "route/activity";

//话题的js路径 和 html路径
var prefixTopicUrl = "/resource/topic";
var prefixTopicHtml = "route/topic";

//投票的js路径 和 html路径
var prefixVoteUrl = "/resource/vote";
var prefixVoteHtml = "route/vote";

//组内公告的js路径 和 html路径
var prefixAnnouncementUrl = "/resource/announcement";
var prefixAnnouncementHtml = "route/announcement";

//私聊
var prefixPrivateChatUrl = "/resource/privateChat";

//通讯录
var prefixContactHtml = "route/contact";

//临时聊天
var prefixTempChatUrl = "/resource/trade";

var downloadUrl = "/resource/download";