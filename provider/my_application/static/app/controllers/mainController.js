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

app.controller('navBarController',
    [
        '$rootScope',
        '$scope',
        '$location',
        '$mdSidenav',
        '$mdToast',
         '$mdDialog',
         '$mdMedia',
         'dashboardSections',
function ($rootScope, $scope, $location, $mdSidenav, $mdToast, $mdDialog, $mdMedia,dashboardSections) {
            $rootScope.path = "Overview";
            
            var userSections = dashboardSections.userSections
            var adminSections = dashboardSections.adminSections
            $scope.auth = oAuthService.authentication;
            
            $scope.isInRole = function (role) {
                if (!$scope.auth || !$scope.auth.me || !$scope.auth.me.roles) {
                    return false;
                }
                return $scope.auth.me.roles.indexOf(role) >= 0;
            }
            $scope.logout = function () {
                oAuthService.logOut();
                $location.path("/login");
            }

            $scope.changePassword = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: '/app/views/templates/change-password-dialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen
                })
                .then(function (answer) {
                        $scope.changePassword();

                    }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });

                $scope.$watch(function () {
                    return $mdMedia('xs') || $mdMedia('sm');
                }, function (wantsFullScreen) {
                    $scope.customFullscreen = (wantsFullScreen === true);
                });
            };
            $scope.openNavSide = function () {
                $mdSidenav('left').toggle();
                // $scope.isSideNavOpen = !$scope.isSideNavOpen;
            };
            $scope.openSubSection = function(sub)
            {
                if (typeof sub.path != "undefined") {
                    $location.path(sub.path);
                }
            }
            $scope.sectionToggle = function(section) {
                section.toggled = !section.toggled;
                
            }
            $scope.switchMode = function(admin){
                $rootScope.sideNaveAdminMode(admin)
                if(admin){
                    $location.path('/admin/accounts');
                } else {
                    $location.path('/home');
                }
            }

            $rootScope.sideNaveAdminMode = function (bool) {
                $scope.isAdminMode = bool;
                if (bool) {
                    $scope.sections = adminSections;
                    return;
                }
                $scope.sections = userSections;
            }

            if ($location.path().indexOf("admin") != -1) {
                $scope.sideNaveAdminMode(false);
            } else {
                $scope.sideNaveAdminMode(true);
            }
            

            function DialogController($scope, $mdDialog) {
                $scope.passQuery = {};
                $scope.$watch("passQuery.confirmPassword", function () {
                    $scope.message = "";
                });
                $scope.changePassword = function () {
 
                    if ($scope.passQuery.newPassword != $scope.passQuery.confirmPassword) {
                        $scope.message = "Confirm password doesn't match";
                        return;
                    }

                    accountsService.changePassword($scope.passQuery).then(function (answer) {
                        $scope.hide();
                        $mdToast.show($mdToast.simple().textContent("Your password has been succesfully updated"));
                    }, function(err) {
                        $scope.message = err.data.modelState[""][0];
                    });
                }

                $scope.hide = function () {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };
                
            }



        }
    ])