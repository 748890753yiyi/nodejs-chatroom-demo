/* 
 *	群组列表
 包括平台下的所有群组，可点搜索列表，及对群组的停用/启用、查看详情
 */


mainApp.controller('groupListCtr', ['$scope', '$rootScope', 'cookie', 'extendsResource', function ($scope, $rootScope, cookie, groupResource) {
    var groupListRestful = prefixGroupUrl + "/groupList";   //用户列表
    var groupEnableOrNotRestful = prefixGroupUrl + "/enableOrNotGroup/:id";   //停用


    // 初始化群组列表
    $scope.page = {'pageNo': 1, 'pageSize': groupPageSize};
    $scope.pageNumber = 1;
    $scope.conditions = {};
    $scope.sorts = {};
    var gridGrid = new grid(groupResource, groupListRestful, $scope.page, $scope.conditions, $scope.sorts);

    gridGrid.query([], function (data) {
        $scope.groupList = data.datas.list;
        $scope.pageNumber = data.pageNumber;
        $scope.page = data.page;
    });

    // 搜索
    $scope.getGroupList = function (searchName) {
        $scope.page = {'pageNo': 1, 'pageSize': groupPageSize};
        $scope.pageNumber = 1;
        $scope.conditions = {"name": searchName};
        $scope.sorts = {};
        gridGrid = new grid(groupResource, groupListRestful, $scope.page, $scope.conditions, $scope.sorts);

        gridGrid.query([], function (data) {
            $scope.groupList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };
    $scope.$watch('groupSearchName', function (newObj, oldObj) {
        if (newObj == '' && newObj != oldObj) {
            $scope.getGroupList($scope.groupSearchName);
        }
    });

    //分页
    $scope.turnToFirstPage = function () {
        gridGrid.firstPage(function (data) {
            $scope.groupList = data.datas.list;
            $scope.page = data.page;
        });
    };
    $scope.turnToPrePage = function () {
        gridGrid.prePage(function (data) {
            $scope.groupList = data.datas.list;
            $scope.page = data.page;
        });
    };
    $scope.turnToNextPage = function () {
        gridGrid.nextPage(function (data) {
            $scope.groupList = data.datas.list;
            $scope.page = data.page;
        });
    };
    $scope.turnToLastPage = function () {
        gridGrid.lastPage(function (data) {
            $scope.groupList = data.datas.list;
            $scope.page = data.page;
        });
    };
    $scope.enterPageNo = function (event, pageNo) {
        if (event.keyCode !== 13) return;
        if (!checkRate(pageNo)) return;
        $scope.page.pageNo = parseInt($scope.page.pageNo);
        gridGrid.selectPage($scope.page, function (data) {
            $scope.groupList = data.datas.list;
            $scope.page = data.page;
        });
    };

    // 停用组
    $scope.selectDisabledGroup = function (id) {
        $scope.sendText = "";
        $scope.disabledGroupId = id;
    };
    $scope.disabledGroup = function (id) {
        groupResource.base(groupEnableOrNotRestful).update({"id": id, "operate": "true"}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.groupList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.groupList[i].id == id) {
                        $scope.groupList[i].basic.stopLogin = 'true';
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };

    // 启用组
    $scope.enableGroup = function (id) {
        groupResource.base(groupEnableOrNotRestful).update({"id": id, "operate": "false"}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.groupList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.groupList[i].id == id) {
                        $scope.groupList[i].basic.stopLogin = 'false';
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };

}]);