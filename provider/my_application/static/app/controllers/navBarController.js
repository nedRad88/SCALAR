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
        'oAuthService',
function ($rootScope, $scope, $location, $mdSidenav, $mdToast, $mdDialog, $mdMedia,dashboardSections, oAuthService) {
    
    
            $rootScope.path = "Overview";
            var userSections = dashboardSections.userSections
            var adminSections = dashboardSections.adminSections
            
            $scope.auth = oAuthService.authentication;
            
            $scope.isInRole = function (role) {
                //console.log(role, $scope.auth.me.roles)
                if (!$scope.auth || !$scope.auth.me || !$scope.auth.me.roles) {
                    return false;
                }
                return $scope.auth.me.roles.indexOf(role) >= 0;
            }
            $scope.logout = function () {
                oAuthService.logOut();
                $location.path("/login");
            }
            
            $scope.goToPage = function (page) {
                console.log('here')
                if(page === 'competitions'){
                    $location.path("/competitions");
                }
                
                if(page === 'datastreams'){
                    $location.path("/datastreams");
                }
                
            }

            $scope.changePassword = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'static/app/views/templates/change-password-dialog.html',
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
                 $scope.isSideNavOpen = !$scope.isSideNavOpen;
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
                    $scope.sections = userSections;
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
                    
                    $scope.hide();
                    $mdToast.show($mdToast.simple().textContent("Your password has been succesfully updated"));
                    /**
                    accountsService.changePassword($scope.passQuery).then(function (answer) {
                        $scope.hide();
                        $mdToast.show($mdToast.simple().textContent("Your password has been succesfully updated"));
                    }, function(err) {
                        $scope.message = err.data.modelState[""][0];
                    });**/
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