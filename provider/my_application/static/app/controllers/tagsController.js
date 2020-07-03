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




app.controller('tagsController',
     [
        '$rootScope',
        '$scope',
        'tagsService',
        '$mdToast',
        '$mdDialog',
        '$mdMedia',

        function ($rootScope, $scope, tagsService, $mdToast, $mdDialog, $mdMedia) {
            'use strict';
            $rootScope.path = 'ADMIN/TAGS';
            $rootScope.sideNaveAdminMode(true);
            $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
            $scope.loading = true;
            var tags = [];
            $scope.selectedTags = [];
            $scope.tagCount = function () {
                return tags.length;
            };

            $scope.tagQuery = {
                order: 'id',
                limit: 10,
                page: 1
            };

            $scope.getTags = function () {
                $scope.tags = tags.slice(($scope.tagQuery.page - 1) * $scope.tagQuery.limit,
                    ($scope.tagQuery.page) * ($scope.tagQuery.limit));
                $scope.selectedTags = [];
            };

            $scope.search = function (query) {
                query = query.toLowerCase();
                if (!query || query.length == 0) {
                    $scope.getTags();
                } else {
                    var filtered = [];
                    angular.forEach(tags, function (item) {
                        if (item.id.toLowerCase().indexOf(query) != -1) {
                            filtered.push(item);
                        }
                    });
                    $scope.tags = filtered;
                }
                
            };

            tagsService.getAllTags().then(
            function successCallback(response) {
                tags = response.data;
                tags.sort(function(a, b) {
                    if (a.id.toLowerCase() < b.id.toLowerCase()) return -1;
                    if (a.id.toLowerCase() > b.id.toLowerCase()) return 1;
                    return 0;
                });

                $scope.getTags();
                $scope.loading = false;
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });

            $scope.getTags();

            
            $scope.editTag = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'app/views/templates/add-tag-dialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen,
                    resolve: {
                        tag: function () {
                            return ev;
                        }

                    }

                })
                .then(function (answer) {

                    $scope.getTags();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
                $scope.$watch(function () {
                    return $mdMedia('xs') || $mdMedia('sm');
                }, function (wantsFullScreen) {
                    $scope.customFullscreen = (wantsFullScreen === true);
                });
            };
            $scope.addTag = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'app/views/templates/add-tag-dialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen,
                    resolve: {
                        tag: function () {
                            return undefined;
                        }

                    }
                })
                .then(function (answer) {
                    tags.unshift(answer);
                    $scope.getTags();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
                $scope.$watch(function () {
                    return $mdMedia('xs') || $mdMedia('sm');
                }, function (wantsFullScreen) {
                    $scope.customFullscreen = (wantsFullScreen === true);
                });
            };

            $scope.deleteTags = function (ev) {
                var confirm = $mdDialog.confirm()
                      .title('Would you like to delete selected tags?')
                      .textContent('All these tags will be removed.')
                      .targetEvent(ev)
                      .ok('Remove')
                      .cancel('Cancel');
                $mdDialog.show(confirm).then(function () {
                    remove();
                }, function () {

                });
            };


            var remove = function () {

                var tagsToDelete = [];
                for (var i = 0; i < $scope.selectedTags.length; i++) {
                    tagsToDelete.push($scope.selectedTags[i].id);
                }

                tagsService.deleteTags(tagsToDelete).then(function (answer) {
                    var indexs = [];
                    for (var j = 0; j < tags.length; j++) {
                        var obj = tags[j];
                        if (tagsToDelete.indexOf(obj.id) >= 0) {
                            indexs.push(j);
                        }
                    }
                    var deleted = 0;
                    for (var k = 0; k < indexs.length; k++) {
                        tags.splice(indexs[k] - deleted, 1);
                        deleted = deleted + 1;
                    }
                    $scope.getTags();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });

            }


            function DialogController($scope, $mdDialog, $mdConstant, tag) {
                $scope.keys = [$mdConstant.KEY_CODE.ENTER, $mdConstant.KEY_CODE.COMMA]
                $scope.isLoading = false;
                $scope.suggestedKeywords = [];
                $scope.selectedKeywords = [];
                var previousTag = {};
                if (tag) {
                    $scope.modeEdit = true;
                    previousTag.keywords = tag.keywords.slice();
                    previousTag.id = tag.id;

                    $scope.tag = tag;
                } else {
                    $scope.modeEdit = false;
                    $scope.tag = { id: "", keywords: [] }
                }

                $scope.suggest = function (keywords) {
                    $scope.isLoading = true;
                    tagsService.suggestKeywords(keywords).then(
                        function successCallback(response) {
                            $scope.suggestedKeywords = response.data;
                            $scope.isLoading = false;
                        }, function errorCallback(err) {
                            $scope.message = err.data;
                            $scope.isLoading = false;
                            $mdToast.show($mdToast.simple().textContent(err.data));
                        });
                }

                $scope.addSelectedKeywords = function (selectedKeywords) {
                    for (var i = 0; i < selectedKeywords.length; i++) {
                        $scope.tag.keywords.push(selectedKeywords[i][0])
                    }


                }


                $scope.hide = function () {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    if ($scope.modeEdit) {
                        tag.keywords = previousTag.keywords;
                        tag.id = previousTag.id;
                    }
                   
                    $mdDialog.cancel();
                };
                $scope.add = function (tag) {
                    tagsService.addTag(tag).then(function (answer) {
                        $mdDialog.hide(tag);
                    }, function (err) {
                        $scope.message = err.data;
                    });
                };

                $scope.edit = function (tag) {
                    tagsService.editTag(previousTag.id, tag).then(function (answer) {
                        $mdDialog.hide(tag);
                    }, function (err) {

                        $scope.message = err.data;
                    });
                };

            }


        }])


