app.directive('pie', [
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
        templateUrl: 'app/views/templates/pie-chart.html',
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
                        scope.data.push(Number(response.data[i].data).toFixed(2));
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


                scope.options = {
                    responsive:true,
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
                uniDataRequest();
 
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