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
'use strict'

app.controller('pagesController',
     [
        '$scope',
        'pagesService',
        '$mdToast',
        '$mdDialog',
        '$mdMedia',
        function ($scope, pagesService, $mdToast, $mdDialog, $mdMedia) {
            'use strict';
            $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
            var pages = []
            $scope.selected = [];
            $scope.count = function () {
                return users.length;
            };

            $scope.query = {
                order: 'userName',
                limit: 5,
                page: 1
            };

            $scope.getPages = function () {
                $scope.users = users.slice(($scope.query.page - 1) * $scope.query.limit,
                    ($scope.query.page) * ($scope.query.limit));
                $scope.selected = [];
            };


            pagesService.getPages().then(
            function successCallback(response) {
                users = response.data.result;

                $scope.getUsers();
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });

            

            
            function DialogController($scope, $mdDialog) {

                $scope.roles = [
                    'admin'
                ]
                $scope.hide = function () {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };
                $scope.add = function (user) {
                    user.roles = (typeof $scope.selectedRoles != 'undefined') ? $scope.selectedRoles : [];
                    user.roles.push('user');

                    var tmp = user;
                    tmp.userName = user.email;
                    user.password = user.firstName + user.lastName;
                    user.confirmPassword = user.password;

                    accountsService.addAccount(user).then(function (answer) {
                        $mdDialog.hide(tmp);
                    }, function (err) {
                        $scope.message = err.data;
                    });
                };
            }


        }])