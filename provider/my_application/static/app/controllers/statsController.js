'use strict'

app.controller('statsController',
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
            $rootScope.path = 'STATS';
            $rootScope.sideNaveAdminMode(false);

            var id = "";
            var operators = ["Ooredoo", "Mobilis", "AT", "Djezzy"];
            var operatorsIds = ["108951559158989", "50847714953", "521549424529415", "182557711758412"];


            initPage($scope, $rootScope, $routeParams, topicsService);


            $scope.charts = [
                         {
                             title: [operators[0]],
                             mode: 'table',
                             config: {
                                 custom: false,
                                 init: {
                                     type: 'week',
                                     time: 'This Week',
                                     avg: false
                                 }
                             },
                             isCustomDate: true,
                             rowspan: "20",
                             colspan: "2",
                             series: [
                                 {
                                     name: 'Negative',
                                     endpoint: ['api/operator/' + operators[0] + '/sentiment/neg']
                                 },
                                 {
                                     name: 'Positive',
                                     endpoint: ['api/operator/' + operators[0] + '/sentiment/pos']
                                 },
                                 {
                                     name: 'Neutral',
                                     endpoint: ['api/operator/' + operators[0] + '/sentiment/net']
                                 },

                                 {
                                     name: 'Score',
                                     endpoint: ['api/operator/' + operators[0] + '/sentiment/score/v2']
                                 }
                             ]
                         },
                         {
                             title: [operators[1]],
                             mode: 'table',
                             config: {
                                 custom: false,
                                 init: {
                                     type: 'week',
                                     time: 'This Week',
                                     avg: false
                                 }
                             },
                             isCustomDate: true,
                             rowspan: "20",
                             colspan: "2",
                             series: [
                                 {
                                     name: 'Negative',
                                     endpoint: ['api/operator/' + operators[1] + '/sentiment/neg']
                                 },
                                 {
                                     name: 'Positive',
                                     endpoint: ['api/operator/' + operators[1] + '/sentiment/pos']
                                 },
                                 {
                                     name: 'Neutral',
                                     endpoint: ['api/operator/' + operators[1] + '/sentiment/net']
                                 },

                                 {
                                     name: 'Score',
                                     endpoint: ['api/operator/' + operators[1] + '/sentiment/score/v2']
                                 }
                             ]
                         }, 
                         {
                             title: ["Algérie télécom"],
                             mode: 'table',
                             config: {
                                 custom: false,
                                 init: {
                                     type: 'week',
                                     time: 'This Week',
                                     avg: false
                                 }
                             },
                             isCustomDate: true,
                             rowspan: "20",
                             colspan: "2",
                             series: [
                                 {
                                     name: 'Negative',
                                     endpoint: ['api/operator/' + operators[2] + '/sentiment/neg']
                                 },
                                 {
                                     name: 'Positive',
                                     endpoint: ['api/operator/' + operators[2] + '/sentiment/pos']
                                 },
                                 {
                                     name: 'Neutral',
                                     endpoint: ['api/operator/' + operators[2] + '/sentiment/net']
                                 },

                                 {
                                     name: 'Score',
                                     endpoint: ['api/operator/' + operators[2] + '/sentiment/score/v2']
                                 }
                             ]
                         },
                         {
                             title: [operators[3]],
                             mode: 'table',
                             config: {
                                 custom: false,
                                 init: {
                                     type: 'week',
                                     time: 'This Week',
                                     avg: false
                                 }
                             },
                             isCustomDate: true,
                             rowspan: "20",
                             colspan: "2",
                             series: [
                                 {
                                     name: 'Negative',
                                     endpoint: ['api/operator/' + operators[3] + '/sentiment/neg']
                                 },
                                 {
                                     name: 'Positive',
                                     endpoint: ['api/operator/' + operators[3] + '/sentiment/pos']
                                 },
                                 {
                                     name: 'Neutral',
                                     endpoint: ['api/operator/' + operators[3] + '/sentiment/net']
                                 },

                                 {
                                     name: 'Score',
                                     endpoint: ['api/operator/' + operators[3] + '/sentiment/score/v2']
                                 }
                             ]
                         }
            ];
        }
    ])