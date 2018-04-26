/* 
 话题列表
 */

mainApp.controller('topicListCtr', ['$scope', '$rootScope', '$http', 'cookie', '$stateParams', 'extendsResource', function ($scope, $rootScope, $http, cookie, $stateParams, topicResource) {
    var topicListRestful = prefixTopicUrl + "/list/:id",
        toTopRestful = prefixTopicUrl + "/toTop/:id",
        cancelToTopRestful = prefixTopicUrl + "/cancelToTop/:id",
        delTopicRestful = prefixTopicUrl+"/delTopic/:id";

    $scope.$on("topicAdd", function (event) {
        refreshData($scope.showType);
    });

    // 初始化列表
    $scope.pageNumber = 1;
    $scope.pageNo = 1;
    $scope.conditions = {'type': 'new', 'groupId': $scope.id, 'pageNo': 1, 'pageSize': topicPageSize};
    var topicGrid = new groupNewGrid(topicResource, topicListRestful, $scope.conditions);
    topicGrid.query([], function (data) {
        // console.log(data);
        $scope.showType = 'new';
        $scope.topicList = data.datas.list;
        $scope.pageNumber = data.pageNumber;
        $scope.pageNo = data.conditions.pageNo;
    });
    // 最新话题
    $scope.newList = function () {
        refreshData('new');
    };
    // 最热话题
    $scope.hotList = function () {
        refreshData('hot');
    };
    //分页
    $scope.nextPage = function () {
        topicGrid.nextPage(function (data) {
            // console.log(data.datas.list);
            $scope.topicList = $scope.topicList.concat(data.datas.list);
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    //置顶
    $scope.toTop = function (id) {
        var value = {"groupId": $scope.id, "id": id, "n": topNum};
        topicResource.base(toTopRestful).update(value, {}, function (data) {
            // alert(data.msg);
            if (data.status == 'success') {
                refreshData($scope.showType);
            } else {
                // alert(data.msg);
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    };

    //取消置顶
    $scope.cancelTop = function (id) {
        var value = {"id": id};
        topicResource.base(cancelToTopRestful).update(value, {}, function (data) {
            // alert(data.msg);
            if (data.status == 'success') {
                refreshData($scope.showType);
            } else {
                // alert(data.msg);
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    };

    function removeTopic(args) {
        $('.alert-confirm').modal('hide');
        var value = {"id": args.id};
        topicResource.base(delTopicRestful).delete({},value,function(data){
            if (data.status == 'success') {
                refreshData($scope.showType);
            }
        });
    }
    //删除
    $scope.delTopic = function(id){
        var str = "要删除该话题吗？";
        $rootScope.$broadcast("alertConfirm", {"str": str, "id": id}, removeTopic);
    };

    // 初始化列表信息
    function refreshData(type) {
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'type': type, 'groupId': $scope.id, 'pageNo': 1, 'pageSize': topicPageSize};
        topicGrid = new groupNewGrid(topicResource, topicListRestful, $scope.conditions);

        topicGrid.query([], function (data) {
            // console.log(data);
            $scope.showType = type;
            $scope.topicList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    }


}]);
