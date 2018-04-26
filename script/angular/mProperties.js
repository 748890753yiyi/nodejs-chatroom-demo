/* 静态变量 */

//组内禁言天数选项
var gagDays = [
    {'name': '三天', 'value': '3'},
    {'name': '一周', 'value': '7'},
    {'name': '长期', 'value': '1'}
];

/* 人 */
// 从哪年开始统计
var startYear = 2015;
// 人员及公司注册时间分布图默认初始化的年份
var initYear = new Date().getFullYear();

//人列表每页加载个数
var userPageSize = 8;
//人的组和公司每页显示个数
var userInfoPageSize = 5;
//组和公司移交管理员权限每页显示人员个数
var transferUserPageSize = 5;

/* 组 */
// 组统计文件最多组个数
var groupSizePageSize = 10;
// 组列表每页个数
var groupPageSize = 8;
// 组的人每页显示个数
var groupInfoPageSize = 5;

/* 日志监控 */
//每页显示个数
var logPageSize = 11;
