/*'use strict';*/
/*
 1、addActivityCtrl：发布活动
 2、activityShowCtr：进入活动页面初始化数据
 */

mainApp.controller('addActivityCtrl', ['cookie', '$timeout', '$scope', '$rootScope', 'FileUploader', function (cookie, $timeout, $scope, $rootScope, FileUploader) {
    //时间控件的初始化
//    $scope.starthh = 0;
//    $scope.startmm = 0;
//    $scope.endhh = 0;
//    $scope.endmm = 0;
    $scope.startStep = {"hh":0, "mm":0};
    $scope.endStep = {"hh":0, "mm":0};
    $scope.startStepTime = {
        hstep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        mstep: [0, 30]
    };
    $scope.endStepTime = {
        hstep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        mstep: [0, 30]
    };
    /*  点击“发布活动”按钮初始化组信息
     groupId:组id
     head:宣传图
     charge:收费情况
     */
    // 初始化活动
    $scope.$parent.initActivityInfo = function () {
        $scope.activity = {};
        $scope.activity.basic = {};
        $scope.activity.basic.groupId = $scope.id;
        $scope.activity.content = {};
        $scope.activity.content.head = '/images/icon-activity.png';
        $scope.activity.content.charge = 'false';
    };

    $scope.selectTimeChange = function(type){
        var timeName = "startTime";
        var stepTimeName = "startStepTime";
        var selectStep = "startStep";
        if(type === "end"){
            timeName = "endTime";
            stepTimeName = "endStepTime";
            selectStep = "endStep";
        } else if($scope.activity.content.endTime && new Date($scope.activity.content.startTime) >= new Date($scope.activity.content.endTime)){
            delete $scope.activity.content.endTime;
            $scope.endStep = {"hh":0, "mm":0};
            $scope.endStepTime = {
                hstep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
                mstep: [0, 30]
            };
        }

        if(!$scope.activity.content[timeName] || ($scope.activity.content[timeName] && $scope.activity.content[timeName].format("yyyyMMdd") > new Date().format("yyyyMMdd"))){
            //今天以后
            $scope[stepTimeName].hstep = [0,1, 2, 3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
            $scope[selectStep].hh = 9;
            $scope[selectStep].mm = 0;
        }else{
            //今天
            $scope[selectStep].hh = new Date().getMinutes()>30?new Date().getHours()+1:new Date().getHours();
            $scope[selectStep].mm = new Date().getMinutes()>30?0:30;
            var hsteps = [];
            for(var i=$scope[selectStep].hh;i<=23;i++){//小时只放当前时间之后的
                hsteps.push(i);
            }
            $scope[stepTimeName].hstep = hsteps;
        }
    };

    //发布活动
    $scope.submit = function (activity, startStep, endStep) {
        // 被禁言则不发送消息
        if ($scope.groupMsg.ownRole.isSpeak !== 'true') {
            $rootScope.$broadcast("alertMsg", "您被禁言,请联系管理员！");
            return;
        }
        $scope.isDisabled = true;
        activity.content.startTime = new Date(new Date(activity.content.startTime.setHours(startStep.hh)).setMinutes(startStep.mm));
        activity.content.endTime = new Date(new Date(activity.content.endTime.setHours(endStep.hh)).setMinutes(endStep.mm));
        if (new Date(activity.content.startTime) >= new Date(activity.content.endTime)) {
            $rootScope.$broadcast("alertMsg", "结束时间必须大于开始时间");
            $scope.isDisabled = false;
        } else if (new Date(activity.content.endTime) <= new Date() || new Date(activity.content.startTime) < new Date()) {
            $rootScope.$broadcast("alertMsg", "时间已经过去了...重新选择");
            $scope.isDisabled = false;
        } else {
            activity.content.dayOfWeek = activity.content.startTime.getDay();
            $scope.socket.emit('distributeActivity', activity);
        }
    };

    // 发布成功
    $scope.socket.on('receiveMessage', function (message) {
        if (message.basic.type == 'activity') {
            var userCookieId = cookie.get("userid");
            if (userCookieId == message.basic.userId) {
                $('.publishActivity').modal('hide');
            }
            $scope.$emit("activityAdd");
        }
        $scope.isDisabled = false;
    });
    // 发布失败
    $scope.socket.on('activityfailed', function (message) {
        // alert(message.msg);
        $rootScope.$broadcast("alertMsg", message.msg);
        $scope.isDisabled = false;
    });

    //宣传图上传
    var uploader = new FileUploader({
        autoUpload: true,
        url: "/head-upload"
    });
    $scope.uploader = uploader;

    uploader.filters.push({
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
        }
    });
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
        if (status == '200') {
            $timeout(function () {
                $scope.activity.content.head = response.url;
            }, 500);
        } else {
            $rootScope.$broadcast("alertMsg", "上传失败！");
        }
    };
}]);

mainApp.controller('activityShowCtr', ['$scope', 'extendsResource', function ($scope, activityResource) {
    var activityListRestful = prefixActivityUrl + "/initList/:id";

    function hotActivityList() {
        var conditions = {'type': 'hot', 'groupId': $scope.id, 'number': activityPageSize};
        activityResource.base(activityListRestful).query(conditions, function (datas) {
            $scope.hotActivities = datas;
        });
    }
    function newActivityList() {
        var conditions = {'type': 'new', 'groupId': $scope.id, 'number': activityPageSize};
        activityResource.base(activityListRestful).query(conditions, function (datas) {
            $scope.newActivities = datas;
        });
    }
    function endActivityList() {
        var conditions = {'type': 'end', 'groupId': $scope.id, 'number': activityPageSize};
        activityResource.base(activityListRestful).query(conditions, function (datas) {
            $scope.endActivities = datas;
        });
    }

    $scope.$on('activityAdd', function (event) {
        hotActivityList();
        newActivityList();
        endActivityList();
    });

    /*
     初始化
     */
    hotActivityList();
    newActivityList();
    endActivityList();
}]);
