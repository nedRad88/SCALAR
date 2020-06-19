'use strict';
app.factory('subscriptionService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    
    var subscriptionServiceFactory = {};
    
  
    var _isSubscribed = function (subscriptionData) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/subscriptions/check?competition='+subscriptionData.competition_id + '&user='+subscriptionData.user,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

        }
        $http(req).then(
            function successCallback(response) {
                console.log(response)
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }
    
    
    var _addSubscription = function (subscriptionData) {
        
        console.log(subscriptionData)
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/subscriptions',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: subscriptionData

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    }
    
    var _unSubscribe = function (subscriptionData) {
        
        
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/subscriptions/delete',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: subscriptionData

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    }
    
    var _getSecretKey = function (subscriptionData) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/subscriptions/secret?competition='+subscriptionData.competition_id + '&user='+subscriptionData.user,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

        }
        $http(req).then(
            function successCallback(response) {
                console.log(response)
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }
    
    subscriptionServiceFactory.addSubscription = _addSubscription;
    subscriptionServiceFactory.isSubscribed = _isSubscribed;
    subscriptionServiceFactory.unSubscribe = _unSubscribe;
    subscriptionServiceFactory.getSecretKey = _getSecretKey;
   

    return subscriptionServiceFactory;
}]); 
