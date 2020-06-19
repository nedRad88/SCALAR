app.directive('chart', [
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
            topic: "="

        },
        templateUrl: 'app/views/templates/data-chart.html',
        link: function (scope, element, attrs) {

            //scope.colors = ooredooAppSettings.colors;
            scope.colors = [];

            var sentiments = ["Negative","Positive", "Neutral" ];
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
                    for (var j = 0; j < scope.data.length; j ++) {
                        scope.data[j] = Math.round(scope.data[j] *100 / total);
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



            var initDirective = function()
            {
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
                console.info("topic="+scope.topic);
                initDirective();
            });

            
        }

    }



}]);