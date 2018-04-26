/*'use strict';*/
/*
 投票详情
 */

mainApp.controller('voteInfoCtr', ['$scope', '$rootScope', '$stateParams', 'extendsResource','$timeout', function ($scope, $rootScope, $stateParams, voteResource,$timeout) {
    var voteId = $stateParams.voteId,
        voteRestful = prefixVoteUrl + "/voteInfo/:id",
        toVoteRestful = prefixVoteUrl + "/vote/:id",
        newVoteListRestful = prefixVoteUrl + "/latestVoteList/:id";
    $scope.voteId = voteId;

    function pageInit () {
        // 初始化投票信息
        voteResource.base(voteRestful).get({id: voteId}, function (msg) {
            var votes = msg.content.votes;
            $scope.voteInfo = msg;
            $scope.votesCount = 0;
            //计算总的投票数
            for(var i=0;i<votes.length;i++){
                votes[i].percent = '0%';
                $scope.votesCount+=votes[i].voteUsers.length;
            }
            //计算每项投票的百分比
            $timeout(function(){
                if($scope.votesCount!==0){
                    for(var i=0;i<votes.length;i++){
                        votes[i].percent = (votes[i].voteUsers.length/$scope.votesCount*100)+"%";
                    }
                }
            },300);
        });

        // 最新投票
        voteResource.base(newVoteListRestful).query({'groupId': $scope.id, 'n': topNum}, function (datas) {
            $scope.newVotes = datas;
        });
    }

    // 初始化
    pageInit();

    // 投票
    /*
     单选：最终选择项用 $scope.voteInfo.checked 绑定 选中的选项的text
     多选：给数组 $scope.voteInfo.content.votes 每一选项绑定 checked 属性(true:选中，false:未选中)
     */
    $scope.toVote = function () {
        // console.log($scope.voteInfo);
        // 整理选择项
        var selects = [];
        // 单选（将选择项加入到selects数组中）
        if ($scope.voteInfo.content.state == 'singleChoice' && $scope.voteInfo.checked) {
            selects.push($scope.voteInfo.checked);
        } else if ($scope.voteInfo.content.state == 'multiChoice') {
            // 多选（循环选项数组，将已选择项加入到selects数组中）
            $scope.voteInfo.content.votes.forEach(function (item) {
                if (item.checked == "true") {
                    selects.push(item.text);
                }
            });
            // 多选限制个数
            if (selects.length > $scope.voteInfo.content.num) {
                // alert("最多选"+$scope.voteInfo.content.num+"项！");
                $rootScope.$broadcast("alertMsg", "最多选" + $scope.voteInfo.content.num + "项！");
                return;
            }
        }
        // 有选项
        if (selects.length > 0) {
            voteResource.base(toVoteRestful).update({id: voteId}, {select: selects}, function (data) {
                if (data.status == 'success') {
                    pageInit();
                } else {
                    $rootScope.$broadcast("alertMsg", data.msg);
                }
            });
        } else {
            $rootScope.$broadcast("alertMsg", "请选择！");
        }
    };


}]);
