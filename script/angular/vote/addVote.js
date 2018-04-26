/* 
 发表话题
 */

mainApp.controller('addVoteCtrl', ['cookie', '$scope', '$rootScope', 'extendsResource', function (cookie, $scope, $rootScope, voteResource) {
    /*  点击“发布投票”按钮初始化组信息
     groupId:组id
     state:默认‘单选’
     num:多选的情况下可选个数

     selects:选项数组
     */
    // 初始化投票
    $scope.$parent.initVoteInfo = function (id) {
        $scope.isDisabled = false;
        var userCookieId = cookie.get("userid");
        $scope.vote = {};
        $scope.vote.basic = {};
        $scope.vote.basic.userId = userCookieId;
        $scope.vote.basic.groupId = id;
        $scope.vote.content = {};
        $scope.vote.content.state = "singleChoice";
        $scope.vote.content.num = 2;

        $scope.selects = [{"text": ''}, {"text": ''}];	//初始化选择项
        $scope.options1 = {values: [2]};    //多选的选择个数
    };

    //添加输入框
    $scope.addSelect = function (type) {
        if ($scope.selects.length > selectNum) {
            // alert("太多啦！最多有 "+selectNum+" 个选项哦 (*^__^*) ");
            $rootScope.$broadcast("alertMsg", "太多啦！最多有 " + selectNum + " 个选项哦 (*^__^*) ");
        } else {
            $scope.selects.push({"text": ''});
        }
    };
    //文字投票
    $scope.getCharacterSelect = function (select) {
        var tempSelect = angular.copy($scope.selects);
        tempSelect = tempSelect.unique("text");
        $scope.options1.values = [2];
        // 数组去除空
        for (var i = tempSelect.length - 1; i >= 0; i--) {
            if(!tempSelect[i].text){
                tempSelect.splice(i, 1);
            }
        }
        // 赋值多选可选个数数组
        var length = tempSelect.length;
        for(var j=3; j<length+1; j++){
            $scope.options1.values.push(j);
        }
    };

    //发布话题
    $scope.isDisabled = false;
    $scope.submit = function (vote, selects) {
        // 被禁言则不发送消息
        if($scope.groupMsg.ownRole.isSpeak!=='true'){
            $rootScope.$broadcast("alertMsg","您被禁言,请联系管理员！");
            return;
        }
        $scope.isDisabled = true;
        vote.content.endTime = new Date(new Date(vote.content.endTime.setHours(23)).setMinutes(59));
        if (vote.content.state == "singleChoice") {
            delete vote.content.num;
        }
        vote.select = angular.copy(selects);    //不直接赋值，避免去重或去空时页面修改
        // 数组去除空
        for (var i = vote.select.length - 1; i >= 0; i--) {
            if(!vote.select[i].text){
                vote.select.splice(i, 1);
            }
        }
        //数组查重
        var trimData = vote.select.checkRepeat("text");
        // 如果有重复则提醒
        if(trimData){
            $rootScope.$broadcast('alertMsg', "投票选项有重复");
            return;
        }
        if (vote.select.length >= 2) {
            $scope.socket.emit('distributeVote',vote);
        } else {
            $rootScope.$broadcast('alertMsg', "投票选项必大于两项");
        }
    };
    // 监听选项的改变，启用发布按钮（防止发布按钮禁用时在修改选项后不能再次发布）
    $scope.$watch('selects',function(newObj,oldObj){
        $scope.isDisabled = false;
    },true);
    // 组内发布
    if ($scope.socket) {
        // 发布成功
        $scope.socket.on('receiveMessage', function (message) {
            if (message.basic.type == 'vote') {
                var userCookieId = cookie.get("userid");
                if (userCookieId == message.basic.userId) {
                    $('.newVote').modal('hide');
                }
                $scope.$emit("voteAdd");
            }
            $scope.isDisabled = false;
        });
        // 发布失败
        $scope.socket.on('receiveMessagefailed', function (message) {
            // alert(message.msg);
            $rootScope.$broadcast("alertMsg", message.msg);
            $scope.isDisabled = false;
        });
    }
    //公司@我的页面的聊天发布
    $scope.$on('initSocket', function (event) {
        // 发布成功
        $scope.socket.on('receiveMessage', function (message) {
            if (message.basic.type == 'vote') {
                $('.newVote').modal('hide');
                $scope.$emit("voteAdd");
            }
            $scope.isDisabled = false;
        });
        // 发布失败
        $scope.socket.on('receiveMessagefailed', function (message) {
            // alert(message.msg);
            $rootScope.$broadcast("alertMsg", message.msg);
            $scope.isDisabled = false;
        });
    });
}]);

