'use strict';
app.factory('postsService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var postsServiceFactory = {};

    var _getPosts = function (params) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/post'+params,
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
    
    var _getPostComments = function (id) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/post'+id,
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

    postsServiceFactory.getPosts = _getPosts;
    postsServiceFactory.getPostComments = _getPostComments;
  

    return postsServiceFactory;
}]);