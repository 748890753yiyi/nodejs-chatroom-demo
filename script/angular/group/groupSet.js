/*'use strict';*/
/*
 设置群组
 */
mainApp.controller('groupSetCtrl', ['$scope','$state', 'cookie', '$window', '$timeout', '$rootScope', 'FileUploader', 'extendsResource', function ($scope,$state, cookie, $window, $timeout, $rootScope, FileUploader, groupResource) {
    var id = $scope.id,
        groupRestful = prefixGroupUrl + "/get/:id",
        groupUpdateRestful = prefixGroupUrl + "/update/:id",
        groupEnableOrNotRestful =  "/manager/group/enableOrNotGroup/:id",
        groupUsersRestful = prefixGroupUrl + "/groupUsers/" + $scope.id,
        removeUserRestful = prefixGroupUrl + "/removeUser/:groupId/:userId",
        setAdminRestful = prefixGroupUrl + "/addAdmin/:groupId/:userId",
        removeAdminRestful = prefixGroupUrl + "/removeAdmin/:groupId/:userId",
        waitUsersRestful = prefixGroupUrl + "/waitImformations/" + $scope.id,
        auditRestful = prefixGroupUrl + "/audit/" + $scope.id,
        allowSpeakRestful = prefixGroupUrl + "/stopSpeak/:id",   //禁言
        adminTransferRestful = prefixGroupUrl + "/removeRootGroup/:id",   //移交管理员
        reportListRestful = prefixGroupUrl + "/tipList",

        uploader,
        userGrid,
        waitGrid;

    /*
     基本设置
     */

    // 获取组信息
    $scope.$parent.getGroupInfo = function () {
        // $('.nav-justified').children("li").removeClass('active');
        // $('.nav-justified').children("li").eq(0).addClass('active');
        groupResource.extend(groupRestful).get({'id': id}, function (data) {
            $scope.editGroupMsg = data;
            $scope.isStopLogin = data.basic.stopLogin;
        });
        $scope.getUserList();
        $scope.getWaitList();
        // $scope.getReportList();
    };



    // 修改组
    $scope.groupUpdate = function (groupId) {
        // console.log($scope.editGroupMsg);
        // console.log($scope.isStopLogin);
        if($scope.isStopLogin !== $scope.editGroupMsg.basic.stopLogin){
            // console.log("改变了");
            groupResource.base(groupEnableOrNotRestful).update({"id": id, "operate": $scope.editGroupMsg.basic.stopLogin}, {}, function (msg) {
                // console.log(msg);
                if(msg.status === 'success'){
                    $state.go('main');
                    $rootScope.$broadcast("groupFocusUpdate", "config");
                    $('.shows').modal('hide');
                    $('.modal-backdrop').removeClass("in");
                }
            });
        }
        groupResource.base(groupUpdateRestful).update({'id': groupId}, $scope.editGroupMsg, function (data) {
            // alert(data.msg);
            $rootScope.$broadcast("alertMsg", data.msg);
            if (data.status == "success") {
                // $('.shows').modal('hide');
                $rootScope.$broadcast('groupUpdate', $scope.editGroupMsg);
            }
        });
    };

    //头像上传
    uploader = $scope.uploader = new FileUploader({
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
    /* uploader.onAfterAddingFile = function(fileItem) {
     console.info('onAfterAddingFile', fileItem);
     }; */
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        //        console.info('onCompleteItem', fileItem, response, status, headers);
        if (status == '200') {
            $timeout(function () {
                $scope.editGroupMsg.basic.head = response.url;
            }, 200);
        } else {
            // alert("上传失败");
            $rootScope.$broadcast("alertMsg", "上传失败！");
        }
    };


    /*
     组成员管理
     */

    // 获取组内成员列表
    $scope.getUserList = function () {
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        var condition = {'pageNo': 1, 'pageSize': groupSetPageSize};

        userGrid = new groupNewGrid(groupResource, groupUsersRestful, condition);
        userGrid.query([], function (data) {
            // console.log(data);
            $scope.members = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    //搜索成员
    $scope.searchGroupMember = function (name) {
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        var condition = {'name': name, 'pageNo': 1, 'pageSize': groupSetPageSize};

        userGrid = new groupNewGrid(groupResource, groupUsersRestful, condition);
        userGrid.query([], function (data) {
            // console.log(data);
            $scope.members = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    $scope.$watch('searchMemberName', function (newObj, oldObj) {
        if (newObj == '' && newObj != oldObj) {
            $scope.getUserList();
        }
    });

    //分页
    $scope.prePage = function () {
        userGrid.prePage(function (data) {
            $scope.members = data.datas.list;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    $scope.nextPage = function () {
        userGrid.nextPage(function (data) {
            $scope.members = data.datas.list;
            $scope.pageNo = data.conditions.pageNo;
        });
    };

    // 移出人员
    function removeGroupUserFunc(args) {
        var user = args.user;
        groupResource.base(removeUserRestful).update({"groupId": $scope.id, "userId": user.id}, {}, function (data) {
            if (data.status == 'success') {
                console.log(user.id);
                $scope.socket.emit('refreshGroup', {'userId': user.id});
                userGrid.query([], function (data) {
                    $scope.members = data.datas.list;
                    $scope.pageNumber = data.pageNumber;
                    $scope.pageNo = data.conditions.pageNo;
                });
                $scope.socket.emit('memberChange');     //刷新人员
                var userCookieId = cookie.get("userid");
                getCookieUser(userCookieId, groupResource, function (cookieUser) {
                    var msg = cookieUser.basic.userName + " 将 " + user.basic.userName + " 移出群组";
                    sendMsg(cookieUser, msg);
                    //刷新个人角色
                    $scope.socket.emit('roleChange', {'userId': user.id, 'role': null});
                });
            } else {
                // alert(data.msg);
                $rootScope.$broadcast("alertMsg", data.msg);
            }
            $('.alert-confirm').modal('hide');
        });
    }
    $scope.removeGroupUser = function (user) {
        var str = "确定移出人员 " + user.basic.userName + "?";
        $rootScope.$broadcast("alertConfirm", {"str": str, "user": user}, removeGroupUserFunc);
    };

    //设置成管理员
    function addGroupAdminFunc(args) {
        var user = args.user;
        groupResource.base(setAdminRestful).update({"groupId": $scope.id, "userId": user.id}, {}, function (data) {
            if (data.status == 'success') {
                userGrid.query([], function (data) {
                    $scope.members = data.datas.list;
                    $scope.pageNumber = data.pageNumber;
                    $scope.pageNo = data.conditions.pageNo;
                });
                var userCookieId = cookie.get("userid");
                getCookieUser(userCookieId, groupResource, function (cookieUser) {
                    var msg = cookieUser.basic.userName + " 将 " + user.basic.userName + " 设置为管理员";
                    sendMsg(cookieUser, msg);
                    $scope.socket.emit('memberChange');
                    //刷新个人角色
                    $scope.socket.emit('roleChange', {'userId': user.id, 'role': data.role});
                });
            } else {
                $rootScope.$broadcast("alertMsg", data.msg);
                $scope.$emit("refreshGroup");
                $(".shows").modal("hide");  //关闭模态框
            }
            $('.alert-confirm').modal('hide');
        });
    }
    $scope.addGroupAdmin = function (user) {
        var str = "确定将 " + user.basic.userName + " 设置为管理员? ";
        $rootScope.$broadcast("alertConfirm", {"str": str, "user": user}, addGroupAdminFunc);
    };

    //取消管理员权限
    function removeGroupAdminFunc(args) {
        var user = args.user;
        groupResource.base(removeAdminRestful).update({"groupId": $scope.id, "userId": user.id}, {}, function (data) {
            if (data.status == 'success') {
                userGrid.query([], function (data) {
                    $scope.members = data.datas.list;
                    $scope.pageNumber = data.pageNumber;
                    $scope.pageNo = data.conditions.pageNo;
                });
                var userCookieId = cookie.get("userid");
                getCookieUser(userCookieId, groupResource, function (cookieUser) {
                    var msg = cookieUser.basic.userName + " 取消 " + user.basic.userName + " 的管理员权限";
                    sendMsg(cookieUser, msg);
                    $scope.socket.emit('memberChange');
                    //刷新个人角色
                    $scope.socket.emit('roleChange', {'userId': user.id, 'role': data.role});
                });
            } else {
                $rootScope.$broadcast("alertMsg", data.msg);
                $scope.$emit("refreshGroup");
                $(".shows").modal("hide");  //关闭模态框
            }
            $('.alert-confirm').modal('hide');
        });
    }
    $scope.removeGroupAdmin = function (user) {
        var str = "确定取消 " + user.basic.userName + " 的管理员权限? ";
        $rootScope.$broadcast("alertConfirm", {"str": str, "user": user}, removeGroupAdminFunc);
    };

    // 组移交管理员权限
    function groupAdminTransferFunc(args) {
        var selectUser = args.user,
            userCookieId = cookie.get("userid");
        getCookieUser(userCookieId, groupResource, function (cookieUser) {
            var userCookie = cookieUser,
                selectId = selectUser.id;
            groupResource.base(adminTransferRestful).update({"id": $scope.id, "rootId": userCookieId, "mainId": selectId}, {}, function (msg) {
                if (msg.status == "success") {
                    var message = userCookie.basic.userName + " 移交管理员给 " + selectUser.basic.userName;
                    sendMsg(userCookie, message);
                    $scope.socket.emit('memberChange'); //刷新人员
                    //刷新个人角色
                    $scope.socket.emit('roleChange', {'userId': selectId, 'role': msg.superRole});
                    $(".shows").modal("hide");  //关闭模态框
                    msg.role.isSpeak = $scope.groupMsg.ownRole.isSpeak;
                    $scope.groupMsg.ownRole = msg.role;
                } else {
                    $rootScope.$broadcast("alertMsg", msg.msg);
                    $scope.$emit("refreshGroup");
                    $(".shows").modal("hide");  //关闭模态框
                }
                $('.alert-confirm').modal('hide');
            });
        });
    }
    $scope.groupAdminTransfer = function (selectUser) {
        var str = "确定将超级管理员权限移交给 " + selectUser.basic.userName + " ? ";
        $rootScope.$broadcast("alertConfirm", {"str": str, "user": selectUser}, groupAdminTransferFunc);
    };


    // 禁言/发言 操作
    $scope.gagDays = gagDays;   // 禁言天数选择
    /*
     user:禁言的人; flag:禁言(1-永久,3-三天,7-一周),发言(true);
     */
    function setGroupGagFunc(args) {
        var user = args.user,
            flag = args.flag;
        groupResource.base(allowSpeakRestful).update({"userId": user.id, "id": $scope.id, "operate": flag}, {}, function (msg) {
            if (msg.status == "success") {
                var length = $scope.members.length;
                for (var i = 0; i < length; i++) {
                    if ($scope.members[i].id == user.id) {
                        var theFlag = flag == 'true' ? 'true' : 'false';
                        $scope.members[i].groupInformation.roleExtend.isSpeak = theFlag;
                        break;
                    }
                }
                //刷新个人权限
                $scope.socket.emit('speakChange', {'userId': user.id, 'isSpeak': flag});

                var userCookieId = cookie.get("userid");
                getCookieUser(userCookieId, groupResource, function (cookieUser) {
                    var message = "";
                    if (flag == 'true') {
                        message = cookieUser.basic.userName + " 取消 " + user.basic.userName + " 的禁言";
                    } else if (flag != '1') {
                        message = cookieUser.basic.userName + " 将 " + user.basic.userName + " 禁言 " + flag + " 天";
                    } else {
                        message = cookieUser.basic.userName + " 将 " + user.basic.userName + " 永久禁言";
                    }
                    sendMsg(cookieUser, message);
                    $('.alert-confirm').modal('hide');
                });
            } else {
                $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
    }
    $scope.setGroupGag = function (user, flag) {
        var str = "";
        if (flag === 'true') {
            str = "确定取消 " + user.basic.userName + " 的禁言? ";
        } else {
            if (flag === "1") {
                str = "确定 长期 禁言 " + user.basic.userName + "? ";
            } else {
                str = "确定禁言 " + user.basic.userName + " " + flag + "天? ";
            }
        }
        $rootScope.$broadcast("alertConfirm", {"str": str, "user": user, "flag": flag}, setGroupGagFunc);
    };

    /*
     待审核
     */
    // 获取待审核列表
    $scope.getWaitList = function () {
        $scope.waitPageNumber = 1;
        $scope.waitPageNo = 1;
        var condition = {'pageNo': 1, 'pageSize': groupSetPageSize};

        waitGrid = new groupNewGrid(groupResource, waitUsersRestful, condition);
        waitGrid.query([], function (data) {
            // console.log(data);
            $scope.waitImformations = data.datas.list;
            $scope.waitPageNumber = data.pageNumber;
            $scope.waitPageNo = data.conditions.pageNo;
        });
    };

    //分页
    $scope.preWaitPage = function () {
        waitGrid.nextPage(function (data) {
            var list = data.datas.list;
            $scope.waitImformations = list;
            $scope.waitPageNo = data.conditions.pageNo;
        });
    };
    $scope.nextWaitPage = function () {
        waitGrid.nextPage(function (data) {
            var list = data.datas.list;
            $scope.waitImformations = list;
            $scope.waitPageNo = data.conditions.pageNo;
        });
    };

    //成员加入的审核
    $scope.audit = function (information, type) {
        var value = {'informationId': information.id, 'userId': information.basic.userId, 'type': type};
        groupResource.base(auditRestful).update({}, value, function (data) {
            if (data.status == 'success') {
                $scope.socket.emit('refreshGroup', {'userId': information.basic.userId});
                waitGrid.query([], function (data) {
                    $scope.waitImformations = data.datas.list;
                    $scope.waitPageNumber = data.pageNumber;
                    $scope.waitPageNo = data.conditions.pageNo;
                });
                var userCookieId = cookie.get("userid");
                getCookieUser(userCookieId, groupResource, function (cookieUser) {
                    var msg = "";
                    if (type == 'agree') {
                        $scope.socket.emit('memberChange');		//刷新人员
                        msg = cookieUser.basic.userName + " 审核 " + information.basic.userName + " 通过";
                    } else {
                        msg = cookieUser.basic.userName + " 拒绝 " + information.basic.userName + " 的请求";
                    }
                    sendMsg(cookieUser, msg);
                });
            } else {
                // alert(data.msg);
                $rootScope.$broadcast("alertMsg", data.msg);
            }
        });
    };

    // 处理后发送一条通知消息
    function sendMsg(user, msg) {
        var message = {};
        message.basic = {};
        message.basic.userId = user.id;
        message.basic.groupId = $scope.id;
        message.basic.type = 'remind';
        message.content = {};
        message.content.text = msg;
        message.content.file = [];
        message.atMembers = [];
        // console.log(message);
        //广播发消息
        $scope.socket.emit('distributeMessage', message);
    }

    /*
     举报列表
     */
    // 获取组举报列表
    var reportGrid;
    $scope.getReportList = function () {
        $scope.reportPageNumber = 1;
        $scope.reportPage = {'pageNo': 1, 'pageSize': groupReportPageSize};
        $scope.reportConditions = {"id": $scope.id};
        $scope.reportSorts = {};
        reportGrid = new grid(groupResource, reportListRestful, $scope.reportPage, $scope.reportConditions, $scope.reportSorts);
        reportGrid.query([], function (data) {
            $scope.reportInformations = data.datas.list;
            $scope.reportPageNumber = data.pageNumber;
            $scope.reportPage = data.page;
        });
    };
    // 分页
    $scope.reportPrePage = function () {
        reportGrid.prePage(function (data) {
            $scope.reportInformations = data.datas.list;
            $scope.reportPage = data.page;
        });
    };
    $scope.reportNextPage = function () {
        reportGrid.nextPage(function (data) {
            $scope.reportInformations = data.datas.list;
            $scope.reportPage = data.page;
        });
    };

}]);