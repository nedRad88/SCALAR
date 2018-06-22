'use strict'

app.controller('pageController',
[
    '$rootScope',
    '$scope',
    'dataService',
    'competitionService',
    'datastreamService',
    'subscriptionService',
    'oAuthService',
    'evaluationService',
    'resultsService',
    'ooredooAppSettings',
    '$routeParams',
    '$mdToast',
    '$mdDialog',
    '$mdMedia',
    '$timeout',
    '$http',
    '$window',
    function ($rootScope, $scope,  dataService, competitionService,datastreamService,subscriptionService, oAuthService,evaluationService,resultsService,ooredooAppSettings, $routeParams, $mdToast, $mdDialog, $mdMedia, $timeout,$http,$window) {
        'use strict';
        
        $rootScope.competition_id = $routeParams.competition.toUpperCase();
        $rootScope.path = 'Competition';
        $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
        
        
        $scope.subscriptionData = {'competition_id' : $rootScope.competition_id, 'user' : oAuthService.authentication.me.id}
        $scope.check = {'competition_id' : $rootScope.competition_id, 'user' : oAuthService.authentication.me.uid}
        $scope.secretKey=''
        $scope.users=[]
        $scope.files = ['file.proto']
        $scope.finished = false;
        
        var users = [];
        $scope.loading = true;
        $scope.selected=[]
        $scope.measures = []
        
        $scope.count = function() {
            return users.length;
        };

        $scope.query = {
            order: 'firstName',
            limit: 10,
            page: 1,
            filter:''
        };

        $scope.getUsers = function () {
            $scope.users = users.slice(($scope.query.page - 1) * $scope.query.limit,
                ($scope.query.page) * ($scope.query.limit));
            $scope.selected = [];
        };
        
        $scope.evaluationMeasures = []
        
        evaluationService.getEvaluation( $rootScope.competition_id).then(
                    function successCallback(response) {
                        
                        
                        var measures = response['data']['measures']
                        for (var m in measures){
                        
                            
                            $scope.evaluationMeasures.push({'field' : m, 'measures' : measures[m]})
                        }
                        $scope.selectedField = $scope.evaluationMeasures[0]
                        console.log($scope.selectedField)
                        
                        //$scope.field = $scope.selectedField.field
                        //$scope.selectedMeasure = $scope.selectedField.measures[0]
                        console.log($scope.field, $scope.selectedMeasure)

                        
                    }, function errorCallback(err) {
                        $scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent(err.data));
                    });

        
        /**
        resultsService.getResults($rootScope.competition_id,$scope.field,$scope.selectedMeasure).then(
            function successCallback(response) {
                users = response.data;
                console.log(users)
                
                
                $scope.getUsers();
                $scope.loading = false;
                
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });
            **/
         
        $scope.loadField = function(){
            var t  = JSON.parse($scope.selectedField);
            $scope.measures =t.measures;
            $scope.field  = t.field

            
        };
        
        $scope.loadMeasure = function(){
        
            console.log($scope.selectedMeasure);
            
            resultsService.getResults($rootScope.competition_id,$scope.field,$scope.selectedMeasure).then(
            function successCallback(response) {
                users = response.data;
                console.log(users);

                $scope.getUsers();
                $scope.loading = false;
                
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });
        };
        
        
        
        $scope.downloadFile = function(){
            
                var endpoint = ooredooAppSettings.ressourceServerBaseUri+"download/proto/" + $rootScope.competition_id;
                console.log(endpoint);
                $window.open(endpoint, '_blank');
        };
        
        

        
        subscriptionService.isSubscribed($scope.check).then(
                    function successCallback(response) {
                        
                        
                        $scope.isSubscribed = (response.data == 'true')

                        
                    }, function errorCallback(err) {
                        $scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent(err.data));
                    });

        
        subscriptionService.getSecretKey($scope.subscriptionData).then(
            function successCallback(response) {
                $scope.secretKey = response.data.secret_key;
            }, function errorCallback(err) {
                $scope.message = err.data;
                
        });
        
        $scope.download = function(){
            /**
            $http.get('http://localhost:5000/download/data/' + $rootScope.competition_id)
                .success(function(data) {
                    console.log(data)
                })
                .error(function(data) {
                    alert(data);
                    console.log('Error: ' + data);
                });**/
            $window.open(ressourceServerBaseUri+"download/data/" + $rootScope.competition_id, '_blank');
        
            
        };
        
        
        $scope.subscribe = function () {
        
            subscriptionService.addSubscription($scope.subscriptionData).then(function (response) {
                $scope.secretKey = response.data.secret_key;
                console.log($scope.secretKey);
                $scope.isSubscribed = true;
                
            },
            function (err) {
                
                $scope.message = err.error_description;
            });
        };
        
        
        $scope.unsubscribe = function () {
        
            subscriptionService.unSubscribe($scope.subscriptionData).then(function (response) {
                $scope.isSubscribed = false;
                $scope.secretKey = ''
                
            },
            function (err) {
                
                $scope.message = err.error_description;
            });
        };
        
        
        //Getting competition details 
        $scope.competitionInfo = {};
        $scope.datastreamInfo = {};
        
        competitionService.getCompetitionInfo($scope.competition_id).then(
            function successCallback(response) {
                
                $scope.competitionInfo = response.data;
                var end_date = new Date($scope.competitionInfo.end_date);
                
                if(end_date.getTime() < Date.now()){
                    console.log('finished')
                    $scope.finished=true;
                    
                    
                }
                else{
                    console.log($scope.competitionInfo.end_date, Date.now())
                }
                
                console.log($scope.competitionInfo)
                datastreamService.getDatastreamInfo($scope.competitionInfo.datastream_id).then(
                    function successCallback(response) {
                        
                        $scope.datastreamInfo = response.data;
                        
                        console.log($scope.datastreamInfo)

                        
                    }, function errorCallback(err) {
                        $scope.message = err.data;
                        $mdToast.show($mdToast.simple().textContent(err.data));
                    });

                
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });
        
        

        
        $rootScope.sideNaveAdminMode(false);
        $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
        $scope.canShowPost = true;
        $scope.topic = true;
        $scope.period = true;
        
        $rootScope.endpoint = "/topic/" + $rootScope.competition_id+"/Valeurs/MAPE";
        $scope.selected_field='';
        $scope.selected_measure = '';
        $scope.fields = [{'name' : 'Valeurs', 'measures' : ['MAPE' , 'TEST']}, {'name' : 'Test','measures' : ['MAPE']}];
        $scope.measures = [];
        //initPage($scope, $rootScope, $routeParams, dataService, $mdMedia, $mdDialog, $timeout);

        $scope.page = {
                title: ['Results'],
                type: 'line',
                mode: 'compare',
                config: {
                    custom: false,
                    init: {
                        type: 'week',
                        time: 'This Week',
                        avg: false
                    }
                },
                isCustomDate: true,
                rowspan: "8",
                colspan: "4",
                series: [
                    {
                        name: 'Results',
                        endpoint: ['api/results/' + $routeParams.competition.toUpperCase()] 
                    }
                
                ],
               endpoint : $rootScope.endpoint,
               fields : $scope.fields,
               competition : $rootScope.competition_id 
            };

        
        $scope.selectField = function () {
        
            
            var selected_field = JSON.parse($scope.selected_field)
            $scope.measures = selected_field.measures
            console.log($scope.measures)
        };
        
        $scope.selectMeasure = function (selected_measure) {
        
            console.log($scope.selected_measure)
            var selected_field = JSON.parse($scope.selected_field)
            $scope.page.endpoint="/topic/" + $rootScope.competition_id+"/"+selected_field.name+"/"+$scope.selected_measure;
            console.log($scope.page.endpoint)
            
        };
        
        $scope.search = function (query) {
                query = query.toLowerCase();
                if (!query || query.length == 0) {
                    $scope.getUsers();
                } else {
                    var filtered = [];
                    //TODO : Check search by 
                    angular.forEach(users, function (item) {
                        if (item.firstName.toLowerCase().indexOf(query) != -1) {
                            filtered.push(item);
                        }
                    });
                    $scope.users = filtered;
                }

            };
        
        $scope.logOrder = function (order) {
                console.log('order: ', order);
            };
        
        



    }
]);
