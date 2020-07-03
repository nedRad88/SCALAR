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
app.factory('oAuthService', ['$http', '$q', 'localStorageService', 'ooredooAppSettings', function ($http, $q, localStorageService, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.oAuthServiceBaseUri;
    var authServiceFactory = {};

    var _authentication = {
        isAuth: false,
        me: ""
    };

    var _saveRegistration = function (registration) {
        
        return $http.post(serviceBase + 'api/account/register', registration).then(function (response) {
            return response;
        });

    };

    var _login = function (loginData) {

        var data = "grant_type=password&username=" + loginData.email + "&password=" + loginData.password;

        var deferred = $q.defer();

        //console.log(data)
        $http.post(serviceBase + 'login', data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).success(function (response) {
            
            
            
            var req = {
                method: 'GET',
                url : serviceBase + 'api/account/me',
                headers : {
                    //'Authorization': 'Bearer ' + response.access_token,
                    'Authorization': response.access_token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                data:""

            }
            $http(req).then(
                function successCallback(resp) {
                    console.log(resp)
                    localStorageService.set('authorizationData', { token: response.access_token, me: resp.data });
                    _authentication.isAuth = true;
                    console.log(resp.data)
                    _authentication.me = resp.data;
                    deferred.resolve(response);
            }, function errorCallback(err) {
                    _logOut();
                    deferred.reject(err);
                });
            

        }).error(function (err, status) {
            _logOut();
            deferred.reject(err);
        });

        return deferred.promise;

    };

    var _logOut = function () {

        localStorageService.remove('authorizationData');

        _authentication.isAuth = false;
        _authentication.me = "";

    };

    var _fillAuthData = function () {

        var authData = localStorageService.get('authorizationData');
        if (authData) {
            _authentication.isAuth = true;
            _authentication.me = authData.me;
        }

    };

    var _isInRole = function (role) {
        //console.log(role, $scope.auth.me.roles)
        if (!_authentication || !_authentication.me || !_authentication.me.roles) {
            return false;
        }
        return _authentication.me.roles.indexOf(role) >= 0;
    }


    authServiceFactory.saveRegistration = _saveRegistration;
    authServiceFactory.login = _login;
    authServiceFactory.logOut = _logOut;
    authServiceFactory.fillAuthData = _fillAuthData;
    authServiceFactory.authentication = _authentication;
    authServiceFactory.isInRole = _isInRole;


    return authServiceFactory;
}]);