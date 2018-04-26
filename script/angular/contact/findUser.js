/*'use strict';*/
/*
 首页添加好友
 1、findUserCtr：查找用户
 2、addFriendCtr：请求添加好友
 */

//搜索用户
mainApp.controller('findUserCtr', ['$scope', '$rootScope', 'cookie', 'extendsResource', function ($scope, $rootScope, cookie, userResource) {
    var userRestful = prefixUserUrl + "/findUser/:contactValue";

    $scope.$parent.initSearch = function () {
        $scope.isShow = '0';
        $scope.findAccount = "";
    };

    $scope.changeSearch = function () {
        $scope.isShow = '0';
    };

    //通过帐号查找用户
    $scope.getUser = function (account) {
        $scope.isShow = '0';    //代表没有搜索
        $scope.isFriend = false;
        if (account) {
            userResource.extend(userRestful).query({contactValue: account}, function (data) {
                if (data.status == "success") {
                    var userCookieId = cookie.get("userid");
                    if (data.list.id == userCookieId) {
                        $scope.isShow = '3';
                        return;
                    }
                    getCookieUser(userCookieId, userResource, function (cookieUser) {
                        $scope.$parent.findUserResult = data.list;
                        $scope.sendText = "我是" + cookieUser.basic.userName;
                        $scope.isShow = '1';    //代表有搜索结果
                        if (data.msg) {
                            $scope.isFriend = true;     //代表已经是好友
                        }
                    });
                } else {
                    $scope.$parent.findUserResult = null;
                    $scope.isShow = '2';    //代表没有搜索结果
                }
            });
        } else {
            // alert("请输入帐号");
            $rootScope.$broadcast("alertMsg", "请输入帐号");
        }
    };
}]);
//添加请求
mainApp.controller('addFriendCtr', ['$scope', '$rootScope', 'extendsResource', function ($scope, $rootScope, informationResource) {
    var noticeRestful = prefixNoticeUrl + "/sendFriendMsg/:id";

    //通过帐号添加好友
    $scope.addUserToFriend = function (account, userId, type, noteName, sendText) {
        var value = {"contactValue": account, "userId": userId, "nickName": noteName, "text": sendText};
        informationResource.base(noticeRestful).save(value, function (msg) {
            // alert(msg.msg);
            $rootScope.$broadcast("alertMsg", msg.msg);
            if (msg.status == "success") {
                $scope.noteName = "";
                $scope.sendText = "";
                $scope.$emit("contactChange");
                $('.find-friend-modal').modal('hide');
            }
        });
    };

}]);