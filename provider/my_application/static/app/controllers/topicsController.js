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

app.controller('topicsController',
     [
        '$rootScope',
        '$scope',
        'topicsService',
        'tagsService',
        '$mdToast',
        '$mdDialog',
        '$mdMedia',
        function ($rootScope, $scope, topicsService, tagsService, $mdToast, $mdDialog, $mdMedia) {
            'use strict';
            $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
            $rootScope.path = 'ADMIN/TOPICS';
            $rootScope.sideNaveAdminMode(true);
            var topics = [];
            
            $scope.loading = true;
            $scope.selectedTopics = [];
            $scope.topicCount = function() {
                return topics.length;
            };
            

            $scope.search = function (query) {
                query = query.toLowerCase();
                if (!query || query.length == 0) {
                    $scope.getTopics();
                } else {
                    var filtered = [];
                    angular.forEach(topics, function (item) {
                        if (item.id.toLowerCase().indexOf(query) != -1) {
                            filtered.push(item);
                        }
                    });
                    $scope.topics = filtered;
                }

            };


            $scope.topicQuery = {
                order: 'userName',
                limit: 10,
                page: 1,
                filter:''
            };

            $scope.getTopics = function () {
                $scope.topics = topics.slice(($scope.topicQuery.page - 1) * $scope.topicQuery.limit,
                    ($scope.topicQuery.page) * ($scope.topicQuery.limit));
                $scope.selectedTopics = [];
            };
 

            topicsService.getAllTopics().then(
            function successCallback(response) {
                topics = response.data;
                topics.sort(function (a, b) {
                    if (a.id.toLowerCase() < b.id.toLowerCase()) return -1;
                    if (a.id.toLowerCase() > b.id.toLowerCase()) return 1;
                    return 0;
                });
                $scope.getTopics();
                $scope.loading = false;
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });

            $scope.getTopics();


            $scope.editTopic = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'app/views/templates/add-topic-dialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen,
                    resolve: {
                        topic: function() {
                            return ev;
                        }

                        }

                    })
                .then(function (answer) {
                    
                    $scope.getTopics();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
                $scope.$watch(function () {
                    return $mdMedia('xs') || $mdMedia('sm');
                }, function (wantsFullScreen) {
                    $scope.customFullscreen = (wantsFullScreen === true);
                });
            };
            $scope.addTopic = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'app/views/templates/add-topic-dialog.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen,
                    resolve: {
                        topic: function () {
                            return undefined;
                        }

                    }
                })
                .then(function (answer) {
                    topics.unshift(answer);
                    $scope.getTopics();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
                $scope.$watch(function () {
                    return $mdMedia('xs') || $mdMedia('sm');
                }, function (wantsFullScreen) {
                    $scope.customFullscreen = (wantsFullScreen === true);
                });
            };

            $scope.deleteTopics = function (ev) {
                var confirm = $mdDialog.confirm()
                      .title('Would you like to delete selected topic?')
                      .textContent('All these topics will be removed.')
                      .targetEvent(ev)
                      .ok('Remove')
                      .cancel('Cancel');
                $mdDialog.show(confirm).then(function () {
                    remove();
                }, function () {
                    
                });
            };


            var remove = function () {

                var topicsToDelete = [];
                for (var i = 0; i < $scope.selectedTopics.length; i++) {
                    topicsToDelete.push($scope.selectedTopics[i].id);
                }
                
                topicsService.deleteTopics(topicsToDelete).then(function (answer) {
                    var indexs = [];
                    for (var j = 0; j < topics.length; j++) {
                        var obj = topics[j];
                            if (topicsToDelete.indexOf(obj.id) >= 0) {
                                indexs.push(j);
                            }
                    }
                    var deleted = 0;
                    for (var k = 0; k < indexs.length; k++) {
                        topics.splice(indexs[k] - deleted, 1);
                        deleted = deleted + 1;
                    }
                    $scope.getTopics();
                }, function () {
                    $scope.status = 'You cancelled the dialog.';
                });
                
            }
           

            function DialogController($scope, $mdDialog, topic, topicsService, tagsService) {


                $scope.tagsSuggestion = [];
                $scope.selectedItem = null;
                $scope.searchText = null;
                $scope.groups = [];
                topicsService.getAllGroups().then(
                  function successCallback(response) {

                      for (var i = 0; i < response.data.length; i++) {
                          $scope.groups.push(response.data[i].label);
                      }


                  }, function errorCallback(err) {
                      $scope.message = err.data;
                    
                  });


                $scope.querySearch= function  (query) {
                    var results = query ? $scope.tagsSuggestion.filter(createFilterFor(query)) : [];
                    return results;
                }

                function createFilterFor(query) {
                    var lowercaseQuery = angular.lowercase(query);
                    return function filterFn(tag) {
                        return (tag.toLowerCase().indexOf(lowercaseQuery) === 0);
                    };
                }

                tagsService.getAllTags().then(
                function successCallback(response) {

                    for (var i = 0; i < response.data.length; i++) {
                        $scope.tagsSuggestion.push(response.data[i].id);
                    }
                    
                    
                }, function errorCallback(err) {
                    $scope.message = err.data;
                   
                });

                var previousTopic  = {};
                if (topic) {
                    $scope.modeEdit = true;
                    previousTopic.tags = topic.tags.slice();
                    previousTopic.id = topic.id;

                    $scope.topic = topic;
                } else {
                    $scope.modeEdit = false;
                    $scope.topic = { id: "", tags: [] }
                }
                

                

                $scope.hide = function() {
                    $mdDialog.hide();
                };

                $scope.cancel = function () {
                    if ($scope.modeEdit) {
                        topic.tags = previousTopic.tags;
                        topic.id = previousTopic.id;
                    }
                    $mdDialog.cancel();
                };
                $scope.add = function (topic) {
                    topicsService.addTopic(topic).then(function (answer) {
                        $mdDialog.hide(topic);
                    }, function (err) {
                        $scope.message = err.data;
                    });
                };

                $scope.edit = function (topic) {
                    topicsService.editTopic(previousTopic.id, topic).then(function (answer) {
                        $mdDialog.hide(topic);
                    }, function (err) {
                       
                        $scope.message = err.data;
                    });
                };

            }


        }])