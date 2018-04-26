/* 
 修改个人信息
 */

mainApp.controller('editUserCtr', ['$scope', '$rootScope', 'cookie', '$timeout', 'FileUploader', 'extendsResource', function ($scope, $rootScope, cookie, $timeout, FileUploader, userResource) {
    var userRestful = prefixUserUrl + "/userInfo/:id";
    var userCookieId = cookie.get('userid');
    //获取个人信息
    $scope.$parent.getUserInfo = function () {
        userResource.base(userRestful).get({id: userCookieId}, function (msg) {
            msg.contactInformation.forEach(function (item) {
                /*if (item.registerTag === "true") {
                    msg.email = item;
                }*/
                if (item.contactType == 'register') {
                    msg.email = item;
                }
                if (item.contactType == 'email') {
                    msg.email = item;
                }
                if (item.contactType == 'phone') {
                    msg.mobileNO = item;
                }
            });
            $scope.userEdit = msg;
            //modalShow(".sets");
        });
    };

    //头像上传
    var uploader = $scope.uploader = new FileUploader({
        autoUpload: true,
        url: "/head-upload"
    });
    uploader.filters.push({
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
        }
    });
    uploader.onAfterAddingFile = function(fileItem) {
        $scope.oldHead = $scope.userEdit.basic.head;
        $scope.userEdit.basic.head = "/images/51.gif";
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
//        console.info('onCompleteItem', fileItem, response, status, headers);
        if (status == '200') {
            /*$timeout(function () {
                var oldHead = $scope.userEdit.basic.head;
                $scope.userEdit.basic.head = response.url;
            }, 200);*/
            // 上传成功后修改个人信息
            userResource.base(userRestful).update({"id": userCookieId}, {"head": response.url}, function (msg) {
                if (msg.status == "success") {
//                    $('.sets').modal('hide');
                    $timeout(function () {
                        $scope.userEdit.basic.head = response.url;
                        $scope.mainSocket.emit('userUpdate', $scope.userEdit);  //通过socket通知组
                    }, 500);
                } else {
                    $scope.userEdit.basic.head = $scope.oldHead;
                    $rootScope.$broadcast("alertMsg", msg.msg);
                }
            });
        } else {
            $rootScope.$broadcast("alertMsg", "上传失败！");
            $scope.userEdit.basic.head = $scope.oldHead;
        }
    };
}]);