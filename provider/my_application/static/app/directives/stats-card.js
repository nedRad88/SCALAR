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
            invertColor:"="
        },
        templateUrl: 'app/views/templates/stats-card-numbers.html',
        link: function (scope) {
            var initDirective = function() {
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
                            var avg = (response.data.avg+"").replace(",", ".");
                            scope.data.avg = (isNaN(avg)) ? 0 : avg * 100;
                        }

                        var evol = (response.data.evolution+"").replace(",", ".");
                        scope.data.evolution = (isNaN(evol)) ? 0 : evol*100;
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