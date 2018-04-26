/* 
 *	人员列表
 包括人员列表，及对人员的停用/启用、查看详情
 */

mainApp.controller('userListCtr', ['$scope', '$rootScope', 'cookie', 'extendsResource', function ($scope, $rootScope, cookie, userResource) {
    var userListRestful = prefixUserUrl + "/userList";   //用户列表
    var userEnableOrNotRestful = prefixUserUrl + "/enableOrNot";   //停用

    // 初始化人员列表
    $scope.page = {'pageNo': 1, 'pageSize': userPageSize};
    $scope.pageNumber = 1;
    $scope.conditions = {};
    $scope.sorts = {};
    var gridGrid = new grid(userResource, userListRestful, $scope.page, $scope.conditions, $scope.sorts);

    gridGrid.query([], function (data) {
        $scope.userList = trimData(data.datas.list);
        $scope.pageNumber = data.pageNumber;
        $scope.page = data.page;
    });

    // 搜索、点击省份重新初始化
    $scope.getUserList = function (provinceName, searchName) {
        $scope.page = {'pageNo': 1, 'pageSize': userPageSize};
        $scope.pageNumber = 1;
        $scope.conditions = {"province": provinceName, "name": searchName};
        $scope.sorts = {};
        gridGrid = new grid(userResource, userListRestful, $scope.page, $scope.conditions, $scope.sorts);

        gridGrid.query([], function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };
    $scope.$watch('userSearchName', function (newObj, oldObj) {
        if (newObj == '' && newObj != oldObj) {
            $scope.getUserList($scope.provinceName, $scope.userSearchName);
        }
    });

    //分页
    $scope.turnToFirstPage = function () {
        gridGrid.firstPage(function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.page = data.page;
        });
    };
    $scope.turnToPrePage = function () {
        gridGrid.prePage(function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.page = data.page;
        });
    };
    $scope.turnToNextPage = function () {
        gridGrid.nextPage(function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.page = data.page;
        });
    };
    $scope.turnToLastPage = function () {
        gridGrid.lastPage(function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.page = data.page;
        });
    };
    $scope.enterPageNo = function (event, pageNo) {
        if (event.keyCode !== 13) return;
        if (!checkRate(pageNo)) return;
        $scope.page.pageNo = parseInt($scope.page.pageNo);
        gridGrid.selectPage($scope.page, function (data) {
            $scope.userList = trimData(data.datas.list);
            $scope.page = data.page;
        });
    };

    // 停用用户
    $scope.selectDisabledUser = function (id) {
        $scope.sendText = "";
        $scope.disabledUserId = id;
    };
    $scope.disabledUser = function (id) {
        userResource.base(userEnableOrNotRestful).update({"id": id, "operate": "true"}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.userList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.userList[i].id == id) {
                        $scope.userList[i].basic.stopLogin = 'true';
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };

    // 启用用户
    $scope.enableUser = function (id) {
        userResource.base(userEnableOrNotRestful).update({"id": id, "operate": "false"}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.userList.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.userList[i].id == id) {
                        $scope.userList[i].basic.stopLogin = 'false';
                        break;
                    }
                }
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };


    function trimData(data) {
        data.forEach(function (item) {
            item.contactInformation.forEach(function (it) {
                if (it.registerTag == "true") {
                    item.contactValue = it.contactValue;
                }
            })
        });
        return data;
    }

}]);