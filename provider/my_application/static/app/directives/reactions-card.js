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