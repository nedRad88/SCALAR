app.directive('statsTable', ['dataService', 'ooredooAppSettings', '$mdToast', '$q', function (dataService, ooredooAppSettings, $mdToast, $q) {
    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var legendTemplate = ooredooAppSettings.legendTemplateWithSeries;
    return {
        restrict: 'EA',
        transclude: 'true',
        scope: {
            title: "=",
            endpoint: "@",
            type: "@",
            period: "=",
            params: "=",
            endpoints: "=series",
            config: "=",
            isCustomDate: "=",
            topic: "=",
            indexOfSerie: "="
        },
        templateUrl: 'app/views/templates/stats-table.html',
        link: function (scope) {

            var config;
            var init;
            if (scope.config) {
                config = scope.config;
                init = (config.init) ? config.init : { type: 'day', time: 'Today', avg:false };
            } else {
                config = {};
                init = { type : 'day', time:'Today', avg:false}
            }


            scope.units = ["Hour","Day", "Week", "Month", "Quarter", "Year"];

            scope.selectUnit = function(unit) {
                scope.selectedUnit = unit;
                pushRequests(unit.toLowerCase());
            }

            scope.switchChartType = function() {
                if (scope.type=="Bar") {
                    scope.type = "Line";
                } else {
                    scope.type = "Bar";
                }
            }
            var avg = function (array) {
                var avgs = [];
                for (var i = 0; i < array.length; i++) {
                    var tmp = 0;
                    for (var j = 0; j < array[i].length; j++) {
                        tmp = tmp + array[i][j];
                    }
                    avgs[i] = [];
                    for (var j = 0; j < array[i].length; j++) {
                        avgs[i].push(array[i][j] * 100 / tmp);
                    }
                }
                return avgs;
            }


            // if true show the custom button
            scope.custom = (typeof config.custom != "undefined") ? config.custom : true;

            // if true initial display will be by average
            scope.isAverage = init.avg;

            var initialTab = init.type;
            var initialTime = init.time;

            //
            scope.data = [];
            scope.labels = [];
            // to save data when chaging the dispplay mode
            var copy = {};

            // charts options

            scope.options = { legendTemplate: legendTemplate, responsive: true };

            scope.colors = []//['#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
            for (var j = 0; j < scope.endpoints.length; j++) {

                scope.colors.push(ooredooAppSettings.colors[scope.endpoints[j].name]);
            }
            scope.param = {};
            scope.param.colors = angular.copy(scope.colors);//['#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
            

            // beginDate & endDate are user just for the biding
            scope.beginDate = new Date();
            scope.endDate = new Date();

            scope.loading = true;

            var loadData = function (time) {
                scope.data = [];
                scope.labels = [];
                copy = {};
                scope.selected = [];

                var intervalle = '';
                if (scope.isCustomDate) {
                    scope.since = moment(scope.period.begin);
                    scope.until = moment(scope.period.end);
                    var duration = moment.duration(scope.until.diff(scope.since)).asDays();
                    if (duration < 3) {
                        intervalle = 'hour';
                    } else if (duration <= 30) {
                        intervalle = 'day';
                    } else if (duration > 30 && duration < 120) {
                        intervalle = 'week';
                    }
                    else {
                        intervalle = 'month';
                    }
                } else {
                    switch (time) {
                        case 'Today':
                            scope.since = moment();
                            scope.until = moment().add(1, 'days');
                            intervalle = 'hour';
                            break;
                        case 'Yesterday':
                            scope.since = moment().subtract(1, 'days');
                            scope.until = moment();
                            intervalle = 'hour';
                            break;

                        case 'This week':
                            scope.since = moment().subtract(6, 'days');
                            scope.until = moment().add(1, 'days');
                            intervalle = 'day';
                            break;
                        case 'Last week':
                            scope.since = moment().subtract(14, 'days');
                            scope.until = moment().subtract(6, 'days');
                            intervalle = 'day';
                            break;
                        case 'This month':
                            scope.since = moment().subtract(1, 'months').add(1, 'days');
                            scope.until = moment().add(1,'days');
                            intervalle = 'day';
                            break;
                        case 'Last month':
                            scope.since = moment().subtract(2, 'months');
                            scope.until = moment().subtract(1, 'months');
                            intervalle = 'day';
                            break;
                        case 'This year':
                            scope.since = moment().days(0).subtract(1, 'years');
                            scope.until = moment().days(0);
                            intervalle = 'month';
                            break;
                        case 'Last year':
                            scope.since = moment().days(0).subtract(2, 'years');
                            scope.until = moment().days(0).subtract(1, 'years');
                            intervalle = 'month';
                            break;
                        default:
                            break;
                    }
                    scope.beginDate = scope.since.toDate();
                    scope.endDate = scope.until.toDate();
                }
                scope.selectedUnit = intervalle.toUpperCase();
                pushRequests(intervalle);
            }

            var pushRequests = function (intervalle) {
                scope.loading = true;
                var series = [];

                if (scope.endpoints) {
                    series = scope.endpoints;
                }
                var queryParam = "?until=" + scope.until.format('YYYY-MM-DD') + "&since=" + scope.since.format('YYYY-MM-DD') + '&by=' + intervalle;


                if (scope.topic && scope.topic.length) {

                    for (var i = 0; i < scope.topic.length; i++) {
                        queryParam = queryParam + "&" + "topics=" + scope.topic[i].id;
                    }
                }
                if (scope.params) {
                    queryParam = queryParam + "&" + scope.params;

                }
                var requests = [];
                for (var j = 0; j < series.length; j++) {

                    requests.push(dataService.fireEndpoint(series[j].endpoint[scope.IndexOfSerie] + queryParam));
                }

                $q.all(requests).then(function successCallback(responses) {
                    scope.data = [];
                    scope.avgs = [];
                    scope.series = [];
                    scope.selected = [];
                    scope.labels = [];

                    copy.data = [];
                    copy.avgs = [];
                    copy.series = [];
                    for (var k = 0; k < responses.length; k++) {
                        var response = responses[k];
                        var data = [];
                        var labels = [];
                        for (var i = 0; i < response.data.length; i++) {
                            try {
                                var label = angular.fromJson(response.data[i].label);
                                response.data[i].label = label;
                            } catch (e) {

                            }

                            if (typeof response.data[i].label !== "string") {
                                var d = response.data[i].label;
                                var date = [d.Year, d.Month - 1, d.Day, d.Hour];
                                var m = moment(date);

                                var l = "";
                                if (i === 0) {
                                    l = m.format('YYYY/MM/DD');
                                    if (intervalle == "quarter") {
                                        l = "Q "+response.data[i].label.Quarter;
                                    } else if (intervalle == "week") {
                                        l = "Week " + response.data[i].label.Week;
                                    }
                                    
                                } else {
                                    if (intervalle != "week") {

                                        if (intervalle == "quarter") {
                                            if (response.data[i].label.Quarter != response.data[i - 1].label.Quarter) {
                                                l = "Q " + response.data[i].label.Quarter;
                                            }
                                            if (response.data[i].label.Year != response.data[i - 1].label.Year) {
                                                l = m.format('YYYY') + " " + l;
                                            }
                                        } else {

                                            if (intervalle == 'hour') {
                                                if (response.data[i].label.Hour != response.data[i - 1].label.Hour) {
                                                    l = m.format('HH') + 'h ' + l;
                                                }
                                            }
                                            if (response.data[i].label.Day != response.data[i - 1].label.Day) {
                                                l = m.format('DD ') + l;
                                            }
                                            if (response.data[i].label.Month != response.data[i - 1].label.Month) {
                                                l = m.format('MM') + ((intervalle == 'month') ? "" : ("/" + l));
                                            }
                                        
                                        
                                        
                                            if (response.data[i].label.Year != response.data[i - 1].label.Year) {
                                                l = m.format('YYYY') + "/" + l;
                                            }
                                        }

                                    } else {
                                       
                                        if (response.data[i].label.Week != response.data[i - 1].label.Week) {
                                            l = "Week "+response.data[i].label.Week;
                                        }
                                        if (response.data[i].label.Year != response.data[i - 1].label.Year) {
                                            l = m.format('YYYY') + " " + l;
                                        }
                                    
                                    
                                       
                                    }
                                    

                                    
                                }
                                switch (intervalle) {
                                    case "month":
                                        var t = m.add(1, "months");
                                        break;
                                    case "day":
                                        var t = m.add(1, "days");
                                        break;
                                    case "hour":
                                        var t = m.add(1, "hours");
                                        break;
                                    case "week":
                                        var e = (response.data[i].label.Week-1) * 7;
                                        var t = moment(moment().year() + "-01-01").add(e, "days");
                                        break;
                                    case "quarter":
                                        var t = m.add(3, "months");
                                        break;
                                    default:
                                }

                                if (moment().isBefore(t)) {
                                    l += "*";
                                }
                                labels.push(l);
                            } else {
                                labels.push(response.data[i].label);
                            }
                            data.push(response.data[i].data);
                        }

                        scope.legend = true;
                        scope.series.push({ name: series[k].name, data: data });
                        scope.data.push(data);
                        scope.labels = labels;
                        scope.selected = [];
                        scope.selected = scope.series.slice();
                    }
                    copy.data = scope.data.slice();
                    copy.series = scope.series.slice();
                    copy.avgs = avg(copy.data);
                    scope.switchDataMode(scope.isAverage);
                    scope.copy = copy;
                    scope.loading = false;
                    scope.rows = []
                    for (l = 0; l < scope.labels.length; l++) {

                        row = [];
                        for (n = 0; n < scope.data.length; n++) {
                            row.push(scope.data[n][l])
                        }
                        scope.rows.push({ name: scope.labels[l], data: row })
                        
                    }
                    


                }, function errorCallback(err) {
                    scope.message = err.data;
                    $mdToast.show($mdToast.simple().textContent("An error occurred"));
                });

            }
            scope.loadData = loadData;

            var changeRange = function (ran) {
                scope.isCustomDate = false;
                switch (ran) {
                    case 'day':
                        scope.times = ["Today", "Yesterday"];
                        break;
                    case 'week':
                        scope.times = ["This week", "Last week"];
                        break;
                    case 'month':
                        scope.times = ["This month", "Last month"];
                        break;
                    case 'year':
                        scope.times = ["This year", "Last year"];
                        break;
                    case 'custom':
                        scope.isCustomDate = true;
                    default:
                        break;
                }
                if (initialTime && scope.times) {
                    var i = scope.times.indexOf(initialTime);
                    selected_time = (i >= 0) ? scope.times[i] : scope.times[0];
                    initialTime = undefined;
                } else {
                    selected_time = scope.times[0];
                }
                scope.selectedDate = selected_time;
                scope.loadData(selected_time);
            }

            scope.changeRange = changeRange;
            
            var lock = true;
            scope.$watch('period', function () {
                if (lock) {
                    lock = false;
                    return;
                }
                scope.update();

            });

            scope.$watch('topic', function () {
                scope.update();

            });

            scope.update = function() {
                if (scope.isCustomDate) {
                    scope.loadData("custom");
                } else {
                    scope.changeRange(initialTab);
                }
            }




            // filters  logic
            var insertAtIndex;

            scope.toggle = function (item, list) {
                var idx = list.indexOf(item);
                var index;
                if (idx > -1) {
                    list.splice(idx, 1);
                    index = scope.series.indexOf(item);
                    scope.data.splice(index, 1);
                    scope.colors.splice(index, 1);
                    scope.series.splice(index, 1);
                }
                else {
                    index = copy.series.indexOf(item);
                    scope.series = insertAtIndex(scope.series, item, index - (copy.series.length - scope.selected.length) + 1);
                    scope.colors = insertAtIndex(scope.colors, scope.param.colors[index], index - (copy.series.length - scope.selected.length) + 1);
                    if (scope.isAverage) {
                        scope.data = insertAtIndex(scope.data, copy.avgs[index], index - (copy.series.length - scope.selected.length) + 1);
                    } else {
                        scope.data = insertAtIndex(scope.data, copy.data[index], index - (copy.series.length - scope.selected.length) + 1);
                    }
                    list.push(item);
                }
            };
            scope.exists = function (item, list) {
                return list.indexOf(item) > -1;
            };

            insertAtIndex = function(array, item, index) {
                var part1 = array.slice(0, index);
                var part2 = array.slice(index, array.length);
                part1.push(item);
                return part1.concat(part2);
                
            };
            scope.switchDataMode = function (mode) {
                scope.isAverage = mode;
                switch (mode) {
                    case true:
                        scope.data = copy.avgs.slice();
                        break;
                    case false:
                        scope.data = copy.data.slice();
                        break;

                }

                scope.series = copy.series.slice();
                scope.selected = copy.series.slice();
            }
        }

    }
}]);