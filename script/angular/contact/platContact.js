/*'use strict';*/
/*
 我的好友
 */

//页面上边栏
mainApp.controller('platContactCtr', ['$scope', '$rootScope', 'cookie', '$timeout', 'extendsResource', function ($scope, $rootScope, cookie, $timeout, userResource) {
    $scope.initial = firstSpells;

    var userDelRestful = prefixUserUrl + "/contact/delUser/:id",
        userSpellRestful = prefixUserUrl + "/contact/spellList",
        userNickNameRestful = prefixUserUrl + "/contact/nickname/:id",
        userGrid;

    $scope.$on("contactChange", function (event) {
        $scope.isChange = true;
        $scope.page = {
            'pageNo': 1,
            'pageSize': contactPageSize
        };
        $scope.sorts = [
            {
                field: "publishTime",
                isDesc: true
            }
        ];
        var tempGrid = new grid(userResource, userSpellRestful, $scope.page, $scope.conditions, $scope.sorts);
        tempGrid.query([], function (data) {
            $scope.userList = data.datas.list;
            // console.log($scope.userList);
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
            $timeout(function () {
                $scope.isChange = false;
            }, 100);
        });
    });

    // 初始化
    $scope.page = {
        'pageNo': 1,
        'pageSize': contactPageSize
    };
    $scope.conditions = {};
    $scope.sorts = [
        {
            field: "publishTime",
            isDesc: true
        }
    ];
    userGrid = new grid(userResource, userSpellRestful, $scope.page, $scope.conditions, $scope.sorts);
    //获取好友
    userGrid.query([], function (data) {
        $scope.userList = data.datas.list;
        $scope.pageNumber = data.pageNumber; //总页数
        $scope.page = data.page;
    });
    //全部列表
    $scope.$parent.getAllList = function () {
        $scope.isChange = true;
        $scope.searchName = null;
        $scope.spell = null;
        $scope.page = {
            'pageNo': 1,
            'pageSize': contactPageSize
        };
        $scope.conditions = {};
        $scope.sorts = [
            {
                field: "publishTime",
                isDesc: true
            }
        ];
        if ($scope.searchName) {
            $scope.conditions.userName = $scope.searchName;
        }
        userGrid = new grid(userResource, userSpellRestful, $scope.page, $scope.conditions, $scope.sorts);
        userGrid.query([], function (data) {
            $scope.userList = data.datas.list;
            // console.log($scope.userList);
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
            $scope.isSearch = false;
            $timeout(function () {
                $scope.isChange = false;
            }, 100);
        });
    };

    //通过首字母查询
    $scope.getBySpell = function (spell) {
        $scope.isChange = true;
        $scope.searchName = null;
        // console.log($scope.searchName);
        $scope.spell = spell;
        $scope.page = {
            'pageNo': 1,
            'pageSize': contactPageSize
        };
        $scope.conditions = {};
        $scope.sorts = [
            {
                field: "publishTime",
                isDesc: true
            }
        ];
        if (spell) {
            $scope.conditions.spell = spell;
        }
        if ($scope.searchName) {
            // console.log($scope.searchName);
            $scope.conditions.userName = $scope.searchName;
        }
        userGrid = new grid(userResource, userSpellRestful, $scope.page, $scope.conditions, $scope.sorts);
        userGrid.query([], function (data) {
            // console.log(data);
            $scope.isSearch = false;
            $scope.spell = spell;
            $scope.userList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
            if (spell || $scope.searchName) {
                $scope.isSearch = true;
            }
            $timeout(function () {
                $scope.isChange = false;
            }, 100);
        });
    };

    //通过姓名搜索
    $scope.getByName = function (name) {
        $scope.isChange = true;
        $scope.page = {
            'pageNo': 1,
            'pageSize': contactPageSize
        };
        $scope.conditions = {};
        $scope.sorts = [
            {
                field: "publishTime",
                isDesc: true
            }
        ];
        if ($scope.spell) {
            $scope.conditions.spell = $scope.spell;
        }
        if (name) {
            // console.log(name);
            $scope.conditions.userName = name;
        }
        userGrid = new grid(userResource, userSpellRestful, $scope.page, $scope.conditions, $scope.sorts);
        userGrid.query([], function (data) {
            $scope.isSearch = false;
            $scope.userList = data.datas.list;
            $scope.pageNumber = data.pageNumber;
            $scope.page = data.page;
            if ($scope.spell || name) {
                $scope.isSearch = true;
            }
            $timeout(function () {
                $scope.isChange = false;
            }, 100);
        });
    };

    $scope.nextPage = function () {
        $scope.isChange = true;
        userGrid.nextPage(function (data) {
            $scope.userList = $scope.userList.concat(data.datas.list);
            $scope.page = data.page;
            $timeout(function () {
                $scope.isChange = false;
            }, 100);
        });
    };

    $scope.$watch('searchName', function (newObj, oldObj) {
        if (newObj === '' && newObj != oldObj && !$scope.isChange) {
            $scope.page = {
                'pageNo': 1,
                'pageSize': contactPageSize
            };
            $scope.conditions = {};
            $scope.sorts = [
                {
                    field: "publishTime",
                    isDesc: true
                }
            ];
            if ($scope.spell) {
                $scope.conditions.spell = $scope.spell;
            }
            userGrid = new grid(userResource, userSpellRestful, $scope.page, $scope.conditions, $scope.sorts);
            userGrid.query([], function (data) {
                $scope.userList = data.datas.list;
                $scope.pageNumber = data.pageNumber;
                $scope.page = data.page;
            });
        }
    });

    //删除好友
    $scope.delUser = function (id) {
        var mymessage = confirm("你确定要删除该好友么？");
        if (mymessage === true) {
            userResource.base(userDelRestful).update({
                id: id
            }, {}, function (msg) {
                if (msg.status == "success") {
                    userGrid.query([], function (data) {
                        $scope.userList = data.datas.list;
                        $scope.pageNumber = data.pageNumber;
                        $scope.page = data.page;
                    });
                } else {
                    // alert(msg.msg);
                    $rootScope.$broadcast("alertMsg", msg.msg);
                }
            });
        }
    };
    //$scope.focus = false;
    //修改好友备注
    $scope.setNickName = function (id, name) {
        //console.log("进入修改"+"id："+id+"nickName:"+name);
        var userCookieId = cookie.get('userid');
        userResource.base(userNickNameRestful).update({},
            {id: userCookieId,
                userId: id,
                nickName: name },
            function (msg) {
                if (msg.status == "success") {
                    angular.forEach($scope.userList, function (item, key) {
                        if (item.id == id) {
                            item.remark = name;
                        }
                    });
                } else {
                    $rootScope.$broadcast("alertMsg", msg.msg);
                }
            });
    };

    // 点击人，私聊
    $scope.getPrivateChat = function (user) {
        var userCookieId = cookie.get('userid');
        if (userCookieId != user.id) {
            var tempUser = {'id': user.id, 'head': user.head, 'userName': user.userName};
            $rootScope.$broadcast("privateChat", tempUser);
        }
    };

}]);
