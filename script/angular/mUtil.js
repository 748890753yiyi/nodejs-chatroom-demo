/*
 此js写了一些常用处理方法
 */

// 验证是否数字
var checkRate = function (input) {
    var reg = new RegExp("^[0-9]*$");
    if (!reg.test(input)) {
        return false;
    } else {
        return true;
    }
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

