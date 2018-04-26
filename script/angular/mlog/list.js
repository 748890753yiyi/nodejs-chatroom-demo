/* 
 *	日志监控列表
 包括平台管理的登录记录
 */


mainApp.controller('logListCtr', ['$scope', '$rootScope', 'cookie', 'extendsResource', function ($scope, $rootScope, cookie, logResource) {
    var logListRestful = prefixLogUrl + "/monitorList";


    // 初始化列表
    $scope.page = {'pageNo': 1, 'pageSize': logPageSize};
    $scope.pageNumber = 1;
    $scope.conditions = {};
    $scope.sorts = {};
    var gridGrid = new grid(logResource, logListRestful, $scope.page, $scope.conditions, $scope.sorts);

    gridGrid.query([], function (data) {
        $scope.logList = data.datas.list;
        $scope.pageNumber = data.pageNumber;
        $scope.page = data.page;
    });

    // 搜索
    $scope.getLogList = function (searchName) {
        $scope.page = {'pageNo': 1, 'pageSize': logPageSize};
        $scope.pageNumber = 1;
        $scope.conditions = {"name": searchName};
        $scope.sorts = {};
        gridGrid = new grid(logResource, logListRestful, $scope.page, $scope.conditions, $scope.sorts);

        gridGrid.query([], function (data) {
            $scope.logList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };
    $scope.$watch('logSearchName', function (newObj, oldObj) {
        if (newObj == '' && newObj != oldObj) {
            $scope.getLogList($scope.logSearchName);
        }
    });

    //分页
    $scope.turnToFirstPage = function () {
        gridGrid.firstPage(function (data) {
            $scope.logList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
        });
    };
    $scope.turnToPrePage = function () {
        gridGrid.prePage(function (data) {
            $scope.logList = data.datas.list;
            $scope.page = data.page;
        });
    };
    $scope.turnToNextPage = function () {
        gridGrid.nextPage(function (data) {
            $scope.logList = data.datas.list;
            $scope.page = data.page;
        });
    };
    $scope.turnToLastPage = function () {
        gridGrid.lastPage(function (data) {
            $scope.logList = data.datas.list;
            $scope.page = data.page;
        });
    };
    $scope.enterPageNo = function (event, pageNo) {
        if (event.keyCode !== 13) return;
        if (!checkRate(pageNo)) return;
        $scope.page.pageNo = parseInt($scope.page.pageNo);
        gridGrid.selectPage($scope.page, function (data) {
            $scope.logList = data.datas.list;
            $scope.page = data.page;
        });
    };

}]);