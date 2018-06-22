'use strict';
app.factory('userService', ['$http', '$q', 'ooredooAppSettings','oAuthService', function ($http, $q, ooredooAppSettings, oAuthService) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var usersServiceFactory = {};
    var user_id = oAuthService.authentication.me.uid
    
    var _getUserCompetitions = function (status, page, step) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/users/'+user_id+'/competitions?status='+status+'&page='+page+'&step='+step,
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
    
    var _getUserDatastreams = function (status, page, step) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/users/'+user_id+'/datastreams?page='+page+'&step='+step,
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

    
    usersServiceFactory.getUserCompetitions = _getUserCompetitions;

    
    return usersServiceFactory;
}]);