/*
	组内邀请成员
 */
mainApp.controller('inviteMembersCtrl', ['$scope', '$http', '$rootScope', 'cookie', 'extendsResource', function($scope, $http, $rootScope, cookie, extendsResource) {
    var userGrid;
    var userSpellRestful = prefixUserUrl + "/contact/spellList";
    var massInsertRestful = prefixGroupUrl + "/massInsert/" + $scope.id;
    var massPassiveRestful = prefixGroupUrl + "/massPassive";

    // 初始化
    $scope.$parent.initUserList = function() {
        $scope.page = {
            'pageNo': 1,
            'pageSize': contactPageSize
        };
        $scope.conditions = {};
        $scope.sorts = [{
            field: "publishTime",
            isDesc: true
        }];
        userGrid = new grid(extendsResource, userSpellRestful, $scope.page, $scope.conditions, $scope.sorts);
        //获取好友
        userGrid.query([], function(data) {
            $scope.userList = data.datas.list;
            $scope.pageNumber = data.pageNumber; //总页数
            $scope.page = data.page;
        });
        $scope.invitation = {};
        $scope.invitation.people = [];
        $scope.inValid = false;
        $scope.people = {'contactValue': ''};
        $scope.invitePeopleList = [{'contactValue': '','inValid':false}, {'contactValue': '','inValid':false}, {'contactValue': '','inValid':false}];
    };

    $scope.addInvitePeople = function() {
        $scope.invitePeopleList.push({ 'contactValue': '','inValid':false});
    };

    /* 校验输入账号是否合法*/
    $scope.checkAccountIsValid = function (account,index){
//        console.log(account);
        if(account){
            if(!account.match(RegCellPhone) && !account.match(RegEmail)){
                $scope.invitePeopleList[index].inValid = true;
                $scope.inValid = true;
            }else{
                $scope.invitePeopleList[index].inValid = false;
                $scope.inValid = false;

                for(var i=0;i < $scope.invitePeopleList.length;i++){
                    if($scope.invitePeopleList[i].inValid){
                        $scope.inValid = true;
                    }
                }
            }

        }else{
            $scope.inValid = true;
        }
        /*if((account&&!account.match(RegCellPhone)) || (account && !account.match(RegEmail))){
            $scope.invitePeopleList[index].inValid = true;
            $scope.inValid = true;
        }else{
            $scope.invitePeopleList[index].inValid = false;
            $scope.inValid = false;

            for(var i=0;i < $scope.invitePeopleList.length;i++){
                if($scope.invitePeopleList[i].inValid){
                    $scope.inValid = true;
                }
            }
        }*/
    };

    // 我的好友列表
    $scope.getUserList = function(spell) {
        $scope.conditions = { 'groupId': $scope.id, 'pageNo': 1, 'pageSize': groupInvitePageSize };
        if (spell) {
            $scope.conditions.firstSpell = spell;
        }

        userGrid = new groupNewGrid(extendsResource, userListRestful, $scope.conditions);
        userGrid.query([], function(data) {
            $scope.userList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.conditions = data.conditions;
        });
    };

    // 分页
    $scope.prePage = function() {
        userGrid.prePage(function(data) {
            $scope.userList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.conditions = data.conditions;
        });
    };
    $scope.nextPage = function() {
        userGrid.nextPage(function(data) {
            $scope.userList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.conditions = data.conditions;
        });
    };


    //选择邀请对象
    $scope.selectInvitePerson = function(select) {
        var userCookieId = cookie.get("userid");
        if (select.id === userCookieId) {
            $rootScope.$broadcast("alertMsg", "不能选自己哦！");
        } else {
            var isHave = false;
            angular.forEach($scope.invitation.people, function(item) {
                if (select.id === item.userId) {
                    isHave = true;
                }
            });
            if (!isHave) {
                var tempUser = { 'userId': select.id, 'userName': select.userName };
                $scope.invitation.people.push(tempUser);
            } else {
                $rootScope.$broadcast("alertMsg", "已存在！");
            }
        }
    }; // 删除邀请对象
    $scope.delPerson = function(id, event) {
        event.stopPropagation(); //阻止事件冒泡，防止点击删除按钮选择发布工作邀请面板隐藏
        angular.forEach($scope.invitation.people, function(item, key) {
            if (id === item.userId) {
                $scope.invitation.people.splice(key, 1);
            }
        });
    };

    //邀请成员
    $scope.submitInvite = function() {
        var userCookieId = cookie.get("userid");
        // 判断组成员
        var len = $scope.invitation.people.length;
        var length = $scope.groupMembers.length;
        for(var m=0; m<len; m++){
            for(var i=0; i<length; i++){
                if($scope.invitation.people[m].userId === $scope.groupMembers[i].id){
                    $scope.invitation.people.splice(m, 1);
                    m--;
                    len = $scope.invitation.people.length;
                    break;
                }
            }
        }
        if(len === 0){
            $rootScope.$broadcast("alertMsg","邀请人员都已存在！");
            $('.invateModal').modal('hide');
            return;
        }
        var value = {"user": $scope.invitation.people,"cookieId":userCookieId};
            extendsResource.extend(massPassiveRestful).save({groupId: $scope.id},value, function(data) {
                var successUsers = '';
                var waitUsers = '';
                var failedUsers = '';
                angular.forEach(data.returnDoc, function(value, key){
                    if(value.status == "success"){
                        successUsers += value.userName+' ';
                        $scope.socket.emit('refreshGroup', { 'userId': value.id }); // 通知刷新左侧
                    }else if(value.status === "wait"){
                        waitUsers += value.userName + ' ';    
                    }else {
                        failedUsers += value.userName + ' ';    
                    }
                });
                getCookieUser(userCookieId, extendsResource, function (cookieUser) {
                    var msg = '';
                    if (waitUsers) {
                        msg = cookieUser.basic.userName + " 邀请 " + waitUsers + " 加入群组，等待审核...";
                    } else if (successUsers) {
                        $scope.socket.emit('memberChange'); //刷新人员
                        msg = cookieUser.basic.userName + " 邀请 " + successUsers + " 加入群组";
                    } else if (failedUsers){
                        $rootScope.$broadcast("alertMsg", failedUsers+"邀请失败或已存在！");
                    }
                    if ( waitUsers || successUsers ) {
                        var message = {};
                        message.basic = {};
                        message.basic.userId = userCookieId;
                        message.basic.groupId = $scope.id;
                        message.basic.type = 'remind';
                        message.content = {};
                        message.content.text = msg;
                        message.content.file = [];
                        message.atMembers = [];
                        // 广播发消息
                        $scope.socket.emit('distributeMessage', message);
                    }
                });
            });
        $('.invateModal').modal('hide');
    };

    $scope.invite = function(list) {
        var tempInviteList = angular.copy(list);
        for (var i = tempInviteList.length - 1; i >= 0; i--) {
            if (!tempInviteList[i].contactValue) {
                tempInviteList.splice(i, 1);
            }
        }
        // 判断组成员
        var len = tempInviteList.length;
        var length = $scope.groupMembers.length;
        for(var m=0; m<len; m++){
            for(var j=0; j<length; j++){
                if(tempInviteList[m].contactValue === $scope.groupMembers[j].contactValue){
                    tempInviteList.splice(m, 1);
                    m--;
                    len = tempInviteList.length;
                    break;
                }
            }
        }
        if(len === 0){
            $rootScope.$broadcast("alertMsg","邀请人员都已存在！");
            $('.invateModal').modal('hide');
            return;
        }
        var userCookieId = cookie.get("userid");
        var groupMsg = $scope.groupMsg;
        getCookieUser(userCookieId, extendsResource, function (cookieUser) {
           
        var inviteList = [];
        angular.forEach(tempInviteList, function(value){
            inviteList.push(value.contactValue);
        });
        extendsResource.base(massInsertRestful).save({'users':inviteList,'groupName':groupMsg.basic.name,'userName':cookieUser.basic.userName}, function(msg) {
//            console.log(msg);
            if (msg.status === 'success') {
                /*var wrongMsg = '';
                $scope.existPeople = [];
                angular.forEach(msg.list, function(item) {
                    if (item.status === 'failed' && item.msg === '用户已存在') {
                        $scope.existPeople.unshift(item);
                    } else {
                        wrongMsg += item.contactValue + item.msg + '\n';
                    }
                });*/
                $rootScope.$broadcast("alertMsg","邀请发送成功！");
                $('.invateModal').modal('hide');
            } else {
                // $rootScope.$broadcast("alertMsg", msg.msg);
            }
        });
     });
    };
}]);
