/* 
 组内@我的
 */

mainApp.controller('atMeCtrl', ['$scope', '$http', 'cookie', '$state', '$rootScope', 'extendsResource', function ($scope, $http, cookie, $state, $rootScope, extendsResource) {

    var groupAtremindRestful = prefixGroupUrl + "/groupAtList";

    var atGrid;
    $scope.$parent.initAtList = function () {
        $scope.conditions = {'pageNo': 1, 'pageSize': groupAtPageSize};
        atGrid = new groupNewGrid(extendsResource, groupAtremindRestful, $scope.conditions);

        atGrid.query([], function (data) {
            // console.log(data);
            $scope.groupAtNotice = data.datas.list;
            $scope.total = data.datas.total;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
            $(".at-modal").modal("show");
        });
    };


    //分页
    $scope.turnToPrePage = function () {
        atGrid.prePage(function (data) {
            $scope.groupAtNotice = data.datas.list;
            $scope.total = data.datas.total;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    $scope.turnToNextPage = function () {
        atGrid.nextPage(function (data) {
            $scope.groupAtNotice = data.datas.list;
            $scope.total = data.datas.total;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    // 切换进入群组
    $scope.changeGroup = function (groupId, atId) {
        $state.go("group", {"id": groupId, "atId": atId});
        $(".at-modal").modal("hide");
    };

}]);