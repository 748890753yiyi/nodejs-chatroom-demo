/* 静态变量 */
//验证码保存时间(30分钟)
var timeSet = 1800000;
//手机号正则
var RegCellPhone = /^1[3|4|5|8|7]\d{9}$/;
//邮箱正则
var RegEmail = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/;
//定时刷新任务的时间(30秒)
var refreshTime = 30 * 1000;


//在线状态数组
var userStates = [
    {"type": "login", "className": "online", "name": "在线"},
    {"type": "invisible", "className": "novisible", "name": "隐身"},
    {"type": "logout", "className": "offline", "name": "退出"}
];

//组内禁言天数选项
var gagDays = [
    {'name': '三天', 'value': '3'},
    {'name': '一周', 'value': '7'},
    {'name': '长期', 'value': '1'}
];
// 组内@全员，数据
var allValue = {'id': 'allId', 'basic': {'userName': '全员', 'spell': 'quanyuan'}, 'contactValue': 'all'};
// 文件排序方式
var fileOrders = {'': '默认', 'createTime': '按创建时间', 'format': '按文件类型', 'size': '按文件大小', 'name': '按文件名称'};

// 浏览器闪动及声音初始化
if (iNotify) {
    var iNotify = new iNotify({
        effect: 'flash',
        interval: 500,
        message: "有新消息！",
        audio: {
            file: ['ring/msg.wav', 'ring/msg.mp4', 'ring/msg.mp3']
        }
    });
}

// 首拼音数组
var firstSpells = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

//组默认头像
var groupHead = "/images/u9.png";
//人默认头像
var userHead = "images/profile.png";

//组内聊天时间显示间隔
var chatTime = 300000;
//组列表每页加载个数
var groupPageSize = 11;
//关注群组限制个数
var focusNumber = 10;
//组内邀请成员显示个数
var groupInvitePageSize = 6;
//组内设置群组成员、待审核显示个数
var groupSetPageSize = 10;
//聊天消息每页加载个数
var needMsgNumber = 10;
//聊天消息撤销限制
var recallMsgNo = 5;
//文件每页加载个数
var filePageSize = 36;
//话题每页加载个数
var topicPageSize = 15;
//话题置顶个数
var topNum = 5;
//活动每页加载个数
var activityPageSize = 4;
//活动、话题评论加载个数
var commentPageSize = 5;
//投票选项个数
var selectNum = 8;
//投票每页加载个数
var votePageSize = 5;
//组内设置群举报列表显示个数
var groupReportPageSize = 4;
//@我的页面每页加载个数
var groupAtPageSize = 5;
//搜索全部群组每页页数
var searchAllGroupPageSize = 5;


//通知页每页加载个数
var noticePageSize = 5;

//通讯录每页加载个数
var contactPageSize = 15;