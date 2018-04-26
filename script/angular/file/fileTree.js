/*'use strict';*/
/*
 文件管理的‘复制’文件功能树结构
 */

mainApp.controller('treeCtr', ['$scope', 'cookie', 'extendsResource', '$filter', function ($scope, cookie, fileResource, $filter) {
    var directoryListRestful = prefixFileUrl + "/directoryList/:id";

    $scope.setting1 = {
        data: {
            key: {
                title: "name"
            },
            simpleData: {
                enable: true,
                pIdKey: "parentId"
            }
        },
        callback: {
            onClick: function (event, treeId, treeNode, clickFlag) {
                // console.log(treeNode);
                $scope.copyToSelect = {};
                $scope.copyToSelect.id = treeNode.id;
                $scope.copyToSelect.name = treeNode.originalName;
                $scope.$apply();
            }
        }
    };
    // 单个复制时初始化树
    $scope.$parent.getTree = function (mainId, id, treeId) {
        //获取文件夹列表，初始化树
        var condition = {"mainId": mainId};
        fileResource.base(directoryListRestful).query(condition, function (datas) {
            var tempArray = [];
            datas.forEach(function (item) {
                // if(item.id!=id && item.parentId!=id){
                var tempObj = {};
                tempObj.id = item.id;
                tempObj.parentId = item.parentId;
                tempObj.originalName = item.name;
                tempObj.name = $filter('spliceNameByte')(item.name, 40);
//                tempObj.icon="css/img/diy/7.png";
                tempArray.push(tempObj);
                // }
            });
            $scope.zNodes1 = tempArray;
            $scope.refreshTree(treeId);
        });
    };
    // 批量复制时初始化树
    $scope.$parent.getTreeList = function (mainId, treeId) {
        //获取文件夹列表，初始化树
        var condition = {"mainId": mainId};
        fileResource.base(directoryListRestful).query(condition, function (datas) {
            var tempArray = [];
            datas.forEach(function (item) {
                var tempObj = {};
                tempObj.id = item.id;
                tempObj.parentId = item.parentId;
                tempObj.originalName = item.name;
                tempObj.name = $filter('spliceNameByte')(item.name, 40);
//                tempObj.icon="css/img/diy/7.png";
                tempArray.push(tempObj);
            });
            $scope.zNodes1 = tempArray;
            $scope.refreshTree(treeId);
        });
    };

    $scope.$parent.closeModal = function (treeId) {
        // $(".select-dept").modal("hide");
        $scope.destroyTree(treeId);
    };

}]);
