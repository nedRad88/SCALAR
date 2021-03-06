﻿app.directive('chart', [
    'dataService',
    'ooredooAppSettings',
    '$mdToast',
    '$q',
    function (dataService, ooredooAppSettings, $mdToast, $q) {
        var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
        var legendTemplate = ooredooAppSettings.legendTemplate;
        var tooltipTemplate = ooredooAppSettings.tooltipTemplate;
        var legendTemplateWithSeries = ooredooAppSettings.legendTemplateWithSeries;
        return {
            restrict: 'EA',
            transclude: 'true',
            scope: {
                title: "@",
                endpoint: "@",
                type: "@",
                mode: "@",
                compareEndpoint: "@",
                period: "=",
                params: "=",
                series: "=",
                topic: "="

            },
            templateUrl: 'app/views/templates/data-chart.html',
            link: function (scope, element, attrs) {

                //scope.colors = ooredooAppSettings.colors;
                scope.colors = [];

                var sentiments = ["Negative", "Positive", "Neutral"];
                var endpoint = scope.endpoint;
                var compareEndpoint = scope.compareEndpoint;
                var series = scope.series;


                var uniDataRequest = function () {
                    scope.dataAvailable = false;
                    scope.kilo = false;
                    var requests = []
                    requests.push(dataService.fireEndpoint(endpoint))
                    if (scope.compareEndpoint) {
                        requests.push(dataService.fireEndpoint(compareEndpoint))
                    }

                    $q.all(requests).then(function successCallback(responses) {
                        var response = responses[0];
                        var total = 0;
                        scope.data = [];
                        scope.labels = [];
                        for (var i = 0; i < response.data.length; i++) {
                            var lbl = response.data[i].label;
                            if (!isNaN(lbl)) {
                                lbl = sentiments[Number(lbl)];

                            }
                            scope.labels.push(lbl);

                            scope.colors.push(ooredooAppSettings.colors[lbl]);
                            scope.data.push(response.data[i].data);
                            total += response.data[i].data;
                            if (response.data[i].data != 0) {

                                scope.dataAvailable = true;
                            }
                        }
                        scope.legend = true;
                        for (var j = 0; j < scope.data.length; j++) {
                            scope.data[j] = Math.round(scope.data[j] * 100 / total);
                        }
                        $(window).resize();
                        scope.total = total;
                        scope.loading = false;
                        if (scope.total > 1000) {
                            scope.modulo = scope.total % 1000;
                            scope.total = scope.total / 1000;
                            scope.kilo = true;
                        }


                        // EVOLUTION
                        if (scope.compareEndpoint) {
                            scope.evolution = responses[1].data.evolution.replace(",", ".");
                            scope.evolution = (isNaN(scope.evolution)) ? 0 : scope.evolution;
                            if (scope.evolution > 1000) {
                                scope.evolution = scope.evolution / 1000;
                                scope.kiloEvo = true;
                            }
                        }
                    }, function errorCallback(err) {
                        scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent("An error occurred"));
                    });
                }

                var multiDataRequest = function () {
                    scope.dataAvailable = true;
                    var requests = [];
                    for (var j = 0; j < series.length; j++) {

                        requests.push(dataService.fireEndpoint(series[j].endpoint));
                    }

                    $q.all(requests).then(function successCallback(responses) {
                        scope.data = [];
                        scope.labels = [];
                        scope.series = [];

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
                                    var m = moment(new Date(d.Year, d.Month, d.Day, d.Hour));
                                    var l = "";
                                    if (i === 0) {
                                        var l = m.format('YYYY/MM/DD');
                                        labels.push(l);
                                    } else {

                                        if (response.data[i].label.Hour != response.data[i - 1].label.Hour) {
                                            l = m.format('HH') + 'h ' + l;
                                        }

                                        if (response.data[i].label.Day != response.data[i - 1].label.Day) {
                                            l = m.format('DD ') + l;
                                        }
                                        if (response.data[i].label.Month != response.data[i - 1].label.Month) {
                                            l = m.format('MM') + l;
                                        }
                                        if (response.data[i].label.Year != response.data[i - 1].label.Year) {
                                            l = m.format('YYYY') + "/" + l;
                                        }
                                        labels.push(l);
                                    }
                                } else {
                                    labels.push(response.data[i].label);
                                }

                                data.push(response.data[i].data);
                            }
                            scope.legend = true;
                            scope.series.push(series[k].name);
                            scope.data.push(data);
                            scope.labels = labels;
                        }

                        scope.loading = false;

                    }, function errorCallback(err) {
                        scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent("An error occurred"));
                    });
                }



                var initDirective = function () {
                    scope.loading = true;
                    scope.total = 0;

                    scope.data = [];
                    scope.labels = [];
                    endpoint = angular.copy(scope.endpoint);
                    compareEndpoint = angular.copy(scope.compareEndpoint);
                    var params = angular.copy(scope.params)
                    series = scope.series;



                    if (scope.period) {
                        var period = scope.period;
                        scope.beginDate = period.begin.replace(/-/g, "/");
                        scope.endDate = period.end.replace(/-/g, "/");
                        endpoint = endpoint + "?" + "since=" + period.begin + "&until=" + period.end;
                        compareEndpoint = compareEndpoint + "?since=" + period.begin + "&until=" + period.end;

                    }

                    if (scope.topic && scope.topic.length) {
                        if (params) {
                            params = params + "&" + "topics=" + scope.topic[0].id;
                        } else {
                            params = "topics=" + scope.topic[0].id;
                        }

                        for (var i = 1; i < scope.topic.length; i++) {
                            params = params + "&" + "topics=" + scope.topic[i].id;
                        }
                    }

                    if (params) {
                        if (scope.period) {
                            endpoint = endpoint + "&" + params;
                            compareEndpoint = compareEndpoint + "&" + params;
                        } else {
                            endpoint = endpoint + "?" + params;
                            compareEndpoint = compareEndpoint + "?" + params;
                        }

                    }

                    if (scope.mode === 'uni-data') {
                        scope.options = { legendTemplate: legendTemplate, responsive: true, percentageInnerCutout: 85, tooltipTemplate: tooltipTemplate };
                        uniDataRequest();


                    } else {
                        scope.options = { legendTemplate: legendTemplateWithSeries, responsive: true };
                        multiDataRequest();


                    }
                }

                var lock = true;
                scope.$watch('period', function () {
                    if (lock) {
                        lock = false;
                        return;
                    }
                    initDirective();
                });


                scope.$watch('topic', function () {
                    console.info("topic=" + scope.topic);
                    initDirective();
                });


            }

        }



    }]);














app.directive('comparableChart', ['dataService', 'ooredooAppSettings', '$mdToast', '$q', function (dataService, ooredooAppSettings, $mdToast, $q) {
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
        templateUrl: 'app/views/templates/comparable-chart.html',
        link: function (scope) {

            var config;
            var init;
            if (scope.config) {
                config = scope.config;
                init = (config.init) ? config.init : { type: 'day', time: 'Today', avg: false };
            } else {
                config = {};
                init = { type: 'day', time: 'Today', avg: false }
            }


            scope.units = ["Hour", "Day", "Week", "Month", "Quarter", "Year"];

            scope.selectUnit = function (unit) {
                scope.selectedUnit = unit;
                pushRequests(unit.toLowerCase());
            }

            scope.switchChartType = function () {
                if (scope.type == "Bar") {
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
                            scope.until = moment().add(1, 'days');
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
                                        l = "Q " + response.data[i].label.Quarter;
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
                                            l = "Week " + response.data[i].label.Week;
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
                                        var e = (response.data[i].label.Week - 1) * 7;
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
                        scope.series.push(series[k].name);
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

            scope.update = function () {
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

            insertAtIndex = function (array, item, index) {
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









app.directive('postCard', ['dataService', 'ooredooAppSettings', '$mdToast', '$q', '$window', '$sce', function (dataService, ooredooAppSettings, $mdToast, $q, $window, $sce) {
    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    return {
        restrict: 'EA',
        transclude: 'true',
        scope: {
            post: "=",
            params: "="

        },
        templateUrl: 'app/views/templates/post-card.html',
        link: function (scope, element, attrs) {

            scope.comments = [];
            scope.filter = "none";
            var endPoint = 'api/post/' + scope.post.id + "/comments";
            if (scope.params.period) {
                endPoint += '?since=' + scope.params.period.begin + '&until=' + scope.params.period.end;
            }
            if (scope.params.mainTopic) {
                endPoint += '&mainTopic=' + scope.params.mainTopic;
            }

            if (scope.params.topics && scope.params.topics.length > 0) {
                for (var i = 0; i < scope.params.topics.length; i++) {
                    endPoint = endPoint + "&" + "topics=" + scope.params.topics[i].id;
                }
            }

            scope.openLink = function (link) {
                $window.open(link, '_blank');
            };


            scope.showAll = function () {
                scope.comments = [];
                scope.filter = "all";
                dataService.fireEndpoint(endPoint).then(
                           function successCallback(response) {
                               for (var i = 0; i < response.data.data.length; i++) {
                                   scope.comments.push(response.data.data[i]);
                               }

                               scope.next = response.data.next;
                           }, function errorCallback(err) {
                               scope.message = err.data;

                           });
            }

            scope.showNegative = function () {
                scope.comments = [];
                scope.filter = "neg";
                dataService.fireEndpoint(endPoint + "&sentiment=neg").then(
                           function successCallback(response) {
                               for (var i = 0; i < response.data.data.length; i++) {
                                   scope.comments.push(response.data.data[i]);
                               }

                               scope.next = response.data.next;
                           }, function errorCallback(err) {
                               scope.message = err.data;

                           });
            }

            scope.showPositive = function () {
                scope.comments = [];
                scope.filter = "pos";
                dataService.fireEndpoint(endPoint + "&sentiment=pos").then(
                           function successCallback(response) {
                               for (var i = 0; i < response.data.data.length; i++) {
                                   scope.comments.push(response.data.data[i]);
                               }

                               scope.next = response.data.next;
                           }, function errorCallback(err) {
                               scope.message = err.data;

                           });
            }

            /*
             if (scope.post.type == "video") {
                 if(scope.post.link.indexOf("youtu") != -1){
                     scope.post.type = "youtube"
                 } else {
                     element.ready(function () {
                         FB.XFBML.parse();
                     });
                 }
                 
             }
             */



            scope.urlify = function urlify(text) {
                var urlRegex = /(https?:\/\/[^\s]+)/g;
                if (text)
                    return text.replace(urlRegex, function (url) {
                        return '<a href="' + url + ' " target="_blank">' + url + '</a>';
                    });
            }
            scope.nextPage = function () {
                dataService.fireEndpoint(scope.next).then(
                            function successCallback(response) {
                                for (var i = 0; i < response.data.data.length; i++) {
                                    scope.comments.push(response.data.data[i]);
                                }
                                scope.next = response.data.next;
                            }, function errorCallback(err) {
                                scope.message = err.data;

                            });
            }

            scope.reportComment = function (comment) {
                dataService.reportComment(comment.id, comment.newSentiment).then(
                           function successCallback(response) {
                               comment.sentiment = comment.newSentiment;
                               comment.report = false;
                           }, function errorCallback(err) {


                           });
            }

        }


    }


}]);






app.directive('reactionsCard', ['dataService', 'ooredooAppSettings', '$mdToast', '$q', function (dataService, ooredooAppSettings, $mdToast, $q) {
    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    return {

        templateUrl: 'app/views/templates/reactions-card.html',
        link: function (scope, element, attrs) {
            scope.reactions = [
                { count: 20, icon: "/content/images/reactions/Grrr.PNG" },
                { count: 320, icon: "/content/images/reactions/Haha.PNG" },
                { count: 234, icon: "/content/images/reactions/Like.PNG" },
                { count: 420, icon: "/content/images/reactions/Love.PNG" },
                { count: 242, icon: "/content/images/reactions/Sad.PNG" },
                { count: 542, icon: "/content/images/reactions/Wouah.PNG" }
            ];
            /*
            dataService.fireEndpoint(scope.endpoint).then(
                function successCallback(response) {
                    scope.loading = false;
                    scope.data.count = response.data.count;
                    scope.data.avg = response.data.avg.replace(",",".") * 100;
                    scope.data.evolution = response.data.evolution.replace(",", ".") ;
                }, function errorCallback(err) {
                    scope.message = err.data;
                    $mdToast.show($mdToast.simple().textContent("An error occurred"));
                });*/
        }

    }


}]);












app.directive('squareNumberCard', ['dataService', 'ooredooAppSettings', '$mdToast', '$q', function (dataService, ooredooAppSettings, $mdToast, $q) {
    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    return {
        restrict: 'EA',
        transclude: 'true',
        scope: {
            title: "@",
            name: "@",
            id: "@page",
            period: "=",
            params: "=",
            others: "=",
            topic: "="

        },

        templateUrl: 'app/views/templates/square-number-card.html',
        link: function (scope) {
            scope.data = [];
            scope.loading = true;
            scope.total = 0;
            var requests = [];
            var param = '';
            var operators = ["ooredoo", "mobilis", "at", "djezzy"];
            scope.operators = operators;
            var operatorsIds = ["108951559158989", "50847714953", "521549424529415", "182557711758412"];
            scope.colors = ['#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
            var concurents = [];
            var concurentsIds = [];


            var initDirective = function () {
                concurents = [];
                concurentsIds = [];
                requests = [];
                param = '';
                scope.data = [];
                scope.loading = true;
                scope.total = 0;

                if (scope.period) {
                    var period = scope.period;
                    scope.beginDate = period.begin.replace(/-/g, "/");
                    scope.endDate = period.end.replace(/-/g, "/");
                    param = param + "?" + "since=" + period.begin + "&until=" + period.end;

                }


                if (scope.topic && scope.topic.length) {
                    if (param) {
                        param = param + "&" + "topics=" + scope.topic[0].id;
                    } else {
                        param = "topics=" + scope.topic[0].id;
                    }

                    for (var i = 1; i < scope.topic.length; i++) {
                        param = param + "&" + "topics=" + scope.topic[i].id;
                    }
                }

                if (scope.params) {
                    if (param != "") {
                        param = param + "&" + scope.params;
                    } else {
                        param = param + "?" + scope.params;
                    }

                }




                for (var i = 0; i < operators.length; i++) {
                    if (operators[i].toLowerCase() != scope.name.toLowerCase()) {
                        concurents.push(operators[i]);
                        concurentsIds.push(operatorsIds[i]);
                    }

                }

                if (scope.others) {
                    for (var j = 0; j < concurentsIds.length ; j++) {

                        requests.push(dataService.fireEndpoint('api/page/' + concurentsIds[j] + '/operator/' + scope.name + param));
                        scope.data.push({ "label": concurents[j] });
                    }
                } else {
                    for (var j = 0; j < concurents.length ; j++) {

                        requests.push(dataService.fireEndpoint('api/page/' + scope.id + '/operator/' + concurents[j] + param));
                        scope.data.push({ "label": concurents[j] });
                    }
                }






                $q.all(requests).then(function successCallback(responses) {

                    scope.total = 0;
                    for (var l = 0; l < responses.length; l++) {
                        scope.total = scope.total + responses[l].data;
                    }

                    for (var k = 0; k < responses.length; k++) {
                        scope.data[k].count = (responses[k].data == 0 || scope.total == 0) ? 0 : (responses[k].data * 100) / scope.total;
                    }

                    scope.loading = false;
                }, function errorCallback(err) {
                    scope.message = err.data;
                    $mdToast.show($mdToast.simple().textContent("An error occurred"));
                });

            }

            var lock = true;
            scope.$watch('period', function () {
                if (lock) {
                    lock = false;
                    return;
                }
                initDirective();
            });

            scope.$watch('topic', function () {
                initDirective();
            });

        }


    }


}]);









app.directive('statsCard', ['dataService', 'ooredooAppSettings', '$mdToast', '$q', function (dataService, ooredooAppSettings, $mdToast, $q) {
    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    return {
        restrict: 'EA',
        transclude: 'true',
        scope: {
            title: "@",
            endpoint: "@",
            period: "=",
            topic: "=",
            invertColor: "="
        },
        templateUrl: 'app/views/templates/stats-card-numbers.html',
        link: function (scope) {
            var initDirective = function () {
                scope.data = {};
                scope.loading = true;
                scope.kilo = false;
                var endpoint = scope.endpoint + "?since=" + scope.period.begin + "&until=" + scope.period.end;


                if (scope.topic && scope.topic.length) {

                    for (var i = 0; i < scope.topic.length; i++) {
                        endpoint = endpoint + "&" + "topics=" + scope.topic[i].id;
                    }
                }
                dataService.fireEndpoint(endpoint).then(
                    function successCallback(response) {
                        scope.loading = false;
                        scope.data.count = response.data.count;

                        if (response.data.avg != undefined) {
                            var avg = (response.data.avg + "").replace(",", ".");
                            scope.data.avg = (isNaN(avg)) ? 0 : avg * 100;
                        }

                        var evol = (response.data.evolution + "").replace(",", ".");
                        scope.data.evolution = (isNaN(evol)) ? 0 : evol * 100;
                        if (scope.data.evolution > 1000) {
                            scope.data.evolution = scope.data.evolution / 1000;
                            scope.kilo = true;
                        }

                    }, function errorCallback(err) {
                        scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent("An error occurred"));
                    });
            };

            var lock = true;
            scope.$watch('period', function () {
                if (lock) {
                    lock = false;
                    return;
                }
                initDirective();
            });

            scope.$watch('topic', function () {
                console.info("topic=" + scope.topic);
                initDirective();
            });
        }
    }
}]);






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
                init = (config.init) ? config.init : { type: 'day', time: 'Today', avg: false };
            } else {
                config = {};
                init = { type: 'day', time: 'Today', avg: false }
            }


            scope.units = ["Hour", "Day", "Week", "Month", "Quarter", "Year"];

            scope.selectUnit = function (unit) {
                scope.selectedUnit = unit;
                pushRequests(unit.toLowerCase());
            }

            scope.switchChartType = function () {
                if (scope.type == "Bar") {
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
                            scope.until = moment().add(1, 'days');
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
                                        l = "Q " + response.data[i].label.Quarter;
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
                                            l = "Week " + response.data[i].label.Week;
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
                                        var e = (response.data[i].label.Week - 1) * 7;
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

            scope.update = function () {
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

            insertAtIndex = function (array, item, index) {
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









app.directive('topTagsCard', ['dataService', 'ooredooAppSettings', '$mdToast', '$q', function (dataService, ooredooAppSettings, $mdToast, $q) {
    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    return {
        restrict: 'EA',
        transclude: 'true',
        scope: {
            title: "@",
            endpoint: "@",
            period: "=",
            topic: "=",
            params: "="
        },
        templateUrl: 'app/views/templates/top-tags-card.html',
        link: function (scope) {
            scope.colors = ooredooAppSettings.sentimentsColors;
            var initDirective = function () {
                scope.data = {};
                scope.loading = true;
                scope.kilo = false;
                var endpoint = scope.endpoint + "?since=" + scope.period.begin + "&until=" + scope.period.end;
                var params = angular.copy(scope.params);

                if (scope.topic && scope.topic.length) {
                    if (params) {
                        params = params + "&" + "topics=" + scope.topic[0].id;
                    } else {
                        params = "topics=" + scope.topic[0].id;
                    }

                    for (var i = 1; i < scope.topic.length; i++) {
                        params = params + "&" + "topics=" + scope.topic[i].id;
                    }
                }

                if (params) {
                    if (scope.period) {
                        endpoint = endpoint + "&" + params;
                    } else {
                        endpoint = endpoint + "?" + params;
                    }

                }


                dataService.fireEndpoint(endpoint).then(
                    function successCallback(response) {
                        scope.loading = false;
                        scope.data = [];
                        for (var j = 0; j < response.data.length; j++) {
                            var tag = response.data[j];
                            tag.total = tag.positiveCount + tag.negativeCount + tag.neutralCount;
                            scope.data.push(tag);
                        }

                    }, function errorCallback(err) {
                        scope.message = err.data;
                    });
            };


            var lock = true;
            scope.$watch('period', function () {
                if (lock) {
                    lock = false;
                    return;
                }
                initDirective();
            });

            scope.$watch('topic', function () {
                console.info("topic=" + scope.topic);
                initDirective();
            });
        }
    }
}]);