'use strict';
app.factory('resultsService', ['$http', '$q', 'ooredooAppSettings','oAuthService', function ($http, $q, ooredooAppSettings, oAuthService) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var resultsServiceFactory = {};
    
    
    var _getResults = function (competition_id,field, measure) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/leaderboard/'+competition_id+'?field='+field+'&measure='+measure,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }
    
    
    resultsServiceFactory.getResults = _getResults;

    
    return resultsServiceFactory;
}]);