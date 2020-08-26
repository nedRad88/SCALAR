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