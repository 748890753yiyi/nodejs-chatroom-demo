/*'use strict';*/
/*
 组内发布公告
 */
mainApp.controller('addAnnouncementCtrl', ['cookie', '$scope', '$rootScope', function (cookie, $scope, $rootScope) {
    $scope.$parent.initAnnouncementInfo = function (id) {
        var userCookieId = cookie.get('userid');
        $scope.announcement = {};
        $scope.announcement.basic = {};
        $scope.announcement.basic.userId = userCookieId;
        $scope.announcement.basic.groupId = id;
        $scope.announcement.content = {};
    };
    $scope.$parent.initAnnouncementInfo($scope.id);

    //发布话题
    $scope.isDisabled = false;
    $scope.submit = function (announcement) {
        // 被禁言则不发送消息
        if ($scope.groupMsg.ownRole.isSpeak !== 'true') {
            $rootScope.$broadcast("alertMsg", "您被禁言,请联系管理员！");
            return;
        }
        $scope.isDisabled = true;
        if ($scope.announcementForm.$valid) {
            $scope.socket.emit('distributeAnnouncement', announcement);
        } else {
            $rootScope.$broadcast("alertMsg", "请按要求输入信息");
        }
    };

    // 发布成功
    $scope.socket.on('receiveMessage', function (message) {
        if (message.basic.type == 'announcement') {
            var userCookieId = cookie.get("userid");
            if (userCookieId == message.basic.userId) {
                $('.announcement-modal').modal('hide');
            }
            $scope.announcement.content = {};
            $scope.$broadcast("announcementAdd");
        }
        $scope.isDisabled = false;
    });
    // 发布失败
    $scope.socket.on('announcementfailed', function (message) {
        // alert(message.msg);
        $rootScope.$broadcast("alertMsg", message.msg);
        $scope.isDisabled = false;
    });
}]);
