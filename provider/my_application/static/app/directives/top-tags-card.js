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
                        scope.data=[];
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