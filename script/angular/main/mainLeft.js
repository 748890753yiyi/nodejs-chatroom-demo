/*
 进入平台左边栏：组列表、新消息提醒
 */

mainApp.controller('mainLeftCtr', ['$scope', 'cookie', '$rootScope', '$state', '$q', '$timeout', 'extendsResource', function ($scope, cookie, $rootScope, $state, $q, $timeout, extendsResource) {
    var groupRestful = prefixGroupUrl + "/ownAllGroupList/:id",
        groupFocusRestful = prefixGroupUrl + "/setFocus/:id",   // 关注/取消关注
        focusTotal = 0; // 标记列表中包含的已置顶群组的个数

    /*
     登录初始化第一个组
     */
    /*extendsResource.extend(groupInitRestful).query({},function(data){
     if(data.id){
     $state.go("group",{'id':data.id});
     }else{
     $state.go("main");
     }
     });*/

    // 初始化组列表
    extendsResource.extend(groupRestful).query({}, function (datas) {
        /*datas.list.forEach(function(item){
         if(item.message.content){
         item.message.content.text = item.message.content.text.replaceAll("<br>"," ").replaceAll("<div>"," ").replaceAll("</div>"," ");
         }
         if(item.message.content&&item.message.content.text==""&&item.message.content.file.length>0){
         item.message.content.text = "[附件]";
         }
         });*/
//        $timeout(function(){
        $scope.ownGroupList = trimList(datas.list);
        focusTotal = datas.focusTotal;
        // 判断是否初始化组，如果是刷新则初始化之前页面，如果是进入index页面则初始化组
        $timeout(function () {
            if (!$scope.isReload) {
                if ($scope.ownGroupList.length > 0) {
                    $state.go("group", {'id': $scope.ownGroupList[0].id, "atId": ""});
                } else {
                    $state.go("main");
                }
            }
        }, 200);
    });

    /*
     关注/取消关注群组
     id: 组id
     type: 关注/取消关注
     */
    $scope.setFocusGroup = function (event, group, type) {
        event.stopPropagation();
        var query = {};
        query.groupId = group.id;
        query.isFocusOn = type;
        query.focusNumber = focusNumber;
        query.level = group.roleExtend.level;
        extendsResource.base(groupFocusRestful).update({}, query, function (data) {
            if (data.status == 'success') {
                getGroupList();
                $rootScope.$broadcast("changeFocus", type, group.id);
            } else {
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    };
    // 组新消息广播
    var userCookieId = cookie.get("userid");
    $scope.mainSocket.on('receiveMessage' + userCookieId, function (msg) {
        var groupId = msg.groupInformation.id;
        if (msg.groupInformation.id !== $scope.enterGroupId) {
            // 新消息title闪动和声音提醒
            iNotify.setTitle(true).player();
        }
        var len = $scope.ownGroupList.length;
        var index = 0;
        for (var i = 0; i < len; i++) {
            if ($scope.ownGroupList[i].id == groupId) {
                index = i;  // 标记当前组在列表中的下标
                $scope.ownGroupList[i].msgCount = $scope.ownGroupList[i].msgCount + 1;
                msg = trimList([msg])[0];
                $scope.ownGroupList[i].message = msg.message;
                break;
            }
        }
        // 切换未关注群组的显示顺序
        if (index > focusTotal) {
            var tempObj = $scope.ownGroupList[index];
            for (var j = index; j > focusTotal; j--) {
                $scope.ownGroupList[j] = $scope.ownGroupList[j - 1];
            }
            $scope.ownGroupList[focusTotal] = tempObj;
        }
        $scope.$apply();
    });
    // 撤回消息
    $scope.mainSocket.on('undo', function (data) {
        var len = $scope.ownGroupList.length;
        for (var i = 0; i < len; i++) {
            if ($scope.ownGroupList[i].id == data.groupId) {
                if(data.messageId == $scope.ownGroupList[i].message.id){
                    $scope.ownGroupList[i].message.basic.undo = true;
                    $scope.ownGroupList[i].message.content.text = "此条信息已删除";
                }
                break;
            }
        }
        $scope.$apply();
    });

    // 刷新组列表（邀请、审核、移出）
    $scope.mainSocket.on('groupRefresh' + userCookieId, function (data) {
        getGroupList();
    });

    /*
     组内修改关注
     type: N/Y 取消关注/关注
     group: 操作的组信息
     */
    $scope.$on('groupFocusUpdate', function (event, type) {
        getGroupList();
        // 通知组修改level
        if (type == "config") {
            $rootScope.$broadcast("refreshGroup");
        }
    });

    //组信息修改刷新显示
    $scope.$on('groupUpdate', function (event, data) {
        var len = $scope.ownGroupList.length;
        for (var i = 0; i < len; i++) {
            if ($scope.ownGroupList[i].id == data.id) {
                $scope.ownGroupList[i].basic.name = data.basic.name;
                if (data.basic.head !== groupHead) {
                    $scope.ownGroupList[i].headDoc = [];
                    $scope.ownGroupList[i].basic.head = data.basic.head;
                }
                break;
            }
        }
    });
    // 新建群组
    $scope.$on('groupRefresh', function (event, groupId) {
        getGroupList();
    });
    // 获取左侧组列表
    function getGroupList() {
        extendsResource.extend(groupRestful).query({}, function (datas) {
            $scope.ownGroupList = trimList(datas.list);
            focusTotal = datas.focusTotal;
            if ($state.$current.name === "main" || $scope.noGroup) {
                $state.go("group", {'id': datas.list[0].id, "atId": ""});
                $scope.$parent.noGroup = false;
            }
        });
    }

    // 退出群组/被移出，刷新列表
    $scope.$on('groupExit', function (event, groupId) {
        var len = $scope.ownGroupList.length;
        for (var i = 0; i < len; i++) {
            if ($scope.ownGroupList[i].id == groupId) {
                $scope.ownGroupList.splice(i, 1);
                break;
            }
        }
    });
    //组的进入和离开
    $scope.$on('groupId', function (event, groupId) {
        if (!$scope.ownGroupList) {
            return;
        }
        $scope.enterGroupId = groupId;
        $scope.hasGroupPrompt = false;
        var len = $scope.ownGroupList.length;
        for (var i = 0; i < len; i++) {
            if ($scope.ownGroupList[i].id !== groupId && $scope.ownGroupList[i].msgCount > 0) {
                $scope.hasGroupPrompt = true;
                break;
            }
        }
        // 没有其他未读消息，则取消title闪动
        if (!$scope.hasGroupPrompt) {
            iNotify.setTitle(false);
        }
    });
    // 离开组，设未读个数为0
    $scope.$on('leaveGroupId', function (event, groupId) {
        var leaveGroupId = groupId;
        $scope.enterGroupId = "";
        var len = $scope.ownGroupList.length;
        for (var i = 0; i < len; i++) {
            if ($scope.ownGroupList[i].id == leaveGroupId) {
                $scope.ownGroupList[i].msgCount = 0;
                break;
            }
        }
    });

    function trimList(datas) {
        datas.forEach(function (item) {
            if (item.message.basic.type == "groupChat") {
                item.message.content.text = item.message.content.text.replaceAll("<br>", " ").replaceAll("<div>", " ").replaceAll("</div>", " ");
                if (item.message.content.text === "" && item.message.content.file.length > 0 && item.message.content.file[0].classify == 'sound') {
                    item.message.content.text = "【语音】";
                } else if (item.message.content.text === "" && item.message.content.file.length > 0) {
                    item.message.content.text = "【附件】";
                }
            } else if (item.message.basic.type == "topic") {
                item.message.content.text = "【话题】";
            } else if (item.message.basic.type == "vote") {
                item.message.content.text = "【投票】";
            } else if (item.message.basic.type == "activity") {
                item.message.content.text = "【活动】";
            } else if (item.message.basic.type == "announcement") {
                item.message.content.text = "【公告】";
            } else if (item.message.basic.type == "groupCard") {
                item.message.content = {};
                item.message.content.text = "【群名片】";
            }
        });
        return datas;
    }

}]);