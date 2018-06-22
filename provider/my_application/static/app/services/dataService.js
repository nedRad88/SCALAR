'use strict';
app.factory('dataService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    
    
    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var dataServiceFactory = {};
    var _fireEndPoint = function (endpoint) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + endpoint,
            //url : 'http://localhost:5000/api/results/1/1',
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
    var _reportComment = function (id, pol) {
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + "api/comment/"+id+"/report",
            data: '"'+pol+'"',
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
    
     var _getStream = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + "topic",
            data: '"'+pol+'"',
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
    
  
    
    dataServiceFactory.fireEndpoint = _fireEndPoint;
    dataServiceFactory.reportComment = _reportComment;
    
    
    
    return dataServiceFactory;
}]);