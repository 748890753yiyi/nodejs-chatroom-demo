/*
 注册
 */

//注册页
startApp.controller('registerCtrl', ['$scope', '$http', function ($scope, $http) {
    var emailPattern = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/;
    var phonePattern = /^1[3|4|5|8|7]\d{9}$/;
    $scope.passwordLong = "密码最多16位!";
    $scope.passwordShort = "密码至少6位!";
    $scope.passwordPattern = "只能包含数字、字母，字母区分大小写!";
    $scope.passwordDifferent = "两次密码输入不一致!";

    var sendCodeRestful = "/sendPhoneMsg";	// 发送验证码
    var userRestful = "/registerApi";			// 注册
    var checkInfoRestful = "/checkInputInfo";	// 查重
    var checkCodeRestful = "/checkCode";//验证验证码
    var checkCodeExistRestful = "/codeIsExist";//验证验证码是否存在

    $scope.$parent.initInfo = function(){
        $scope.user = {"password": ""};
        $scope.emailuser = {"password": ""};
        $scope.password1 = "";
        $scope.password3 = "";
        $scope.checkInfo = {"userName": true, "phoneCheck": true, "codeSend":false,codeCheck:true};
        $scope.emailcheckInfo = {"userName": true, "emailCheck": true};
    };

    // 手机注册相关修改检测
    $scope.phoneChange = function(type){
        $scope.checkInfo.codeSend = false;
        $scope.checkInfo[type] = true;
        $scope.checkInfo.pattern = false;
        if($scope.user.phone&&$scope.user.phone.search(phonePattern) == 0){
            $scope.checkInfo.pattern = true;
        }
    };
    $scope.phoneCheckFun = function (arg, type) {
        restHttp($http, "get", checkInfoRestful, {}, function (data) {
            console.log(data);
            if (data.status == "ok") {
                $scope.checkInfo[type] = "used";
                $scope.checkInfo.codeSend = true;
            } else {
                $scope.checkInfo[type] = false;
            }
        },{"type": type, "value": arg});
    };
    // 发送验证码
    $scope.sendCode = function (account) {
        //点击获取验证码时候需要先判断验证码是否存在,如果存在提示存在
        restHttp($http, "get", checkCodeExistRestful, {}, function (msg) {
            console.log("点击获取验证码时判断是否存在验证码---"+msg);
            if(msg.status=="exist"){
                /*$scope.$apply(function(){
                    $scope.checkInfo.codeSend = false;
                });*/
                $scope.checkInfo.codeSend = true;
                alert("验证码已经存在");
            }else{
                console.log('验证码不存在,进行获取验证码操作');
                restHttp($http, "get", sendCodeRestful, {}, function (data) {
                    console.log(data);
                    if(data.status == "success") {
                        $scope.checkInfo.codeSend = true;
                        setTimeout(function(){
                            $scope.$apply(function(){
                                $scope.checkInfo.codeSend = false;
                            });
                        },20000);
                    }else{
                        alert(data.msg);
                    }
                },{"phone": account});
            }
        },{type:"register",phoneNo:account});
        /*routeHttp($http, checkCodeExistRestful, {type:"register",phoneNo:account}, function(msg){
            console.log("点击获取验证码时判断是否存在验证码---"+msg);
            if(msg.status=="exist"){
                $scope.$apply(function(){
                    $scope.checkInfo.codeSend = false;
                });
            }else{
                console.log('验证码不存在,进行获取验证码操作');
                restHttp($http, "get", sendCodeRestful, {}, function (data) {
                    console.log(data);
                    if(data.status == "success") {
                        $scope.checkInfo.codeSend = true;
                        setTimeout(function(){
                            $scope.$apply(function(){
                                $scope.checkInfo.codeSend = false;
                            });
                        },20000);
                    }else{
                        alert(data.msg);
                    }
                },{"phone": account});
            }
        })*/
        /*restHttp($http, "get", sendCodeRestful, {}, function (data) {
            console.log(data);
            if(data.status == "success") {
                $scope.checkInfo.codeSend = true;
                setTimeout(function(){
                    $scope.$apply(function(){
                        $scope.checkInfo.codeSend = false;
                    });
                },20000);
            }else{
                alert(data.msg);
            }
        },{"phone": account});*/
    };


    // 邮箱注册相关修改检测
    $scope.emailChange = function(type){
        $scope.emailcheckInfo[type] = true;
        $scope.emailcheckInfo.pattern = false;
        if($scope.emailuser.email&&$scope.emailuser.email.search(emailPattern) == 0){
            $scope.emailcheckInfo.pattern = true;
        }
    };
    $scope.emailCheckFun = function(arg, type){
        if(type == "emailCheck" && !$scope.emailcheckInfo.pattern){
            return;
        }
        restHttp($http, "get", checkInfoRestful, {}, function (data) {
            console.log(data);
            if (data.status == "ok") {
                $scope.emailcheckInfo[type] = "used";
            } else {
                $scope.emailcheckInfo[type] = false;
            }
        },{"type": type, "value": arg});
    };

    //register按键
    $scope.register = function (user, password, registerType) {
        $scope.isDisabled = true;
        if (user.password != password) {
            alert("两次密码不一致！");
            $scope.isDisabled = false;
        } else {
            if(registerType=="phone"){
                //检查验证码是否正确
                restHttp($http, "get", checkCodeRestful, {}, function (msg) {
                    if(msg.status == "success"){
                        console.log("验证码正确");
                        user.type = registerType;
                        routeHttp($http, userRestful, user, function(msg1){
                            if(msg1.status == "ok"){
                                $scope.isDisabled = false;
                                $('.user-register').modal('hide');
                                alert(msg1.msg);
                            }else{
                                $scope.isDisabled = false;
                                alert(msg1.msg);
                            }
                        });
                    }else if(msg.status == "diff"){
                        $scope.codeState="diff";
                        $scope.isDisabled = false;
                        console.log("验证码不匹配");
                    }else{
                        $scope.codeState="getandput";
                        console.log("验证码不存在");
                        $scope.isDisabled = false;
                    }
                },{type:"register",phoneNo:user.phone,code:user.code});
                /*routeHttp($http, checkCodeRestful, {type:"register",phoneNo:user.phone,code:user.code}, function(msg){
                 if(msg.status == "success"){
                 console.log("验证码正确");
                 user.type = registerType;
                 routeHttp($http, userRestful, user, function(msg1){
                 if(msg1.status == "ok"){
                 $scope.isDisabled = false;
                 $('.user-register').modal('hide');
                 alert(msg1.msg);
                 }else{
                 $scope.isDisabled = false;
                 alert(msg1.msg);
                 }
                 });
                 }else if(msg.status == "diff"){
                 $scope.codeState="diff";
                 console.log("验证码不匹配");
                 }else{
                 $scope.codeState="getandput";
                 console.log("验证码不存在");
                 }
                 });*/
            }else{
                user.type = registerType;
                routeHttp($http, userRestful, user, function(msg){
                    if(msg.status == "ok"){
                        $scope.isDisabled = false;
                        $('.user-register').modal('hide');
                        alert(msg.msg);
                    }else{
                        $scope.isDisabled = false;
                        alert(msg.msg);
                    }
                });
            }

        }
    };
}]);


//验证两次密码一致
startApp.directive('pwCheck', [function () {
    return {
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {
            var firstPassword = 'input[name='+attrs.pwCheck+']';
            // 监听新密码的改变
            $(firstPassword).bind("input propertychange",function(){
                scope.$apply(function () {
                    ctrl.$setValidity('pwmatch', elem.val() === $(firstPassword).val());
                    if(!elem.val()){
                        ctrl.$setValidity('pwmatch',true);
                    }
                });
            });
            elem.on('keyup', function () {
                scope.$apply(function () {
                    // console.info(elem.val() === $(firstPassword).val());
                    ctrl.$setValidity('pwmatch', elem.val() === $(firstPassword).val());
                    if(!elem.val()){
                        ctrl.$setValidity('pwmatch',true);
                    }
                });
            });
        }
    }
}]);