/* 
 1、groupListCtr：我的群组展示，可以搜索，点击可进入组
 */
mainApp.controller('groupListCtr', ['$scope', '$http', 'cookie', '$state','$rootScope', 'extendsResource','$timeout', function ($scope, $http, cookie, $state,$rootScope, groupResource,$timeout) {
    var searchAllGroupRestful = prefixGroupUrl + "/queryGroups";
    var searchListGrid;

    $scope.$parent.initSearchGroup = function(){
        $scope.allGroupList = null;
        $scope.searchgroupName = '';
        $scope.pageNumber = 0;
        $('.search-allGroups').modal("show");
    };

    $scope.searchGroupByName = function (name) {
        $scope.conditions = {'pageNo': 1, 'pageSize': searchAllGroupPageSize,'searchName':name};
        searchListGrid = new groupNewGrid(groupResource, searchAllGroupRestful, $scope.conditions);
        searchListGrid.query([], function (data) {
            $scope.allGroupList = data.datas.list;
            $scope.total = data.datas.total;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    //分页
    $scope.turnToPrePage = function () {
        searchListGrid.prePage(function (data) {
            $scope.allGroupList = data.datas.list;
            $scope.total = data.datas.total;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    $scope.turnToNextPage = function () {
        searchListGrid.nextPage(function (data) {
            $scope.allGroupList = data.datas.list;
            $scope.total = data.datas.total;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    $scope.joinThis = function(id){
        var joinGroupRestful = prefixGroupUrl + "/groupDirect/" + id;
        var userCookieId = cookie.get("userid");
        groupResource.extend(joinGroupRestful).save({},function(data){
            $rootScope.$broadcast("alertMsg",data.msg);
            var msg='';
            getCookieUser(userCookieId, groupResource, function (cookieUser) {
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
        // $('.search-allGroups').modal('hide');
    };
}]);
