/*
 登录
 */
var startApp = angular.module('startApp', []);

startApp.controller('loginCtrl', ['$http', '$scope', function ($http, $scope) {
    $scope.user = {};
    $scope.registerHtml = regPath;
    var groupId;
    if (window.location.search) {
        groupId = window.location.search.slice(9);
    }
    //登录
    $scope.save = function (user) {
        if (!navigator.cookieEnabled) {
            alertMsg("浏览器禁用Cookie,请启用cookie！");
            return;
        }
        $scope.isLoading = true;
        user.type = envCheck;       // 标记生成环境
        user.groupId = groupId;     // 邀请进组
        if (user.userName && user.password) {
            routeHttp($http, 'loginApi', user, function (data) {
                if (data.status == 'success') {
                    window.location.href = './index.html';  //登录进入平台首页
                } else {
                    $scope.isLoading = false;
                    alertMsg(data.msg);
                }
            });
        } else {
            $scope.isLoading = false;
            alertMsg("请填写完整信息");
        }
    };
    //reset方法
    $scope.reset = function () {
        $scope.user = {};
        $scope.noCookie = true;
    };

    function alertMsg(msg) {
        if (msg) {
            $scope.alertMsg = msg;
            $('.alert-msg').modal('show');
        }
    }

}]);


/*
 与服务器交互
 */
function routeHttp(http, target, value, callback) {
    http.post(target, value).success(function (data) {
        // console.log(data);
        if (data.msg == 'no cookie') {
            window.location.href = "../../../login.html";
        } else {
            callback(data);
        }
    });
}
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

