/* 
 我的群组的‘关注’配置
 */
mainApp.controller('userGroupListCtrl', ['$scope', '$rootScope', 'cookie', 'extendsResource', '$timeout', function ($scope, $rootScope, cookie, groupResource, $timeout) {
    var groupFocusListRestful = prefixGroupUrl + "/stickGroups/:id";    //我的关注群组列表
    var groupConfigRestful = prefixGroupUrl + "/sortStick/:id";       // 提交顺序配置
    var sort;
    // 获取我关注的群组列表
    $scope.$parent.getFocusGroups = function () {
        groupResource.extend(groupFocusListRestful).query({}, function (datas) {
            if (datas.list.length > 0) {
                $scope.ownFocusGroupList = datas.list;
                var length = $scope.ownFocusGroupList.length;
                $(".config-group").modal("show");
                var sortableObj = $(".group-sortable")[0];
                sort = new Sortable(sortableObj,
                    {
                        group: "id",
                        store: null, // @see Store
                        onEnd: function (/**Event*/evt) { // 拖拽结束，更新数组顺序
                            // 向上拖动
                            if (evt.oldIndex > evt.newIndex) {
                                var tempObj = $scope.ownFocusGroupList[evt.oldIndex];
                                for (var i = evt.oldIndex; i >= evt.newIndex; i--) {
                                    $scope.ownFocusGroupList[i] = $scope.ownFocusGroupList[i - 1];
                                }
                                $scope.ownFocusGroupList[evt.newIndex] = tempObj;
                            } else if (evt.oldIndex < evt.newIndex) {
                                // 向下拖动
                                var tempObj1 = $scope.ownFocusGroupList[evt.oldIndex];
                                for (var j = evt.oldIndex; j <= evt.newIndex; j++) {
                                    $scope.ownFocusGroupList[j] = $scope.ownFocusGroupList[j + 1];
                                }
                                $scope.ownFocusGroupList[evt.newIndex] = tempObj1;
                            }
                        }
                    }
                );
            } else {
                $rootScope.$broadcast("alertMsg", "暂无置顶群组可配置！");
            }
        });
    };

    // 提交配置
    $scope.submitConfig = function (groups) {
        groupResource.base(groupConfigRestful).update({}, {"groupDocs": groups}, function (msg) {
            if (msg.status == "success") {
                $rootScope.$broadcast("groupFocusUpdate", "config");
                $(".config-group").modal("hide");
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    };


    //置顶群组排序modal显示 控制alert提示信息的显示
    $scope.isShowAlert = true;
    $('.config-group').on('shown.bs.modal', function (e) {
        $scope.isShowAlert = true;
        $timeout(function () {
            $scope.isShowAlert = false;
        }, 3000);
        $scope.$apply();
    });

}]);