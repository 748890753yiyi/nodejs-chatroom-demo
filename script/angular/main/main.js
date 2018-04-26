//'use strict';
/*
 模块的定义
 根控制器 rootCtrl：初始化当前的用户信息，控制器的之间通信中转
 路由配置
 */

var mainApp = angular.module('mainApp', ['ivpusic.cookie', 'ngResource', 'controlsApp', 'ui.router', 'angularFileUpload', 'ui.bootstrap.datepicker', 'ui.bootstrap.timepicker', 'ngMedia', 'ng-context-menu', 'ngzTree']);

mainApp = restfulFactory(mainApp);

mainApp.controller('rootCtr', ['$scope', 'cookie', '$timeout', '$http', 'extendsResource', function ($scope, cookie, $timeout, $http, extendsResource) {
    var groupAtPromptRestful = prefixGroupUrl + "/atRemind",
        noticePromptRestful = prefixNoticeUrl + "/noticePrompt",
        userCookieId = cookie.get('userid');
    $scope.homeHtml = homeHtml;
    $scope.tradeHtml = tradeHtml;
    $scope.protectionHtml = protectionHtml;
    $scope.clearingHtml = clearingHtml;
    $scope.ucenterHtml = ucenterHtml;

    routeHttp($http, 'initIndex', {"cookieId": userCookieId, "type": envCheck}, function (data) {
        if (data.status === "success") {
            // 进入初始化cookie
            getCookieUser(userCookieId, extendsResource, function (cookieUser) {
                $scope.userCookie = cookieUser;
            });
        } else {
            $scope.alertMsg = data.msg;
            $('.alert-msg').modal('show');
        }
    });

    // 进入初始化cookie
    /*getCookieUser(userCookieId, extendsResource, function (cookieUser) {
        $scope.userCookie = cookieUser;
    });*/
    $scope.userStates = userStates;     // 用户状态数组
    $scope.currentState = userStates[0];    //初始化用户在线

    $scope.mainSocket = io.connect(socketUrl + 'loginConnect', {'forceNew': true, 'reconnect': true});
    //初始化
    $scope.mainSocket.on('login', function () {
        $scope.mainSocket.emit('newUser', {userId: userCookieId});
    });
    // 收到私聊消息
    $scope.mainSocket.on('messageRemind' + userCookieId, function (data) {
        $scope.$broadcast("newMessage", data);
    });
    // 修改用户状态
    $scope.mainSocket.on('updateUserState', function (data) {
        userCookieId = cookie.get('userid');
        if (data.userId == userCookieId) {
            $scope.currentState = data.state;
            $scope.$apply();
        }
    });
    /*$scope.mainSocket.on('error', function(data){
        $scope.mainSocket.connect();
    });*/
    // 通知私聊
    $scope.$on("privateChat", function (event, data) {
        // console.log(data);
        $scope.initChat(data);
    });

    /*
     导航栏组内@提到我的有新消息提醒
     */
    function getAtRemind() {
        if ($scope.atTimer) {
            $timeout.cancel($scope.atTimer);    //清除定时任务
        }
        extendsResource.extend(groupAtPromptRestful).query({}, function (data) {
            $scope.hasAtPrompt = data.flag;
        });
        $scope.atTimer = $timeout(getAtRemind, refreshTime);
    }
    /*
     导航栏通知有新消息提醒
     */
    function getNoticeRemind(arg) {
        if ($scope.noticeTimer) {
            $timeout.cancel($scope.noticeTimer);    //清除定时任务
        }
        extendsResource.extend(noticePromptRestful).query({}, function (data) {
            // 登录进入系统，且有通知，则弹出
            if(arg && data.total>0){
                $scope.noticeInit();
            }
            $scope.hasNoticePrompt = data.total;
        });
        $scope.noticeTimer = $timeout(getNoticeRemind, refreshTime);
    }
    // 关闭通知列表刷新提示
    $scope.closeNotice = function () {
        getNoticeRemind();
    };

    /*
     修改在线状态
     state: login(在线),invisible(隐身),logout(离线 即 退出)
     */
    $scope.changeState = function (state) {
        if (state.type == "logout") {
            routeHttp($http, "loginOut", {}, function (data) {
                cookie.remove('userid');
                window.location.href = loginHtml;
            });
        } else {
            userCookieId = cookie.get('userid');
            $scope.mainSocket.emit('invisible', {"userId": userCookieId, "state": state});
            // $scope.currentState = state;
        }
    };



    // 路由跳转开始
    var groupRestful = prefixGroupUrl + "/getUserRole",
        groupCheckQrCode = prefixGroupUrl + "/checkQrCode";
    $scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
        //$('.tooltip').hide();
        if (toState) {
            $scope.isReload = true;     // 标记是否刷新页面（mainLeft判断后初始化）
        }
        // 如果是进入组，则判断其权限
        if(toState.name.indexOf('group') > -1){
            var id = toParams.id;
            var userCookieId = cookie.get("userid");
            var value = {"groupId": id, "userId": userCookieId};
            // 查找我在组内的角色(如果被禁用则不进入)
            ajaxFun(groupRestful,value,"get",function(msg){
                if(msg.msg==="您已经被移出群组！"){
                    event.preventDefault();// 取消默认跳转行为
                    /*$scope.alertMsg="您已不在此组！";
                     $('.alert-msg').modal('show');*/
                    if(toState.name == 'group' || $scope.isReload && toState.name == 'group.chat'){
                        $scope.noGroup = true;
                        $timeout( function() {
                            $scope.$broadcast("groupRefresh");
                        }, 100);
                    }
                }
                // 判断组是否停用
                else if(msg.groupInformation.basic.stopLogin=="true"){
                    event.preventDefault();// 取消默认跳转行为
                    $scope.alertMsg="组已停用，请刷新数据";
                    $('.alert-msg').modal('show');
                }
                else if(msg.groupInformation.role.status=='false'){
                    event.preventDefault();// 取消默认跳转行为
                    $scope.alertMsg="您已被停用，请刷新数据";
                    $('.alert-msg').modal('show');
                }
                else{
                    ajaxFun(groupCheckQrCode,{"groupId": id},"get",function(msg){
//                        console.log(msg);
                    });
                }
            });
        }
    });
    // 监听页面改变，返回顶部
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
        // console.log(toState);
        // console.log(toParams);
        // console.log(fromState);
        // console.log(fromParams);
        window.scrollTo(0, 0);

        // 进入聊天页面算高度
        if (toState.name == 'group.chat') {
            setTimeout(function () {
                var windowH = $(window).height();
                var headerH = $(" header > nav").outerHeight();//页面顶部导航高度
//                var groupInfoH = $(".row-icon-btns").outerHeight();//群组页面群组信息高度
                var groupInfoH = $(".js-group-info").height();//群组页面群组信息高度
                var groupNavH = $(".js-group-nav").height();//群组页面导航高度
                var chatFooter = $("#chatFooter").outerHeight();//交流区发送面板高度
                var paddingBottom = 0;
                var paddingBottom7 = 15;

                var asideRightH = windowH - headerH -groupInfoH -groupNavH - paddingBottom;
                var chatMessagesH = windowH - headerH -groupInfoH -groupNavH -chatFooter - paddingBottom;

                $("#chat-messages").height(chatMessagesH);//设置交流区区域高度

                //var asideOtherPanelH = $(".js-aside-other-panel").outerHeight();//设置右侧成员列表以上面板的高度
//                var asideOtherPanelH = 221;
                var asideOtherPanelH = 90;
//                console.log("---asideOtherPanelH:"+asideOtherPanelH);
//                console.log("---asideRightH:"+asideRightH);
                var groupMemberExpandH = asideRightH - asideOtherPanelH - paddingBottom7;
                $(".js-groupMember-panel").height(groupMemberExpandH);//设置成员面板的高度

//                $("#chat-messages").mCustomScrollbar();
                $('.js-groupMember-panel').mCustomScrollbar(
                    {
                        autoHideScrollbar: true
                    }
                );
            }, 500);
        }
    });

    $scope.$on('alertMsg', function (event, msg) {
        if (msg) {
            $scope.alertMsg = msg;
            $('.alert-msg').modal('show');
        }
    });
    // 确认提示框
    $scope.$on('alertConfirm', function (event, msg, func) {
        if (msg.str) {
            $scope.alertConfirm = msg.str;    // 确认框显示提示
            $scope.funcMsg = msg;           //方法的参数
            $scope.submitFunc = func;       //确认的方法
            $('.alert-confirm').modal('show');
        }
    });


    // 初始化  判断新用户的引导及未读提醒
    if(cookie.get("newUser")) {
        $('.guide-modal').modal({
             backdrop:'static',
             keyboard:false,
             show:true
         });
    }
    getAtRemind();
    getNoticeRemind("init");
    $timeout(function(){
        cookie.remove('newUser');   // 移除新用户标记的cookie
    }, 2000);

}]);

// 引导模态框初始化图片信息
mainApp.controller('guideCtr', ['$scope', 'cookie', '$timeout', '$http', 'extendsResource', '$compile', function ($scope, cookie, $timeout, $http, extendsResource, $compile) {
    $scope.guideImages = ["images/01.png","images/02.png","images/03.png"];
}]);

//路由，ui-view实现页面嵌套
mainApp.config(["$stateProvider", "$urlRouterProvider", function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider
        .when('/group/:id/:atId', '/group/:id/:atId/chat');

    // Now set up the states
    $stateProvider
        .state('main', {
            url: "/main",
            templateUrl: prefixGroupHtml + "/main.html"
        })
        //组
        .state('group', {
            url: "/group/:id/:atId",
            controller: "groupCtrl",
            templateUrl: prefixGroupHtml + "/group.html"
        })
        //组内聊天
        .state('group.chat', {
            url: "/chat",
            templateUrl: prefixGroupHtml + "/chat.html",
            controller: "chatCtrl"
        })
//    /:path  ${path}
        //组内文件
        .state('group.filesManager', {
            url: "/filesManager",
            templateUrl: prefixFileHtml + "/file.html"
        })
        //话题
        .state('group.topic', {
            url: "/topic",
            templateUrl: prefixTopicHtml + "/topic.html"
        })
        //话题详情
        .state('group.topic.topicinfo', {
            url: "/topicdetails/:topicId/",
            views: {
                '@group': {
                    templateUrl: prefixTopicHtml + "/topicDetail.html"
                }
            }
        })
        //活动
        .state('group.activity', {
            url: "/activity",
            templateUrl: prefixActivityHtml + "/activity.html"
        })
        //活动列表
        .state('group.activity.activityList', {
            url: "/activityList/:activityType/",
            // templateUrl: prefixActivityHtml+"/activityList.html"
            views: {
                '@group': {
                    templateUrl: prefixActivityHtml + "/activityList.html"
                }
            }
        })
        //活动详情
        .state('group.activity.activityinfo', {
            url: "/activityinfo/:activityId/",
            // templateUrl: prefixActivityHtml+"/activityDetail.html"
            views: {
                '@group': {
                    templateUrl: prefixActivityHtml + "/activityDetail.html"
                }
            }
        })
        //投票
        .state('group.vote', {
            url: "/vote",
            templateUrl: prefixVoteHtml + "/vote.html"
        })
        //投票
        .state('group.vote.voteinfo', {
            url: "/voteInfo/:voteId",
            // templateUrl: prefixVoteHtml+"/voteInfo.html"
            views: {
                '@group': {
                    templateUrl: prefixVoteHtml + "/voteDetail.html"
                }
            }
        })
        //组内公告
        .state('group.announcement', {
            url: "/announcement",
            templateUrl: prefixAnnouncementHtml + "/announcement.html"
        })
        //通讯录
        .state('addressBook', {
            url: "/addressBook",
            templateUrl: prefixContactHtml + "/contact.html"
        });

}]);
mainApp.factory('requestInjector', ['cookie', function (cookie) {
    return {
        request: function (config) {
            if(!cookie.get("userid")){
                window.location.href = loginHtml;
                return;
            }
            // 如果是生成环境，则直接获取cookie
            /*if(envCheck && !cookie.get("userid")){
                window.location.href = loginHtml;
                return;
            } else if(!envCheck) {
                scriptFun(cookieUrl, function (msg) {
                    try {
                        if (msg && msg.status === "1" && cookie.get("userid") == msg.Cookie) {
                            var userPermission = prefixUserUrl + "/getUserPermission";
                            ajaxFun(userPermission, {"userId": cookie.get("userid")}, function(data) {
                                if(data.permission === "true"){
                                    // 被禁用
                                    window.location.href = loginHtml;
                                    return;
                                }else{
                                    return config;
                                }
                            });
                        } else if (msg && msg.status === "1" && config.url === "loginOut") {
                            return config;
                        }else if (msg && msg.status === "1") {
                            // cookie存在且本地cookie不一样
                            window.location.href = "./loading.html";
                            return;
                        } else {
                            // cookie不存在
                            window.location.href = loginHtml;
                            return;
                        }
                    } catch (event) {
//                        console.log(event);
                        if(event.name!=="TypeError"){
                            window.location.href = loginHtml;
                            return;
                        }
                    }
                });
            }*/
//            return $q.reject('requestRejector');
//            return window.location.href = loginHtml;
            return config;
        }/*,
        requestError: function (rejectReason) {
            console.log(rejectReason);
//            return window.location.href = loginHtml;
        },*/
        /*response: function(response) {
            console.log(response);
            return response;
        },*/
        /*responseError: function (rejectReason) {
            console.log(rejectReason);
//            return window.location.href = loginHtml;
        }*/
    };
}]);
mainApp.config(['$httpProvider', function ($httpProvider) {
    //console.log($httpProvider.defaults);
    //$httpProvider.defaults.headers.common['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.common['Pragma'] = 'no-cache';
    // $httpProvider.defaults.withCredentials = true;//设置cookies
    $httpProvider.interceptors.push('requestInjector');
}]);
