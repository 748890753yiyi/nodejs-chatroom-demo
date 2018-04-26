/*
 通知页面的控制器
 */

//页面上边栏
mainApp.controller('noticeCtrl', ['$scope', '$rootScope', 'cookie', '$http', '$window', 'extendsResource', function ($scope, $rootScope, cookie, $http, $window, noticeResource) {
    var noticeRestful = prefixNoticeUrl + "/list/:id",
        noticeDealRestful = prefixNoticeUrl + "/deal",
        noticeDealGroupRestful = prefixGroupUrl + "/agreeOrUpdate",
        noticeGrid;

    //初始化通知
    $scope.$parent.noticeInit = function () {
        $scope.page = {'pageNo': 1, 'pageSize': noticePageSize};
        $scope.pageNumber = 1;
        $scope.conditions = [];
        $scope.sorts = [
            {
                field: "basic.publishTime",
                isDesc: true
            }
        ];
        noticeGrid = new grid(noticeResource, noticeRestful, $scope.page, $scope.conditions, $scope.sorts);

        noticeGrid.query([], function (data) {
//            console.log(data);
            $scope.notices = data.datas.list;
            $scope.pageNumber = data.pageNumber;//总页数
            $scope.page = data.page;
            $(".notice-modal").modal("show");
        });
    };

    /*$scope.page = {'pageNo': 1, 'pageSize': noticePageSize};
     $scope.pageNumber = 1;
     $scope.conditions = [];
     $scope.sorts = [
     {
     field: "basic.publishTime",
     isDesc: true
     }
     ];
     var noticeGrid = new grid(noticeResource, noticeRestful, $scope.page, $scope.conditions, $scope.sorts);

     noticeGrid.query([], function (data) {
     //console.log(data);
     $scope.notices = data.datas.list;
     $scope.pageNumber = data.pageNumber;//总页数
     $scope.page = data.page;
     });*/


    $scope.prePage = function () {
        noticeGrid.prePage(function (data) {
            $scope.notices = data.datas.list;
            $scope.page = data.page;
        });
    };
    $scope.nextPage = function () {
        noticeGrid.nextPage(function (data) {
            $scope.notices = data.datas.list;
            $scope.page = data.page;
        });
    };

    //好友请求处理
    $scope.dealReq = function (notice, type) {
        routeHttp($http, noticeDealRestful, {'id': notice.id, 'state': type}, function (data) {
            if (data.status === 'success') {
                angular.forEach($scope.notices, function (item) {
                    if (notice.id === item.id) {
                        item.basic.state = type;
                    }
                });
                $rootScope.$broadcast("contactChange");
            } else {
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    };
    //邀请加入群组请求处理
    $scope.dealGroupReq = function (notice, type) {
        routeHttp($http, noticeDealGroupRestful, {
            'id': notice.id,
            'state': type,
            'groupId': notice.basic.groupId,
            'userId': notice.basic.userId
        }, function (data) {
            //console.log(data);
            if (data.status === 'success') {
                notice.basic.state = type;
                $rootScope.$broadcast("alertMsg", data.msg);
                $rootScope.$broadcast("groupRefresh");
            } else if(data.status === 'exist') {
                $rootScope.$broadcast("alertMsg", data.msg);
                notice.basic.state = type;
            }else{
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    };

}]);