/* 
 发表话题
 */

mainApp.controller('addTopicCtrl', ['cookie', '$scope', '$rootScope', 'extendsResource', function (cookie, $scope, $rootScope, topicResource) {

    /*  点击“发布话题”按钮初始化组信息
     groupId:组id
     */
    // 初始化话题
    $scope.$parent.initTopicInfo = function () {
        $scope.topic = {};
        $scope.topic.basic = {};
        $scope.topic.basic.groupId = $scope.id;
        $scope.topic.content = {};
    };

    //发布话题
    $scope.isDisabled = false;
    $scope.submit = function (topic, files) {
        // 被禁言则不发送消息
        if ($scope.groupMsg.ownRole.isSpeak !== 'true') {
            $rootScope.$broadcast("alertMsg", "您被禁言,请联系管理员！");
            return;
        }
        $scope.isDisabled = true;
        topic.content.file = files;
        // console.log(topic);
        $scope.socket.emit('distributeTopic', topic);
    };

    // 发布成功
    $scope.socket.on('receiveMessage', function (message) {
        if (message.basic.type == 'topic') {
            var userCookieId = cookie.get("userid");
            if (userCookieId == message.basic.userId) {
                $('.newtopic').modal('hide');
            }
            $scope.$emit("topicAdd");
            $scope.$broadcast("addFinished");
        }
        $scope.isDisabled = false;
    });
    // 发布失败
    $scope.socket.on('topicfailed', function (message) {
        // alert(message.msg);
        $rootScope.$broadcast("alertMsg", message.msg);
        $scope.isDisabled = false;
    });


}]);

