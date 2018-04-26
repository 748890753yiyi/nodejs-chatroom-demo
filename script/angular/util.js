/*'use strict';*/
/*
 此js写了一些常用处理方法
 */

// 获取cookie中的user信息
function getCookieUser(userId, extendsResource, callback) {
//    var cookieUserInfo = prefixUserUrl + "/cookieUserInfo/:id";
    var cookieUserInfo = prefixUserUrl + "/userInfo/:id";
    // console.log(userId);
    // console.log(extendsResource);
    extendsResource.extend(cookieUserInfo).get({"id": userId}, function (msg) {
        callback(msg);
    });
}
// 获取地址栏参数
function GetQueryString(name)
{
    var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if(r!=null)return  unescape(r[2]);
    return null;
}
/*function closeWindow(){
    if (navigator.userAgent.indexOf("MSIE") > 0) {
        if (navigator.userAgent.indexOf("MSIE 6.0") > 0) {
            window.opener = null;
            window.close();
        } else {
            window.open('', '_top');
            window.top.close();
        }
    }
    else if (navigator.userAgent.indexOf("Firefox") > 0) {
        window.location.href = 'about:blank ';
    } else {
        window.opener = null;
        window.open('', '_self', '');
        window.close();
    }
}*/
function closeWindow() {
    var userAgent = navigator.userAgent;
    if (userAgent.indexOf("Firefox") != -1
        || userAgent.indexOf("Chrome") != -1) {
        window.location.href = "about:blank";
    } else {
        window.opener = null;
        window.open("", "_self");
        window.close();
    }
}
//转义<>
var trimSymbol = function (text) {
    text = text.replace(/</g, "&lt;");
    text = text.replace(/>/g, "&gt;");
    return text;
};
// 去空格
var trimSpace = function (text, tag) {
    if (text) {
        if (!tag) {
            tag = "";
        }
        text = text.replace(/\s\s/g, tag + tag);
    }
    return text;
};
// 将\n替换为<br>
var trimEnter = function (text) {
    text = text.replace(/\n/g, "<br>");
    return text;
};

var isNotEmptyString = function (value) {
    if (value && value !== "") {
        return true;
    }
    return false;
};
var checkRate = function (input) {
    var reg = new RegExp("^[0-9]*$");
    if (!reg.test(input)) {
        return false;
    }
    return true;
};
/*simple condition
 type:"simple",
 field:"time",
 dataType:"date",
 operate:">",
 value:$scope.conditionValue1
 */
var simpleCondition = function (field, dataType, operate, value) {
    var condition = {};
    condition.type = "simple";
    condition.field = field;
    condition.dataType = dataType;
    if (operate) {
        condition.operate = operate;
    }
    if (value !== "undefined" && value.length != 0) {
        condition.value = value;
    }

    return condition;
};
/*or condition
 type:"or",
 conditions:
 [
 {field:"userName",
 value:$scope.conditionValue7},
 {field:"msg",
 value:$scope.conditionValue8}
 ]
 */
//orCondition的参数是simpleCondition对象数组
var orCondition = function (arguments1) {
    var condition = {};
    condition.type = "or";
    condition.conditions = [];
    for (var i = 0; i < arguments1.length; i++) {
        var argument = arguments1[i];
        var con = {};

        /*
         for(var key in argument){
         con.field=key;
         con.value=argument[key];
         break;
         }
         */
        condition.conditions.push(argument);
    }
    return condition;
};

//遮蔽层开始
function overlayerStart() {
    $(".loading-modal").modal({
        show: true,
        backdrop: "static",
        keyboard: true
    });
}
//遮蔽层结束
function overlayerEnd() {
    $(".loading-modal").modal('hide');
}
// 模态框
var modalShow = function (id) {
    $(id).modal("show");
};
var modalHide = function (id) {
    $(id).modal("hide");
};

//extend
function extend(subClass, superCLass) {
    var F = function () {
    };
    F.prototype = superCLass.prototype;
    subClass.prototype = new F();
    subClass.prototype.constructor = subClass;
}
/***
 items:要排序的数组
 sortName:按sortName属性排序
 ***/
function sortByProperty(items, sortName) {
    //console.log(items);
    //使用js的sort方法
    items.sort(function (a, b) {
        if (a[sortName] > b[sortName]) {
            return 1;
        } else {
            return -1;
        }
    });
}


//拷贝
function clone(myObj) {
    if (typeof(myObj) != 'object') return myObj;
    if (myObj === null) return myObj;

    var myNewObj = new Object();

    for (var i in myObj)
        myNewObj[i] = clone(myObj[i]);

    return myNewObj;
}
function Checkstrlenght(chars) {
    var sum = 0;
    for (var i = 0; i < chars.length; i++) {
        var c = chars.charCodeAt(i);
        if ((c >= 0x0001 && c <= 0x007e) || (0xff60 <= c && c <= 0xff9f)) {
            sum++;
        } else {
            sum += 2;
        }
    }
    return sum;
}


/*
 与服务器交互 post 方法
 target：方法名
 value：传值
 */
function routeHttp(http, target, value, callback) {
    http.post(target, value).success(function (data) {
        // console.log(data);
        if (data.msg == 'no cookie') {
            window.location.href = loginHtml;
        } else {
            callback(data);
        }
    });
}
/*
 与服务器交互方法
 method：http请求类型
 target：方法名
 value：发送请求数据
 param：参数
 */
function restHttp(http, method, target, value, callback, param) {
    var config = {};
    config.url = target;
    config.method = method;
    config.data = value;
    config.params = param;
//	console.log(config);
    http(config).success(function (data) {
        // console.log(method);
        // console.log(data);
        if (data.msg == 'no cookie') {
            window.location.href = loginHtml;
        } else {
            callback(data);
        }

    });
}
Date.prototype.format = function (format) {
    var o = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(), //day
        "h+": this.getHours(), //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
        "S": this.getMilliseconds() //millisecond
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
};
// 字符串替换所有
String.prototype.replaceAll = function (s1, s2) {
    return this.replace(new RegExp(s1, "gm"), s2);
};
/*
 *  数组去重
 *  key: 如果数组内是对象，则传其需要验证的 key 字符串
 * */
Array.prototype.unique = function (key) {
    var n = {}, r = []; //n为hash表，r为临时数组
    for (var i = 0; i < this.length; i++) //遍历当前数组
    {
        var tempKey = this[i];  //取当前值在中间对象中作为key值
        if (key) {
            tempKey = this[i][key]; //如果是对象，则取对应key值的value作为中间对象key值
        }
        if (!n[tempKey]) //如果hash表中没有当前项
        {
            n[tempKey] = true; //存入hash表
            r.push(this[i]); //把当前数组的当前项push到临时数组里面
        }
    }
    return r;
};
/*
 *  数组判断是否有重复
 *  key: 如果数组内是对象，则传其需要验证的 key 字符串
 * */
Array.prototype.checkRepeat = function (key) {
    var n = {}, flag = false; //n为hash表，r为临时数组, flag为是否有重复的标记
    for (var i = 0; i < this.length; i++) //遍历当前数组
    {
        var tempKey = this[i];  //取当前值在中间对象中作为key值
        if (key) {
            tempKey = this[i][key]; //如果是对象，则取对应key值的value作为中间对象key值
        }
        if (!n[tempKey]) //如果hash表中没有当前项
        {
            n[tempKey] = true; //存入hash表
        }
        else {
            flag = true;
            break;
        }
    }
    return flag;
};
// id为 idName 区域光标处追加数据str
function setPosition(idName, str) {
    var elem = $('#' + idName);
    if (!elem.is(":focus")) {
        elem.focus();
    }
    setTimeout(function () {
        var selection = window.getSelection ? window.getSelection() : document.selection;
        var range = window.getSelection ? window.getSelection().getRangeAt(0) : void 0;
        var pos = selection.focusOffset;
        range.setStart(range.endContainer, Math.max(pos, 0));
        range.setEnd(range.endContainer, range.endOffset);
        range.deleteContents();
        var hasR = range.createContextualFragment(str);
        if (typeof(str) == 'object') {
            hasR = str;
        }
        range.insertNode(hasR);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
//        elem.focus();
    }, 0);
}
// 将文本形式的网址链接替换为可点击链接
function replaceUrl(str, index) {
    // 查找网址开始位置
    var startIndex = str.indexOf("http", index);
    // 判断是否本身带a标签
    if (startIndex > 6 && str.substring(startIndex - 6, startIndex - 1) == 'href=') {
        startIndex = str.indexOf("</a>", index) + 4;
        return replaceUrl(str, startIndex);
    }
    if (startIndex > -1) {
        // 如果不是从头开始，则取其之后子串
        var newStr = str;
        if (startIndex > 0) {
            newStr = str.substring(startIndex);
        }
        // 查找网址结束位置
        var strEnd = newStr.search(/([\u4e00-\u9fa5]|\s|&nbsp;)/);
        var endIndex = strEnd + startIndex;
        if (strEnd == -1) {
            endIndex = str.length;
        }
        // 截取子串(网址)
        var subStr = str.substring(startIndex, endIndex);
        // 判断是否是粘贴的表情
        if (subStr.indexOf("/arclist/") > -1) {
            return replaceUrl(str, startIndex + 1);
        }
        //拼接字符串
        str = str.substring(0, startIndex) + "<a href='" + subStr + "'>" + subStr + "</a>" + str.substring(endIndex);
        var nextIndex = startIndex + 9 + subStr.length + 2 + subStr.length + 4;
        return replaceUrl(str, nextIndex);
    } else {
        return str;
    }
}

// 作为script请求，调用统一用户接口
function scriptFun(url, callback) {
    $.getScript(url, function () {
        callback(usercookie);
    });
}
//ajax请求，进入组角色判断与路由跳转同步执行
function ajaxFun(url,params,method,callback){
    $.ajax({
        method : method,
        url : url,
        data: params,
        dataType : "json",
        async: false
    }).success(function(res, status, headers, config) {
        callback(res);
    });
}
// 获取粘贴内容中的文字
function getPasteText(e) {
    var text = null;
    var newClipboardData = (e.originalEvent || e).clipboardData;
    // console.log(newClipboardData);
    if (window.clipboardData && clipboardData.setData) {
        // IE
        if (window.clipboardData.getData('text')) {
            text = window.clipboardData.getData('text');
        }
    } else if (newClipboardData.getData('text/plain')) {
        var data = newClipboardData.getData('text/plain');
        // 飞秋截图判断
        if (data.search('<IMG src="file:///') > -1) {
            return;
        }
        // 其他正常文本
        text = newClipboardData.getData('text/plain');
    } else if (newClipboardData.files.length > 0) {
        // 火狐粘贴本地文件
        e.preventDefault();
    }
    return text;
}
// 粘贴文字处理
function textPaste(text) {
    // 网址末尾追加空格
    if (text.search("[http|https]://") > -1) {
        text = text + " ";
    }
    if (document.body.createTextRange) {
        var textRange;
        if (document.selection) {
            textRange = document.selection.createRange();
        } else if (window.getSelection) {
            var sel = window.getSelection();
            var range = sel.getRangeAt(0);
            // 创建临时元素，使得TextRange可以移动到正确的位置
            var tempEl = document.createElement("span");
            tempEl.innerHTML = "&#FEFF;";
            range.deleteContents();
            range.insertNode(tempEl);
            textRange = document.body.createTextRange();
            textRange.moveToElementText(tempEl);
            tempEl.parentNode.removeChild(tempEl);
        }
        textRange.text = text;
        textRange.collapse(false);
        textRange.select();
    } else {
        // Chrome之类浏览器
        document.execCommand("insertText", false, text);
    }
}
// 发送消息粘贴图片处理
function getPasteImg(elem, event, uploadUrl, $http) {
    var isChrome = false;
    var clipboardData = (event.clipboardData || event.originalEvent.clipboardData);
    if (clipboardData && clipboardData.items) {
//       console.log("chrome");
        isChrome = true;
        var items = clipboardData.items,
            len = items.length,
            blob = null;
        //阻止默认行为即不让剪贴板内容在div中显示出来
        event.preventDefault();
        //在items里找粘贴的image,据上面分析,需要循环
        for (var i = 0; i < len; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                //getAsFile() 此方法只是living standard firefox ie11 并不支持
                blob = items[i].getAsFile();
            }
        }
        if (blob !== null) {
            var reader = new FileReader();
            reader.onload = function (event) {
                // event.target.result 即为图片的Base64编码字符串
                var base64_str = event.target.result;
//                console.log(base64_str);
                if (base64_str == "data:") {
                    return;
                }
                //可以在这里写上传逻辑 直接将base64编码的字符串上传（可以尝试传入blob对象，看看后台程序能否解析）
                uploadImgFromPaste(elem, base64_str, 'paste', isChrome, uploadUrl, $http);
            };
            reader.readAsDataURL(blob);
        }
    } else {
//        console.log("firefox / IE11");
        setTimeout(function () {
            //设置setTimeout的原因是为了保证图片先插入到div里，然后去获取值
//          var imgList = document.querySelectorAll('#inputor img'),
            // qq截图后贴入qq输入框，后复制粘贴到此处，路径为本地路径，且它会带有div标签包裹（先div替换为空）
//            elem.html(elem.html().replace("<div>","").replace("</div>",""));      //已将所有本地文件过滤掉，不需要处理
            var imgList = elem.children("img"),
                len = imgList.length,
                src_str = '',
                i;
            for (i = 0; i < len; i++) {
                // 转为jQuery对象操作dom
                if (!$(imgList[i]).hasClass('media-object')) {
                    //如果是截图那么src_str就是base64 如果是复制的其他网页图片那么src_str就是此图片在别人服务器的地址
                    src_str = imgList[i].src;
                    // 粘贴表情则不上传
                    if (src_str.indexOf("arclist/") > -1) {
                        return;
                    }
                    if (window.clipboardData && window.clipboardData.setData) {
                        // ie移除原图
                        imgList[i].removeNode(true);
                    } else {
                        // 火狐移除原图
//                        imgList[i].remove();
                        $(imgList[i]).remove();
                    }
                }
            }
            if (!src_str) {
                return;
            }
            uploadImgFromPaste(elem, src_str, 'paste', isChrome, uploadUrl, $http);
        }, 1);
    }
}
// 粘贴上传图片
function uploadImgFromPaste(elem, file) {
    // 放入输入框
    var image = '<img style="display:inline;vertical-align:bottom;" class="media-object insert-image" src="' + file + '" >';
    var imgNode = $(image).data('file', file).data('url', file);
    // 输入框插入缩略图
    var elemId = elem[0].id;
    setPosition(elemId, imgNode[0]);
    $('#' + elemId).animate({ scrollTop: 50}, 0);
}

