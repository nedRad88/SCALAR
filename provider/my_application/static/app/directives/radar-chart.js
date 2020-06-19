app.directive('radar', [
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
            mode :"@",
            compareEndpoint: "@",
            period: "=",
            params : "=",
            series: "=",
            topic: "=filter"

        },
        templateUrl: 'app/views/templates/radar-chart.html',
        link: function (scope, element, attrs) {

            //scope.colors = ooredooAppSettings.colors;
            scope.colors = [];

            var sentiments = ["Negative", "Positive", "Neutral"];
            var series_copy = angular.copy(scope.series)
            var series = angular.copy(scope.series);

            intervalle = "week"

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
                    }

                    scope.loading = false;

                }, function errorCallback(err) {
                    scope.message = err.data;
                    $mdToast.show($mdToast.simple().textContent("An error occurred"));
                });
            }

            var initDirective = function()
            {
                scope.loading = true;
                scope.total = 0;

                scope.data = [];
                scope.labels = [];
                var params = angular.copy(scope.params);
                series = angular.copy(series_copy);



                if (scope.period) {
                    var period = scope.period;
                    scope.beginDate = period.begin.replace(/-/g, "/");
                    scope.endDate = period.end.replace(/-/g, "/");
                    for (var j = 0; j < series.length; j++) {
                        series[j].endpoint = series[j].endpoint + "?" + "since=" + period.begin + "&until=" + period.end;
                    }
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
                        for (var j = 0; j < series.length; j++) {

                            series[j].endpoint = series[j].endpoint + "&" + params;
                        }

                    } else {
                        series[j].endpoint = series[j].endpoint + "?" + params;
                    }

                }


                scope.options = {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutoutPercentage: 83,
                    legend: {
                        display: true,
                        position: 'bottom',
                        fullWidth: 'false',
                        labels: {
                            boxWidth: 12,
                            padding: 5
                        }
                    },
                    tooltips: {
                        enabled: true,
                        mode: 'single',
                        callbacks: {
                            afterLabel: function (items, data) {
                                return "%"
                            }
                        }
                    }
                };
                scope.options = {
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        display: true,
                        position: 'bottom',
                        fullWidth: 'false',
                        labels: {
                            boxWidth: 12,
                            padding: 5
                        }
                    },
                    tooltips: {
                        enabled: true,
                        mode: 'single',
                    }
                };
                multiDataRequest();
 
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
                console.info("topic="+scope.topic);
                initDirective();
            });

            
        }

    }



}]);