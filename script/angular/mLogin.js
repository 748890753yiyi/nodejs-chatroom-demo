/*
 *   登录平台后台管理
 * */
var startApp = angular.module('startApp', []);

startApp.controller('loginCtrl', ['$http', '$scope', function ($http, $scope) {
    $scope.user = {};
    //登录
    $scope.save = function (user) {
        if (user.contactValue && user.password) {
            routeHttp($http, '../mLogin', user, function (data) {
                if (data.status == 'success') {
                    window.location.href = indexHtml;  //登录进入平台首页
                } else {
                    alert(data.msg);
                }
            });
        } else {
            alert("请填写完整信息");
        }
    };
    //reset方法
    $scope.reset = function () {
        $scope.user = {};
    }
}]);
/*
 与服务器交互
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