function restfulFactory(app) {
    app.factory('baseResource', ["$resource", function ($resource) {
        var baseResource = {
            base: function (url) {
                return $resource(url, {id: '@id'},
                    {
                        update: {
                            method: 'PUT'
                        }
                    }, validateCallBackFun, validateDeal);
            }
        };
        return baseResource;
    }]);
    app.factory('extendsResource', ['baseResource', '$resource', function (baseResource, $resource) {
        var manageResource = {
            base: baseResource.base,
            extend: function (url) {
                return $resource(url, {id: '@id'},
                    {
                        query: {
                            method: "GET",
                            isArray: false
                        }
                    }, validateCallBackFun, validateDeal);
            }
        };
        return manageResource;
    }]);
    return app;
}
var validateCallBackFun = function (data, callback) {
    if (data.status) {
        if (data.status == 'fail') {
            if (data.msg == 'no session' || data.msg == 'no cookie') {
                // console.log(data.msg);
                window.location.href = loginHtml;
                return;
            } else if (data.msg == 'error') {
                window.location.href = '/error.html';
                return;
            } else {
                alert(data.msg);
            }
        }
    }
    callback(data);
};

var reqValidateRestful = {post: {url: '', time: new Date().getTime()}, put: {url: '', time: new Date().getTime()}};
var validateDeal = function (url, action, callback) {
    var nowTime = new Date().getTime();
    //console.log(action);
    var returnValue = true;
    if (action.method == 'POST') {
        if (url == reqValidateRestful.post.url) {
            if (nowTime - reqValidateRestful.post.time <= 1000) {
                returnValue = false;
            }
        }
        reqValidateRestful.post.url = url;
        reqValidateRestful.post.time = nowTime;
        callback(returnValue);
    } else if (action.method == 'PUT') {
        if (url == reqValidateRestful.put.url) {
            if (nowTime - reqValidateRestful.put.time <= 1000) {
                returnValue = false;
            }
        }
        reqValidateRestful.put.url = url;
        reqValidateRestful.put.time = nowTime;
        callback(returnValue);
    } else {
        callback(returnValue);
    }

};