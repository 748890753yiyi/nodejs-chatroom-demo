/*
 *   登录进入平台后台管理
 *   路由配置
 * */

var mainApp = angular.module('mainApp', ['ivpusic.cookie', 'ngResource', 'ui.router', 'highcharts-ng']);

mainApp = restfulFactory(mainApp);

mainApp.controller('rootCtr', ['$scope', '$http', 'cookie', function ($scope, $http, cookie) {
    // 监听页面改变，返回顶部
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
        // console.log(toState);
        // console.log(toParams);
        // console.log(fromState);
        // console.log(fromParams);
        window.scrollTo(0, 0);
    });

    $scope.$on('alertMsg', function (event, msg) {
        if (msg != "") {
            $scope.alertMsg = msg;
            $('.alert-msg').modal('show');
        }
    });

    $scope.logout = function () {
        routeHttp($http, "../mLoginOut", {}, function (data) {
            // cookie.remove('isLogin');
            cookie.remove('user');
            window.location.href = loginHtml;
        });
    };

}]);

//路由，ui-view实现页面嵌套
mainApp.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider
        .when('/personnal', '/personnal/staffList')
        .otherwise("/personnal");
    // Now set up the states
    $stateProvider
        //人员
        .state('personnal', {
            url: "/personnal",
            templateUrl: prefixUserHtml + "/user.html"
        })
        .state('personnal.staffList', {
            url: "/staffList",
            templateUrl: prefixUserHtml + "/staffList.html"
        })
        .state('personnal.staff', {
            url: "/staff",
            templateUrl: prefixUserHtml + "/staff.html"
        })
        .state('personnal.list', {
            url: "/list",
            templateUrl: prefixUserHtml + "/registerMonitor.html"
        })
        .state('personnal.list.info', {
            url: "/info/:id",
            views: {
                '@personnal': {
                    templateUrl: prefixUserHtml + "/userInfo.html"
                }
            }
        })

        //组
        .state('group', {
            url: "/group",
            templateUrl: prefixGroupHtml + "/list.html"
        })
        .state('group.info', {
            url: "/info/:id",
            views: {
                '@': {
                    templateUrl: prefixGroupHtml + "/groupInfo.html"
                }
            }
        })

        //监控
        .state('log', {
            url: "/log",
            templateUrl: prefixLogHtml + "/log.html"
        })

}]);
mainApp.config(['$httpProvider', function ($httpProvider) {
    //$httpProvider.defaults.headers.common['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.common['Pragma'] = 'no-cache';
}]);
