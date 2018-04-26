/*'use strict';*/
/*
 组初始化
 */
mainApp.controller('groupCtrl', ['$scope', '$stateParams', 'cookie', '$window', '$timeout', '$rootScope', 'extendsResource', function ($scope, $stateParams, cookie, $window, $timeout, $rootScope, groupResource) {
    var id = $stateParams.id,
        groupRestful = prefixGroupUrl + "/get/:id",
        unReadMsgRestful = prefixGroupUrl + "/unReadMsg/" + id,
        waitNumRestful = prefixGroupUrl + "/handleGroupWaitCount/" + id,
        exitGroupRestful = prefixGroupUrl + "/memberExit/" + id,
        groupFocusRestful = prefixGroupUrl + "/setFocus/:id",   // 关注/取消关注
        atListRestful = prefixGroupUrl + "/atList/:id",

        groupSendTextBoxId = "inputor", //输入框id
        userCookieId = cookie.get('userid');
    // console.log("in: "+id);
    $scope.id = id;
    $timeout(function () {
        $rootScope.$broadcast('groupId', $scope.id);
    }, 20);

    $scope.unReadMsg = 0;

    $scope.socket = io.connect(socketUrl + 'groupConnect', {'forceNew': true, 'reconnect': true});
    // $scope.socket = io.connect({forceNew:true});
    //初始化
    $scope.socket.on('welcome', function () {
        // console.log("组内连接成功");
        $scope.socket.emit('init', {"groupId": id, "userId": userCookieId});
    });
    // 改变角色
    $scope.socket.on('changeRole' + userCookieId, function (role) {
        // console.log(role);
        if (!role) {
            $rootScope.$broadcast("alertMsg", "你被移出了群组！");
            $window.location = "/index.html";
        } else {
            role.isFocusOn = $scope.groupMsg.ownRole.isFocusOn;
            $scope.groupMsg.ownRole = role;
            // 取消管理员后清楚刷新未读消息
            if (role.id == '3') {
                if ($scope.groupTimer) {
                    $timeout.cancel($scope.groupTimer); //清除定时任务
                }
            } else {
                getWaitCount();
            }
        }
    });
    //改变发言权限
    $scope.socket.on('changeSpeak' + userCookieId, function (isSpeak) {
        if (isSpeak == '3') {
            isSpeak = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3);
        } else if (isSpeak == '7') {
            isSpeak = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7);
        } else if (isSpeak == '1') {
            isSpeak = 'false';
        }
        $scope.groupMsg.ownRole.isSpeak = isSpeak;
        $scope.initChatAt();   //初始化@
        $scope.$apply();
    });

    $scope.$on('$destroy', function () {
        // console.log('destroy');
        $scope.socket.disconnect();
        $rootScope.$broadcast('leaveGroupId', $scope.id);
        $timeout.cancel($scope.groupTimer);
    });
    // 标记是否聊天chat页面
    $scope.$on('isChat', function (event, data) {
        $scope.isChat = data;
    });

    $scope.$on('refreshGroup', function (event) {
        groupData();
    });
    // 组内@列表
    $scope.initChatAt = function () {
        var condition;
        $timeout(function () {
            $('#' + groupSendTextBoxId).atwho('run').atwho({
                at: "@",
                start_with_space: false,
                alias: "at-mentions",
                search_key: "spell|name",
                tpl: "<li data-value='${atwho-at}${name}'>${name}(${contactValue})</li>",
                // href='#/myInfo/${userId}/'
                insert_tpl: "<span><a class='site-message-alt-name' alt='${name}'>${atwho-data-value}</a></span>",
                'callbacks': {
                    remote_filter: function (query, callback) {
                        callback(null);
                    }
                }
            }).on('focus', function (e) {
                //        console.log("focus");
                $timeout(function () {
                    userCookieId = cookie.get('userid');
                    condition = {"groupId": $scope.id};
                    groupResource.base(atListRestful).query(condition, function (datas) {
                        var members = datas;
                        var _users = [allValue];
                        members.forEach(function (item) {
                            item.contactInformation.forEach(function (it) {
                                if (it.registerTag == 'true') {
                                    item.contactValue = it.contactValue;
                                }
                            });
                            if (item.id != userCookieId) {
                                _users.push(item);
                            }
                        });
                        var relationData = _users;
                        relationData = $.map(relationData, function (value, i) {
                            return {id: i, 'name': value.basic.userName, 'userId': value.id, 'spell': value.basic.spell, 'contactValue': value.contactValue};
                        });
                        $('#' + groupSendTextBoxId).atwho('load', "at-mentions", relationData);
                    });
                }, 300);

            }).one('matched-at-mentions.atwho', function (e, key, query) {
                //console.log("matched-at-mentions.atwho")
            }).one('matched.atwho', function (e) {
                //console.log("matched.atwho")
            });
        }, 1000);
    };

    // 未读消息
    function getWaitCount() {
        if ($scope.groupTimer) {
            $timeout.cancel($scope.groupTimer); //清除定时任务
        }
        groupResource.extend(waitNumRestful).query({}, function (data) {
            $scope.waitCount = data.count;
        });
        $scope.groupTimer = $timeout(getWaitCount, refreshTime);
    }
    //初始化进入的群组信息
    function groupData() {
        groupResource.base(groupRestful).get({"id": id}, function (msg) {
            // console.log(msg);
            $scope.groupMsg = msg;
            if (!$scope.lastExitTime) {
                $scope.$broadcast("initList", msg.ownRole.exitTime);
            }
            $scope.lastExitTime = msg.ownRole.exitTime;
            if (msg.ownRole.id == '3') {
                if ($scope.groupTimer) {
                    $timeout.cancel($scope.groupTimer); //清除定时任务
                }
            } else if (msg.ownRole.id == '1' || msg.ownRole.id == '2') {
                getWaitCount();
            }
        });
    }

    // 上次离开未读个数
    groupResource.extend(unReadMsgRestful).query({}, function (data) {
        // console.log(data);
        $scope.oldMsgCount = data.count;
        $timeout(function () {
            $scope.oldMsgCount = 0;
        }, 10 * 1000);
    });

    //邀请新用户
    $scope.$on('memberAdd', function (event) {
        groupData();
        $scope.$broadcast('groupInfoUpdate');
    });
    //搜索指定成员聊天记录
    $scope.searchUserChat = function (searchUserName) {
        $scope.$broadcast('searchUserName', searchUserName);
    };
    $scope.$watch('searchChatName', function (newObj, oldObj) {
        if (!newObj && newObj != oldObj) {
            $scope.$broadcast('searchUserName', "");
        }
    });
    // 修改组信息
    $scope.$on('groupUpdate', function (event, data) {
        $scope.groupMsg.basic.name = data.basic.name;
        if (data.basic.head !== groupHead) {
            $scope.groupMsg.memberHead = [];
            $scope.groupMsg.basic.head = data.basic.head;
        }
    });


    // 退出群组
    $scope.userExit = function () {
        groupResource.base(exitGroupRestful).update({}, {}, function (data) {
            if (data.status == 'success') {
                userCookieId = cookie.get("userid");
                getCookieUser(userCookieId, groupResource, function (cookieUser) {
                    var msg = cookieUser.basic.userName + " 退出群组";
                    $scope.socket.emit('memberChange'); //刷新人员
                    sendMsg(cookieUser, msg);
                    // 退出群组则跳转到首页
                    $window.location = "/index.html";
                });
            } else {
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    };

    /*
     左侧栏修改关注
     type: N/Y 取消关注/关注
     groupId: 操作的组id
     */
    $scope.$on("changeFocus", function (event, type, groupId) {
        if (id == groupId) {
            $scope.groupMsg.ownRole.isFocusOn = type;
        }
    });
    /* 关注/取消关注群组
     id: 组id
     type: 关注/取消关注
     */
    $scope.setFocusGroup = function (group, type) {
        var query = {};
        query.groupId = group.id;
        query.isFocusOn = type;
        query.focusNumber = focusNumber;
        query.level = $scope.groupMsg.ownRole.level;
        groupResource.base(groupFocusRestful).update({}, query, function (data) {
            if (data.status == 'success') {
                $scope.groupMsg.ownRole.isFocusOn = type;
                $rootScope.$broadcast("groupFocusUpdate", type, group);
            } else {
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    };

    // 处理后发送一条通知消息
    function sendMsg(user, msg) {
        var message = {};
        message.basic = {};
        message.basic.userId = user.id;
        message.basic.groupId = $scope.id;
        message.basic.type = 'remind';
        message.content = {};
        message.content.text = msg;
        message.content.file = [];
        message.atMembers = [];
        // console.log(message);
        //广播发消息
        $scope.socket.emit('distributeMessage', message);
    }

    /* 
     初始化页面
     */
    groupData();

    // 导出聊天记录
    $scope.initTime = function () {
        $scope.exportTime = {};
    };
    // 修改开始时间，判断结束时间是否大于开始时间
    $scope.changeStartTime = function () {
        if($scope.exportTime.endTime && new Date($scope.exportTime.startTime) > new Date($scope.exportTime.endTime)){
            delete $scope.exportTime.endTime;
        }
    };

}]);