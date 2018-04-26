/*'use strict';*/
/*
 进入组，文件管理
 */
mainApp.controller('fileCtr', ['$scope', '$rootScope', 'FileUploader', '$http', 'cookie', '$timeout', 'extendsResource', '$filter', function ($scope, $rootScope, FileUploader, $http, cookie, $timeout, fileResource, $filter) {
    $scope.directoryDownloadRestful = prefixFileUrl + "/directoryDownload";     //文件夹下载
    $scope.fileUploadRestful = prefixFileUrl + "/uploadFile";   // 上传
    var fileRestful = prefixFileUrl + "/list/:id",
        fileQueryRestful = prefixFileUrl + "/queryFilesList/:id",
        addDirectoryRestful = prefixFileUrl + "/addDirectory/:id",
        fileDeleteRestful = prefixFileUrl + "/deleteFile/:id",
        renameRestful = prefixFileUrl + "/rename",
        fileMoveToRestful = prefixFileUrl + "/fileMoveTo",
        fileCopyRestful = prefixFileUrl + "/fileCopy",
        batchDownloadRestful = prefixFileUrl + "/batchDownload",    //批量下载
        directoryListRestful = prefixFileUrl + "/directoryList/:id",    // 文件夹树
        mainId = $scope.id,
        specificUrls = [],
        specificUrl = {"fileName": "根目录", "fileId": "-1"},
        fileGrid,
        uploader;
    $scope.user = cookie.get('user');
    $scope.mainId = mainId;
    $scope.parentId = "-1";
    $scope.fileLists = [];
    $scope.parentName = "根目录";
    $scope.selectFiles = [];
    $scope.handleMsg = "处理中";

    //文件夹
    $scope.file = [];
    specificUrls.push(specificUrl);
    $scope.specificUrls = specificUrls;

    /* 初始化数据 */
    $scope.fileSorts = fileOrders;
    $scope.orderType = "";  //排序类型
    $scope.orderName = fileOrders[""];  //排序中文显示
    $scope.pageNumber = 1;
    $scope.pageNo = 1;
    $scope.conditions = {"mainId": mainId, "parentId": '-1', 'sort': $scope.orderType, 'pageNo': 1, 'pageSize': filePageSize};
    fileGrid = new multiGetGrid(fileResource, fileRestful, $scope.conditions, $scope, 'selectFiles');

    fileGrid.query([], function (data) {
        // console.log(data);
        $scope.fileLists = data.datas.list;
        $scope.pageNumber = data.pageNumber;
        $scope.pageNo = data.conditions.pageNo;
        $scope.parentId = '-1';
    });

    //获取文件列表
    function fileList(mainId, fileId) {
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {"mainId": mainId, "parentId": fileId, 'sort': $scope.orderType, 'pageNo': 1, 'pageSize': filePageSize};
        fileGrid = new multiGetGrid(fileResource, fileRestful, $scope.conditions, $scope, 'selectFiles');

        fileGrid.query([], function (data) {
            // console.log(data);
            $scope.isSelectedAll = false;
            $scope.fileLists = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
            $scope.parentId = fileId;
            $scope.searchFileName = '';
            // 更新上传路径
            $scope.uploader.url = $scope.fileUploadRestful + "?mainId=" + mainId + "&parentId=" + fileId;
            uploader.url = $scope.fileUploadRestful + "?mainId=" + mainId + "&parentId=" + fileId;
            $timeout(function () {
                $scope.isChange = false;
            }, 100);
        });
    }

    //文件搜索
    $scope.searchFileName = '';
    $scope.searchFile = function (searchFileName, fileId) {
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {"mainId": mainId, "parentId": fileId, 'name': searchFileName, 'pageNo': 1, 'pageSize': filePageSize};
        fileGrid = new multiGetGrid(fileResource, fileQueryRestful, $scope.conditions, $scope, 'selectFiles');

        fileGrid.query([], function (data) {
            // console.log(data);
            $scope.isSelectedAll = false;
            $scope.fileLists = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    // 切换排序方式
    $scope.changeSort = function (type) {
        $scope.orderType = type;    //排序类型
        $scope.orderName = fileOrders[type];    //排序中文显示
        fileList(mainId, $scope.parentId);
    };

    $scope.$watch('searchFileName', function (newObj, oldObj) {
        if (newObj === '' && newObj != oldObj && !$scope.isChange) {
            fileList(mainId, $scope.parentId);
        }
    });

    //分页
    $scope.nextPage = function () {
        fileGrid.nextPage(function (data) {
            $scope.isSelectedAll = false;
            $scope.fileLists = $scope.fileLists.concat(data.datas.list);
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    //上传组件
    uploader = $scope.uploader = new FileUploader({
        autoUpload: true,
        url: $scope.fileUploadRestful + "?mainId=" + mainId + "&parentId=" + $scope.parentId
    });
    uploader.onAfterAddingFile = function (fileItem) {
        // console.info('onAfterAddingFile', fileItem);
        $(".files-upload-info-panel").removeClass("suspension-bottom");	//移除底部class
        fileItem.file.parentName = $scope.parentName;
    };
    uploader.onProgressItem = function (fileItem, progress) {
        // console.info('onProgressItem', fileItem, progress);
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        // console.info('onCompleteItem', fileItem, response, status, headers);
    };
    uploader.onCompleteAll = function () {
//        console.info('onCompleteAll');
        if ($scope.pageNumber == 1) {
            fileList(mainId, $scope.parentId, $scope.showType);
        }
        $scope.handleMsg = "";
    };
    $scope.closeUpload = function () {
        uploader.clearQueue();
    };

    // 更新已进入的目录列表
    $scope.changeUrl = function (fileId) {
        $scope.isChange = true;
        fileList(mainId, fileId);
        $scope.selectFiles = [];
        uploader.clearQueue();
        for (var i = 0; i < specificUrls.length; i++) {
            if (fileId == specificUrls[i].fileId) {
                specificUrls.splice(i + 1, specificUrls.length - i);
                $scope.parentName = specificUrls[i].fileName;
                break;
            }
        }
    };

    // 点击进入文件夹
    $scope.childrenFile = function (file) {
        if (file.type == "D") {
            $scope.isChange = true;
            var specificUrl = {"fileName": file.name, "fileId": file.id};
            $scope.parentName = file.name;
            specificUrls.push(specificUrl);
            fileList(mainId, file.id);
            $scope.selectFiles = [];
            uploader.clearQueue();
        }
    };


    // 添加文件夹
    $scope.initDirect = function () {
        $scope.newDirect = {};
        $scope.newDirect.mainId = mainId;
        $scope.newDirect.parentId = $scope.parentId;
    };
    $scope.addDirectory = function () {
        fileResource.base(addDirectoryRestful).save($scope.newDirect, function (msg) {
            $rootScope.$broadcast("alertMsg", msg.msg);
            if (msg.status == 'success') {
                $('.createfile').modal('hide');
                if ($scope.pageNumber == 1) {
                    fileList(mainId, $scope.parentId);
                }
            }
        });
    };

    //重命名
    $scope.checkRename = function () {
        if ($scope.selectFiles.length === 0) {
            $rootScope.$broadcast("alertMsg", "您未选择任何文件");
        } else if ($scope.selectFiles.length > 1) {
            $rootScope.$broadcast("alertMsg", "请选择一个文件");
        } else {
            $scope.getFileName($scope.selectFiles[0]);
            $('.modiyfiles').modal('show');
        }
    };
    //单个
    $scope.getFileName = function (file) {
        $scope.editFile = angular.copy(file);
        // 去除后缀名
        $scope.editFile.name = $scope.editFile.name.replace("." + $scope.editFile.format, "");
    };
    $scope.renameFile = function (file) {
        // 加上后缀名
        var tempFile = angular.copy(file);
        if (tempFile.type == "F") {
            tempFile.name = tempFile.name + "." + tempFile.format;
        }
        fileResource.base(renameRestful).update({}, tempFile, function (msg) {
            $rootScope.$broadcast("alertMsg", msg.msg);
            if (msg.status == 'success') {
                $('.modiyfiles').modal('hide');
                $scope.fileLists.forEach(function (item) {
                    if (item.id == file.id) {
                        item.name = file.name;
                    }
                });
            }
        });
    };

    // 全选
    $scope.selectAll = function ($event, fileLists) {
        var checkState = $event.target.checked;
        fileGrid.selectAll(fileLists, checkState, function (node, checked, resources, changeNodes) {
            $scope.isSelectedAll = checked;
        });
    };
    // 选择
    $scope.updateSelection = function ($event, fileList) {
        fileGrid.checkNode(fileList, function (node, checked) {
            if (checked) {
                $scope.isSelectedAll = fileGrid.isSelectAll($scope.fileLists);
            } else {
                $scope.isSelectedAll = false;
            }
        });
    };

    //	删除文件
    $scope.fileDelete = function (id) {
        fileResource.base(fileDeleteRestful).delete({'mainId': mainId}, {'id': id}, function (msg) {
            // alert(msg.msg);
            $rootScope.$broadcast("alertMsg", msg.msg);
            if (msg.status == 'success') {
                for (var i = 0; i < $scope.fileLists.length; i++) {
                    if ($scope.fileLists[i].id == id) {
                        $scope.fileLists.splice(i, 1);
                        break;
                    }
                }
            }
        });
    };

    // 批量删除
    $scope.deleteFileList = function () {
        if ($scope.selectFiles.length === 0) {
            // alert("您未选择任何文件");
            $rootScope.$broadcast("alertMsg", "您未选择任何文件");
        } else {
            var userCookieId = cookie.get("userid");
            var selectNum = 0;	// 记录合法数据
            var deleteNum = 0;	// 记录删除个数
            var errorMsg = "";
            for (var i = 0; i < $scope.selectFiles.length; i++) {
                if ($scope.selectFiles[i].id != mainId && ($scope.groupMsg.ownRole.id != '3' || $scope.selectFiles[i].userId == userCookieId)) {
                    selectNum = selectNum + 1;
                } else if ($scope.groupMsg.ownRole.id == '3' || $scope.selectFiles[i].userId != userCookieId) {
                    $rootScope.$broadcast("alertMsg", "权限不足！");
                    break;
                } else {
                    $rootScope.$broadcast("alertMsg", "主文件夹不允许删除");
                    break;
                }
            }
            if (selectNum == $scope.selectFiles.length) {
                for (var j = 0; j < selectNum; j++) {
                    fileResource.base(fileDeleteRestful).delete({'mainId': mainId}, {'id': $scope.selectFiles[j].id}, function (msg) {
                        if (msg.status == 'success') {
                            deleteNum = deleteNum + 1;
                            if (deleteNum == selectNum) {
                                $scope.selectFiles = [];
                                fileList(mainId, $scope.parentId);
                            }
                        }
                    });
                }
            }
        }
    };

    // 批量下载
    $scope.downloadFileList = function () {
        if ($scope.selectFiles.length === 0) {
            $rootScope.$broadcast("alertMsg", "您未选择任何文件！");
        } else {
            var selectedIds = fileGrid.getSeletedId();
            var httpresp = 'ids=';
            var idshttp = 'ids=';
            for (var i = 0; i < selectedIds.length; i++) {
                $scope.fileLists.forEach(function (item) {
                    if (item.id == selectedIds[i]) {
                        if (!item.downloadCount) {
                            item.downloadCount = 0;
                        }
                        item.downloadCount = item.downloadCount + 1;
                    }
                });
                if (i < selectedIds.length - 1) {
                    httpresp = httpresp + selectedIds[i] + '&' + idshttp;
                } else {
                    httpresp = httpresp + selectedIds[i];
                }
            }
            window.open(batchDownloadRestful + '?' + httpresp);
            // 取消选择
            fileGrid.selectAll($scope.fileLists, false, function (node, checked, resources, changeNodes) {
                $scope.isSelectedAll = checked;
            });
        }
    };


    //移动到
    $scope.moveFileList = false;	//标记不是批量移动
    $scope.moveId = function (file) {
        var id = file.id;
        $scope.moveFileId = file;
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
//                tempObj.icon = "css/img/diy/7.png";
                // tempObj.iconSkin="folder";
                tempArray.push(tempObj);
                // }
            });
            // console.log(tempArray);
            $scope.zNodes = tempArray;
            $scope.refreshTree('tree');
        });
    };
    $scope.moveTo = function (file, toFile) {
        if (toFile.id == file.id || toFile.id == file.parentId) {
            $rootScope.$broadcast("alertMsg", "不能移动到自身或原来文件夹！");
        } else {
            var value = {"mainId": mainId, "id": file.id, "toId": toFile.id};
            // console.log(value);
            fileResource.base(fileMoveToRestful).save(value, function (msg) {
                // alert(msg.msg);
                $rootScope.$broadcast("alertMsg", msg.msg);
                if (msg.status == 'success') {
                    $('.move').modal('hide');
                    fileList(mainId, $scope.parentId);
                }
            });
        }
    };
    //批量移动
    $scope.moveList = function () {
        if ($scope.selectFiles.length === 0) {
            // alert("您未选择任何文件");
            $rootScope.$broadcast("alertMsg", "您未选择任何文件！");
        } else {
            $scope.moveFileList = true;
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
//                    tempObj.icon = "css/img/diy/7.png";
                    tempArray.push(tempObj);
                });
                $scope.zNodes = tempArray;
                $scope.refreshTree('tree');
            });
            $('.move').modal('show');
        }
    };
    $scope.moveListTo = function (toFile) {
        if ($scope.selectFiles.length === 0) {
            $rootScope.$broadcast("alertMsg", "您未选择任何文件！");
        } else {
            var selectNum = 0;
            var moveNum = 0;
            var errorMsg = "";
            var userCookieId = cookie.get("userid");
            for (var i = 0; i < $scope.selectFiles.length; i++) {
                if ($scope.selectFiles[i].id != mainId && ($scope.groupMsg.ownRole.id != '3' || $scope.selectFiles[i].userId == userCookieId)) {
                    selectNum = selectNum + 1;
                } else if ($scope.groupMsg.ownRole.id != '3' || $scope.selectFiles[i].userId == userCookieId) {
                    $rootScope.$broadcast("alertMsg", "权限不足！");
                    break;
                }
                if (toFile.id == $scope.selectFiles[i].id || toFile.id == $scope.selectFiles[i].parentId) {
                    $rootScope.$broadcast("alertMsg", "不能移动到自身或原来文件夹！");
                    return;
                }
            }

            if (selectNum == $scope.selectFiles.length) {
                var array = angular.copy($scope.selectFiles);
                array.forEach(function (item) {
                    var value = {"mainId": mainId, "id": item.id, "toId": toFile.id};
                    routeHttp($http, fileMoveToRestful, value, function (msg) {
                        moveNum = moveNum + 1;
                        if (msg.status == 'success') {
                            if (moveNum == selectNum) {
                                $rootScope.$broadcast("alertMsg", "移动完成！");
                            }
                        } else {
                            $rootScope.$broadcast("alertMsg", msg.msg);
                        }
                        if (moveNum == selectNum) {
                            $('.move').modal('hide');
                            $scope.moveFileList = false;
                            $scope.selectFiles = [];
                            fileList(mainId, $scope.parentId);
                        }
                    });
                });
            }
        }
    };


    //复制到(树结构在自控制器treeCtrl)
    $scope.copyFile = function (file) {
        $scope.getTree(mainId, file.id, 'tree1');	//初始化树
        $scope.copyFileIs = angular.copy(file);
    };
    $scope.copyTo = function (file, toFile) {
        if (toFile.id == file.id || toFile.id == file.parentId) {
            $rootScope.$broadcast("alertMsg", "不能复制到自身或原来文件夹！");
        } else {
            var value = {"file": file, "toId": toFile.id};
            // var str = JSON.stringify(value);
            fileResource.base(fileCopyRestful).save(value, function (msg) {
                $rootScope.$broadcast("alertMsg", msg.msg);
                if (msg.status == 'success') {
                    $('.copy').modal('hide');
                    // fileList(mainId,$scope.parentId);
                }
            });
        }
    };
    //批量复制
    $scope.copyList = function () {
        if ($scope.selectFiles.length === 0) {
            $rootScope.$broadcast("alertMsg", "您未选择任何文件！");
        } else {
            $scope.copyFileList = true;
            $scope.getTreeList(mainId, 'tree1');	//初始化树
            $('.copy').modal('show');
        }
    };
    $scope.copyListTo = function (toFile) {
        if ($scope.selectFiles.length === 0) {
            $rootScope.$broadcast("alertMsg", "您未选择任何文件！");
        } else {
            var selectNum = 0;
            var moveNum = 0;
            var errorMsg = "";
            for (var i = 0; i < $scope.selectFiles.length; i++) {
                if ($scope.selectFiles[i].id != mainId && ($scope.groupMsg.ownRole.id != '3' || $scope.selectFiles[i].userId == userCookieId)) {
                    selectNum = selectNum + 1;
                } else if ($scope.groupMsg.ownRole.id != '3' || $scope.selectFiles[i].userId == userCookieId) {
                    $rootScope.$broadcast("alertMsg", "权限不足！");
                    break;
                }
                if (toFile.id == $scope.selectFiles[i].id || toFile.id == $scope.selectFiles[i].parentId) {
                    $rootScope.$broadcast("alertMsg", "不能复制到自身或原来文件夹！");
                    return;
                }
            }
            if (selectNum === $scope.selectFiles.length) {
                for (var j = 0; j < selectNum; j++) {
                    var value = {"file": $scope.selectFiles[j], "toId": toFile.id};
                    routeHttp($http, fileCopyRestful, value, function (msg) {
                        moveNum = moveNum + 1;
                        if (msg.status == 'success') {
                            if (moveNum == selectNum) {
                                $rootScope.$broadcast("alertMsg", "移动完成！");
                            }
                        } else {
                            $rootScope.$broadcast("alertMsg", msg.msg);
                        }
                        if (moveNum == selectNum) {
                            $('.move').modal('hide');
                            $scope.moveFileList = false;
                            $scope.selectFiles = [];
                            fileList(mainId, $scope.parentId, $scope.showType);
                        }
                    });
                }
            }
        }
    };

    // 复制
    $scope.setting = {
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
                $scope.moveToSelect = {};
                $scope.moveToSelect.id = treeNode.id;
                $scope.moveToSelect.name = treeNode.originalName;
                $scope.$apply();
            }
        }
    };
    // 单个文件下载增加其下载次数
    $scope.downloadCount = function (id) {
        $scope.fileLists.forEach(function (item) {
            if (item.id == id) {
                if (!item.downloadCount) {
                    item.downloadCount = 0;
                }
                item.downloadCount = item.downloadCount + 1;
            }
        });
    };
}]);
