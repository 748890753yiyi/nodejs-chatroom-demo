/*'use strict';*/
/*
 登录
 */
var loadingApp = angular.module('loadingApp', ['ivpusic.cookie']);

loadingApp.controller('loadingCtrl', ['$scope', '$http', 'cookie', function ($scope, $http, cookie) {
    var groupId;
    if (window.location.search) {
        groupId = window.location.search.slice(9);
    }
    // 判断是否生成环境
    var userCookieId = cookie.get("userid");
    if (envCheck && !userCookieId) {
        window.location.href = loginHtml;
        return;
    } else if (envCheck) {
        routeHttp($http, 'initIndex', {"cookieId": userCookieId, "type": envCheck, "groupId": groupId}, function (data) {
            if (data.status === "success") {
                window.location.href = './index.html';  //登录进入平台首页
                return;
            } else {
                $scope.alertMsg = data.msg;
                $('.alert-msg').modal('show');
            }
        });
    } else {
        var userCookie;
        $.getScript(cookieUrl, function () {
            try {
                userCookie = usercookie;
                if (userCookie && userCookie.status === "1") {
                    routeHttp($http, 'initIndex', {"cookieId": usercookie.Cookie, "type": envCheck, "groupId": groupId}, function (data) {
                        if (data.status === "success") {
                            window.location.href = './index.html';  //登录进入平台首页
                            return;
                        } else {
                            $scope.alertMsg = data.msg;
                            $('.alert-msg').modal('show');
                        }
                    });
                } else {
                    window.location.href = loginHtml;
                    return;
                }
            } catch (e) {
                window.location.href = loginHtml;
                return;
            }
        });
    }

    // 登录失败后，点击关闭提醒跳转到登录界面
    $scope.clickRedirect = function() {
        window.location.href = loginHtml;
    };

}]);


/*
 与服务器交互
 */
function routeHttp(http, target, value, callback) {
    http.post(target, value).success(function (data) {
        callback(data);
    });
}

function restHttp(http, method, target, value, callback, param) {
    var config = {};
    config.url = target;
    config.method = method;
    config.data = value;
    config.params = param;
    http(config).success(function (data) {
        callback(data);
    });
}

