/* 
 新建群组
 */

mainApp.controller('addGroupCtrl', ['cookie', '$scope', '$rootScope', '$state', 'extendsResource', function (cookie, $scope, $rootScope, $state, groupResource) {
    var groupRestful = prefixGroupUrl + "/:id";

    /*  点击“创建群组”按钮初始化组信息
     name:组名称
     head:组头像
     permission:加入权限(直接D,邀请I)
     isAudit:是否审核
     */
    // 首页的创建群组
    $scope.$parent.initGroupInfo = function () {
        $scope.group = {};
        $scope.group.basic = {};
        // $scope.group.basic.name='aaa';
        $scope.group.basic.head = '/images/u9.png';
        $scope.group.extend = {};
        $scope.group.extend.permission = 'D';
        $scope.group.extend.isAudit = 'N';
    };


    //创建
    $scope.submit = function (newGroup) {
        // console.log(newGroup);
        groupResource.base(groupRestful).save(newGroup, function (msg) {
            // console.log(msg);
            if (msg.status == "success") {
                $('.create-group').modal('hide');
                // 通知左侧栏刷新列表
                $rootScope.$broadcast("groupRefresh", msg.groupId);
                setTimeout(function() {
                    $state.go("group", {'id': msg.groupId, "atId": ""});
                }, 700);
				/*var str = "是否进入 " + newGroup.basic.name + " 组?";
                $rootScope.$broadcast("alertConfirm", {"str": str, "groupId": msg.groupId}, addGroupFunc);*/
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };

    function addGroupFunc(args) {
        $state.go("group", {'id': args.groupId, "atId": ""});
        $('.alert-confirm').modal('hide');
    }

}]);