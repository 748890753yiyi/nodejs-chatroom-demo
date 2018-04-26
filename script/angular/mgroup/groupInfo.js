/*
 *	组详情
 1、组的详细信息  2、组内人员列表
 * */

mainApp.controller('groupInfoCtr', ['$scope', '$rootScope', 'cookie', '$stateParams', 'extendsResource', function ($scope, $rootScope, cookie, $stateParams, groupResource) {
    var groupInfoRstful = prefixGroupUrl + "/groupDetailTop/:id";    //组详情
    var groupListRstful = prefixGroupUrl + "/groupDetail";    //人员列表
    var userEnableOrNotRestful = prefixUserUrl + "/groupEnableOrNot/:id";   //人的停用和启用
    var adminOperationRestful = prefixUserUrl + "/setAdmin/:id";   //设置管理员、取消管理员
    var allowSpeakRestful = prefixUserUrl + "/allowSpeak/:id";   //组内禁言
    var groupUserRestful = prefixUserUrl + "/groupList/:id";    //组人员列表
    var groupAdminTransferRestful = prefixUserUrl + "/removeRootGroup/:id";    //组移交管理员


    var id = $stateParams.id;//获取GroupId
    // console.log(id);

    // 获取组基本信息
    groupResource.base(groupInfoRstful).get({"id": id}, function (data) {
        $scope.groupInfo = data;
    });


    // 获取人员列表
    $scope.page = {'pageNo': 1, 'pageSize': groupInfoPageSize};
    $scope.conditions = {"id": id};
    $scope.sorts = {};
    var groupGrid = new grid(groupResource, groupListRstful, $scope.page, $scope.conditions, $scope.sorts);
    groupGrid.query([], function (data) {
        $scope.userList = trimData(data.datas.list);
        $scope.pageNumber = data.pageNumber;
        $scope.page = data.page;
    });

    //分页
    $scope.turnToFirstPage = function () {
        groupGrid.firstPage(function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };
    $scope.turnToPrePage = function () {
        groupGrid.prePage(function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };
    $scope.turnToNextPage = function () {
        groupGrid.nextPage(function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };
    $scope.turnToLastPage = function () {
        groupGrid.lastPage(function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };
    $scope.enterPageNo = function (event, pageNo) {
        if (event.keyCode !== 13) return;
        if (!checkRate(pageNo)) return;
        $scope.page.pageNo = parseInt($scope.page.pageNo);
        groupGrid.selectPage($scope.page, function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };

    // 人停用
    $scope.selectDisabledGroup = function (id) {
        $scope.sendText = "";
        $scope.disabledUserId = id;
    };
    $scope.groupDisabled = function (userId) {
        groupResource.base(userEnableOrNotRestful).update({"id": userId, "groupId": id, "operate": "false"}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.userList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.userList[i].id == userId) {
                        $scope.userList[i].groupInformation.role.status = 'false';
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };
    // 人启用
    $scope.groupEnable = function (userId) {
        groupResource.base(userEnableOrNotRestful).update({"id": userId, "groupId": id, "operate": "true"}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.userList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.userList[i].id == userId) {
                        $scope.userList[i].groupInformation.role.status = 'true';
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };
    /* 	组管理员操作
     userId：所选user的id值
     flag：标记设为的角色(2-管理员, 3-普通成员)
     */
    $scope.setGroupAdminOperation = function (userId, flag) {
        groupResource.base(adminOperationRestful).update({"userId": userId, "id": id, "type": "role", "operate": flag}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.userList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.userList[i].id == userId) {
                        $scope.userList[i].groupInformation.role = msg.role;
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };
    // 人禁言操作
    $scope.gagDays = gagDays;
    $scope.setGroupGag = function (userId, flag) {
        groupResource.base(allowSpeakRestful).update({"userId": userId, "id": id, "type": "roleExtend", "operate": flag}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.userList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.userList[i].id == userId) {
                        var theFlag = flag == 'true' ? 'true' : 'false';
                        $scope.userList[i].groupInformation.roleExtend.isSpeak = theFlag;
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };
    // 组内人列表
    var groupUserGrid;
    $scope.getGroupUserList = function (userId, name) {
        $scope.selectUserId = userId;
        $scope.groupUserPage = {'pageNo': 1, 'pageSize': transferUserPageSize};
        $scope.groupUserConditions = {"id": id, 'name': name};
        $scope.groupUserSorts = {};
        groupUserGrid = new grid(groupResource, groupUserRestful, $scope.groupUserPage, $scope.groupUserConditions, $scope.groupUserSorts);
        groupUserGrid.query([], function (data) {
            $scope.spellShow = name;
            $scope.groupUserList = data.datas.list;
            $scope.groupUserPageNumber = data.pageNumber;
            $scope.groupUserPage = data.page;
            $(".group-select").modal("show");
        });
    };
    // 分页
    $scope.groupUserPrePage = function () {
        groupUserGrid.prePage(function (data) {
            $scope.groupUserList = data.datas.list;
            $scope.groupUserPage = data.page;
        });
    };
    $scope.groupUserNextPage = function () {
        groupUserGrid.nextPage(function (data) {
            $scope.groupUserList = data.datas.list;
            $scope.groupUserPage = data.page;
        });
    };

    // 组移交管理员权限
    $scope.groupAdminTransfer = function (selectId) {
        groupResource.base(groupAdminTransferRestful).update({"id": id, "rootId": $scope.selectUserId, "mainId": selectId}, {}, function (msg) {
            $(".group-select").modal("hide");
            if (msg.status == "success") {
                var length = $scope.userList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.userList[i].id == $scope.selectUserId) {
                        $scope.userList[i].groupInformation.role = msg.role;
                        break;
                    }
                }
                for (var j = 0; j < length; j++) {
                    if ($scope.userList[j].id == selectId) {
                        $scope.userList[j].groupInformation.role = msg.superRole;
                        $scope.groupInfo.basic.userName = $scope.userList[j].basic.userName;
                        break;
                    }
                }
                $scope.selectUserId = "";
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };

    // 整理人员信息
    function trimData(data) {
        data.forEach(function (item) {
            item.contactInformation.forEach(function (it) {
                if (it.registerTag == "true") {
                    item.contactValue = it.contactValue;
                }
            });
        });
        return data;
    }
}]);