/*'use strict';*/
/*
 组内公告页面：
 列表和最新公告
 */
/**
 * 公告列表controller
 */
mainApp.controller('announcementCtrl', ['$scope', '$location', '$rootScope','$anchorScroll', 'extendsResource', function ($scope, $location, $rootScope, $anchorScroll, announcementResource) {
    var announcementListRestful = prefixVoteUrl + '/announcement/list',
        delAnnouncementRestful = prefixAnnouncementUrl + '/delAnnouncement/:id',
        announcementGird,
        finished;   //标识数据是否已经加载完毕
    //初始化公告列表方法：类型：all,当前页数：1,总页数：5，组Id:$scope.id
    $scope.initList = function () {
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'type': 'all', 'pageNo': 1, 'pageSize': 5, 'groupId': $scope.id};
        announcementGird = new groupNewGrid(announcementResource, announcementListRestful, $scope.conditions);
        announcementGird.query([], function (data) {
            $scope.announcementLists = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    //加载时调用初始化方法；
    $scope.initList();
    //页面局部滚动条滚动加载
    //$(document.getElementById('mediaList')).scroll(function () {
    //    console.log($(this).scrollTop());
    //    // console.log(document.getElementById('mediaList').scrollHeight);
    //    // console.log($('#mediaList').height());
    //    var height = $('#mediaList').height();
    //    //判断是否存在下一页及滚动条是否将到达底部
    //    if ($(this).scrollTop() + height / 20 >= (document.getElementById('mediaList').scrollHeight - height) && $scope.pageNumber != $scope.pageNo) {
    //        console.log("Boom!!!!");
    //        // $scope.nextPage();
    //    }
    //});
    //页面局部滚动条滚动加载
    finished = true;//标识数据是否已经加载完毕
    //列表分页方法
    $scope.nextPage = function () {
        announcementGird.nextPage(function (data) {
            $scope.announcementLists = $scope.announcementLists.concat(data.datas.list);
            $scope.pageNo = data.conditions.pageNo;
            finished = true;//当数据返回后，将finished变为true;
        });
    };
    //监听mediaList容器的滚动条事件；
    $(document.getElementById('mediaList')).scroll(function () {
        var height = $('#mediaList').height();
        //判断是否存在下一页及滚动条是否将到达底部
        if (finished && $(this).scrollTop() + height / 20 >= (document.getElementById('mediaList').scrollHeight - height) && $scope.pageNumber != $scope.pageNo) {
            // console.log("Boom!!!!");
            // 没开始加载另一页的时，将finished置为false;
            finished = false;
            $scope.nextPage();
        }
    });

    //添加成功后，刷新列表
    $scope.$on('announcementAdd', function () {
        $scope.initList();
    });
    //跳到该公告位置[接收到该公告的ID:data],当列表存在滚动条时跳转到该条信息
    $scope.$on('gotoAnnouncement', function (event, data) {
        //判断是否存在滚动条[如果不存在滚动条会将主页面的滚动条做为判断，来定位]
        if ((document.getElementById('mediaList').clientWidth < document.getElementById('mediaList').offsetWidth - 4)) {
            $location.hash(data);
            $anchorScroll();
        }
    });

    //删除
    $scope.delAnnouncement = function(id){
        var str = "要删除该公告吗？ ";
        $rootScope.$broadcast("alertConfirm", {"str": str, "id": id}, removeAnnouncement);
    };

    function removeAnnouncement(args) {
        $('.alert-confirm').modal('hide');
        var value = {"id": args.id};
        announcementResource.base(delAnnouncementRestful).delete({},value,function(data){
            if (data.status == 'success') {
                $scope.initList();
            }
        });
    }

}]);
/**
 * 最新公告列表controller
 */
mainApp.controller('latestAnnouncementCtrl', ['$scope', 'extendsResource', function ($scope, latestAnnouncementResource) {
    var latestAnnouncementRestful = prefixVoteUrl + '/announcement/list',
        latestAnnouncementGird;
    //初始化列表方法:类型:new,页码：1，总页数：5，组Id:$scope.id;
    $scope.initLatestAnnouncementList = function () {
        $scope.pageNumber = 1;
        $scope.pageNo = 1;
        $scope.conditions = {'type': 'new', 'pageNo': 1, 'pageSize': 5, 'groupId': $scope.id};
        latestAnnouncementGird = new groupNewGrid(latestAnnouncementResource, latestAnnouncementRestful, $scope.conditions);

        latestAnnouncementGird.query([], function (data) {
            // console.log(data);
            $scope.latestAnnouncementLists = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.pageNo = data.conditions.pageNo;
        });
    };
    //加载时调用一次；
    $scope.initLatestAnnouncementList();
    //监听到添加成功后，刷新列表；
    $scope.$on('announcementAdd', function () {
        $scope.initLatestAnnouncementList();
    });
    //当点击该公告时将这条公告的ID传给列表controller[同级controller]
    $scope.goToAnnouncement = function (id) {
        $scope.$parent.$broadcast("gotoAnnouncement", id);
    };
}]);