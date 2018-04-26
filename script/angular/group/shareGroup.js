/**
 * Created by MageeLee on 2016/7/1.
 */

mainApp.controller('shareGroupController',['$scope','cookie','$rootScope','$state','$q','$timeout','extendsResource',function($scope,cookie,$rootScope,$state,$q,$timeout,extendsResource){
    var groupRestful=prefixGroupUrl+"/listGroup";

    $scope.share = {};
    // 获取分享群组列表
    $scope.$parent.getShareGroupList = function(){
        extendsResource.extend(groupRestful).query({},function(datas){
            angular.forEach(datas.list, function(item, key){
                if(item.id === $scope.id){
                    datas.list.splice(key,1);
                }
            });
            $scope.shareGroupList = datas.list;
        });
        //console.log(1);
        $scope.share.groupList = [];
        $scope.contactSearch = '';
        //console.log($scope.share.groupList);
    };

    //选择向哪些群组分享
    /*$scope.selectShareGroupTo = function(group){
        console.log(group);
    }*/
    $scope.selectShareGroupTo = function(select) {
        /*console.log($scope.id);
        console.log(select);*/
        var isHave = false;
        angular.forEach($scope.share.groupList, function(item) {
            if (select.id === item.id) {
                isHave = true;
            }
        });
        if (!isHave) {
            $scope.share.groupList.push(select);
        } else {
            $rootScope.$broadcast("alertMsg", "已存在！");
        }
    };
    // 删除邀请对象
    $scope.delGroup= function(id, event) {
        event.stopPropagation(); //阻止事件冒泡，防止点击删除按钮选择发布工作邀请面板隐藏
        angular.forEach($scope.share.groupList, function(item, key) {
            if (id === item.id) {
                $scope.share.groupList.splice(key, 1);
            }
        });
    };

    //分享
    $scope.submitShare = function(){
        var userCookieId = cookie.get("userid");
        $scope.socket.emit('distributeGInvite',{"id":$scope.id,"groupList":$scope.share.groupList,"userId":userCookieId});
        modalHide(".shareGroup");
    };

    //分享到人人
    var rrShareParam = {
        resourceUrl :regPath + '?groupId=' +$scope.id,	//分享的资源Url
        srcUrl : regPath + '?groupId=' +$scope.id,	//分享的资源来源Url,默认为header中的Referer,如果分享失败可以调整此值为resourceUrl试试
        pic : 'https://sns.banquanmaoyi.com/images/u9.png',		//分享的主题图片Url
        title : '来我们群组看看吧！',		//分享的标题
        description : '丰富的群组功能，等着你来体验'	//分享的详细描述
    };
    // rrShareOnclick(rrShareParam);
    var rrurl = [];
    for(var r in rrShareParam){
        rrurl.push(r + '=' + encodeURIComponent(rrShareParam[r]||''));
    }
    $scope.rrShare = rrurl.join('&');


    //分享到QQ
    var p = {
        url: regPath + '?groupId=' + $scope.id, /*获取URL，可加上来自分享到QQ标识，方便统计*/
        desc:'丰富的群组功能，等着你来体验', /*分享理由(风格应模拟用户对话),支持多分享语随机展现（使用|分隔）*/
        title:'来我们群组看看吧。', /*分享标题(可选)*/
        summary:'', /*分享摘要(可选)*/
        pics:'https://sns.banquanmaoyi.com/images/u9.png', /*分享图片(可选)*/
        flash: '', /*视频地址(可选)*/
        site:'SNS', /*分享来源(可选) 如：QQ分享*/
        style:'201',
        width:32,
        height:32
    };
    var qqurl = [];
    for(var i in p){
        qqurl.push(i + '=' + encodeURIComponent(p[i]||''));
    }
    $scope.qqshare = qqurl.join('&');

    //分享到QQ空间
    var qzone = {
        url:regPath + '?groupId=' + $scope.id,
        showcount:'0',/*是否显示分享总数,显示：'1'，不显示：'0' */
        desc:'丰富的群组功能，等着你来体验',/*默认分享理由(可选)*/
        summary:'',/*分享摘要(可选)*/
        title:'加入群组',/*分享标题(可选)*/
        site:'SNS',/*分享来源 如：腾讯网(可选)*/
        pics:'https://sns.banquanmaoyi.com/images/u9.png', /*分享图片的路径(可选)*/
        style:'201',
        width:113,
        height:39
    };
    var qzoneurl = [];
    for(var j in qzone){
        qzoneurl.push(j + '=' + encodeURIComponent(qzone[j]||''));
    }
    $scope.qzoneshare = qzoneurl.join('&');

    //分享到微博
    var weibo = {
        url:regPath + '?groupId=' + $scope.id,
        title:'加入群组',
        appkey:'',
        pic:'https://sns.banquanmaoyi.com/images/u9.png',/*分享图片的路径(可选)*/
        searchPic:true
    };
    var weibourl = [];
    for(var k in weibo){
        weibourl.push(k + '=' + encodeURIComponent(weibo[k]||''));
    }
    $scope.weiboShare = weibourl.join('&');

    //点击分享按钮分享到其他平台
    $scope.shareOtherPlatform = function (platform) {
        window.open('http://api.bshare.cn/share/'+platform+'?url='+shareHtml+$scope.id);
    }
}]);