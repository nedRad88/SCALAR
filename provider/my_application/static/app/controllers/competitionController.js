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
app.controller('competitionController', ['$scope', '$location','$mdMedia','$mdDialog', 'competitionService', 'datastreamService','userService','oAuthService','evaluationService','$timeout','$mdToast','oAuthService', function ($scope, $location,$mdMedia,$mdDialog, competitionService,datastreamService,userService,oAuthService, evaluationService, $timeout,$mdToast,authService) {
  
    
    $scope.measure= null;
    
    $scope.selectedTab ={'title' : 'all' , 'data' : []};
    $scope.filters=['ALL' ,'MINE'];
    
    
    
   

    $scope.message = "";
    
    $scope.all_competitions = [];
    $scope.active_competitions=[];
    $scope.coming_competitions=[];
    $scope.finished_competitions=[];
    $scope.datastreams = null;
    $scope.competition={};
    $scope.tabs = [];
    $scope.currentPage = 1;
    $scope.step = 5;
    $scope.isAdmin = authService.isInRole('ADMIN');
    
    $scope.selected_filter = $scope.filters[0];
    console.log($scope.selected_filter);
    
    $scope.selectFilter = function (filter) {
        console.log(filter);
        $scope.selected_filter = filter;
        $scope.selectTab($scope.selectedTab)
        

    };
    
    $scope.auth = oAuthService.authentication;
    
    $scope.isInRole = function (role) {
        //console.log(role, $scope.auth.me.roles)
        if (!$scope.auth || !$scope.auth.me || !$scope.auth.me.roles) {
            return false;
        }
        return $scope.auth.me.roles.indexOf(role) >= 0;
    };
    
    
    
    

    competitionService.getCompetitions('all',1, $scope.step).then(
            function successCallback(response) {
                
                
                $scope.all_competitions = response['data']['data'];
                console.log($scope.all_competitions);
                
                $scope.tabs.push({'title' : 'all' , 'data' : $scope.all_competitions, 'total' : response['data']['total']})
                
                

                
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });


    competitionService.getCompetitions("active",1, $scope.step).then(
            function successCallback(response) {
                
                $scope.active_competitions = response['data']['data'];
                $scope.tabs.push({'title' : 'active' , 'data' : $scope.active_competitions, 'total' : response['data']['total']})
                

                
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });

    competitionService.getCompetitions("coming",1, $scope.step).then(
        function successCallback(response) {
            
            $scope.coming_competitions = response['data']['data'];
            $scope.tabs.push({'title' : 'coming' , 'data' : $scope.coming_competitions, 'total' : response['data']['total']})

            
        }, function errorCallback(err) {
            $scope.message = err.data;
            $mdToast.show($mdToast.simple().textContent(err.data));
        });

    competitionService.getCompetitions("finished",1, $scope.step).then(
        function successCallback(response) {
            
            $scope.finished_competitions = response['data']['data'];
            $scope.tabs.push({'title' : 'finished' , 'data' : $scope.finished_competitions, 'total' : response['data']['total']})

            
        }, function errorCallback(err) {
            $scope.message = err.data;
            $mdToast.show($mdToast.simple().textContent(err.data));
        });
        
    
    
        
    $scope.go = function (competition_id) {
        //console.log(competition_id)
        $location.path( "/results/"+ competition_id );
    };
        
 
    
    $scope.openDatastreamInfo= function (datastream) {
        console.log(datastream)
        //$location.path( "/results/"+ competition_id );
    };
    
  
   
    
    $scope.gotoPage = function() {
      
       switch ($scope.selected_filter) {
            case 'ALL':
                competitionService.getCompetitions($scope.selectedTab.title, $scope.currentPage, $scope.step).then(
                    function successCallback(response) {
                        
                        
                        $scope.all_competitions = response['data'];
                            
                        //TODO : set appropriate tab content
                        var tab = $scope.tabs.filter(x => x.title === $scope.selectedTab.title);
                        //console.log(tab)
                        tab = tab[0];
                        tab.data = response['data']['data'];
                        tab.total = response['data']['total']

                        
                    }, function errorCallback(err) {
                        $scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent(err.data));
                    });
      
                break;
            case 'MINE':
                 userService.getUserCompetitions($scope.selectedTab.title, $scope.currentPage, $scope.step).then(
                    function successCallback(response) {
                        
                        
                        $scope.all_competitions = response['data'];
                        //$scope.tabs.push({'title' : 'all' , 'data' : $scope.all_competitions, 'total' : 10})
                        
                        
                        //TODO : set appropriate tab content 
                        var tab = $scope.tabs.filter(x => x.title === $scope.selectedTab.title);
                        //console.log(tab)
                        tab = tab[0];
                        tab.data = response['data']['data'];
                        tab.total = response['data']['total']

                        
                    }, function errorCallback(err) {
                        $scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent(err.data));
                    });
                
                break;
       }
      
    };
    
    
    $scope.showPagination = false;
    
    $scope.selectTab= function (tab) {
        
        
        
        //$location.path( "/results/"+ competition_id );
        var total_pages = tab.total / $scope.step;
        $scope.total = Math.ceil(total_pages);
        $scope.currentPage = 1;
        $scope.selectedTab = tab;
        if($scope.total > 1){
            $scope.showPagination = true;
        }
        else{
            $scope.showPagination = false
        }
        
        
        
        
        $scope.gotoPage()
        
         
        
        
    };
    $scope.hidePagination =  function () {
       $scope.showPagination = false;
       $scope.selectedTab = 'form'
         
        
        
    };
    
    $scope.addCompetition = function (ev) {
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
            $mdDialog.show({
                controller: DialogController,
                templateUrl: '/static/app/views/templates/add-competition-dialog.html',
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
                //$scope.hide()
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
        
            $scope.targets=[];
            $scope.selected = {}
            
            $scope.measures = [{'id' : 1, 'name' : 'MAPE'}, {'id' : 2, 'name' : 'TEST'}]
            
            $scope.hide = function() {
                $mdDialog.hide();
            };
            $scope.cancel = function () {
                
                $mdDialog.cancel();
                
            };
            
            evaluationService.getStandardEvaluationMeasures().then(
            function successCallback(response) {
                
                $scope.measures = response.data
                
                
                

                
            }, function errorCallback(err) {
                $scope.message = err.data;
                console.log(message);
                $mdToast.show($mdToast.simple().textContent(err.data));
            });
            
            
            $scope.loadDatastreams = function() {

                // Use timeout to simulate a 650ms request.
                return $timeout(function() {

                datastreamService.getDatastreams(null, null).then(
                    function successCallback(response) {
                        
                        $scope.datastreams = response['data']['data'];
                        console.log($scope.datastreams)

                        
                    }, function errorCallback(err) {
                        $scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent(err.data));
                    });

                }, 500);
            };
        
            $scope.loadMeasures = function() {

                // Use timeout to simulate a 650ms request.
                return $timeout(function() {
                    $scope.measures = [{'id' : 1, 'name' : 'MAPE'}, {'id' : 2, 'name' : 'TEST'}]
                    //console.log($scope.targets)

                }, 500);
            };
            $scope.addNewTarget = function(target) {
                
                var measures = target['measures'];
                var item = {};
                item['name'] = target.name;
                item['measures'] = [];
                
                for (var key in measures){ 
                    item['measures'].push(key)
                }
                
                $scope.targets.push(item)
                console.log($scope.targets)
            };
            
            $scope.removeTarget = function(toRemove) {
              
                //console.log(toRemove)
                for (var i  in $scope.targets){
                    
                    
                    var item = $scope.targets[i]
                    
                    //console.log(item.name , toRemove.name)
                    if (item.name === toRemove.name ){
                        
                        //console.log(item, toRemove)
                        $scope.targets.splice(i, 1);
        
                        
                        
                        
                    }
                    
                    
                }
                //console.log($scope.targets)
                
                
            };
            
             //an array of files selected
            $scope.files = [];

            //listen for the file selected event
            $scope.$on("fileSelected", function (event, args) {
                $scope.$apply(function () {            
                    //add the file object to the scope's files collection
                    $scope.files.push(args.file);
                });
            });
    
            
            
            
            $scope.addCompetition = function () {
                //console.log($scope.tagets)
                
                
                $scope.competition.config = {}
                
                //console.log($scope.selected)
                $scope.competition.target_class = ''
                var evaluation_measures = {}
                for (var i in $scope.targets){
                    //$scope.competition.target_class = $scope.competition.target_class + key + ';'
                    //$scope.competition.config[key] = Object.keys($scope.selected[key])
                    var item = $scope.targets[i]
                    
                    evaluation_measures[item.name] = item.measures
                    
                }
                console.log(evaluation_measures)
                
                $scope.competition.config = evaluation_measures;
                $scope.competition.target_class = $scope.competition.target_class.slice(0, $scope.competition.target_class.length -1)
                
                //TODO: Format config ==> to array
                //$scope.competition.config = $scope.selected
                
                var start_date =$scope.competition.start_date;
                var start_time = $scope.competition.start_time;

                var end_date =$scope.competition.end_date;
                var end_time = $scope.competition.end_time;

                var a = moment(start_date).format('YYYY-MM-DD');
                var b = moment(start_time).format('HH:mm:ss');
                var start_date_format = String(a) + ' '+ String(b);
                
                var c = moment(end_date).format('YYYY-MM-DD');
                var d = moment(end_time).format('HH:mm:ss');
                var end_date_format = String(c) + ' '+ String(d);
                
                $scope.competition.start_date = start_date_format;
                $scope.competition.end_date = end_date_format;
                
              

                
                competitionService.addCompetition($scope.competition, $scope.files).then(
                    function successCallback(response) {
                        
                        console.log($scope.files);
                        $scope.hide()
                        
                    }, function errorCallback(err) {
                        $scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent(err.data));
                    });
                //$location.path( "/results/"+ competition_id );**/
            }; 
        }
    

  
    
   
    
        
        
        


}]);