/*'use strict';*/
/*
 活动列表(按几天内、时间段查询)
 */

mainApp.controller('activityInfoCtr', ['$scope', '$rootScope', '$http', 'cookie','$state', '$stateParams', 'extendsResource', function ($scope, $rootScope, $http, cookie, $state, $stateParams, activityResource) {
    var activityId = $stateParams.activityId,
        activityListRestful = prefixActivityUrl + "/initList/:id",
        activityRestful = prefixActivityUrl + "/activityInfo/:id",
        addMemberRestful = prefixActivityUrl + "/registration/:id",
        addCommentRestful = prefixActivityUrl + "/comment",
        activityCommentRestful = prefixActivityUrl + "/commentList/:id",
        delCommentRestful = prefixActivityUrl + "/delComment/:id",
        delActivityRestful = prefixActivityUrl + "/delActivity/:id",
        activityGrid;
    $scope.activityId = activityId;

    // 初始化回复信息
    $scope.newComment = {};
    $scope.newComment.basic = {};
    $scope.newComment.basic.type = 'activityReply';
    $scope.newComment.basic.activityId = activityId;
    $scope.newComment.content = {};

    // 初始化活动信息
    activityResource.base(activityRestful).get({id: activityId}, function (msg) {
        var userCookieId = cookie.get("userid");
        // 判断我是否已报名
        $scope.isMember = false;
        $scope.isEnd = false;
        msg.member.forEach(function (item) {
            if (item.id == userCookieId) {
                $scope.isMember = true;
            }
        });
        if (new Date(msg.content.endTime) < new Date()) {
            $scope.isEnd = true;
        }
        $scope.activityInfo = msg;
    });
    // 初始化评论
    $scope.pageNumber = 1;
    $scope.pageNo = 1;
    $scope.conditions = {'activityId': activityId, 'pageNo': 1, 'pageSize': commentPageSize};
    activityGrid = new groupNewGrid(activityResource, activityCommentRestful, $scope.conditions);

    activityGrid.query([], function (data) {
        // console.log(data);
        $scope.comments = data.datas.list;
        $scope.pageNumber = data.pageNumber;
        $scope.pageNo = data.conditions.pageNo;
    });
    // 评论分页
    $scope.nextPage = function () {
        activityGrid.nextPage(function (data) {
            $scope.comments = $scope.comments.concat(data.datas.list);
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    // 推荐活动
    activityResource.base(activityListRestful).query({'type': 'hot', 'groupId': $scope.id, 'number': activityPageSize}, function (datas) {
        $scope.activities = datas;
    });
    //活动报名
    $scope.addMember = function () {
        if (window.confirm("您要报名吗？ ")) {
            activityResource.base(addMemberRestful).update({id: activityId}, {}, function (data) {
                if (data.status == 'success') {
                    // alert("报名成功！");
                    $rootScope.$broadcast("alertMsg", "报名成功！");
                    activityResource.base(activityRestful).get({id: activityId}, function (msg) {
                        var userCookieId = cookie.get("userid");
                        $scope.isMember = false;
                        msg.member.forEach(function (item) {
                            if (item.id == userCookieId) {
                                $scope.isMember = true;
                            }
                        });
                        $scope.activityInfo = msg;
                    });
                } else {
                    $rootScope.$broadcast("alertMsg", "报名失败！");
                }
            });
        }
    };

    //删除
    $scope.delActivity = function(id){
        var str = "要删除该活动吗？ ";
        $rootScope.$broadcast("alertConfirm", {"str": str, "id": id}, removeActivity);
    };

    //删除
    function removeActivity(args) {
        $('.alert-confirm').modal('hide');
        var value = {"id": args.id};
        activityResource.base(delActivityRestful).delete({},value,function(data){
            if (data.status == 'success') {
                $state.go('group.activity');
            }
        });
    }

    // 点击某人下的‘回复’按钮
    $scope.clickComment = function (comment) {
        $scope.newComment.basic.replyId = comment.basic.userId;
        $scope.newComment.basic.replyName = comment.basic.userName;
    };
    // 评论
    $scope.submitComment = function (comment) {
        var tempComment = angular.copy(comment);
        tempComment.content.text = tempComment.content.text.replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\n", "<br>");
        delete tempComment.basic.replyName;
        activityResource.extend(addCommentRestful).save(tempComment, function (data) {
            if (data.status == 'success') {
                var conditions = {'activityId': activityId, 'pageNo': 1, 'pageSize': 1};
                activityResource.extend(activityCommentRestful).query(conditions, function (data) {
                    $scope.comments.splice(0, 0, data.list[0]);     //显示最新一条评论
                });
                $scope.newComment = {};
                $scope.newComment.basic = {};
                $scope.newComment.basic.type = 'activityReply';
                $scope.newComment.basic.activityId = activityId;
                $scope.newComment.content = {};

                //回复框隐藏，评论框显示
                $(".js-row-comment").show();
                $(".js-row-reply").hide();
            } else {
                // alert("失败！");
                $rootScope.$broadcast("alertMsg", "失败！");
            }
        });
    };
    //删除评论
    $scope.delComment = function (commentId) {
        if (window.confirm("您确定要删除吗？ ")) {
            activityResource.base(delCommentRestful).delete({}, {"id": commentId}, function (data) {
                if (data.status == 'success') {
                    for (var i = 0; i < $scope.comments.length; i++) {
                        if ($scope.comments[i].id == commentId) {
                            $scope.comments.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    $rootScope.$broadcast("alertMsg", "失败！");
                }
            });
        }
    };


}]);
