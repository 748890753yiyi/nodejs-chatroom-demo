/*
 项目的指令和过滤器
 */

// 时间
mainApp.filter('formatSex', ['$locale',
    function ($locale) {
        return function (input) {
            if (input) {
                if (input == "0") {
                    input = "男";
                } else if (input == "1") {
                    input = "女";
                }
            }
            return input;
        };
    }
])
// 联系方式
    .filter('formatContact', ['$locale',
        function ($locale) {
            return function (input) {
                if (input) {
                    if (input == "register") {
                        input = "邮箱";
                    } else if (input == "mobileNO") {
                        input = "手机";
                    }
                }
                return input;
            };
        }
    ])
// 日期
    .filter('formatDay', ['$locale',
        function ($locale) {
            return function (seconds) {
                var day = "";
                if (seconds) {
                    var d = new Date(seconds);
                    var nowDate = new Date();
                    day = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                    var nowDay = nowDate.getFullYear() + "-" + (nowDate.getMonth() + 1) + "-" + nowDate.getDate();
                    if (day == nowDay) {
                        day = "今天";
                    }
                }
                return day
            };
        }
    ])
// 日期
    .filter('formatDate', ['$locale',
        function ($locale) {
            return function (seconds) {
                var day = "";
                if (seconds) {
                    var d = new Date(seconds);
                    day = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                }
                return day
            };
        }
    ])
    .filter('formatTime', ['$locale',
        function ($locale) {
            return function (seconds) {
                var time = "";
                if (seconds) {
                    var d = new Date(seconds);
                    var h = d.getHours();
                    var m = d.getMinutes();
                    if (h < 10) {
                        h = "0" + h;
                    }
                    if (m < 10) {
                        m = "0" + m;
                    }
                    time = h + ":" + m;
                }
                return time;
            };
        }
    ])
// 星期
    .filter('formatWeek', ['$locale',
        function ($locale) {
            return function (n) {
                var day = '';
                if (n == 0) {
                    day = "日";
                } else if (n == 1) {
                    day = "一";
                } else if (n == 2) {
                    day = "二";
                } else if (n == 3) {
                    day = "三";
                } else if (n == 4) {
                    day = "四";
                } else if (n == 5) {
                    day = "五";
                } else {
                    day = "六";
                }
                return day
            };
        }
    ])

// 按字符截取
    .filter('spliceNameByte', function () {
        return function (str, n) {
            if (str != undefined) {
                var tmpStr = str.substr(0, n);
                var tmpCode = tmpStr.replace(/[^\x00-\xff]/g, '\r\n').split('');
                n = (tmpCode[n - 1] == '\r') ? n - 2 : n - 1;
                var l = tmpCode.slice(0, n).join('').replace(/\r\n/g, '*').length;
                if (tmpCode.length > n) {
                    return tmpStr.substr(0, l) + "...";
                } else {
                    return tmpStr.substr(0, l);
                }
            }
        }
    })
// 文件大小的转换
    .filter('fileSize', function () {
        var fileSize = function (input) {
            if (input < 1024) {
                return Math.round(input) + 'B';
            }
            if (input >= 1024 && input < 1024 * 1024) {
                return Math.round(input / 1024 * 10) / 10 + "K";
            }
            if (input >= 1024 * 1024 && input < 1024 * 1024 * 100) {
                return Math.round(input / (1024 * 1024) * 10) / 10 + "M";
            }
            if (input >= 1024 * 1024 * 100 && input < 1024 * 1024 * 1024) {
                return Math.round(input / (1024 * 1024)) + "M";
            }
            if (input >= 1024 * 1024 * 1024) {
                return Math.round(input / (1024 * 1024 * 1024) * 10) / 10 + "G";
            }
        };
        return fileSize;
    })

// 处理同时发送原因输入框
    .directive('inputShow', function () {
        return{
            link: function (scope, elem, cttrs, ctrl) {
                elem.bind("click", function () {
                    var obj = $('.popover-stop');
                    var offsetX = elem.offset().left;
                    var offsetY = elem.offset().top;
                    var popoverHeight = obj.height() + 4;//4为为了实现居中所加的偏移
                    var popoverWidth = obj.width() - 4;//4为为了实现居中所加的偏移
                    obj
                        .css({"display": "block", "top": offsetY - popoverHeight, "left": offsetX - popoverWidth / 2});
                })
            }
        };
    });