/* 'use strict'; */
/*
 此js写了控件的控制器：（日历，上传）
 */
var controlsApp = angular.module('controlsApp', ['angularFileUpload', 'ngResource']);

/*
 日历控件控制器
 */
controlsApp.controller('DatepickerDemoCtrl', ['$scope', function ($scope) {
    $scope.today = function () {
        $scope.dt = new Date();
    };
    // Disable weekend selection
    $scope.disabled = function (date, mode) {
//        return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
    };
    $scope.toggleMin = function () {
        $scope.minDate = $scope.minDate ? $scope.minDate : new Date();
    };
    $scope.open = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.opened = true;
    };
    $scope.dateOptions = {
        formatYear: 'yyyy',
        startingDay: 0
    };
    $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'yyyy-MM-dd', 'dd.MM.yyyy', 'shortDate'];
    $scope.format = $scope.formats[2];
    //$scope.today();
    $scope.toggleMin();
    $scope.maxDate = '';
    $scope.nowDate = new Date();
}]);

/*
 上传控件控制器
 */
controlsApp.controller('fileUploadCtrl', ['$scope', '$rootScope', '$http', '$stateParams', '$timeout', 'FileUploader', 'cookie', function ($scope, $rootScope, $http, $stateParams, $timeout, FileUploader, cookie) {
    var userCookie = cookie.get('user');
    var id = '';
    if (!$stateParams.id) {
        id = userCookie.id;
    } else {
        id = $stateParams.id;
    }

    // 选择的云端资料追加
    $scope.$on("pushCloudSelect", function (event, data) {
        $scope.uploadFiles = $scope.uploadFiles.concat(data);
        var tempArray = angular.copy(data);
        tempArray.forEach(function (item) {
            item.isSelect = true;
        });
        $scope.uploadTmpFiles = $scope.uploadTmpFiles.concat(tempArray);
    });

    $scope.$on("addFinished", function (event) {
        $scope.uploadTmpFiles = [];
        $scope.uploadFiles = [];
        $scope.$parent.chatFiles = [];
    });
    $scope.$parent.chatFiles = [];
    $scope.uploadTmpFiles = [];
    $scope.uploadFiles = [];
    var len = 0;
    //上传组件
    var uploader = $scope.uploader = new FileUploader({
        autoUpload: true,
        url: "file-upload?groupId=" + id
    });
    // FILTERS
    uploader.filters.push({
        name: 'customFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            return this.queue.length < 9;
        }
    });
    uploader.filters.push({
        name: 'typeFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.name.slice(item.name.lastIndexOf('.') + 1) + '|';
            if ('|flv|mp4|wmv|avi|3gp|rmvb|mkv|'.indexOf(type) !== -1) {
                $rootScope.$broadcast("alertMsg", "不能上传视频文件！");
            }
            return '|flv|mp4|wmv|avi|3gp|rmvb|mkv|'.indexOf(type) == -1;
        }
    });
    uploader.filters.push({
        name: 'sizeFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            if (item.size > 25 * 1024 * 1024) {
                $rootScope.$broadcast("alertMsg", "请上传小于25M的文件！");
            }
            return item.size <= 25 * 1024 * 1024;
        }
    });
    uploader.onAfterAddingFile = function (fileItem) {
        console.info('onAfterAddingFile', fileItem);
        var file = {};
        file.isAction = false;
        file.thumbnail_url = '/images/51.gif';
        file.imageUrl = '/images/51.gif';
        $scope.uploadTmpFiles.push(file);
        len = $scope.uploadTmpFiles.length;
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
        len = $scope.uploadTmpFiles.length;
        var file = clone(response);
//        var file = response;
        file.isAction = true;
        $timeout(
            function () {
                var tempFile = angular.copy(file);
                delete tempFile.isAction;
                $scope.uploadFiles.push(tempFile);
                $scope.$parent.chatFiles.push(tempFile);
                file.thumbnail_url = file.imageUrl;
                $scope.uploadTmpFiles.splice(len - 1, 1);
                $scope.uploadTmpFiles.splice(0, 0, file);
            },
            1000
        );
    };
    uploader.onCompleteAll = function () {
//        console.info('onCompleteAll');
    };

    $scope.uploadDelete = function (imgTmpUrl, imgUrl, event) {
        if (event) {
            event.stopPropagation();
        }
        var index;
        for (var i = 0; i < $scope.uploadFiles.length; i++) {
            var img = $scope.uploadFiles[i];
            if (img.imageUrl == imgTmpUrl) {
                index = i;
            }
        }
        $scope.uploadFiles.splice(index, 1);
        $scope.$parent.chatFiles.splice(index, 1);
        for (var j = 0; j < $scope.uploadTmpFiles.length; j++) {
            var img1 = $scope.uploadTmpFiles[j];
            if (img1.thumbnail_url == imgTmpUrl) {
                index = j;
            }
        }
        $scope.uploadTmpFiles.splice(index, 1);
        uploader.queue.length--;
        $http.post('file-delete', {url: imgUrl, tmpUrl: imgTmpUrl, groupId: id}).success(function (data) {
            // console.log('删除图片');
        });
    };

    $scope.selectDelete = function (imgTmpUrl, imgUrl, event) {
        if (event) {
            event.stopPropagation();
        }
        var index;
        for (var i = 0; i < $scope.uploadFiles.length; i++) {
            var img = $scope.uploadFiles[i];
            if (img.imageUrl == imgTmpUrl) {
                index = i;
            }
        }
        $scope.uploadFiles.splice(index, 1);
        for (var j = 0; j < $scope.uploadTmpFiles.length; j++) {
            var img1 = $scope.uploadTmpFiles[j];
            if (img1.imageUrl == imgTmpUrl) {
                index = j;
            }
        }
        $scope.uploadTmpFiles.splice(index, 1);
    };

}]);


