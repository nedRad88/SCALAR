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
app.controller('datastreamController', ['$scope', '$location','$mdMedia','$mdDialog', 'datastreamService','$timeout', '$mdToast', function ($scope, $location,$mdMedia,$mdDialog,datastreamService,$timeout, $mdToast) {
  

    $scope.message = "";
    
    $scope.datastreams = [];
    $scope.filters=['ALL' ,'MINE'];
    $scope.currentPage = 1;
    $scope.step = 5;
    
   
    
    
    $scope.gotoPage = function() {
             
        datastreamService.getDatastreams($scope.currentPage, $scope.step).then(
            function successCallback(response) {
                 //$location.path( "/results/"+ competition_id );
                var sub_total = response['data']['total'];
                var total_pages= sub_total / $scope.step;
                $scope.total = Math.ceil(total_pages);
                
                $scope.datastreams = response['data']['data'];
                console.log($scope.datastreams)

                
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });
        
      
      
      
    };
    
    /**
    //an array of files selected
    $scope.files = [];

    //listen for the file selected event
    $scope.$on("fileSelected", function (event, args) {
        $scope.$apply(function () {            
            //add the file object to the scope's files collection
            $scope.files.push(args.file);
        });
    });**/
    
    /**
    $scope.addDatastream = function () {
       
        
        console.log($scope.files);
        
        datastreamService.addDatastream($scope.datastream, $scope.files).then(
            function successCallback(response) {
                
                console.log($scope.files);
                
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });
        
    }; **/

    
        
    $scope.go = function (datastream_id) {
        console.log(datastream_id)
        $location.path( "/datastreams/"+ datastream_id);
    };
    $scope.addDatastream = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
            $mdDialog.show({
                controller: DialogController,
                templateUrl: '/static/app/views/templates/add-datastream-dialog.html',
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
 
    function DialogController($scope, $mdDialog, user) {
        
        //console.log($scope.files);
        $scope.files = [];
        $scope.hide = function() {
                $mdDialog.hide();
            };
            
        $scope.cancel = function () {
                
                $mdDialog.cancel();
                
            };

        //listen for the file selected event
        $scope.$on("fileSelected", function (event, args) {
            $scope.$apply(function () {            
                //add the file object to the scope's files collection
                $scope.files.push(args.file);
            });
        });
        
        $scope.addDatastream = function () {    
            
            datastreamService.addDatastream($scope.datastream, $scope.files).then(
                function successCallback(response) {
                    
                    console.log(response['data']);
                    $scope.cancel()
                    
                }, function errorCallback(err) {
                    $scope.message = err.data;
                    $mdToast.show($mdToast.simple().textContent(err.data));
                });
        
        
        }
    }
    
    
   
    
        
        
        


}]);