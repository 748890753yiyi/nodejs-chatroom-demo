/*
 *	人员详情
 1、人员的详细信息  2、人的组列表  3、人的公司列表
 * */

mainApp.controller('userInfoCtr', ['$scope', '$rootScope', 'cookie', '$stateParams', 'extendsResource', function ($scope, $rootScope, cookie, $stateParams, userResource) {
    var userInfoRestful = prefixUserUrl + "/personalDetailTop/:id";    //人员详情
    var userListRestful = prefixUserUrl + "/personalDetail/:id";    //组和公司列表
    var groupEnableOrNotRestful = prefixUserUrl + "/groupEnableOrNot/:id";   //停用和启用
    var adminOperationRestful = prefixUserUrl + "/setAdmin/:id";   //设置管理员、取消管理员
    var allowSpeakRestful = prefixUserUrl + "/allowSpeak/:id";   //组内禁言
    var groupUserRestful = prefixUserUrl + "/groupList/:id";    //组人员列表
    var groupAdminTransferRestful = prefixUserUrl + "/removeRootGroup/:id";    //组移交管理员

    var id = $stateParams.id;//获取UserId
    // console.log(id);

    // 获取人员基本信息
    userResource.base(userInfoRestful).get({"id": id}, function (data) {
        $scope.userInfo = data;
    });


    // 获取组列表
    $scope.getGroupList = function () {
        $scope.groupPage = {'pageNo': 1, 'pageSize': userInfoPageSize};
        $scope.groupConditions = {"id": id, "type": "group"};
        $scope.groupSorts = {};
        groupGrid = new grid(userResource, userListRestful, $scope.groupPage, $scope.groupConditions, $scope.groupSorts);
        groupGrid.query([], function (data) {
            $scope.groupList = data.datas.list;
            $scope.groupPageNumber = data.pageNumber;
            $scope.groupPage = data.page;
        });
    };

    //分页
    $scope.turnToFirstPage = function () {
        groupGrid.firstPage(function (data) {
            $scope.groupList = data.datas.list;
            $scope.groupPage = data.page;
        });
    };
    $scope.turnToPrePage = function () {
        groupGrid.prePage(function (data) {
            $scope.groupList = data.datas.list;
            $scope.groupPage = data.page;
        });
    };
    $scope.turnToNextPage = function () {
        groupGrid.nextPage(function (data) {
            $scope.groupList = data.datas.list;
            $scope.groupPage = data.page;
        });
    };
    $scope.turnToLastPage = function () {
        groupGrid.lastPage(function (data) {
            $scope.groupList = data.datas.list;
            $scope.groupPage = data.page;
        });
    };
    $scope.enterToPageNo = function (event, pageNo) {
        if (event.keyCode !== 13) return;
        if (!checkRate(pageNo)) return;
        $scope.groupPage.pageNo = parseInt($scope.groupPage.pageNo);
        groupGrid.selectPage($scope.groupPage, function (data) {
            $scope.groupList = data.datas.list;
            $scope.groupPage = data.page;
        });
    };

    // 组停用
    $scope.selectDisabledGroup = function (id) {
        $scope.sendText = "";
        $scope.disabledGroupId = id;
    };
    $scope.groupDisabled = function (groupId) {
        userResource.base(groupEnableOrNotRestful).update({"id": id, "groupId": groupId, "operate": "false"}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.groupList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.groupList[i].id == groupId) {
                        $scope.groupList[i].role.status = 'false';
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        })
    };
    // 组启用
    $scope.groupEnable = function (groupId) {
        userResource.base(groupEnableOrNotRestful).update({"id": id, "groupId": groupId, "operate": "true"}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.groupList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.groupList[i].id == groupId) {
                        $scope.groupList[i].role.status = 'true';
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };
    // 组管理员操作
    $scope.setGroupAdminOperation = function (groupId, flag) {
        userResource.base(adminOperationRestful).update({"userId": id, "id": groupId, "type": "role", "operate": flag}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.groupList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.groupList[i].id == groupId) {
                        $scope.groupList[i].role = msg.role;
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };
    // 组禁言操作
    $scope.gagDays = gagDays;
    $scope.setGroupGag = function (groupId, flag) {
        userResource.base(allowSpeakRestful).update({"userId": id, "id": groupId, "type": "roleExtend", "operate": flag}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.groupList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.groupList[i].id == groupId) {
                        var theFlag = flag == 'true' ? 'true' : 'false';
                        $scope.groupList[i].roleExtend.isSpeak = theFlag;
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
    $scope.getGroupUserList = function (groupId, name) {
        $scope.selectGroupId = groupId;
        $scope.groupUserPage = {'pageNo': 1, 'pageSize': transferUserPageSize};
        $scope.conditions = {"id": groupId, 'name': name};
        $scope.sorts = {};
        groupUserGrid = new grid(userResource, groupUserRestful, $scope.groupUserPage, $scope.conditions, $scope.sorts);
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
        userResource.base(groupAdminTransferRestful).update({"rootId": id, "id": $scope.selectGroupId, "mainId": selectId}, {}, function (msg) {
            $(".group-select").modal("hide");
            if (msg.status == "success") {
                var length = $scope.groupList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.groupList[i].id == $scope.selectGroupId) {
                        $scope.groupList[i].role = msg.role;
                        break;
                    }
                }
                $scope.selectGroupId = "";
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };


    // 初始化进入页面的组列表
    $scope.getGroupList();

}]);