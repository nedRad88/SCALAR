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