/* 
 投票列表
 */

mainApp.controller('voteListCtr', ['$scope', '$http', 'cookie', '$rootScope', '$stateParams', 'extendsResource', function ($scope, $http, cookie, $rootScope, $stateParams, voteResource) {
    var voteListRestful = prefixVoteUrl + "/list/:id",
        newVoteListRestful = prefixVoteUrl + "/latestVoteList/:id",
        delVoteRestful = prefixVoteUrl + '/delVote/:id',
        stopVoteRestful = prefixVoteUrl + '/stopVote/:id';
    $scope.cookieUserId = cookie.get("userid");
    $scope.$on("voteAdd", function (event) {
        refreshData($scope.showType);
        voteResource.base(newVoteListRestful).query({'groupId': $scope.id, 'n': topNum}, function (datas) {
            $scope.newVotes = datas;
        });
    });

    // 初始化列表
    $scope.pageNumber = 1;
    $scope.pageNo = 1;
    $scope.conditions = {'type': 'allVote', 'groupId': $scope.id, 'pageNo': 1, 'pageSize': votePageSize};
    var voteGrid = new groupNewGrid(voteResource, voteListRestful, $scope.conditions);
    voteGrid.query([], function (data) {
        $scope.showType = 'allVote';
        $scope.voteList = data.datas.list;
        $scope.pageNumber = data.pageNumber;
        $scope.pageNo = data.conditions.pageNo;
    });

    // 最新投票
    voteResource.base(newVoteListRestful).query({'groupId': $scope.id, 'n': topNum}, function (datas) {
        $scope.newVotes = datas;
    });

    // 全部
    $scope.getAllVoteList = function () {
        refreshData('allVote');
    };
    // 我发起的
    $scope.getOwnVoteList = function () {
        refreshData('myVote');
    };
    // 我参与的
    $scope.getParticipateVoteList = function () {
        refreshData('myParticipateVote');
    };

    //删除
    function removeVote(args) {
        $('.alert-confirm').modal('hide');
        var value = {"id": args.id};
        voteResource.base(delVoteRestful).delete({}, value, function (data) {
            console.log(data);
            if (data.status == 'success') {
                refreshData(args.type);
            }
        });
    }

    //删除
    $scope.delVote = function (id, type) {
        var str = "要删除该投票吗？";
        $rootScope.$broadcast("alertConfirm", {"str": str, "id": id, "type": type}, removeVote);
    };

    //停止
    function stopVoteFunc(args) {
        $('.alert-confirm').modal('hide');
        var value = {"id": args.vote.id};
        voteResource.base(stopVoteRestful).update({}, value, function (data) {
            if (data.status == 'success') {
                args.vote.basic.stopVote = true;
            } else {
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    }

    //停止投票
    $scope.stopVote = function (vote) {
        var str = "要停止该投票吗？";
        $rootScope.$broadcast("alertConfirm", {"str": str, "vote": vote}, stopVoteFunc);
    };

    //分页
    $scope.nextPage = function () {
        voteGrid.nextPage(function (data) {
            $scope.voteList = $scope.voteList.concat(data.datas.list);
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    // 列表数据
    function refreshData(type) {
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'type': type, 'groupId': $scope.id, 'pageNo': 1, 'pageSize': topicPageSize};
        voteGrid = new groupNewGrid(voteResource, voteListRestful, $scope.conditions);

        voteGrid.query([], function (data) {
            // console.log(data);
            $scope.showType = type;
            $scope.voteList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    }

}]);
