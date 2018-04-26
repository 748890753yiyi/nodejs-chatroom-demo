/*
 *	人员统计，表格结果
 * */

mainApp.controller('userListStatisticsCtr', ['$scope', 'cookie', 'extendsResource', function ($scope, cookie, userResource) {
    var yearUserRestful = prefixUserUrl + "/yearMonthDay";    //年注册统计（每月）

    $scope.monthArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    // 可选年数组
    $scope.yearArray = [];
    var nowDate = new Date();
    var nowYear = nowDate.getFullYear();
    for (var i = startYear; i <= nowYear; i++) {
        $scope.yearArray.push(i);
    }
    $scope.showYear = initYear;
    // 初始化某一年的每月注册数
    var condition = {'years': initYear};
    var conditionStr = JSON.stringify(condition);
    userResource.extend(yearUserRestful).query({'condition': conditionStr}, function (datas) {
        $scope.userStatistics = datas.list;
    });

    // 切换年份
    $scope.changeYear = function (year) {
        $scope.showYear = year;
        $scope.showMonth = "";
        $scope.showDay = "";
        var condition = {'years': year};
        var conditionStr = JSON.stringify(condition);
        userResource.extend(yearUserRestful).query({'condition': conditionStr}, function (datas) {
            $scope.userStatistics = datas.list;
            $scope.monthStatistics = [];
            $scope.monthStatistics1 = [];
        });
    };

    // 切换月份
    $scope.changeMonth = function (month) {
        $scope.showMonth = month;
        $scope.showDay = "";
        $scope.dayArray = [];
        var condition = {'years': $scope.showYear, 'month': month};
        var conditionStr = JSON.stringify(condition);
        userResource.extend(yearUserRestful).query({'condition': conditionStr}, function (datas) {
            $scope.userStatistics = datas.list;
            $scope.monthStatistics = datas.list.slice(12, 24);
            $scope.monthStatistics1 = datas.list.slice(24);
            // 统计次月份的天数
            var dayLength = datas.list.length;
            for (var i = 1; i <= dayLength; i++) {
                $scope.dayArray.push(i);
            }
        });
    };
    // 切换日期
    $scope.changeDay = function (day) {
        $scope.showDay = day;
        var condition = {'years': $scope.showYear, 'month': $scope.showMonth, 'date': day};
        var conditionStr = JSON.stringify(condition);
        userResource.extend(yearUserRestful).query({'condition': conditionStr}, function (datas) {
            $scope.userStatistics = datas.list;
            $scope.monthStatistics = [];
            $scope.monthStatistics1 = [];
        });
    };

}]);