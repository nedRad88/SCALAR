/*

Copyright 2020 Nedeljko Radulovic, Dihia Boulegane, Albert Bifet

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */
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
