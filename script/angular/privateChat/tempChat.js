var chatApp = angular.module('chatApp', ['ivpusic.cookie', 'ngResource', 'angularFileUpload']);

chatApp = restfulFactory(chatApp);

chatApp.controller('rootCtr', ['$scope', 'cookie', function ($scope, cookie) {
    var userName = GetQueryString("userName");
    $scope.userName = (userName ? decodeURI(userName) : "");

    $scope.$on('alertMsg', function (event, msg, callback) {
        if (msg) {
            $scope.alertMsg = msg;
            $('.alert-msg').modal('show');
        }
        if (callback) {
            $scope.alertCall = callback;
        } else {
            $scope.alertCall = null;
        }
    });
    // 确认提示框
    $scope.$on('alertConfirm', function (event, msg, func) {
        if (msg.str) {
            $scope.alertConfirm = msg.str;    // 确认框显示提示
            $scope.funcMsg = msg;           //方法的参数
            $scope.submitFunc = func;       //确认的方法
            $('.alert-confirm').modal('show');
        }
    });
}]);

chatApp.controller('tradeChatCtr', ['$scope', '$rootScope', 'cookie', 'FileUploader', '$http', 'extendsResource', function ($scope, $rootScope, cookie, FileUploader, $http, extendsResource) {
    var loadMsgRestful = prefixTempChatUrl + "/tradeInitMsgList/:id",
        chatUserListRestful = prefixTempChatUrl + "/tradeInitUnreadCount",
        updateListRestful = prefixTempChatUrl + "/updateTradeState",
        checkUserRestful = prefixTempChatUrl + "/userCheck",
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
            $scope.privateSocket = io.connect(socketUrl + 'tradeConnect', {forceNew: true});
            //初始化
            $scope.privateSocket.on('welcomeTrade', function () {

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

            $scope.privateSocket.on('to' + userId, function (message) {
                if (message.basic.fromId != userId && message.basic.fromId != $scope.onChatUser.id) {
                    newMessage(message);
                    return;
                }
                // 别人发送的消息修改未读状态
                if (message.basic.fromId == $scope.onChatUser.id) {
                    // 发送修改广播
                    $scope.privateSocket.emit('tradeUpdateMessage', message);
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

                message.isSelf = message.basic.userId == userId ? true : false;
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

    // 关闭所有聊天
    /*$scope.closeAllChat = function () {
        var str = "确定关闭所有聊天 ?";
        $rootScope.$broadcast("alertConfirm", {"str": str}, closeWindow);
    };*/

    // 初始化消息列表
    function initMsgList(id) {
        var condition = {'fromId': userId, 'toId': $scope.onChatUser.id, 'startNO': $scope.startNo, 'pageSize': needMsgNumber};
        extendsResource.base(loadMsgRestful).query(condition, function (datas) {
            trimData(datas);
            // $scope.isLoad=false;
            var chat = $("#" + chatMessageId);
            $("#" + chatMessageBoxId).animate({ scrollTop: 10000}, 1000);
            // 加载下一页数据
            $scope.needLazyMessages = true;
            updateState();
        });
    }

    // 修改相关信息（将所有消息改为已读，重新刷新未读个数）
    function updateState() {
        var condition = {'userId': $scope.onChatUser.id, 'toId': userId};
        extendsResource.base(updateListRestful).update(condition, function (datas) {
//            console.log("ok");
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
        var condition = {'fromId': userId, 'toId': $scope.onChatUser.id, 'startNO': $scope.startNo, 'pageSize': needMsgNumber};
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
        for (var i = 0; i < data.length; i++) {
            var postData = data[i];
            postData.isSelf = postData.basic.userId == userId ? true : false;
            postData.isSign = false;
            if (!$scope.isSign && (postData.basic.state === true || postData.basic.userId == userId)) {
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
        array.forEach(function (item, key) {
            var trimItem = item.replaceAll("<br>", '').replaceAll("&nbsp;", '').replaceAll(" ", '').replaceAll("<div>", '').replaceAll("</div>", '');
            if (trimItem) {
                var tempMsg = initMsg();
                tempMsg.keyId = "privateSend" + sendMsgCount + key;    // 默认按下标初始化一个标识，用来替换新数据
                // 记录需要发送的消息列表
                var json = angular.copy(tempMsg);
                tempMsg.isSelf = true;
                tempMsg.isLoading = true;   // 判断是否加载状态的消息，来显示footer(撤销、收藏)
                if (item.indexOf("upload") > -1) {
                    var tempItem = item.replace("upload", "");   // 替换之后的值即为附件在上传列表中对应的下标
                    if (fileLists[0][tempItem]) {
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
                $scope.$apply();
            }
        });
        $("#" + sendTextBoxId).html("");
        // 上传
        var count = 0;
        var uploadUrl = pasteuploadUrl + "?groupId=" + userId;
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
    };
    // 发送消息前初始化消息对象
    function initMsg(userCookie) {
        var tempMsg = {};
        tempMsg.basic = {};
        tempMsg.basic.userId = userId;
        tempMsg.basic.fromId = userId;
        tempMsg.basic.userName = userName;
        tempMsg.basic.head = head;
        tempMsg.basic.toId = $scope.onChatUser.id;
        tempMsg.basic.type = 'tradeChat';
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
//            delete item.basic.head;
//            delete item.basic.userName;
            delete item.content.imageFiles;
            setTimeout(function () {
                //广播发消息
                $scope.privateSocket.emit('tradeSendMessage', item);
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
    var uploader = $scope.uploader = new FileUploader({
        autoUpload: false,
        url: "file-upload?groupId=" + userId
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
        name: 'imageFilter',
        fn: function (item /*{File|FileLikeObject}*/, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            if ('|jpg|png|jpeg|bmp|gif|'.indexOf(type) == -1) {
                $rootScope.$broadcast("alertMsg", "只允许上传图片！");
            }
            return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
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
        var fileSrc = "";
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

    // 点击查看消息列表
    $scope.getChatList = function () {
        extendsResource.base(chatUserListRestful).query({"userId": userId}, function (datas) {
            if (datas.length == 0) {
                $rootScope.$broadcast("alertMsg", "没有未读信息,关闭提示将关闭页面", function () {
                    closeWindow();
                });
                return;
            }
            var tempArray = angular.copy($scope.chatUserList);
            datas.forEach(function (item) {
                item.head = userHead;
                var flag = false;
                for (var i = 0; i < tempArray.length; i++) {
                    var tempItem = $scope.chatUserList[i];
                    if (item.id == tempItem.id) {
                        flag = true;
                    }
                }
                // 原列表不存在此用户，则追加
                if (!flag) {
                    $scope.chatUserList.splice(0, 0, item);
                }
            });
            // 初始化组
            if ($scope.chatUserList.length > 0) {
                var tempObj = $scope.chatUserList[0];
                toId = tempObj.userId;
                userName = tempObj.userName;
                head = userHead;
                $scope.initChat($scope.chatUserList[0]);
            }
        });
    };

    // 新消息通知（刷新个数 或 刷新左侧列表）
    function newMessage(data) {
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
    }

    function checkUser(tempuserId, tempuserName, temptoId, temptoName) {
        /*var value = {'id': toId, 'head': userHead, 'userName': toName};
         $scope.initChat(value);*/
        var condition = {'userId': tempuserId, 'userName': tempuserName, 'toId': temptoId, 'toName': temptoName};
        extendsResource.extend(checkUserRestful).query(condition, function (data) {
            if (data.status == "success") {
                var value = {'id': toId, 'head': userHead, 'userName': toName};
                $scope.initChat(value);
            } else {
                $rootScope.$broadcast("alertMsg", "没有会话权限,关闭提示将关闭页面", function () {
                    closeWindow();
                });
            }
        });
    }

    /* 初始化 */
    var userId, userName, toId, toName, head;
    if (window.location.search) {
        userId = GetQueryString("userId");
        userName = decodeURI(GetQueryString("userName"));
        head = userHead;
        toId = GetQueryString("toId");
        toName = decodeURI(GetQueryString("toName"));
    }
    // 初始化上传路径
    uploader.url = "file-upload?groupId=" + userId;

    var value = {'id': toId, 'head': userHead, 'userName': toName};
    $scope.initChat(value);

    // cookie存在
    /*var userCookie = cookie.get("userid");
    if (!envCheck) {
        userCookie = userId;
    }

    if (userId && userId == userCookie) {
        //参数不全
        if (userName === 'null' || (toId && toName === 'null')) {
            $rootScope.$broadcast("alertMsg", "信息不完整,关闭提示将关闭页面", function () {
                closeWindow();
            });
        } else if (toId) {
            // 有联系人
            checkUser(userId, userName, toId, toName);
        } else {
            // 没有联系人
            $scope.getChatList();
        }
    } else if (userId && userId !== userCookie) {
        // cookie不存在
        $rootScope.$broadcast("alertMsg", "请登录,关闭提示将关闭页面", function () {
            closeWindow();
        });
    } else {
        // 参数缺少
        $rootScope.$broadcast("alertMsg", "信息不完整,关闭提示将关闭页面", function () {
            closeWindow();
        });
    }*/

}]);

chatApp.directive('textPaste', ['$http', function ($http) {
    return{
        link: function (scope, elem, cttrs, ctrl) {
            var uploadUrl = cttrs.uploadUrl;    //上传路径
            try {
                document.execCommand("AutoUrlDetect", false, false);
            } catch (e) {
            }
            elem.on('paste', function (event) {
                // 先处理文字粘贴
                var text = getPasteText(event);
                if (text) {
                    //阻止默认行为即不让剪贴板内容在div中显示出来
                    event.preventDefault();
                    // 如果有文字则去格式粘贴文字
                    textPaste(text);
                    return;
                }
                // 粘贴内容不是文字(即图片)
                var result = getPasteImg(elem, event, uploadUrl, $http);
                if (result) {
                    scope.$broadcast("alertMsg", "大于25M的文件请在‘文件’页面上传！");
                }
            });
        }
    };
}]).directive('setFocus', function () {
    //获取焦点
    return function (scope, element) {
        element[0].focus();
        // 再次获取焦点时定位最后
        element.on('focus', function (event) {
            setTimeout(function () {
                var range = window.getSelection ? window.getSelection().getRangeAt(0) : void 0;
                if (element[0].lastChild) {
                    // 光标定位到最后一个元素之后
                    range.setStartAfter(element[0].lastChild);
                }
            }, 0);
        });
    };
}).directive('parseHtml', [
    function () {
        return function (scope, element, attr) {
            scope.$watch(attr.parseHtml, function (value) {
                parseDoc(value);
            });

            function parseDoc(value) {
                if (angular.isDefined(value)) {
                    value = trimSpace(value, '&nbsp');
                    value = trimEnter(value);
                    element.html(value);
                }
            }
        };
    }
]).filter('formatUrl', function () {
    return function (value) {
        var url = encodeURIComponent(value);
        return url;
    };
}).filter('spliceNameByte', function () {
    return function (str, n) {
        if (str !== undefined) {
            var tmpStr = str.substr(0, n);
            var tmpCode = tmpStr.replace(/[^\x00-\xff]/g, '\r\n').split('');
            n = (tmpCode[n - 1] == '\r') ? n - 2 : n - 1;
            var l = tmpCode.slice(0, n).join('').replace(/\r\n/g, '*').length;
            if (tmpCode.length > n) {
                return tmpStr.substr(0, l) + "...";
            } else {
                return tmpStr.substr(0, l);
            }
        }
    };
}).filter('chatFormatDay', function () {
    return function (seconds) {
        if (seconds) {
            var d = new Date(seconds);
            var nowDate = new Date();
            var day = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
            var nowDay = nowDate.getFullYear() + "-" + (nowDate.getMonth() + 1) + "-" + nowDate.getDate();
            if (day == nowDay) {
                day = "";
            }
            return day;
        }
    };
}).filter('formTime', function () {
    return function (seconds) {
        if (seconds) {
            var d = new Date(seconds);
            var time = "";
            var h = d.getHours();
            var m = d.getMinutes();
            if (h < 10) {
                h = "0" + h;
            }
            if (m < 10) {
                m = "0" + m;
            }
            time = h + ":" + m;
            return time;
        }
    };
});