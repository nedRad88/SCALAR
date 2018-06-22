'use strict'

app.controller('accountsController',
     [
        '$rootScope',
        '$scope',
        'accountsService',
        '$mdToast',
        '$mdDialog',
        '$mdMedia',
        '$location',
        'randomString',
        function ($rootScope, $scope, accountsService, $mdToast, $mdDialog, $mdMedia, $location,randomString) {
            'use strict';
            var passMinLength = 8;
            $rootScope.path = 'ADMIN/ACCOUNTS';
            $rootScope.sideNaveAdminMode(true);
            $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
            var users = [];
            $scope.loading = true;
            $scope.selected = [];
            $scope.allowed = false;
            $scope.count = function() {
                return users.length;
            };

            $scope.query = {
                order: 'userName',
                limit: 10,
                page: 1,
                filter:''
            };

            $scope.getUsers = function () {
                $scope.users = users.slice(($scope.query.page - 1) * $scope.query.limit,
                    ($scope.query.page) * ($scope.query.limit));
                $scope.selected = [];
            };

            $scope.search = function (query) {
                query = query.toLowerCase();
                if (!query || query.length == 0) {
                    $scope.getUsers();
                } else {
                    var filtered = [];
                    angular.forEach(users, function (item) {
                        if (item.firstName.toLowerCase().indexOf(query) != -1) {
                            filtered.push(item);
                        }
                    });
                    $scope.users = filtered;
                }

            };

            accountsService.getAllAccounts().then(
            function successCallback(response) {
                users = response.data;
                console.log(response)
                /**
                users.sort(function (a, b) {
                    if (a.firstName.toLowerCase() < b.firstName.toLowerCase()) return -1;
                    if (a.firstName.toLowerCase() > b.firstName.toLowerCase()) return 1;
                    return 0;
                });**/
                
                $scope.getUsers();
                $scope.loading = false;
                $scope.allowed = true;
                
            }, function errorCallback(err) {
                console.log(err);
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
                $location.url('/forbidden');
                
            });
            
           

            
            $scope.editUser = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'static/app/views/templates/add-user-dialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen,
                    resolve: {
                        user: function () {
                            return ev;
                        }
                    }
                })
                .then(function () {
                    $scope.getUsers();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
                $scope.$watch(function () {
                    return $mdMedia('xs') || $mdMedia('sm');
                }, function (wantsFullScreen) {
                    $scope.customFullscreen = (wantsFullScreen === true);
                });
            };


            $scope.addUser = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: '/static/app/views/templates/add-user-dialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen,
                    resolve: {
                        user: function () {
                            return null;
                        }
                    }
                })
                .then(function (answer) {
                    users.unshift(answer);
                    $scope.getUsers();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
                $scope.$watch(function () {
                    return $mdMedia('xs') || $mdMedia('sm');
                }, function (wantsFullScreen) {
                    $scope.customFullscreen = (wantsFullScreen === true);
                });
            };

            $scope.deleteUsers = function (ev) {
                var confirm = $mdDialog.confirm()
                      .title('Would you like to delete selected users?')
                      .textContent('Selected users will be removed.')
                      .targetEvent(ev)
                      .ok('Remove')
                      .cancel('Cancel');
                $mdDialog.show(confirm).then(function () {
                    remove();
                }, function () {
                    
                });
            };


            $scope.resetPassword = function (ev) {
                $scope.toReset = ev;
                $scope.toReset.newPassowrd = randomString(passMinLength);
                var confirm = $mdDialog.confirm()
                      .title('Would you like to reset the user password?')
                      .textContent('The new password will be: ' + $scope.toReset.newPassowrd)
                      .targetEvent(ev)
                      .ok('Reset')
                      .cancel('Cancel');

                $mdDialog.show(confirm).then(function (answer) {
                    resetPassword($scope.toReset);

                }, function () {

                });
            };

            var remove = function () {

                var usersToDelete = [];
                for (var i = 0; i < $scope.selected.length; i++) {
                    usersToDelete.push($scope.selected[i].email);
                }
                accountsService.deleteAccounts(usersToDelete).then(function (answer) {
                    var indexs = [];
                    for (var j = 0; j < users.length; j++) {
                            var obj = users[j];
                            if (usersToDelete.indexOf(obj.userName) >= 0) {
                                indexs.push(j);
                            }
                    }
                    var deleted = 0;
                    for (var k = 0; k < indexs.length; k++) {
                        users.splice(indexs[k] - deleted, 1);
                        deleted = deleted + 1;
                    }
                    $scope.getUsers();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });

            };
            var resetPassword = function(user) {
                accountsService.resetAccountPassword(user.userName, user.newPassowrd).then(function (answer) {
                  
                }, function () {

                });
            };

            function DialogController($scope, $mdDialog, user) {
                $scope.previousUser = {};
                if (user) {
                    $scope.modeEdit = true;
                    $scope.previousUser = angular.copy(user);
                    $scope.selectedRoles = user.roles;
                    $scope.user = user;
                } else {
                    $scope.modeEdit = false;
                    $scope.user = {}
                }
                
                $scope.generatePassword = function () {
                    $scope.user.password = randomString(passMinLength);
                    $scope.user.confirmPassword = $scope.user.password;
                }

                $scope.generatePassword();

                $scope.roles = [
                    'admin'
                ]
                $scope.hide = function() {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    if ($scope.modeEdit) {
                        user.email = $scope.previousUser.email;
                        user.firstName = $scope.previousUser.firstName;
                        user.lastName = $scope.previousUser.lastName;
                        user.phone = $scope.previousUser.phone;
                        user.roles = $scope.previousUser.roles;
                    }
                    $mdDialog.cancel();
                    
                };

                $scope.edit = function (user, mail) {

                    var tmp = user;
                    tmp.roles = [];
                    if (typeof $scope.selectedRoles != 'undefined') {
                        for (var i = 0; i < $scope.selectedRoles.length; i++) {
                            tmp.roles.push({ roleId: $scope.selectedRoles[i], roleName: $scope.selectedRoles[i] })
                        }
                    }
                    
                    tmp.phoneNumber = user.phone;
                    tmp.userName = user.email;
                    accountsService.editAccount(tmp, mail).then(function (answer) {
                        user.roles = $scope.selectedRoles;
                        $mdDialog.hide();
                    }, function (err) {
                        $scope.message = err.data;
                    });
                }

                $scope.add = function (user) {
                    user.roles = (typeof $scope.selectedRoles != 'undefined')? $scope.selectedRoles:[];
                    user.roles.push('user');
                    
                    var tmp = user;
                    tmp.userName = user.email;
                    /*
                    user.password = user.firstName + user.lastName;
                    user.confirmPassword = user.password;
                    */
                    accountsService.addAccount(user).then(function (answer) {
                        $mdDialog.hide(tmp);
                    }, function (err) {
                        $scope.message = err.data;
                    });
                };
            }


        }])