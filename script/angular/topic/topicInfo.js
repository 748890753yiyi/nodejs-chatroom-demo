/* 
 活动列表(按几天内、时间段查询)
 */

mainApp.controller('topicInfoCtr', ['$scope', '$rootScope', '$http', 'cookie', '$stateParams', 'extendsResource', function ($scope, $rootScope, $http, cookie, $stateParams, topicResource) {
    var topicId = $scope.topicId = $stateParams.topicId,
        topicRestful = prefixTopicUrl + "/topicInfo/:id",
        topicListRestful = prefixTopicUrl + "/list/:id",
        enjoyRestful = prefixTopicUrl + "/enjoy/:id",
        addCommentRestful = prefixTopicUrl + "/comment",
        topicCommentRestful = prefixTopicUrl + "/infoList/:id",
        delCommentRestful = prefixTopicUrl + "/delComment/:id",
        enjoyGrid;

    $scope.comments = [];

    // 初始化回复信息
    $scope.newComment = {};
    $scope.newComment.basic = {};
    $scope.newComment.basic.type = 'topicReply';
    $scope.newComment.basic.topicId = topicId;
    $scope.newComment.content = {};

    // 初始化活动信息
    topicResource.base(topicRestful).get({topicId: topicId}, function (msg) {
        msg.content.text = msg.content.text.replaceAll("\n", "<br>");
        $scope.topicInfo = msg;
    });
    // 初始化评论
    $scope.showType = 'comment';    // 默认评论类型(控制滚动条加载)
    $scope.pageNumber = 1;
    $scope.pageNo = 1;
    $scope.conditions = {'type': 'reply', 'topicId': topicId, 'pageNo': 1, 'pageSize': commentPageSize};
    var topicGrid = new groupNewGrid(topicResource, topicCommentRestful, $scope.conditions);

    topicGrid.query([], function (data) {
        $scope.comments = data.datas.list;
        $scope.pageNumber = data.pageNumber;
        $scope.pageNo = data.conditions.pageNo;
    });

    // 最新话题
    topicResource.extend(topicListRestful).query({'type': 'new', 'groupId': $scope.id, 'pageNo': 1, 'pageSize': topNum}, function (datas) {
        $scope.newTopics = datas.list;
    });

    //喜欢
    $scope.addEnjoy = function () {
        if (window.confirm("您要标为喜欢吗？ ")) {
            topicResource.base(enjoyRestful).update({id: topicId}, {}, function (data) {
                if (data.status == 'success') {
                    // alert("成功！");
                    topicResource.base(topicRestful).get({topicId: topicId}, function (msg) {
                        msg.content.text = msg.content.text.replaceAll("\n", "<br>");
                        $scope.topicInfo = msg;
                    });
                    $scope.getEnjoyList();
                } else {
                    $rootScope.$broadcast("alertMsg", '失败！');
                }
            });
        }
    };

    // 点击某人下的‘回复’按钮
    $scope.clickComment = function (comment) {
        $scope.newComment.basic.replyId = comment.basic.userId;
        $scope.newComment.basic.replyName = comment.basic.userName;
        //浏览器滚动条滚动到最末端 输入框获得焦点
        $('body').scrollTop( $('body')[0].scrollHeight);
        $('#replyTextarea')[0].focus();
    };

    // 评论
    $scope.submitComment = function (comment) {
        var tempComment = angular.copy(comment);
        tempComment.content.text = tempComment.content.text.replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\n", "<br>");
        delete tempComment.basic.replyName;
        topicResource.extend(addCommentRestful).save(tempComment, function (data) {
            if (data.status == 'success') {
                var conditions = {'type': 'reply', 'topicId': topicId, 'pageNo': 1, 'pageSize': 1};
                topicResource.extend(topicCommentRestful).query(conditions, function (data) {
                    $scope.comments.splice(0, 0, data.list[0]); 	//显示最新一条评论
                });
                $scope.newComment = {};
                $scope.newComment.basic = {};
                $scope.newComment.basic.type = 'topicReply';
                $scope.newComment.basic.topicId = topicId;
                $scope.newComment.content = {};

                //评论框显示、回复框隐藏
                $(".js-row-comment").show();
                $(".js-row-reply").hide();
            } else {
                $rootScope.$broadcast("alertMsg", '失败！');
            }
        });
    };

    //删除评论
    $scope.delComment = function (commentId) {
        if (window.confirm("您确定要删除吗？ ")) {
            topicResource.base(delCommentRestful).delete({}, {id: commentId}, function (data) {
                if (data.status == 'success') {
                    for (var i = 0; i < $scope.comments.length; i++) {
                        if ($scope.comments[i].id == commentId) {
                            $scope.comments.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    $rootScope.$broadcast("alertMsg", '失败！');
                }
            });
        }
    };

    // 评论列表
    $scope.getCommentList = function () {
        $scope.showType = 'comment';
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'type': 'reply', 'topicId': topicId, 'pageNo': 1, 'pageSize': commentPageSize};
        topicGrid = new groupNewGrid(topicResource, topicCommentRestful, $scope.conditions);

        topicGrid.query([], function (data) {
            $scope.comments = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    // 只看楼主
    $scope.getSearch = function () {
        $scope.onlyLandlord = true;
        $scope.showType = 'comment';
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'type': 'reply', 'topicId': topicId, 'pageNo': 1, 'pageSize': commentPageSize, 'userId': $scope.topicInfo.basic.userId};
        topicGrid = new groupNewGrid(topicResource, topicCommentRestful, $scope.conditions);

        topicGrid.query([], function (data) {
            $scope.comments = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    //取消只看楼言主
    $scope.cancelOnlyLandlord = function () {
        $scope.getCommentList();
        $scope.onlyLandlord = false;
    };
    // 评论分页
    $scope.nextPage = function () {
        topicGrid.nextPage(function (data) {
            $scope.comments = $scope.comments.concat(data.datas.list);
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    // 喜欢列表
    $scope.getEnjoyList = function () {
        $scope.showType = 'enjoy';
        $scope.enjoyPageNumber = 1;
        $scope.enjoyPageNo = 1;
        $scope.conditions = {'type': 'enjoy', 'topicId': topicId, 'pageNo': 1, 'pageSize': commentPageSize};
        enjoyGrid = new groupNewGrid(topicResource, topicCommentRestful, $scope.conditions);

        enjoyGrid.query([], function (data) {
            // console.log(data);
            $scope.topicEnjoy = data.datas.list;
            $scope.enjoyPageNumber = data.pageNumber;
            $scope.enjoyPageNo = data.conditions.pageNo;
        });
    };

    // 喜欢分页
    $scope.enjoyNextPage = function () {
        enjoyGrid.nextPage(function (data) {
            $scope.topicEnjoy = $scope.topicEnjoy.concat(data.datas.list);
            $scope.enjoyPageNo = data.conditions.pageNo;
        });
    };
}]);
