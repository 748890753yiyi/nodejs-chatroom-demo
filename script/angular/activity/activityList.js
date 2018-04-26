/*'use strict';*/
/*
 活动列表(按几天内、时间段查询)
 */

mainApp.controller('activityListCtr', ['$scope', '$rootScope', '$stateParams', 'extendsResource', function ($scope, $rootScope, $stateParams, activityResource) {
    $scope.type = $stateParams.activityType;
    var activityListRestful = prefixActivityUrl + "/moreList/:id",
        activityDaysListRestful = prefixActivityUrl + "/recentDayList/:id",
        weekendListRestful = prefixActivityUrl + "/weekendList/:id",
        selectDayListRestful = prefixActivityUrl + "/selectDayList/:id",
        hotOrganizerRestful = prefixActivityUrl + "/hotOrganizer/:id",
        activityGrid;

    // 初始化列表
    $scope.isSearch = false;
    $scope.pageNumber = 1;
    $scope.pageNo = 1;
    $scope.conditions = {'type': $scope.type, 'groupId': $scope.id, 'pageNo': 1, 'pageSize': activityPageSize};
    activityGrid = new groupNewGrid(activityResource, activityListRestful, $scope.conditions);
    activityGrid.query([], function (data) {
        $scope.allActivityList = data.datas.list;
        $scope.pageNumber = data.pageNumber;
        $scope.pageNo = data.conditions.pageNo;
    });
    // 马上开始的活动推荐
    activityResource.extend(activityListRestful).query({'type': 'will', 'groupId': $scope.id, 'pageNo': 1, 'pageSize': activityPageSize}, function (data) {
        $scope.activities = data.list;
    });
    // 热门活动组织者
    activityResource.base(hotOrganizerRestful).query({'id': $scope.id, 'n': activityPageSize}, function (datas) {
        $scope.hotOrganizers = datas;
    });

    // 全部
    $scope.allList = function () {
        $scope.isSearch = false;
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'type': $scope.type, 'groupId': $scope.id, 'pageNo': 1, 'pageSize': activityPageSize};
        activityGrid = new groupNewGrid(activityResource, activityListRestful, $scope.conditions);

        activityGrid.query([], function (data) {
            // console.log(data);
            $scope.allActivityList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    // 最近三天
    $scope.threeDayList = function () {
        $scope.isSearch = false;
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'n': 3, 'id': $scope.id, 'pageNo': 1, 'pageSize': activityPageSize};
        activityGrid = new groupNewGrid(activityResource, activityDaysListRestful, $scope.conditions);

        activityGrid.query([], function (data) {
            // console.log(data);
            $scope.allActivityList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    // 最近一周
    $scope.sevenDayList = function () {
        $scope.isSearch = false;
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'n': 7, 'id': $scope.id, 'pageNo': 1, 'pageSize': activityPageSize};
        activityGrid = new groupNewGrid(activityResource, activityDaysListRestful, $scope.conditions);

        activityGrid.query([], function (data) {
            $scope.allActivityList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    // 周末
    $scope.weekendList = function () {
        $scope.isSearch = false;
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'id': $scope.id, 'pageNo': 1, 'pageSize': activityPageSize};
        activityGrid = new groupNewGrid(activityResource, weekendListRestful, $scope.conditions);

        activityGrid.query([], function (data) {
            $scope.allActivityList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    // 按时间段搜索
    // 搜索之前初始化时间为空，清空数据
    $scope.initTime = function(){
        $scope.isSearch = true;     // 标记是搜索页
        $scope.searchResult = false;    //标记是否已点击搜索
        $scope.select = {};
        $scope.allActivityList = [];
    };
    $scope.selectDayList = function () {
        if ($scope.select.startTime >= $scope.select.endTime) {
            $rootScope.$broadcast("alertMsg", "开始时间不能在结束时间之后");
        } else {
            $scope.pageNumber = 1;
            $scope.pageNo = 1;
            $scope.conditions = {'id': $scope.id, 'pageNo': 1, 'pageSize': activityPageSize};
            if ($scope.select.startTime) {
                $scope.conditions.startTime = $scope.select.startTime;
            }
            if ($scope.select.endTime) {
                $scope.conditions.endTime = $scope.select.endTime;
            }
            activityGrid = new groupNewGrid(activityResource, selectDayListRestful, $scope.conditions);

            activityGrid.query([], function (data) {
                // console.log(data);
                $scope.allActivityList = data.datas.list;
                $scope.searchResult = true;
                $scope.pageNumber = data.pageNumber;
                $scope.pageNo = data.conditions.pageNo;
            });
        }
    };
    //分页
    $scope.nextPage = function () {
        activityGrid.nextPage(function (data) {
            $scope.allActivityList = $scope.allActivityList.concat(data.datas.list);
            $scope.pageNo = data.conditions.pageNo;
        });
    };

}]);
