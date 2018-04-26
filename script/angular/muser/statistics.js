/*
 *	人员统计，统计图
 * */

mainApp.controller('userStatisticsCtr', ['$scope', 'cookie', 'extendsResource', function ($scope, cookie, userResource) {
    var yearUserRestful = prefixUserUrl + "/yearMonthDay";    //年注册统计（每月）

    // 可选年数组
    $scope.yearArray = [];
    var nowDate = new Date();
    var nowYear = nowDate.getFullYear();
    for (var i = startYear; i <= nowYear; i++) {
        if (i != initYear) {
            $scope.yearArray.push(i);
        }
    }

    // 初始化某一年的每月注册数
    var condition = {'years': initYear};
    var conditionStr = JSON.stringify(condition);
    userResource.extend(yearUserRestful).query({'condition': conditionStr}, function (datas) {
        datas.list.forEach(function (item) {
            if (item.y > 0) {
                item.drilldown = true;
            }
        });
        // 初始化图表参数
        $scope.showYear = initYear;
        $scope.chartConfig = {
            options: {
                chart: {
                    type: 'column',
                    events: {
                        drillup: function (e) {
                            var chart = this;
                            var title = '统计 ' + $scope.showYear + '年 人员注册量';
                            chart.setTitle({text: title}, null);
                            $scope.$apply(function () {
                                $scope.isLoading = false;
                            })
                        }
                    }
                },
                credits: {
                    enabled: false
                },
                legend: {
                    enabled: false
                },
                lang: {
                    drillUpText: "返回 >> {series.name}"

                },
                plotOptions: {
                    series: {
                        borderWidth: 0,
                        dataLabels: {
                            enabled: true,
                            format: '{point.y}'
                        }
                    }
                },
                tooltip: {
                    headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
                    pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y}</b> 人<br/>'
                }
            },
            title: {
                text: '统计 ' + $scope.showYear + '年 人员注册量'
            },
            xAxis: {
                type: 'category'
            },
            yAxis: {
                title: {
                    text: '人数'
                }
            },
            series: [
                {
                    name: initYear + '年',
                    colorByPoint: true,
                    data: datas.list
                }
            ]
        };
        // 下钻
        $scope.chartConfig.options.chart.events.drilldown = function (e) {
            if (!e.seriesOptions) {
                // console.log(e.point.name);
                var chart = this, drilldowns = {};
                // Show the loading label
                chart.showLoading('加载中 ...');
                $scope.isLoading = true;
                // 获取月份数据
                var condition1 = {'years': $scope.showYear, 'month': e.point.monthes};
                var conditionStr1 = JSON.stringify(condition1);
                userResource.extend(yearUserRestful).query({'condition': conditionStr1}, function (data) {
                    var series = {
                        name: e.point.name,
                        type: 'spline',
                        data: data.list
                    };
                    setTimeout(function () {
                        chart.hideLoading();
                        chart.addSeriesAsDrilldown(e.point, series);
                        var title = '统计 ' + $scope.showYear + '年' + series.name + ' 人员注册量';
                        chart.setTitle({text: title}, null);
                    }, 1000);
                });
            }
        };
    });

    // 切换年份
    $scope.changeYear = function (year) {
        $scope.showYear = year;
        // 重新初始化选项
        $scope.yearArray = [];
        for (var i = startYear; i <= nowYear; i++) {
            if (i != year) {
                $scope.yearArray.push(i);
            }
        }
        var condition = {'years': year};
        var conditionStr = JSON.stringify(condition);
        userResource.extend(yearUserRestful).query({'condition': conditionStr}, function (datas) {
            datas.list.forEach(function (item) {
                if (item.y > 0) {
                    item.drilldown = true;
                }
            });

            $scope.chartConfig.title = {
                text: '统计 ' + year + '年 人员注册量'
            };
            $scope.chartConfig.series = [
                {
                    name: year + '年',
                    colorByPoint: true,
                    data: datas.list
                }
            ];
        });
    };

}]);