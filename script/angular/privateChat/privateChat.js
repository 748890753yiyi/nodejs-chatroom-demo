/* 
 私聊的操作：
 聊天的人员列表；
 切换显示；
 聊天记录、发消息；
 */
mainApp.controller('privateChatCtr', ['$scope', '$rootScope', 'cookie', 'FileUploader', '$http', 'extendsResource', function ($scope, $rootScope, cookie, FileUploader, $http, extendsResource) {
    var loadMsgRestful = prefixPrivateChatUrl + "/message/:id",
        unreadTotalRestful = prefixPrivateChatUrl + "/findNoReadMsgCount/:id",
        chatUserListRestful = prefixPrivateChatUrl + "/messageList",
        updateListRestful = prefixPrivateChatUrl + "/updateMessageState",

        chatHeight = 0,
        lazyLoadMessages = [],
        sendTextBoxId = "privateMsgInputor",        //输入框id
        chatMessageBoxId = "private-chat-messages", //聊天界面id
        chatMessageId = "private-chatUL";           //每条消息的id
    $scope.chatUserList = [];   //定义与我聊天的人员列表
    // 初始化聊天
    $scope.$parent.initChat = function (newUser) {
        // 切换聊天，断开之前的socket
        if ($scope.onChatUser && $scope.onChatUser.id != newUser.id) {
            updateState();
            $scope.privateSocket.disconnect();
        }
        // 不是同一个人则重新连接socket
        if ($scope.onChatUser && $scope.onChatUser.id != newUser.id || !$scope.onChatUser) {
            newUser.count = 0;
            // 判断是否已存在列表，不存在则追加
            var isIn = false;
            $scope.chatUserList.forEach(function (item) {
                if (item.id == newUser.id) {
                    isIn = true;
                }
            });
            if (!isIn) {
                $scope.chatUserList.splice(0, 0, newUser);
            }

            // 连接socket
            $scope.privateSocket = io.connect(socketUrl + 'privateConnection', {forceNew: true});
            //初始化
            $scope.privateSocket.on('welcomeP2P', function () {
                // var userCookieId = cookie.get('userid');
                // $scope.privateSocket.emit('p2pInit',{fromId:userCookieId,toId:newUser.id});	//参数chatUserId代表与我聊天的人id
            });
            $scope.onChatUser = newUser;	//定义正在与我聊天人员

            //初始化变量
            $scope.startNo = 0;
            $scope.privateMsgs = [];
            uploader.clearQueue();
            // 是否标记未读界限
            $scope.isSign = false;
            chatHeight = 0;
            //延迟加载部分
            lazyLoadMessages = [];
            $scope.needLazyMessages = false;
            $scope.needLoadLazyToHtml = false;
            nowTime = new Date();   // 标记进入组的时间
            timeArrayObject = {};   //记录已显示的时间

            // 初始化聊天记录
            initMsgList();

            // privateSocket 事件监听
            // 接收消息(对应每一个用户唯一的接收消息事件名)
            $("#" + sendTextBoxId).focus(function () {
                $scope.isSending = false;
            });
            var userCookieId = cookie.get('userid');
            $scope.privateSocket.on('to' + userCookieId, function (message) {
                var userCookieId = cookie.get('userid');
                if (message.basic.fromId != userCookieId && message.basic.fromId != $scope.onChatUser.id) {
                    return;
                }
                // 别人发送的消息修改未读状态
                if (message.basic.fromId == $scope.onChatUser.id) {
                    // 发送修改广播
                    $scope.privateSocket.emit('p2pUpdateMessage', message);
                    // 新消息声音提醒
                    iNotify.player();
                }
                // 整理时间的显示
                var time = nowTime - new Date(message.basic.publishTime);
                var timeResult = parseInt(time / chatTime);
                if (!timeArrayObject[timeResult]) {
                    timeArrayObject[timeResult] = true;
                    message.showTime = true;
                }

                message.isSelf = message.basic.userId == userCookieId ? true : false;
                // 自己的消息则替换
                if (message.isSelf) {
                    $scope.isSending = false;
                    uploader.clearQueue();
                    trimSendMsg(message);
                    return;
                }
                delete message.keyId;
                // 不是自己的消息则追加
                $scope.privateMsgs.splice($scope.privateMsgs.length, 0, message);
                $scope.startNo++;
                // 滚动条
                var chat = $("#" + chatMessageId);
                $("#" + chatMessageBoxId).animate({ scrollTop: chat.height()}, 100);
                $scope.$apply();
            });
            //收到修改用户信息的广播
            $scope.privateSocket.on('receiveUpdateUser', function (user) {
                $scope.privateMsgs.forEach(function (msg, i) {
                    if (msg.id == user.id) {
                        msg.basic.head = user.basic.head;
                        msg.basic.userName = user.basic.userName;
                    }
                });
                $scope.$apply();
            });
        }
        // 显示聊天列表
        $(".messages-folder").next().children(".messages-expand").css({"transform": "rotate(0deg)", "bottom": 0});
    };

    // 关闭私聊窗口
    $scope.closePrivateChat = function () {
        updateState();
        $scope.privateSocket.disconnect();
        $scope.onChatUser = null;
    };

    // 关闭和某人的交流窗口(length>1时显示单个关闭按钮，length==1时只有最外层关闭按钮)
    $scope.closeOneChat = function (id) {
        var index = 0;	//记录下标
        for (var i = 0; i < $scope.chatUserList.length; i++) {
            if (id == $scope.chatUserList[i].id) {
                $scope.chatUserList.splice(i, 1);
                // 如果关闭的不是最后一项则记录为其下一项
                if (i < $scope.chatUserList.length) {
                    index = i;
                }
                break;
            }
        }
        // 如果关闭当前显示聊天框则重新下一个
        if ($scope.onChatUser.id == id) {
            $scope.initChat($scope.chatUserList[index]);
        }
    };

    // 初始化消息列表
    function initMsgList(id) {
        var userCookieId = cookie.get('userid');
        var condition = {'fromId': userCookieId, 'toId': $scope.onChatUser.id, 'startNO': $scope.startNo, 'number': needMsgNumber};
        extendsResource.base(loadMsgRestful).query(condition, function (datas) {
            trimData(datas);
            // $scope.isLoad=false;
            var chat = $("#" + chatMessageId);
            $("#" + chatMessageBoxId).animate({ scrollTop: 10000}, 1000);
            // 加载下一页数据
            $scope.needLazyMessages = true;
        });
    }

    // 修改相关信息（将所有消息改为已读，重新刷新未读个数）
    function updateState() {
        var userCookieId = cookie.get('userid');
        var condition = {'userId': $scope.onChatUser.id, 'toId': userCookieId};
        extendsResource.base(updateListRestful).update(condition, function (datas) {
            intervalUnread();
        });
    }

    // 滚动
    $("#" + chatMessageBoxId).scroll(function () {
        var scrollTop = $("#" + chatMessageBoxId).scrollTop();
        if (scrollTop === 0) {
            // isStart=false;
            var chat = $("#" + chatMessageId);
            chatHeight = chat.height();
            $scope.needLoadLazyToHtml = true;
            // isStart=true;
            if (lazyLoadMessages.length > 0) {
                $scope.isLoad = true;
            }
            $scope.$apply();
        }
        $scope.$watch("loadOld", function (newValue, oldValue) {
            if (newValue && !oldValue) {
                $scope.loadOld = false;
                // 滚动滚动条
                setTimeout(function () {
                    var chat = $("#" + chatMessageId);
                    var h = chat.height() - chatHeight;
                    $("#" + chatMessageBoxId).animate({ scrollTop: h}, 100);
                    chatHeight = chat.height();
                }, "0");
            }
        });
    });


    //延迟加载部分
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
        var userCookieId = cookie.get('userid');
        var condition = {'fromId': userCookieId, 'toId': $scope.onChatUser.id, 'startNO': $scope.startNo, 'number': needMsgNumber};
        extendsResource.base(loadMsgRestful).query(condition, function (datas) {
            $scope.needLazyMessages = false;
            lazyLoadMessages = datas;
        });
    }

    // 加载上一页显示
    function loadLazyMessagetoHtml() {
        var data = lazyLoadMessages;
        if (data.length > 0) {
            trimData(data);
            $scope.loadOld = true;
            $scope.needLoadLazyToHtml = false;
            $scope.needLazyMessages = true;
            $scope.isLoad = false;
        }
        $scope.$apply();
    }

    // 消息数据整理
    var nowTime = new Date();   // 标记进入组的时间
    var timeArrayObject = {};   //记录已显示的时间
    function trimData(data) {
        var userCookieId = cookie.get('userid');
        for (var i = 0; i < data.length; i++) {
            var postData = data[i];
            postData.isSelf = postData.basic.userId == userCookieId ? true : false;
            postData.isSign = false;
            if (!$scope.isSign && (postData.basic.state === true || postData.basic.userId == userCookieId)) {
                var signData = {};
                signData.basic = {};
                signData.content = {};
                signData.isSign = true;
                signData.basic.userName = "";
                signData.content.msg = "历史信息";
                $scope.privateMsgs.splice(0, 0, signData);
                $scope.isSign = true;
            }
            //撤回判断及整理文件
            if (postData.basic.undo === true) {
                postData.content.text = "此条信息已删除";
                postData.basic.type = "text";
            }
            // 整理时间的显示
            var time = nowTime - new Date(postData.basic.publishTime);
            var timeResult = parseInt(time / chatTime);
            if (!timeArrayObject[timeResult]) {
                timeArrayObject[timeResult] = true;
                postData.showTime = true;
            }
            $scope.privateMsgs.splice(0, 0, postData);
            $scope.startNo++;
        }
    }

    // 发送消息
    var sendMsgCount = 0;   // 记录发送消息次数（没发送一次加1，区分默认加载进入聊天框内的keyId，以防重复）
    $scope.sendPrivateMsg = function () {
        sendMsgCount++;
        var msg = $("#" + sendTextBoxId).html();	//获取消息
        var fileLists = getFiles();
        fileLists[1].forEach(function (item, key) {
            // 将上传的图片整体替换为 ^-upload1^- 来区分文字和图片(且确保不会出现输入内容与此相同)；upload后的数组就是图片对应的下标(顺序)
            msg = msg.replace('<img style="display:inline;vertical-align:bottom;" class="media-object insert-image" src="' + item + '">', "^-upload" + key + "^-");
        });
        var tempMsgStr = msg.replaceAll("<br>", '').replaceAll("&nbsp;", '').replaceAll(" ", '').replaceAll("<div>", '').replaceAll("</div>", '');   //去掉所有空格和换行
        if (!tempMsgStr) {
            $rootScope.$broadcast("alertMsg", "不能发送空消息");
            return;
        }
        var array = msg.split('^-');
        var sendMsgList = [];   //记录此次发送的消息数组
        var userCookieId = cookie.get("userid");
        getCookieUser(userCookieId, extendsResource, function (cookieUser) {
            array.forEach(function (item, key) {
                var trimItem = item.replaceAll("<br>", '').replaceAll("&nbsp;", '').replaceAll(" ", '').replaceAll("<div>", '').replaceAll("</div>", '');
                if (trimItem) {
                    var tempMsg = initMsg(cookieUser);
                    tempMsg.keyId = "privateSend" + sendMsgCount + key;    // 默认按下标初始化一个标识，用来替换新数据
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
                    $scope.privateMsgs.push(tempMsg);
                    sendMsgList.push(json);
                    $("#" + chatMessageBoxId).animate({ scrollTop: $("#" + chatMessageId).height()}, 100);
                }
            });
            $("#" + sendTextBoxId).html("");
            // 上传
            var count = 0;
            var userCookieId = cookie.get("userid");
            var uploadUrl = pasteuploadUrl + "?groupId=" + userCookieId;
            sendMsgList.forEach(function (item, key) {
                if (!item.content.text) {
                    var uploadFile = item.content.file[0];
                    if ((typeof uploadFile) == "string") {
                        // base64 截图上传
                        routeHttp($http, uploadUrl, {"file": uploadFile}, function (data) {
                            item.content.file[0] = data;
                            count++;
                            // 记录上传进度，完毕后发送消息
                            if (count == sendMsgList.length) {
                                sendMsg(sendMsgList, sendMsgCount);
                            }
                        });
                    } else {
                        // 选择列表上传
                        uploadFile.upload();
                        uploadFile._onSuccess = function (response, status, headers) {
                            item.content.file[0] = response;
                            count++;
                            if (count == sendMsgList.length) {
                                sendMsg(sendMsgList, sendMsgCount);
                            }
                        };
                    }
                } else if (item.content.text) {
                    count++;
                    if (count == sendMsgList.length) {
                        sendMsg(sendMsgList, sendMsgCount);
                    }
                }
            });

        });
    };
    // 发送消息前初始化消息对象
    function initMsg(userCookie) {
        var tempMsg = {};
        tempMsg.basic = {};
        tempMsg.basic.userId = userCookieId;
        tempMsg.basic.fromId = userCookieId;
        tempMsg.basic.userName = userCookie.basic.userName;
        tempMsg.basic.head = userCookie.basic.head;
        tempMsg.basic.toId = $scope.onChatUser.id;
        tempMsg.basic.type = 'privateChat';
        tempMsg.content = {};
        tempMsg.content.text = "";
        tempMsg.content.file = [];
        tempMsg.content.imageFiles = [];
        return tempMsg;
    }

    // 循环消息数组，按顺序发送消息
    function sendMsg(msgList, count) {
        var time = 0;
        msgList.forEach(function (item, key) {
            $scope.isSending = true;
            if (item.content.text) {
                item.content.text = replaceUrl(item.content.text, 0).replaceAll("<a", "<a target='_blank'");
            }
            // 删除无用静态数据
            delete item.basic.head;
            delete item.basic.userName;
            delete item.content.imageFiles;
            setTimeout(function () {
                //广播发消息
                $scope.privateSocket.emit('p2pSendMessage', item);
            }, time);
            // 如果此条消息为带附件的，则下一条消息延迟300ms发送，如果此条消息为文字的，则下一条消息延迟30ms发送; 为确保上一条消息已发送成功
            time = item.content.text ? time + 30 : time + 300;
        });
        // 设定 20 秒后发送失败则显示失败状态
        setTimeout(function () {
            var length = $scope.privateMsgs.length;
            for (var i = length - 1; i >= 0; i--) {
                if ($scope.privateMsgs[i].keyId && $scope.privateMsgs[i].keyId.indexOf("privateSend" + count) > -1) {
                    $scope.privateMsgs[i].isLoading = false;
                    $scope.privateMsgs[i].isFailed = true;
                    $scope.$apply();
                }
            }
        }, 20000);
    }

    // 替换自己发送消息为真实消息
    function trimSendMsg(msg) {
        var length = $scope.privateMsgs.length;
        for (var i = length - 1; i >= 0; i--) {
            if ($scope.privateMsgs[i].keyId == msg.keyId) {
                delete msg.keyId;
                $scope.privateMsgs.splice(i, 1, msg);
                $scope.startNo++;
                break;
            }
        }
        $scope.$apply();
    }

    // 获取上传列表
    function getFiles() {
        var urls = [];
        var datas = [];
        $.map($("#" + sendTextBoxId).find("img.media-object"), function (item) {
            var data = $(item).data('file');
            urls.push($(item).data('url'));
            datas.push(data);
            return data;
        });
        return [datas, urls];
    }

    //发消息快捷键
    $("#" + sendTextBoxId).bind('keydown', function (event) {
        if (!event.shiftKey && event.keyCode == 13) {
            event.preventDefault();
            $scope.sendPrivateMsg();
        }
    });

    // 上传
    var userCookieId = cookie.get('userid');
    var uploader = $scope.uploader = new FileUploader({
        autoUpload: false,
        url: "file-upload?groupId=" + userCookieId
    });
    // FILTERS
    uploader.filters.push({
        name: 'customFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            // console.log(item.type);
            return this.queue.length < 10;
        }
    });
    uploader.filters.push({
        name: 'typeFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.name.slice(item.name.lastIndexOf('.') + 1) + '|';
            if ('|flv|mp4|wmv|avi|3gp|rmvb|mkv|'.indexOf(type) !== -1) {
                $rootScope.$broadcast("alertMsg", "暂不允许上传视频文件！");
            }
            return '|flv|mp4|wmv|avi|3gp|rmvb|mkv|'.indexOf(type) == -1;
        }
    });
    uploader.filters.push({
        name: 'sizeFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            if (item.size > 25 * 1024 * 1024) {
                $rootScope.$broadcast("alertMsg", "此大于25M！");
            }
            return item.size <= 25 * 1024 * 1024;
        }
    });
    uploader.onAfterAddingFile = function (fileItem) {
        // console.info('onAfterAddingFile', fileItem);
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
                var elemId = sendTextBoxId;
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
        var elemId = sendTextBoxId;
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

    // 未读提醒
    function intervalUnread() {
        extendsResource.extend(unreadTotalRestful).query({}, function (data) {
            $scope.allUnreadCount = data.count;
        });
    }

    // 点击查看消息列表
    $scope.getChatList = function () {
        extendsResource.extend(chatUserListRestful).query({}, function (datas) {
            var tempArray = angular.copy($scope.chatUserList);
            datas.list.forEach(function (item) {
                var flag = false;
                for (var i = 0; i < tempArray.length; i++) {
                    var tempItem = $scope.chatUserList[i];
                    if (item.id == tempItem.id) {
                        flag = true;
                    }
                }
                // 原列表不存在此用户，则追加
                if (!flag) {
                    // var tempInform = {};
                    // tempInform.id = item.id;
                    // tempInform.head = item.basic.head;
                    // tempInform.userName = item.basic.userName;
                    // tempInform.count = item.count;
                    // $scope.chatUserList.splice(0,0,tempInform);
                    $scope.chatUserList.splice(0, 0, item);
                }
            });
            // 初始化组
            if($scope.chatUserList.length>0){
                $scope.initChat($scope.chatUserList[0]);
            }
        });
    };

    // 新消息通知（刷新个数 或 刷新左侧列表）
    $scope.$on("newMessage", function (event, data) {
        // 新消息声音提醒
        iNotify.player();
        // 整体提醒个数
        $scope.$apply(function () {
            $scope.allUnreadCount++;
        });
        if ($scope.onChatUser && data.basic.userId != $scope.onChatUser.id) {
            var flag = false;
            $scope.chatUserList.forEach(function (item) {
                // 存在此人则增加个数
                if (item.id == data.basic.userId) {
                    flag = true;
                    $scope.$apply(function () {
                        item.count++;
                    });
                }
            });
            // 不存在此人则追加
            if (!flag) {
                $scope.$apply(function () {
                    var tempInform = {};
                    tempInform.id = data.basic.fromId;
                    tempInform.head = data.basic.head;
                    tempInform.userName = data.basic.userName;
                    tempInform.count = 1;
                    $scope.chatUserList.splice(0, 0, tempInform);
                });
            }
        }
    });

    // 初始化未读条数
    intervalUnread();

}]);

