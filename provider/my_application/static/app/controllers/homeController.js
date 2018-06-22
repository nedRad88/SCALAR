'use strict'

app.controller('homeController',
    [
    '$rootScope',
    '$scope',
    'topicsService',
    '$routeParams',
    '$location',
    '$mdToast',
    'settings',
        function ($rootScope, $scope, topicsService, $routeParams, $location, $mdToast, settings) {

            $scope.canShowPost = false;
            //$scope.options.legendTemplate = "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"
            $rootScope.path = settings.title;
            $rootScope.sideNaveAdminMode(settings.isAdminMode);

            var id = "";
            var operators = ["Ooredoo", "Mobilis", "AT", "Djezzy"];
            var operatorsIds = ["108951559158989", "50847714953", "521549424529415", "182557711758412"];


            initPage($scope, $rootScope, $routeParams, topicsService);


            $scope.charts = [
                
            {
                title: operators[0] + ' Score',
                endpoint: 'api/operator/' + operators[0] + '/sentiment/score/v2/summary',
                mode: 'stats',
                rowspan: "2",
                colspan: "1"
            },
            {
                title: operators[1] + ' Score',
                endpoint: 'api/operator/' + operators[1] + '/sentiment/score/v2/summary',
                mode: 'stats',
                rowspan: "2",
                colspan: "1"
            },
            {
                title: operators[2] + ' Score',
                endpoint: 'api/operator/' + operators[2] + '/sentiment/score/v2/summary',
                mode: 'stats',
                rowspan: "2",
                colspan: "1"
            },
            {
                title: operators[3] + ' Score',
                endpoint: 'api/operator/' + operators[3] + '/sentiment/score/v2/summary',
                mode: 'stats',
                rowspan: "2",
                colspan: "1"
            },
            
            {
                title: ['Score v2','Score', 'Positive', 'Negative'],
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
                colspan: "2",
                params: "byAvg=true",
                series: [
                {
                    name: operators[0],
                    endpoint: [
                        'api/operator/' + operators[0] + '/sentiment/score/v2',
                        'api/operator/' + operators[0] + '/sentiment/score',
                        'api/operator/' + operators[0] + '/sentiment/pos',
                        'api/operator/' + operators[0] + '/sentiment/neg']
                },
                             {
                                 name: operators[1],
                                 endpoint: [
                                     'api/operator/' + operators[1] + '/sentiment/score/v2',
                                     'api/operator/' + operators[1] + '/sentiment/score',
                                     'api/operator/' + operators[1] + '/sentiment/pos',
                                     'api/operator/' + operators[1] + '/sentiment/neg']
                             },
                             {
                                 name: operators[2],
                                 endpoint: [
                                     'api/operator/' + operators[2] + '/sentiment/score/v2',
                                     'api/operator/' + operators[2] + '/sentiment/score',
                                     'api/operator/' + operators[2] + '/sentiment/pos',
                                     'api/operator/' + operators[2] + '/sentiment/neg']
                             },
                             {
                                 name: operators[3],
                                 endpoint: [
                                     'api/operator/' + operators[3] + '/sentiment/score/v2',
                                     'api/operator/' + operators[3] + '/sentiment/score',
                                     'api/operator/' + operators[3] + '/sentiment/pos',
                                     'api/operator/' + operators[3] + '/sentiment/neg']
                             }
                         ]
                     },
                        {
                            title: 'Share of Negative',
                            endpoint: 'api/operator/sentiment/neg/shared',
                           
                            type: 'doughnut',
                            mode: 'pie',
                            rowspan: "4",
                            colspan: "1"
        },
                        {
                            title: 'Share of Positive',
                            endpoint: 'api/operator/sentiment/pos/shared',
                            /*compareEndpoint: 'api/operator/' + $routeParams.name + '/mentions',*/
                            type: 'Doughnut',
                            mode: 'pie',
                            rowspan: "4",
                            colspan: "1"
                        },
            {
                title: 'Positive comments',
                mode: 'radar',
                type: 'radar',
                rowspan: "8",
                colspan: "2",
                series: [
                   {
                       name: 'Positive',
                       endpoint: ['api/operator/' + 'ooredoo' + '/axes/sentiment/pos']
                   },
                   {
                       name: 'Negative',
                       endpoint: ['api/operator/' + 'mobilis' + '/axes/sentiment/pos']
                   },
                   {
                       name: 'Negative',
                       endpoint: ['api/operator/' + 'djezzy' + '/axes/sentiment/pos']
                   },
                   {
                       name: 'Negative',
                       endpoint: ['api/operator/' + 'at' + '/axes/sentiment/pos']
                   },

                ]
            }, 
            ];
        }
    ])