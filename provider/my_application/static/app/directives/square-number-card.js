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


            var initDirective = function() {
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