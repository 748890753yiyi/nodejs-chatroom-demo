var path = window.location.host.replace(':', '\\:');
//console.log(path);

//var loginHtml = "http://sns.banquanmaoyi.com";
var loginHtml = "http://ucenter.banquanmaoyi.com/uias/app/login.jsp?tourl=sns.banquanmaoyi.com";
var cookieUrl = "http://ucenter.banquanmaoyi.com/uias/api/userApi.do?method=getUserCookie";
var regPath = 'http://ucenter.banquanmaoyi.com/uias/app/register.jsp?tourl=http://sns.banquanmaoyi.com';
var homeHtml = "http://www.banquanmaoyi.com/";
var tradeHtml = "http://trade.banquanmaoyi.com/";
var protectionHtml = "http://protection.banquanmaoyi.com/";
var clearingHtml = "http://clearing.banquanmaoyi.com/";
var ucenterHtml = "http://ucenter.banquanmaoyi.com/";
var shareHtml = "http://ucenter.banquanmaoyi.com/uias/api/register.jsp?tourl=http://ucenter.banquanmaoyi.com" +
    "/uias/app/login.jsp?tourl=http://sns.banquanmaoyi.com/loading.html?groupId=";
var envCheck = true;  // 标记是生产环境

// 静态图片路径
var imageUrl = "public/images";
// 粘贴图片的上传
var pasteuploadUrl = "upload-image-by-paste";

// socket服务器地址
var socketUrl = "/";


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