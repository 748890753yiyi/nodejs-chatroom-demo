/*'use strict';*/
/*
 组内聊天页面
 */
mainApp.controller('chatCtrl', ['$scope', '$q', '$http', 'cookie','$state', '$stateParams', '$timeout', '$rootScope', 'FileUploader', 'extendsResource', function ($scope, $q, $http, cookie, $state,$stateParams, $timeout, $rootScope, FileUploader, extendsResource) {
    $scope.uploadUrl = pasteuploadUrl + "?groupId=" + $scope.id;
    var chatAtId = $stateParams.atId,
        loadMsgRestful = prefixGroupUrl + "/chatInformationList/:id",
        loadAtMsgRestful = prefixGroupUrl + "/atPositionInformation/:id",
        memberRestful = prefixGroupUrl + "/groupMember/:id",
        userRestful = prefixUserUrl + "/findUser/:contactValue",
        addFriendRestful = prefixNoticeUrl + "/sendFriendMsg/:id",
        collectRestful = prefixGroupUrl + "/collectMsg/:id",
        unReadAtlistRestful = prefixGroupUrl + "/unReadAtMsg/:id",
        announcementRestful = prefixVoteUrl + '/announcement/list',
        reportRestful = prefixGroupUrl + "/tip",
        checkDeleteInfoRestful = prefixGroupUrl + '/checkInfo',

        groupSendTextBoxId = "inputor",        //输入框id
        sendBoxObj = $("#inputor"),
        groupChatMessageBoxId = "chat-messages", //聊天界面id
        chatMessageBoxObj = $("#chat-messages"),
        groupChatMessageId = "chatUL",           //每条消息的id
        chatMessageObj = $("#chatUL"),

        isInitAt = false,
        sendMsgCount = 0;   // 记录发送消息次数（没发送一次加1，区分默认加载进入聊天框内的keyId，以防重复）

    //判断活动、话题、投票、公告是否被删除
    $scope.checkDeleteInfo = function(id,type){
        var value = {'id':id,'type':type};
        extendsResource.extend(checkDeleteInfoRestful).query(value, function (data) {
            if(data.status === 'success'){
                if(type === 'vote'){
                    $state.go('group.vote.voteinfo',{voteId:id});
                }else if(type === 'topic'){
                    $state.go('group.topic.topicinfo',{topicId:id});
                }else if (type === 'activity'){
                    $state.go('group.activity.activityinfo',{activityId:id});
                }else if(type === 'announcement'){
                    $state.go('group.announcement');
                }
            }else{
                if(type === 'vote'){
                    $rootScope.$broadcast("alertMsg", "该投票已被管理员删除！");
                }else if(type === 'topic'){
                    $rootScope.$broadcast("alertMsg", "该话题已被管理员删除！");
                }else if (type === 'activity'){
                    $rootScope.$broadcast("alertMsg", "该活动已被管理员删除！");
                }else if(type === 'announcement'){
                    $rootScope.$broadcast("alertMsg", "该公告已被管理员删除！");
                }
            }
            /*if (!$scope.hasAtMe && datas.list.length > 0) {
                $scope.atMessage = datas.list[0];
                $scope.hasAtMe = true;
                $scope.atMessages = datas.list;
            }*/
        });
    };


    $scope.msgs = [];
    $scope.isLoad = true;
    $scope.startNo = 0;
    $scope.endNo = 0;
    $scope.isSign = false;
    $scope.hasAtMe = false;     //是否包含@信息
    $scope.atMessages = [];     //@我的未读列表

    $scope.$emit('isChat', true);
    $scope.$on('$destroy', function () {
        $scope.$emit('isChat', false);
    });
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
        // console.log("chatAtId: "+chatAtId)
        window.scrollTo(0, 0);
        if (fromState.name == 'group' && chatAtId) {
            // 初始化@信息
            isInitAt = true;
        }
        // 初始化
        if ($scope.lastExitTime) {
            if (isInitAt) {
                loadAtInformation($scope.lastExitTime);
            } else {
                loadInitList($scope.lastExitTime);
            }
            lastAnnouncement();
            // 返回聊天页面初始化成员信息
            getMembers();
            $scope.initChatAt();   //初始化@
        }
        $scope.$on('initList', function (event, time) {
            // console.log(time);
            // console.log(isInitAt);
            if (isInitAt) {
                loadAtInformation(time);
            } else {
                loadInitList(time);
            }
            lastAnnouncement();
            // getMembers();
            $scope.initChatAt();   //初始化@
        });
    });

    //搜索
    $scope.$on('searchUserName', function (event, name) {
//        console.log("searchUserName=="+name);
        $scope.searchName = name;
    });
    // 刷新成员列表(socket的通知)
    $scope.socket.on('updateOnlineUsers', function (userId) {
        // console.log("on   updateOnlineUsers: "+userId);
        getMembers();
    });
    //发送消息
    // 文件和文字分别以一条消息发送
    $scope.sendSelfMsg = function () {
        var fileLists,
            allAtMembers,
            msg,
            tempMsgStr,
            array,
            sendMsgList,
            userCookieId;
        // 被禁言则不发送消息
        if ($scope.groupMsg.ownRole.isSpeak !== 'true') {
            $rootScope.$broadcast("alertMsg", "您被禁言,请联系管理员！");
            return;
        }
        sendMsgCount++;
        msg = sendBoxObj.html();    //获取消息
        fileLists = getFiles();     //获取交流去内的文件列表(即需上传的文件)
        allAtMembers = getAtMembers();  //获取@过的人
        fileLists[1].forEach(function (item, key) {
            // 将上传的图片整体替换为 ^-upload1^- 来区分文字和图片(且确保不会出现输入内容与此相同)；upload后的数组就是图片对应的下标(顺序)
            msg = msg.replace('<img style="display:inline;vertical-align:bottom;" class="media-object insert-image" src="' + item + '">', "^-upload" + key + "^-");
        });
        tempMsgStr = msg.replaceAll("<br>", '').replaceAll("&nbsp;", '').replaceAll(" ", '').replaceAll("<div>", '').replaceAll("</div>", '');   //去掉所有空格和换行
        if (!tempMsgStr) {
            $rootScope.$broadcast("alertMsg", "不能发送空消息");
            return;
        }
        array = msg.split('^-');
        sendMsgList = [];   //记录此次发送的消息数组
        userCookieId = cookie.get("userid");
        getCookieUser(userCookieId, extendsResource, function (cookieUser) {
            array.forEach(function (item, key) {
                var trimItem = item.replaceAll("<br>", '').replaceAll("&nbsp;", '').replaceAll(" ", '').replaceAll("<div>", '').replaceAll("</div>", '');
                if (trimItem) {
                    var tempMsg = initMsg(cookieUser);
                    tempMsg.keyId = "send" + sendMsgCount + key;    // 默认按下标初始化一个标识，用来替换新数据
                    // 记录需要发送的消息列表
                    var json = angular.copy(tempMsg);
                    tempMsg.isSelf = true;
                    tempMsg.isLoading = true;   // 判断是否加载状态的消息，来显示footer(撤销、收藏)
                    if (item.indexOf("upload") > -1) {
                        var tempItem = item.replace("upload", "");   // 替换之后的值即为附件在上传列表中对应的下标
                        if (fileLists[0][tempItem]) {
//                        console.log(fileLists[1][tempItem]);
                            json.content.file[0] = fileLists[0][tempItem];
                            // 默认显示图片（fileLists[1][tempItem]即为缩略图路径）
                            tempMsg.content.file.push({"imageUrl": fileLists[1][tempItem]});
                        }
                    } else {
                        // 默认显示消息内容
                        tempMsg.content.text = item;
                        json.content.text = item;
                    }
                    // 如果是最后一页，则追加数据
                    if (!$scope.loadNextPage) {
                        $scope.msgs.push(tempMsg);
                    }
                    sendMsgList.push(json);
                    chatMessageBoxObj.animate({ scrollTop: chatMessageObj.height()}, 100);
                }
            });
            sendBoxObj.html(""); // 清空发送框
            // 上传
            var count = 0;
            sendMsgList.forEach(function (item, key) {
                if (!item.content.text) {
                    var uploadFile = item.content.file[0];
                    if ((typeof uploadFile) == "string") {
                        // base64 截图上传
                        routeHttp($http, $scope.uploadUrl, {"file": uploadFile}, function (data) {
                            item.content.file[0] = data;
                            count++;
                            // 记录上传进度，完毕后发送消息
                            if (count == sendMsgList.length) {
                                sendMsg(sendMsgList, sendMsgCount, allAtMembers);
                            }
                        });
                    } else {
                        // 选择列表上传
                        uploadFile.upload();
                        uploadFile._onSuccess = function (response, status, headers) {
                            item.content.file[0] = response;
                            count++;
                            if (count == sendMsgList.length) {
                                sendMsg(sendMsgList, sendMsgCount, allAtMembers);
                            }
                        };
                    }
                } else if (item.content.text) {
                    count++;
                    if (count == sendMsgList.length) {
                        sendMsg(sendMsgList, sendMsgCount, allAtMembers);
                    }
                }
            });
        });
    };
    // 发送语音消息
    $scope.sendAudioMsg = function (size, audio, timeSize) {
        sendMsgCount++;
        var tempCount = sendMsgCount,
            userCookieId = cookie.get("userid");
        getCookieUser(userCookieId, extendsResource, function (cookieUser) {
            var tempMsg = initMsg(cookieUser);
            tempMsg.keyId = "send" + sendMsgCount + "1";

            var jsonObj = angular.copy(tempMsg);
            jsonObj.isSelf = true;
            jsonObj.isLoading = true;
            jsonObj.isSound = true;
            // 如果是最后一页，则追加数据
            if (!$scope.loadNextPage) {
                $scope.msgs.push(jsonObj);
                chatMessageBoxObj.animate({ scrollTop: chatMessageObj.height()}, 100);
            }
            tempMsg.content.buf = {"size": size, "binaryStr": audio, "timeSize": timeSize};

            delete tempMsg.basic.userName;
            delete tempMsg.basic.head;
            delete tempMsg.atMembers;
            $scope.socket.emit('distributeAudioMessage', tempMsg);
            // 设定 20 秒后发送失败则显示失败状态
            $timeout(function () {
                var length = $scope.msgs.length;
                for (var i = length - 1; i >= 0; i--) {
                    // 如果是我发送的消息、keyId存在，且keyId为当前超时的keyId值，则将其设置为失败
                    if ($scope.msgs[i].keyId && $scope.msgs[i].keyId == "send" + tempCount + "1") {
                        $scope.msgs[i].isLoading = false;
                        $scope.msgs[i].isFailed = true;
                        break;
                    }
                }
            }, 20000);
        });
    };
    // 发送消息前初始化消息对象
    function initMsg(userCookie) {
        var tempMsg = {};
        tempMsg.basic = {};
        tempMsg.basic.userId = userCookie.id;
        tempMsg.basic.userName = userCookie.basic.userName;
        tempMsg.basic.head = userCookie.basic.head;
        tempMsg.basic.groupId = $scope.id;
        tempMsg.basic.type = 'groupChat';
        tempMsg.content = {};
        tempMsg.content.text = "";
        tempMsg.content.file = [];
        tempMsg.atMembers = [];
        return tempMsg;
    }

    /*循环消息数组，按顺序发送消息
     msgList: 发送的消息列表
     count: 进入此组后发送消息的次数
     */
    function sendMsg(msgList, count, allAtMembers) {
        var time = 0;
        msgList.forEach(function (item, key) {
            if (item.content.text) {
                item.content.text = replaceUrl(item.content.text, 0).replaceAll("<a", "<a target='_blank'");
            }
            // 给对应消息添加@用户列表
            var atMembers = [];                 //存储此条消息@人员数组
            allAtMembers.forEach(function (item1) {
                if (item.content.text.indexOf(item1.userId) > -1) {
                    atMembers.push(item1);
                }
            });
            item.atMembers = atMembers;
            // 删除无用静态数据
            delete item.basic.head;
            delete item.basic.userName;
            setTimeout(function () {
                //广播发消息
                $scope.socket.emit('distributeMessage', item);
            }, time);
            // 如果此条消息为带附件的，则下一条消息延迟300ms发送，如果此条消息为文字的，则下一条消息延迟30ms发送; 为确保上一条消息已发送成功
            time = item.content.text ? time + 30 : time + 400;
        });
        // 设定 20 秒后发送失败则显示失败状态
        $scope["send" + count + "Timer"] = $timeout(function () {
            var length = $scope.msgs.length;
            for (var i = length - 1; i >= 0; i--) {
                // 如果是我发送的消息、keyId存在，且keyId为当前超时的keyId值，则将其设置为失败
                if ($scope.msgs[i].keyId && $scope.msgs[i].keyId.indexOf("send" + count) > -1) {
                    $scope.msgs[i].isLoading = false;
                    $scope.msgs[i].isFailed = true;
                }
            }
        }, 20000);
    }

    // 替换自己发送消息为真实消息
    function trimSendMsg(msg) {
        var length = $scope.msgs.length;
        for (var i = length - 1; i >= 0; i--) {
            if ($scope.msgs[i].keyId == msg.keyId) {
                delete msg.keyId;
                $scope.msgs.splice(i, 1, msg);
                $scope.startNo++;
                break;
            }
        }
        $scope.$apply();
    }

    //发消息快捷键
    sendBoxObj.bind('keydown', function (event) {
        var isAtEnter = $("#atwho-ground-inputor .atwho-view").is(':visible');
        if (!event.shiftKey && event.keyCode == 13 && !isAtEnter) {
            event.preventDefault();
            $scope.sendSelfMsg();
            $scope.$apply();
        }
    });

    // 接收消息
    $scope.socket.on('receiveMessage', function (message) {
//        console.log('收到新信息');
//        console.log(message);
        // 刷新公告
        if (message.basic.type == 'announcement') {
            lastAnnouncement();
        }
        // 整理时间的显示
        var time = nowTime - new Date(message.basic.publishTime);
        var timeResult = parseInt(time / chatTime);
        if (!timeArrayObject[timeResult]) {
            timeArrayObject[timeResult] = true;
            message.showTime = true;
        }
        var userCookieId = cookie.get('userid');
        message.isSelf = message.basic.userId == userCookieId ? true : false;
        if (message.isSelf) {
            $timeout.cancel($scope[message.keyId + "Timer"]);
            sendBoxObj.html("");	//清空消息
            sendBoxObj.blur();	//失去焦点
            sendBoxObj.focus();	//获取焦点(实现重新加载@人列表)
            uploader.clearQueue();
            // 如果是最后一页，则替换数据
            if (!$scope.loadNextPage && message.basic.type == 'groupChat') {
                trimSendMsg(message);
            } else if ($scope.loadNextPage) {
                $rootScope.$broadcast("alertMsg", "您当前显示不是最后一页，可手动加载新数据！");
            } else if (!$scope.loadNextPage) {
                $scope.msgs.splice($scope.msgs.length, 0, message);
                $scope.startNo++;
                $scope.$apply();
            }
            var chat = chatMessageObj;
            chatMessageBoxObj.animate({ scrollTop: chat.height()}, 100);
            return;
        }
        delete message.keyId;   //删除其keyId，防止其他人再发送和我发送的消息的keyId冲突
        // 整理@信息
        if (message.basic.type == 'groupChat' && message.atMembers) {
            for (var m = 0; m < message.atMembers.length; m++) {
                if (message.atMembers[m].userId == userCookieId || message.atMembers[m].userId == 'allId') {
                    $scope.atMessage = message;
                    $scope.hasAtMe = true;
                    $scope.atMessages.splice(0, 0, message);
                    $scope.$apply();
                }
            }
        }
        // 当前展示最后一页
        if (!$scope.loadNextPage) {
            $scope.msgs.splice($scope.msgs.length, 0, message);
            $scope.startNo++;
            $scope.$apply();
            // 新消息声音提醒
            iNotify.player();
            $scope.isAlert = true;
            $scope.otherUserName = message.basic.userName;
            $scope.$apply();
            setTimeout(function () {
                $scope.isAlert = false;
                var chat = chatMessageObj;
                chatMessageBoxObj.animate({ scrollTop: chat.height()}, 100);
                $scope.$apply();
            }, '3000');
        } else {
            $scope.isAlert = true;
            $scope.otherUserName = message.basic.userName;
            $scope.$apply();
        }
    });
    //收到修改用户信息的广播
    $scope.socket.on('receiveUpdateUser', function (user) {
        $scope.msgs.forEach(function (msg, i) {
            if (msg.basic.userId == user.id) {
                msg.basic.head = user.basic.head;
            }
        });
        $scope.$apply();
        getMembers();
    });
    //撤回消息
    var lastOtherMsgIndex = 0;
    $scope.recallMsg = function (msgIndex, msgId) {
        // console.log(msgIndex+"   "+msgId);
        for (var i = msgIndex; i < $scope.msgs.length; i++) {
            if (msgIndex == i) {
                continue;
            }
            if ($scope.msgs[i].isSelf === false) {
                lastOtherMsgIndex = i;
            }
        }
        // 如果此条消息之后有别人发送的消息 或者 30条之前的消息，不允许撤回
        if (msgIndex - lastOtherMsgIndex < 0) {
            $rootScope.$broadcast('alertMsg', "已有其他人发言，不允许撤回");
        } else if ($scope.msgs.length - msgIndex - 1 > recallMsgNo) {
            $rootScope.$broadcast('alertMsg', "之后消息超过" + recallMsgNo + "条，不允许撤回");
        }
        /*if((msgIndex-lastOtherMsgIndex<0)||($scope.msgs.length-msgIndex-1>recallMsgNo)){
         // alert("已过时，不允许撤回");
         $rootScope.$broadcast('alertMsg',"已过时，不允许撤回");
         }*/ else {
            // console.log("=======撤回=======");
            $scope.socket.emit('askForUndo', msgId);
        }
    };
    // 撤回成功
    $scope.socket.on('undo', function (message) {
        for (var i = $scope.msgs.length; i > $scope.msgs.length - 40; i--) {
            // console.log(message.id+";"+$scope.msgs[i-1].id);
            if ($scope.msgs[i - 1].id == message.id) {
                $scope.msgs[i - 1].content.text = "此条信息已删除";
                $scope.msgs[i - 1].content.file = [];
                $scope.msgs[i - 1].basic.type = "text";
                $scope.$apply();
                break;
            }
        }
    });
    // 撤回失败
    $scope.socket.on('undoFail', function (msgId) {
        // alert("不允许撤回");
        $rootScope.$broadcast("alertMsg", "不允许撤回！");
    });

    //收藏
    $scope.addCollect = function (id) {
        extendsResource.base(collectRestful).update({id: id}, {}, function (data) {
            $rootScope.$broadcast("alertMsg", data.msg);
        });
    };

    // 查看对应@提到我的消息
    $scope.readAt = function (id) {
        for (var i = 0; i < $scope.atMessages.length; i++) {
            if (id == $scope.atMessages[i].id) {
                var msgDom = $('.' + $scope.atMessages[i].id);
                if (msgDom.html() == undefined) {
                    $scope.msgs = [];
                    lazyLoadMessages = [];
                    lazyNextLoadMessages = [];
                    chatAtId = id;
                    loadAtInformation();
                } else {
                    var msgOffset = msgDom.offset().top;
                    var chatOffset = chatMessageBoxObj.offset().top;
                    var chatScrollTop = chatMessageBoxObj.scrollTop();
                    chatMessageBoxObj.animate({scrollTop: msgOffset - chatOffset + chatScrollTop});
                }
                $scope.atMessages.splice(i, 1);
                break;
            }
        }
        if ($scope.atMessages.length > 0) {
            $scope.atMessage = $scope.atMessages[0];
        } else {
            $scope.atMessage = null;
            $scope.hasAtMe = false;
        }
    };
    // 关闭@我的提醒
    $scope.close = function () {
        $scope.atMessage = null;
        $scope.hasAtMe = false;
        $scope.atMessages = [];
    };
    // 查看最新消息
    $scope.readNewMsg = function () {
        if (!$scope.loadNextPage) {
            $scope.isAlert = false;
            var chat = chatMessageObj;
            chatMessageBoxObj.animate({ scrollTop: chat.height()}, 100);
            return;
        }
        isStart = false;
        $scope.msgs = [];
        lazyLoadMessages = [];
        lazyNextLoadMessages = [];
        $scope.startNo = 0;
        $scope.loadNextPage = false;
        chatAtId = null;
        $scope.isSign = false;
        loadInitList($scope.lastExitTime);
        $scope.isAlert = false;
    };

    // 获取@用户列表
    function getAtMembers() {
        var items = sendBoxObj.atwho('getInsertedItems');
        var tempItems = [];
        // 判断是否数组
        if (items instanceof Array) {
            // 整理选择@数组
            items.forEach(function (item) {
                var isHave = false;
                tempItems.forEach(function (it) {
                    if (item.userId == it.userId) {
                        isHave = true;
                    }
                });
                if (!isHave) {
                    var tempJson = {};
                    tempJson.userId = item.userId;
                    tempItems.push(tempJson);
                }
            });
        }
        return tempItems;
    }

    // 初始化消息列表
    function loadInitList(lastExitTime) {
        // console.log(lastExitTime);
        overlayerStart();
        var condition = {'groupId': $scope.id, 'startNO': $scope.startNo, 'number': needMsgNumber};
        extendsResource.base(loadMsgRestful).query(condition, function (datas) {
            // console.log(datas);
            trimData(datas);
            $scope.isLoad = false;
            chatMessageBoxObj.animate({ scrollTop: 10000}, 1000);
            $scope.needLazyMessages = true;
            $timeout(function () {
                overlayerEnd();
            }, 300);
            // $scope.needNextLazyMessages=true;
        });

        //@提到我的消息，提示未读消息中最后一条@我的信息
        var atCondition = {"id": $scope.id, "exitTime": lastExitTime};
        extendsResource.extend(unReadAtlistRestful).query(atCondition, function (datas) {
            // console.log(datas);
            if (!$scope.hasAtMe && datas.list.length > 0) {
                $scope.atMessage = datas.list[0];
                $scope.hasAtMe = true;
                $scope.atMessages = datas.list;
            }
        });
    }

    // 定位@提到我的消息
    function loadAtInformation(lastExitTime) {
        // console.log(lastExitTime);
        var condition = {'groupId': $scope.id, 'informationId': chatAtId, 'pageNo': needMsgNumber};
        extendsResource.extend(loadAtMsgRestful).query(condition, function (datas) {
            // console.log(datas);
            trimData(datas.list);
            $scope.startNo = datas.index + needMsgNumber + 1;	//此条信息的下标
            $scope.endNo = datas.index;
            $scope.isLoad = false;
            chatMessageBoxObj.animate({ scrollTop: 10000}, 1000);
            $scope.needLazyMessages = true;
            $scope.needNextLazyMessages = true;
        });

        //@提到我的消息，提示未读消息中最后一条@我的信息
        if (lastExitTime) {
            var atCondition = {"id": $scope.id, "exitTime": lastExitTime};
            extendsResource.extend(unReadAtlistRestful).query(atCondition, function (datas) {
                // console.log(datas);
                datas.list.forEach(function (item) {
                    if (item.id != chatAtId) {
                        $scope.atMessage = item;
                        $scope.hasAtMe = true;
                        $scope.atMessages.push(item);
                    }
                });
            });
        }
    }

    //延迟加载部分
    var lazyLoadMessages = [];
    var lazyNextLoadMessages = [];
    $scope.needLazyMessages = false;
    $scope.needNextLazyMessages = false;
    $scope.needLoadLazyToHtml = false;

    // 上一页预加载
    $scope.$watch("needLazyMessages", function () {
        if ($scope.needLazyMessages === true) {
            setTimeout(function () {
                getOldMessagesForLazyLoad();
            }, "0");
        }
        if ($scope.needLoadLazyToHtml === true && $scope.needLazyMessages === false) {	// !$scope.needLazyMessages代表延迟数据没加载回来
            setTimeout(function () {
                loadLazyMessagetoHtml();
            }, "0");
        }
    });
    // 下一页预加载
    $scope.$watch("needNextLazyMessages", function () {
        if ($scope.needNextLazyMessages === true) {
            setTimeout(function () {
                getNextMessagesForLazyLoad();
            }, "0");
        }
    });
    // 显示
    $scope.$watch("needLoadLazyToHtml", function () {
        if ($scope.needLoadLazyToHtml === true && $scope.needLazyMessages === false) {	// !$scope.needLazyMessages代表延迟数据没加载回来
            setTimeout(function () {
                loadLazyMessagetoHtml();
            }, "0");
        }
    });
    // 加载数据（向上加载）
    function getOldMessagesForLazyLoad() {
        var condition = {'groupId': $scope.id, 'startNO': $scope.startNo, 'number': needMsgNumber};
        extendsResource.base(loadMsgRestful).query(condition, function (datas) {
            $scope.needLazyMessages = false;
            lazyLoadMessages = datas;
        });
    }

    // 加载数据（向下加载）
    function getNextMessagesForLazyLoad() {
        var loadStartNO = $scope.endNo - needMsgNumber;
        var loadNumber = needMsgNumber;
        if ($scope.endNo - needMsgNumber < 0) {
            loadStartNO = 0;
            loadNumber = $scope.endNo;
        }
        if (loadNumber > 0) {
            var condition = {'groupId': $scope.id, 'startNO': loadStartNO, 'number': loadNumber};
            extendsResource.base(loadMsgRestful).query(condition, function (datas) {
                // console.log(datas);
                $scope.needNextLazyMessages = false;
                lazyNextLoadMessages = datas;
                if (datas.length > 0) {
                    $scope.loadNextPage = true;
                }
            });
        }
    }

    // 加载上一页显示
    function loadLazyMessagetoHtml() {
        var data = lazyLoadMessages;
        if (data.length > 0) {
            trimData(data);
            $scope.loadOld++;
            $scope.needLoadLazyToHtml = false;
            $scope.needLazyMessages = true;
            $scope.isLoad = false;
        }
        $scope.$apply();
    }

    // 下一页显示
    $scope.nextPage = function () {
        $scope.loadNextPage = false;
        var data = lazyNextLoadMessages;
        if (data.length > 0) {
            trimData(data, 'nextPage');
            // $scope.loadOld++;
            $scope.needNextLazyMessages = true;
            $scope.isLoad = false;
        }
    };

    //鼠标上划，load old msgList
    $scope.loadOld = 0;
    var loadOld = 0;
    var chatHeight = 0;
    var isStart = true;
    chatMessageBoxObj.scroll(function () {
        var scrollTop = chatMessageBoxObj.scrollTop();
        if (scrollTop === 0 && isStart) {
            // console.log('加载历史...');
            isStart = false;
            var chat = chatMessageObj;
            chatHeight = chat.height();
            $scope.needLoadLazyToHtml = true;
            isStart = true;
            if (lazyLoadMessages.length > 0) {
                $scope.isLoad = true;
            }
            $scope.$apply();
            //console.log(chat.height());
        }
        $scope.$watch("loadOld", function () {
            setTimeout(function () {
                if ($scope.loadOld != loadOld) {
                    var chat = chatMessageObj;
                    loadOld = $scope.loadOld;
                    var h = chat.height() - chatHeight;
                    chatMessageBoxObj.animate({ scrollTop: h}, 100);
                    chatHeight = chat.height();
                }
            }, "0");
        });
    });

    //右边栏人员
    function getMembers() {
        var condition = {"groupId": $scope.id};
        extendsResource.extend(memberRestful).query(condition, function (data) {
            var userCookieId = cookie.get("userid");
            data.list.forEach(function(item){
                if((item.id !== userCookieId && item.groupOnline == 'invisible') || !item.groupOnline){
                    item.groupOnline = "logout";
                }
            });
            $scope.members = data.list;
            $scope.$parent.groupMembers = data.list;
            $scope.memNum = data.count;
            $scope.onlineNum = data.onlineCount;
        });
    }

    // 加好友
    $scope.select = function (user) {
        // event.stopPropagation();
        extendsResource.extend(userRestful).query({"contactValue": user.contactValue}, function (data) {
            // console.log(data);
            if (data.msg) {
                $rootScope.$broadcast("alertMsg", data.msg);
            } else {
                $scope.selectUser = user;
                var userCookieId = cookie.get("userid");
                getCookieUser(userCookieId, extendsResource, function (cookieUser) {
                    $scope.sendText = "我是" + cookieUser.basic.userName;
                    $('.popover-add-friend').show();
                });
            }
        });
    };
    $scope.addUserToFriend = function (user, noteName, sendText) {
        var value = {"contactValue": user.contactValue, "userId": user.id, "nickName": noteName, "text": sendText};
        extendsResource.base(addFriendRestful).save(value, function (msg) {
            // alert(msg.msg);
            $rootScope.$broadcast("alertMsg", msg.msg);
            if (msg.status == "success") {
                $scope.noteName = "";
                $scope.sendText = "";
                $scope.selectUser = null;
                $('.popover-add-friend').hide();
            }
        });
    };
    // 最新公告
    function lastAnnouncement() {
        var value = {"type": 'new', "groupId": $scope.id, 'pageNo': 1, 'pageSize': 3};
        extendsResource.extend(announcementRestful).query(value, function (datas) {
            $scope.latestAnnouncementLists = datas.list;
        });
    }

    var nowTime = new Date();   // 标记进入组的时间
    var timeArrayObject = {};   //记录已显示的时间
    // 消息数据整理
    function trimData(data, loadType) {
        // console.log($scope.lastExitTime)
        var userCookieId = cookie.get('userid');
        if (loadType) {
            data.reverse();
        }
        for (var i = 0; i < data.length; i++) {
            var postData = data[i];
            postData.isSelf = postData.basic.userId == userCookieId ? true : false;
            //$scope.msgs.push(msg);
            postData.isSign = false;
            if (!$scope.isSign && ((!chatAtId && $scope.lastExitTime >= postData.basic.publishTime) || (chatAtId && $scope.lastExitTime <= postData.basic.publishTime))) {
                var signData = {};
                signData.basic = {};
                signData.content = {};
                signData.isSign = true;
                signData.basic.userName = "";
                signData.content.msg = "历史信息";
                if (loadType) {
                    // 向下加载，追加
                    $scope.msgs.push(signData);
                } else {
                    $scope.msgs.splice(0, 0, signData);
                }
                $scope.isSign = true;
            }
            if (postData.basic.type == 'groupChat') {
                //撤回判断
                if (postData.basic.undo === true) {
                    postData.content.text = "此条信息已删除";
                    postData.content.file = [];
                    postData.basic.type = "text";
                }
            }
            if (loadType) {
                // 向下加载，追加
                $scope.msgs.push(postData);
                $scope.endNo--;
            } else {
                $scope.msgs.splice(0, 0, postData);
                $scope.startNo++;
            }
            // 整理时间的显示
            var time = nowTime - new Date(postData.basic.publishTime);
            var timeResult = parseInt(time / chatTime);
            if (!timeArrayObject[timeResult]) {
                timeArrayObject[timeResult] = true;
                if (loadType) {
                    // 向下加载，追加
                    $scope.msgs[$scope.msgs.length - 1].showTime = true;
                } else if (chatAtId) {
                    // @进入初始化
                    $scope.msgs[0].showTime = true;
                } else if ($scope.startNo > 1) {
                    // 其他初始化
                    $scope.msgs[1].showTime = true;
                }
            }
        }
    }

    //点击头像@功能
    $scope.clickAt = function (userInfo) {
        var userCookieId = cookie.get('userid');
        if (userInfo.userId == userCookieId) {
            sendBoxObj.focus();
            $rootScope.$broadcast('alertMsg', "不能@自己！");
            return;
        }
        if (sendBoxObj.html() == '<br>') {
            sendBoxObj.html("");
        }
        // 给字符串添加data
        var str = "<span contenteditable='false' class='atwho-view-flag atwho-view-flag-at-mentions " + userInfo.userId + "'><span><a alt='" + userInfo.userName + "' class='site-message-alt-name'>@" + userInfo.userName + "</a></span><span contenteditable='false'> &nbsp;</span></span>";
        var tempJson1 = {};
        tempJson1.userId = userInfo.userId;
        var strData = $(str).data('atwho-data-item', tempJson1);
        setPosition(groupSendTextBoxId, strData[0]);
    };

    // @初始化（页面对于）
    /*$scope.$parent.initChatAt = function() {
        $timeout(function(){
            sendBoxObj.atwho('run').atwho({
                at: "@",
                start_with_space: false,
                alias: "at-mentions",
                search_key: "spell|name",
                tpl: "<li data-value='${atwho-at}${name}'>${name}(${contactValue})</li>",
                // href='#/myInfo/${userId}/'
                insert_tpl: "<span><a class='site-message-alt-name' alt='${name}'>${atwho-data-value}</a></span>",
                'callbacks': {
                    remote_filter: function (query, callback) {
                        callback(null)
                    }
                }
            }).on('focus', function (e) {
    //        console.log("focus");
                $timeout(function () {
                    var userCookieId = cookie.get('userid');
                    var condition = {"groupId": $scope.id};
                    extendsResource.base(atListRestful).query(condition, function (datas) {
                        var members = datas;
                        var _users = [allValue];
                        members.forEach(function (item) {
                            item.contactInformation.forEach(function (it) {
                                if (it.registerTag == 'true') {
                                    item.contactValue = it.contactValue;
                                }
                            });
                            if (item.id != userCookieId) {
                                _users.push(item);
                            }
                        });
                        var relationData = _users;
                        relationData = $.map(relationData, function (value, i) {
                            return {id: i, 'name': value.basic.userName, 'userId': value.id, 'spell': value.basic.spell, 'contactValue': value.contactValue};
                        });
                        sendBoxObj.atwho('load', "at-mentions", relationData);
                    });
                }, 300)

            }).one('matched-at-mentions.atwho', function (e, key, query) {
                //console.log("matched-at-mentions.atwho")
            }).one('matched.atwho', function (e) {
                //console.log("matched.atwho")
            });
        }, 1000);
    };*/

    var uploader = $scope.uploader = new FileUploader({
        autoUpload: false,
        url: "file-upload?groupId="+$scope.id
    });
    // FILTERS
    uploader.filters.push({
        name: 'customFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            return this.queue.length < 10;
        }
    });
    uploader.filters.push({
        name: 'typeFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.name.slice(item.name.lastIndexOf('.') + 1) + '|';
            return '|flv|mp4|wmv|avi|3gp|rmvb|mkv|'.indexOf(type) == -1;
        }
    });
    uploader.filters.push({
        name: 'sizeFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            return item.size <= 25 * 1024 * 1024;
        }
    });
    uploader.onAfterAddingFile = function (fileItem) {
        console.info('onAfterAddingFile', fileItem);
        var postfix = fileItem.file.name.match(/^(.*)(\.)(.{1,8})$/)[3].toLowerCase();
        var fileSrc = "";
        if (postfix == "gif" || postfix == "jpeg" || postfix == "jpg" || postfix == "png") {
            var reader = new FileReader();
            reader.onload = function (event) {
                fileSrc = event.target.result;
                // 放入输入框
                var image = '<img style="display:inline;vertical-align:bottom;" class="media-object insert-image" src="' + fileSrc + '" >';
                var imgNode = $(image).data('file', fileItem).data('url', fileSrc);
                // 输入框插入缩略图
                var elemId = groupSendTextBoxId;
                setPosition(elemId, imgNode[0]);
                $('#' + elemId).animate({ scrollTop: 40}, 0);
            };
            reader.readAsDataURL(fileItem._file);
            return;
        }
        else if (postfix == "html" || postfix == "htm") {
            fileSrc = 'images/html.png';
        }
        else if (postfix == "xls" || postfix == "xlsx") {
            fileSrc = 'images/excel.png';
        }
        else if (postfix == "mp3" || postfix == "wma") {
            fileSrc = 'images/music.png';
        }
        else if (postfix == "ppt" || postfix == "pptx") {
            fileSrc = 'images/ppt.png';
        }
        else if (postfix == "txt" || postfix == "gnt") {
            fileSrc = 'images/text.png';
        }
        else if (postfix == "doc" || postfix == "docx") {
            fileSrc = 'images/word.png';
        }
        else if (postfix == "zip" || postfix == "rar" || postfix == "jar" || postfix == "tar") {
            fileSrc = 'images/zip.png';
        }
        else if (postfix == "pdf") {
            fileSrc = 'images/pdf.png';
        }
        else {
            fileSrc = 'images/unknown.png';
        }
        // 放入输入框
        var image = '<img style="display:inline;vertical-align:bottom;" class="media-object insert-image" src="' + fileSrc + '" >';
        var imgNode = $(image).data('file', fileItem).data('url', fileSrc);
        // 输入框插入缩略图
        var elemId = groupSendTextBoxId;
        setPosition(elemId, imgNode[0]);
        $('#' + elemId).animate({ scrollTop: 50}, 0);
    };
    // CALLBACKS
    uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
        // console.info('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
        // console.info('onCompleteItem', fileItem, response, status, headers);
    };
    uploader.onCompleteAll = function () {
        console.info('onCompleteAll');
    };

    // 获取上传列表
    function getFiles() {
        var urls = [];
        var datas = [];
        var items = $.map(sendBoxObj.find("img.media-object"), function (item) {
            var data = $(item).data('file');
            urls.push($(item).data('url'));
            datas.push(data);
            return data;
        });
//    return items;
        return [datas, urls];
    }

    // 点击人，私聊
    $scope.getPrivateChat = function (user) {
        var userCookieId = cookie.get('userid');
        if (userCookieId != user.id) {
            var tempUser = {'id': user.id, 'head': user.basic.head, 'userName': user.basic.userName};
            $rootScope.$broadcast("privateChat", tempUser);
        }
    };

    // 举报
    $scope.selectReport = function (user) {
        // event.stopPropagation();
        $scope.reportUser = user;
        $scope.reportText = '';
        $('.popover-report-group-member').show();
    };
    // 提交举报信息（提交一条举报信息 type:'groupReport'）
    $scope.submitReport = function (user, reportText) {
        var userCookieId = cookie.get("userid");
        getCookieUser(userCookieId, extendsResource, function (cookieUser) {
            var str = cookieUser.basic.userName + " 举报 " + user.basic.userName;
            var value = {};
            value.basic = {'userId': userCookieId, 'toId': user.id, 'type': 'groupReport', 'groupId': $scope.id};
            value.content = {"text": reportText, 'notice': str};
            extendsResource.base(reportRestful).save(value, function (data) {
                if (data.status == 'success') {
                    $('.popover-report-group-member').hide();
                } else {
                    $rootScope.$broadcast("alertMsg", data.msg);
                }
            });
        });

    };

    var playAudioObj = {};  // 记录正在播放的语音
    // 播放语音
    $scope.audioPlay = function (audioClass, msg) {
        // 对未停止播放的语音做暂停处理
        if (playAudioObj.className) {
            playAudioObj.className.pause();
            playAudioObj.className.currentTime = 0;
            playAudioObj.msg.isPlay = false;
        }
        if(!playAudioObj.msg || msg.id !== playAudioObj.msg.id){
            var audioObj = $("." + audioClass + " audio")[0];
            // 记录新的播放语音
            playAudioObj.className = audioObj;
            playAudioObj.msg = msg;
            // 播放
            audioObj.play();
            msg.isPlay = true;
            // 监听播放完毕
            audioObj.addEventListener("ended", function () {
                $scope.$apply(function () {
                    msg.isPlay = false;
                    audioObj.currentTime = 0;
                    playAudioObj = {};      // 清空正则播放的语音记录
                });
            }, true);//true表示事件机制采用事件捕获  从上到下捕获
        }else{
            playAudioObj = {};
        }
    };

    // 停止播放语音
    $scope.audioStop = function (audioClass, msg) {
        var audioObj = $("." + audioClass + " audio")[0];
        audioObj.pause();
        audioObj.currentTime = 0; //只能通过设置当前播放时间的形式来实现
        msg.isPlay = false;
        playAudioObj = {};  // 清空正则播放的语音记录
    };

    // 人员列表右键
    $scope.onRightClick = function (message) {
        message.isClick = true;
    };
    $scope.onCloseRightClick = function (message) {
        message.isClick = false;
    };

    //加入推荐群组
    $scope.joinGroup = function(id){
        var joinGroupRestful = prefixGroupUrl + "/groupDirect/" + id;
        var userCookieId = cookie.get("userid");

        extendsResource.extend(joinGroupRestful).save({},function(data){
            $rootScope.$broadcast("alertMsg",data.msg);
            var msg='';
            getCookieUser(userCookieId, extendsResource, function (cookieUser) {
                if(data.status=='wait'){
                    msg = cookieUser.basic.userName+" 请求加入群组，等待审核...";
                }else if(data.status=='success'){
                    $scope.$emit("groupAdd"); // 广播 或者 循环列表只刷新当前数据
                    msg = cookieUser.basic.userName+" 加入群组";
                }
                if(data.status=='wait' || data.status=='success'){
                    // var socket = io.connect({forceNew:true});
                    var socket = io.connect(socketUrl+'groupConnect',{forceNew:true});
                    //初始化
                    socket.on('welcome',function() {
                        socket.emit('init',{groupId:id,userId:userCookieId});
                    });
                    $timeout(function(){
                        var message = {};
                        message.basic = {};
                        message.basic.userId = userCookieId;
                        message.basic.groupId = id;
                        message.basic.type = 'remind';
                        message.content = {};
                        message.content.text = msg;
                        message.content.file=[];
                        message.atMembers=[];
                        // console.log(message);
                        // 广播发消息
                        socket.emit('memberChange');		//刷新人员
                        socket.emit('distributeMessage',message);
                        socket.disconnect();
                        // socket.emit('exitGroup',id);
                    },1000);
                }
            });
        });
        $('.group-join').modal('hide');
    };

    $scope.setGroupInfo = function(id){
        var groupRestful=prefixGroupUrl+"/get/" + id;
        extendsResource.extend(groupRestful).get({'id':id},function(data){
            $scope.groupInfo = data;
        });
    };

}]);