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
app.factory('accountsService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.oAuthServiceBaseUri;
    var accountsServiceFactory = {};
    
    var _getAllAccounts = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'admin/accounts',
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

    var _register = function (user) {
        
        console.log(user)
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'register',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: user

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    }

    var _editAccount = function (user, id) {
        var notify = (user.notify) ? "?notify=true" : "?notify=false";
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + 'api/account/'+id+'/' + notify,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: user

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    };
    var _deleteAccounts = function (users) {
        console.log(users);
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'admin/accounts/delete',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data:users

        };
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    }

    var _resetAccountPassword = function(userName, new_password) {
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + 'api/account/'+ userName+'/password',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: '"'+new_password+'"'

        };
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    };


    var _changePassword = function (query) {


        var deferred = $q.defer();

        var req = {
            method: 'PUT',
            url: serviceBase + 'api/account/me/password',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: query
        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;

    }

    accountsServiceFactory.getAllAccounts = _getAllAccounts;
    accountsServiceFactory.register = _register;
    accountsServiceFactory.editAccount = _editAccount;
    accountsServiceFactory.deleteAccounts = _deleteAccounts;
    accountsServiceFactory.resetAccountPassword = _resetAccountPassword;
    accountsServiceFactory.changePassword = _changePassword;
    return accountsServiceFactory;
}]);