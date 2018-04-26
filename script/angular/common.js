/*
 项目的指令和过滤器
 */
mainApp.directive('textPaste', ['$http', function ($http) {
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
    }])


    //验证两次密码一致
    .directive('pwCheck', [function () {
        return {
            require: 'ngModel',
            link: function (scope, elem, attrs, ctrl) {
                var firstPassword = 'input[name=' + attrs.pwCheck + ']';
                // 监听新密码的改变
                $(firstPassword).bind("input propertychange", function () {
                    scope.$apply(function () {
                        ctrl.$setValidity('pwmatch', elem.val() === $(firstPassword).val());
                        if (!elem.val()) {
                            ctrl.$setValidity('pwmatch', true);
                        }
                    });
                });
                // 监听确认密码的输入
                elem.on('keyup', function () {
                    scope.$apply(function () {
                        ctrl.$setValidity('pwmatch', elem.val() === $(firstPassword).val());
                        if (!elem.val()) {
                            ctrl.$setValidity('pwmatch', true);
                        }
                    });
                });
            }
        };
    }])
    //绑定值
    .directive('getValue', function () {
        return{
            require: '?ngModel',
            scope: false,
            link: function (scope, elem, cttrs, ctrl) {
                //监听model改变
                // console.log(elem)
                elem.bind('select', function () {
                    scope.$apply(function () {
                        ctrl.$setViewValue(elem.val());
                    });
                });
            }
        };
    })
    //表情
    .directive('emotionShow', function () {
        return{
            link: function (scope, elem, cttrs, ctrl) {
                // console.log(elem[0].tagName);
                var elemName = elem[0].tagName;
                // 如果是span标签则是click事件，如果是div标签则是mouseover事件
                var tipName = 'invitaiton';
                if (elemName == 'DIV') {
                    tipName = '';
                }
                elem.bind("click", function () {
                    var index = cttrs.emotionShow;
                    var emotionDivW = 375;//表情面板的宽度
                    var elemW = elem.outerWidth();//当前触发元素的宽度
                    if (!$('.emotionDiv').is(':visible')) {
                        var ex = 0, ey = 0;
                        ex = elem.offset().left - emotionDivW;
                        ey = elem.offset().top + 21;
                        $('.emotion').qqFace({
                            ex: ex,
                            ey: ey,
                            id: index,
                            assign: index,
                            path: 'arclist/',	//表情存放的路径
                            tip: tipName
                        });
                    }
                });
            }
        };
    })
    .directive('setFocus', function () {
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
    })
    // 以html格式显示
    .directive('parseHtml', [
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
    ])
    .directive('parseHtmlNonbr', [
        function () {
            return function (scope, element, attr) {
                scope.$watch(attr.parseHtmlNonbr, function (value) {
                    parseDoc(value);
                });
                function parseDoc(value) {
                    if (angular.isDefined(value)) {
                        value = trimSpace(value, '&nbsp');
                        element.html(value);
                    }
                }
            };
        }
    ])

    // 视频播放
    .directive('videoShow', [
        function () {
            return  {
                restrict: 'E',
                transclude: true,
                // require: '^ngModel',
                scope: {url: '@', tep: '@', name: '@'},
                link: function (scope, element, attrs) {
                    scope.$watch(scope.name, function (value) {
                        // console.log("scope.url="+scope.url);
                        // console.log("tep="+scope.tep);
                        var html = '<video poster="' + scope.tep + '" controls="controls" preload="none" style="width:240px;height:180px">' +
                            '<source src="' + scope.url + '" ></source></video>';
                        // var html='<video src="'+scope.url+'" poster="'+scope.tep+'" controls="controls" preload="none" style="width:240px;height:180px"></video>'
                        element.html(html);
                        //console.log(element);

                    });

                },
                template: '<div ></div>',
                replace: true

            };
        }
    ])

    /*交流区根据发送框的高度  计算两侧附加框的高度*/
    .directive('heightAuto', ['$timeout', function ($timeout) {
        return{
            link: function (scope, elem, cttrs, ctrl) {
                elem.on('focusin keyup keydown', function (event) {
                    isEnter(event);
                    $timeout(function () {
                        var h = elem.outerHeight();
                        $(".sound-div").outerHeight(h);
                        if (h >= 160) {
                            $(".add-div").css('text-align', 'left');
                        }
                    }, 100);
                });

                //判断是否按了enter键
                function isEnter(event){
                    if(!event.shiftKey && event.keyCode == 13){
                        $timeout(function () {
                            $(".sound-div").outerHeight(45);
                        },0);
                    }
                }
            }
        };
    }])

    //表单校验不通过增加 .has-error
    .directive('inputHasError', ['$timeout', function ($timeout) {
        return{
            link: function (scope, elem, cttrs, ctrl) {
                var $parents =  elem.parents('.form-group');
                elem.on('blur', function (event) {
                    if(!elem.val()&&!$parents.hasClass('has-error')){
                        $parents.addClass('has-error');
                    }
                });
                elem.bind('keyup', function (event) {
                    if(elem.val()){
                        $parents.removeClass('has-error');
                    }else{
                        $parents.addClass('has-error');
                    }
                });
            }
        };
    }])
    //滚动条加载指令
    .value('THROTTLE_MILLISECONDS', null)
    .directive('infiniteScroll', [
        '$rootScope', '$window', '$interval', 'THROTTLE_MILLISECONDS', function ($rootScope, $window, $interval, THROTTLE_MILLISECONDS) {
            return {
                scope: {
                    infiniteScroll: '&',                            //滚动调用的方法
                    infiniteScrollContainer: '=',                   //
                    infiniteScrollDistance: '=',                    //滚动调用距离
                    infiniteScrollDisabled: '=',                    //滚动是否可用
                    infiniteScrollUseDocumentBottom: '='            //
                },
                link: function (scope, elem, attrs) {
                    var changeContainer, checkWhenEnabled, container, handleInfiniteScrollContainer, handleInfiniteScrollDisabled, handleInfiniteScrollDistance, handleInfiniteScrollUseDocumentBottom, handler, height, immediateCheck, offsetTop, pageYOffset, scrollDistance, scrollEnabled, throttle, useDocumentBottom, windowElement;
                    windowElement = angular.element($window);
                    scrollDistance = null;
                    scrollEnabled = null;
                    checkWhenEnabled = null;
                    container = null;
                    immediateCheck = true;
                    useDocumentBottom = false;
                    height = function (elem) {
                        elem = elem[0] || elem;
                        if (isNaN(elem.offsetHeight)) {
                            return elem.document.documentElement.clientHeight;
                        } else {
                            return elem.offsetHeight;
                        }
                    };
                    offsetTop = function (elem) {
                        if (!elem[0].getBoundingClientRect || elem.css('none')) {
                            return;
                        }
                        return elem[0].getBoundingClientRect().top + pageYOffset(elem);
                    };
                    pageYOffset = function (elem) {
                        elem = elem[0] || elem;
                        if (isNaN(window.pageYOffset)) {
                            return elem.document.documentElement.scrollTop;
                        } else {
                            return elem.ownerDocument.defaultView.pageYOffset;
                        }
                    };
                    handler = function () {
                        var containerBottom, containerTopOffset, elementBottom, remaining, shouldScroll;
                        if (container === windowElement) {
                            containerBottom = height(container) + pageYOffset(container[0].document.documentElement);
                            elementBottom = offsetTop(elem) + height(elem);
                        } else {
                            containerBottom = height(container);
                            containerTopOffset = 0;
                            if (offsetTop(container) !== void 0) {
                                containerTopOffset = offsetTop(container);
                            }
                            elementBottom = offsetTop(elem) - containerTopOffset + height(elem);
                        }
                        if (useDocumentBottom) {
                            elementBottom = height((elem[0].ownerDocument || elem[0].document).documentElement);
                        }
                        remaining = elementBottom - containerBottom;
                        shouldScroll = remaining <= height(container) * scrollDistance + 1;
                        if (shouldScroll) {
                            checkWhenEnabled = true;
                            if (scrollEnabled) {
                                if (scope.$$phase || $rootScope.$$phase) {
                                    return scope.infiniteScroll();
                                } else {
                                    return scope.$apply(scope.infiniteScroll);
                                }
                            }
                        } else {
                            return checkWhenEnabled = false;
                        }
                    };
                    throttle = function (func, wait) {
                        var later, previous, timeout;
                        timeout = null;
                        previous = 0;
                        later = function () {
                            var context;
                            previous = new Date().getTime();
                            $interval.cancel(timeout);
                            timeout = null;
                            func.call();
                            return context = null;
                        };
                        return function () {
                            var now, remaining;
                            now = new Date().getTime();
                            remaining = wait - (now - previous);
                            if (remaining <= 0) {
                                clearTimeout(timeout);
                                $interval.cancel(timeout);
                                timeout = null;
                                previous = now;
                                return func.call();
                            } else {
                                if (!timeout) {
                                    return timeout = $interval(later, remaining, 1);
                                }
                            }
                        };
                    };
                    if (THROTTLE_MILLISECONDS != null) {
                        handler = throttle(handler, THROTTLE_MILLISECONDS);
                    }
                    scope.$on('$destroy', function () {
                        return container.unbind('scroll', handler);
                    });
                    handleInfiniteScrollDistance = function (v) {
                        return scrollDistance = parseFloat(v) || 0;
                    };
                    scope.$watch('infiniteScrollDistance', handleInfiniteScrollDistance);
                    handleInfiniteScrollDistance(scope.infiniteScrollDistance);
                    handleInfiniteScrollDisabled = function (v) {
                        scrollEnabled = !v;
                        if (scrollEnabled && checkWhenEnabled) {
                            checkWhenEnabled = false;
                            return handler();
                        }
                    };
                    scope.$watch('infiniteScrollDisabled', handleInfiniteScrollDisabled);
                    handleInfiniteScrollDisabled(scope.infiniteScrollDisabled);
                    handleInfiniteScrollUseDocumentBottom = function (v) {
                        return useDocumentBottom = v;
                    };
                    scope.$watch('infiniteScrollUseDocumentBottom', handleInfiniteScrollUseDocumentBottom);
                    handleInfiniteScrollUseDocumentBottom(scope.infiniteScrollUseDocumentBottom);
                    changeContainer = function (newContainer) {
                        if (container != null) {
                            container.unbind('scroll', handler);
                        }
                        container = newContainer;
                        if (newContainer != null) {
                            return container.bind('scroll', handler);
                        }
                    };
                    changeContainer(windowElement);
                    handleInfiniteScrollContainer = function (newContainer) {
                        if ((newContainer == null) || newContainer.length == 0) {
                            return;
                        }
                        if (newContainer instanceof HTMLElement) {
                            newContainer = angular.element(newContainer);
                        } else if (typeof newContainer.append === 'function') {
                            newContainer = angular.element(newContainer[newContainer.length - 1]);
                        } else if (typeof newContainer === 'string') {
                            newContainer = angular.element(document.querySelector(newContainer));
                        }
                        if (newContainer != null) {
                            return changeContainer(newContainer);
                        } else {
                            throw new Exception("invalid infinite-scroll-container attribute.");
                        }
                    };
                    scope.$watch('infiniteScrollContainer', handleInfiniteScrollContainer);
                    handleInfiniteScrollContainer(scope.infiniteScrollContainer || []);
                    if (attrs.infiniteScrollParent != null) {
                        changeContainer(angular.element(elem.parent()));
                    }
                    if (attrs.infiniteScrollImmediateCheck != null) {
                        immediateCheck = scope.$eval(attrs.infiniteScrollImmediateCheck);
                    }
                    return $interval((function () {
                        if (immediateCheck) {
                            return handler();
                        }
                    }), 0, 1);
                }
            };
        }
    ])

    // 检查输入长度
    .directive('checkStrLength', function () {
        return{
            require: 'ngModel',
            link: function (scope, elem, attrs, ctrl) {
                elem.on('keyup', function () {
                    scope.$apply(function () {
                        var str = elem.val();
                        var n = attrs.checkStrLength;
                        var $parents =  elem.parents('.form-group');
                        if($parents.hasClass('has-error')){
                            $parents.removeClass('has-error');
                        }
                        if (str) {
                            var tmpStr = str.substr(0, n);
                            var tmpCode = tmpStr.replace(/[^\x00-\xff]/g, '\r\n').split('');
                            n = (tmpCode[n - 1] == '\r') ? n - 2 : n - 1;
                            if (tmpCode.length > n) {
                                $parents.addClass('has-error');
                                ctrl.$setValidity('lengthvalid', false);
                            } else {
                                ctrl.$setValidity('lengthvalid', true);
                            }
                        }
                        else {
                            ctrl.$setValidity('lengthvalid', true);
                        }
                    });
                });
            }
        };
    });

// 转码
mainApp.filter('formatUrl', function () {
        return function (value) {
            var url = encodeURIComponent(value);
            return url;
        };
    })
// 收费
    .filter('formatCharge', function () {
        return function (charge) {
            var role = '';
            if (charge == 'true') {
                role = "收费";
            } else if (charge == 'false') {
                role = "免费";
            }
            return role;
        };
    })

    // 时间
    .filter('formatTime', function () {
        return function (seconds) {
            if (seconds) {
                var d = new Date(seconds);
                var time = "";
                var h = d.getHours();
                var m = d.getMinutes();
                var s = d.getSeconds();
                if (h < 10) {
                    h = "0" + h;
                }
                if (m < 10) {
                    m = "0" + m;
                }
                if (s < 10) {
                    s = "0" + s;
                }
                time = h + ":" + m + ":" + s;
                return time;
            }
        };
    })
    // 日期
    .filter('formatDay', function () {
        return function (seconds) {
            if (seconds) {
                var d = new Date(seconds);
                var nowDate = new Date();
                var day = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
                var nowDay = nowDate.getFullYear() + "-" + (nowDate.getMonth() + 1) + "-" + nowDate.getDate();
                if (day == nowDay) {
                    day = "今天";
                }
                return day;
            }
        };
    })
    // 组内日期
    .filter('chatFormatDay', function () {
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
    })
    // 星期
    .filter('formatWeek', function () {
        return function (n) {
            var day = '';
            if (n === 0) {
                day = "日";
            } else if (n == 1) {
                day = "一";
            } else if (n == 2) {
                day = "二";
            } else if (n == 3) {
                day = "三";
            } else if (n == 4) {
                day = "四";
            } else if (n == 5) {
                day = "五";
            } else {
                day = "六";
            }
            return day;
        };
    })
// 按字符截取字符串len长度，没传值默认8
    .filter('simpleFileName', function () {
        return function (fileName, len) {
            if (!len) {
                len = 8;
            }
            var simple = '';
            if (fileName) {
                if (fileName.length > len) {
                    simple = fileName.substr(0, len - 3) + '...';
                } else {
                    simple = fileName;
                }
            }
            return simple;
        };
    })
    // 按字符截取
    .filter('spliceNameByte', function () {
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
    })
    // 文件大小的转换
    .filter('fileSize', function () {
        var fileSize = function (input) {
            if (input < 1024) {
                return Math.round(input) + 'B';
            }
            if (input >= 1024 && input < 1024 * 1024) {
                return Math.round(input / 1024 * 10) / 10 + "K";
            }
            if (input >= 1024 * 1024 && input < 1024 * 1024 * 100) {
                return Math.round(input / (1024 * 1024) * 10) / 10 + "M";
            }
            if (input >= 1024 * 1024 * 100 && input < 1024 * 1024 * 1024) {
                return Math.round(input / (1024 * 1024)) + "M";
            }
            if (input >= 1024 * 1024 * 1024) {
                return Math.round(input / (1024 * 1024 * 1024) * 10) / 10 + "G";
            }
        };
        return fileSize;
    })

    // 时间
    .filter('formTime', function () {
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
    })
    // 日期
    .filter('formDay', function () {
        return function (seconds) {
            if (seconds) {
                var d = new Date(seconds);
                var nowDate = new Date();
                var day = d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
                var nowDay = nowDate.getFullYear() + "年" + (nowDate.getMonth() + 1) + "月" + nowDate.getDate() + "日";
                if (day == nowDay) {
                    day = "今天";
                }
                return day;
            }
        };
    })
    // 组内禁言
    .filter('formSpeakDay', function () {
        return function (seconds) {
            var day = 0;
            var str = "禁言中,";
            if (seconds && seconds !== 'true' && seconds !== 'false') {
                var newdate = new Date(seconds).getTime();
                var nowDate = new Date().getTime();
                day = Math.ceil((newdate - nowDate) / (1000 * 60 * 60 * 24));
                return str + day + "天后解禁";
            } else if (seconds === 'false') {
                return "您已经被无限期禁言";
            }
        };
    });