'use strict'

app.controller('accountsController',
     [
        '$rootScope',
        '$scope',
        'accountsService',
        '$mdToast',
        '$mdDialog',
        '$mdMedia',
        'randomString',
        function ($rootScope, $scope, accountsService, $mdToast, $mdDialog, $mdMedia, randomString) {
            'use strict';
            var passMinLength = 8;
            $rootScope.path = 'ADMIN/ACCOUNTS';
            $rootScope.sideNaveAdminMode(true);
            $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
            var users = [];
            $scope.loading = true;
            $scope.selected = [];
            $scope.count = function () {
                return users.length;
            };

            $scope.query = {
                order: 'userName',
                limit: 10,
                page: 1,
                filter: ''
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
                users.sort(function (a, b) {
                    if (a.firstName.toLowerCase() < b.firstName.toLowerCase()) return -1;
                    if (a.firstName.toLowerCase() > b.firstName.toLowerCase()) return 1;
                    return 0;
                });
                $scope.getUsers();
                $scope.loading = false;
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });




            $scope.editUser = function (ev) {
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'app/views/templates/add-user-dialog.html',
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
                    templateUrl: 'app/views/templates/add-user-dialog.html',
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
                    var indexs = []
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

            }
            var resetPassword = function (user) {
                accountsService.resetAccountPassword(user.userName, user.newPassowrd).then(function (answer) {

                }, function () {

                });
            }

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
                $scope.hide = function () {
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
                    user.roles = (typeof $scope.selectedRoles != 'undefined') ? $scope.selectedRoles : [];
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



app.controller('pageController',
[
    '$rootScope',
    '$scope',
    'topicsService',
    'dataService',
    '$routeParams',

    '$mdToast',
    '$mdDialog',
    '$mdMedia',
    '$timeout',
    function ($rootScope, $scope, topicsService, dataService, $routeParams, $mdToast, $mdDialog, $mdMedia, $timeout) {
        'use strict';
        $rootScope.path = $routeParams.name.toUpperCase();
        $rootScope.sideNaveAdminMode(false);
        $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
        $scope.canShowPost = true;
        var id = "";
        var operators = ["ooredoo", "mobilis", "at", "djezzy"];
        var operatorsIds = ["108951559158989", "50847714953", "521549424529415", "182557711758412"];
        var concurents = [];
        var concurentsIds = [];
        for (var i = 0; i < operators.length; i++) {
            if (operators[i].toLowerCase() != $routeParams.name.toLowerCase()) {
                concurents.push(operators[i])
                concurentsIds.push(operatorsIds[i])
            } else {
                id = operatorsIds[i];
            }
        }

        initPage($scope, $rootScope, $routeParams, topicsService, dataService, $mdMedia, $mdDialog, $timeout);


        $scope.charts = [

            {
                title: 'Positive comments',
                endpoint: 'api/operator/' + $routeParams.name + '/sentiment/pos/summary',
                mode: 'stats',
                rowspan: "2",
                colspan: "1"
            },
            {
                title: 'Negative comments',
                endpoint: 'api/operator/' + $routeParams.name + '/sentiment/neg/summary',
                mode: 'stats',
                rowspan: "2",
                colspan: "1",
                invertColor: true
            },
            {
                title: 'Neutral comments',
                endpoint: 'api/operator/' + $routeParams.name + '/sentiment/net/summary',
                mode: 'stats',
                rowspan: "2",
                colspan: "1"
            },
            {
                title: 'Sentiment Score',
                endpoint: 'api/operator/' + $routeParams.name + '/sentiment/score/v2/summary',
                mode: 'stats',
                rowspan: "2",
                colspan: "1"
            },

            {
                title: ['Sentiment'],
                type: 'Line',
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
                series: [
                    {
                        name: 'Negative',
                        endpoint: ['api/operator/' + $routeParams.name + '/sentiment/neg']
                    },
                    {
                        name: 'Positive',
                        endpoint: ['api/operator/' + $routeParams.name + '/sentiment/pos']
                    },
                    {
                        name: 'Neutral',
                        endpoint: ['api/operator/' + $routeParams.name + '/sentiment/net']
                    },

                    {
                        name: 'Score',
                        endpoint: ['api/operator/' + $routeParams.name + '/sentiment/score/v2']
                    }
                ]
            },
            {
                title: 'Sentiment',
                endpoint: 'api/operator/' + $routeParams.name + '/sentiment',
                compareEndpoint: 'api/operator/' + $routeParams.name + '/mentions',
                type: 'Doughnut',
                mode: 'uni-data',
                rowspan: "4",
                colspan: "1"
            },

            {
                title: 'Sentiment in Other pages',
                endpoint: 'api/operator/' + $routeParams.name + '/sentiment',
                compareEndpoint: 'api/operator/' + $routeParams.name + '/mentions',

                params: 'pages=' + concurentsIds.join("&pages="),
                type: 'Doughnut',
                mode: 'uni-data',
                rowspan: "4",
                colspan: "1"
            },
            {
                title: 'Top Tags',
                endpoint: 'api/operator/' + $routeParams.name + '/tags/top',
                mode: 'toptags',
                rowspan: "4",
                colspan: "1"
            },








            {
                title: 'MENTIONS IN OTHER PAGES',
                endpoint: 'api/operator/' + $routeParams.name + '/concurents/summary',
                mode: 'toptags',
                params: 'pages=' + concurentsIds.join("&pages="),
                rowspan: "4",
                colspan: "1"
            },

            /*
          
            {
                title: 'Sentiment of Others',
                endpoint: 'api/page/' + id + '/operator/' + $routeParams.name + '/sentiment',
                compareEndpoint: 'api/page/' + id + '/mentions/' + $routeParams.name,
                params: "concurents=true",
                type: 'Doughnut',
                mode: 'uni-data',
                rowspan: "4",
                colspan: "1"
            },

            

            {
                title: 'Sentiment of ' + concurents[0],
                endpoint: 'api/page/' + id + '/operator/' + concurents[0] + '/sentiment',
                compareEndpoint: 'api/page/' + id + '/mentions/' + concurents[0],
                type: 'Doughnut',
                params: 'topic=' + concurents[0] + "&period=7",
                mode: 'uni-data',
                rowspan: "4",
                colspan: "1"
            },
            {
                title: 'Sentiment of ' + concurents[1],
                endpoint: 'api/page/' + id + '/operator/' + concurents[1] + '/sentiment',
                compareEndpoint: 'api/page/' + id + '/mentions/' + concurents[1],
                type: 'Doughnut',
                params: 'topic=' + concurents[1] + "&period=7",
                mode: 'uni-data',
                rowspan: "4",
                colspan: "1"
            },
            {
                title: 'Sentiment of ' + concurents[2],
                endpoint: 'api/page/' + id + '/operator/' + concurents[2] + '/sentiment',
                compareEndpoint: 'api/page/' + id + '/mentions/' + concurents[2],
                params: 'topic=' + concurents[2] + "&period=7",
                type: 'Doughnut',
                mode: 'uni-data',
                rowspan: "4",
                colspan: "1"
            }*/
        ];




    }
]);

function initPage($scope, $rootScope, $routeParams, topicsService, dataService, $mdMedia, $mdDialog, $timeout) {

    $scope.endDate = new Date();
    $scope.beginDate = moment(new Date()).subtract(1, 'weeks').toDate();
    $scope.isCustomDate = true;

    $scope.params = {
        period: $scope.period,
        mainTopic: $routeParams.name,
        topics: $scope.topic
    };





    var begin = moment(new Date()).subtract(1, 'weeks').format('YYYY-MM-DD');
    var end = moment(new Date()).format('YYYY-MM-DD');




    $scope.dateChanged = function () {
        var tmpBegin = moment($scope.beginDate);
        var tmpEnd = moment($scope.endDate);
        $scope.minDate = angular.copy(tmpBegin).add(1, 'days').toDate();
        if (tmpBegin.isSameOrAfter(tmpEnd)) {
            tmpEnd = angular.copy(tmpBegin).add(1, 'days');
            $scope.endDate = tmpEnd.toDate();
        }
        $scope.period = {
            begin: tmpBegin.format('YYYY-MM-DD'),
            end: tmpEnd.format('YYYY-MM-DD')
        }
        $scope.params.period = $scope.period;
    }




    $scope.dates = [
        { label: "Day", elements: ["Today", "Yesterday"] },
        { label: "Week", elements: ["This Week", "Last Week"] },
        { label: "Month", elements: ["This Month", "Last Month"] },
        { label: "Year", elements: ["This Year", "Last Year"] },
        { label: "Quarters", elements: ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"] },
        { label: "Custom", elements: ["Custom"] }
    ];


    var loadAll = function () {
        var groups = [{ group: "All", topics: [] }];
        topicsService.getAllTopicsByGroup().then(
        function successCallback(response) {
            for (var j = 0; j < response.data.length; j++) {
                groups.push(response.data[j]);
            }

            $scope.groups = groups;
            $scope.selectedTopic = $scope.groups[0];
        }, function errorCallback(err) {
            $scope.message = err.data;

        });
        //["All", "Data", "Brand", "Network"]
    }

    loadAll();



    $scope.selectDate = function (selected_date) {
        var intervalle = '';
        var begin;
        var end;
        var actualYear = moment().year() + "-01-01";
        switch (selected_date.toLowerCase()) {
            case 'today':
                begin = moment();
                end = moment().add(1, 'days');
                intervalle = 'hour';
                break;
            case 'yesterday':
                begin = moment().subtract(1, 'days');
                end = moment();
                intervalle = 'hour';
                break;

            case 'this week':
                begin = moment().subtract(6, 'days');
                end = moment().add(1, 'days');
                intervalle = 'day';
                break;
            case 'last week':
                begin = moment().subtract(13, 'days');
                end = moment().subtract(6, 'days');
                intervalle = 'day';
                break;
            case 'this month':
                begin = moment().subtract(1, 'months').add(1, 'days');
                end = moment().add(1, 'days');
                intervalle = 'day';
                break;
            case 'last month':
                begin = moment().subtract(2, 'months').add(1, 'days');
                end = moment().subtract(1, 'months').add(1, 'days');
                intervalle = 'day';
                break;
            case 'quarter 1':
                begin = moment(actualYear).quarter(1);
                end = moment(actualYear).quarter(2);
                intervalle = 'month';
                break;
            case 'quarter 2':
                begin = moment(actualYear).quarter(2);
                end = moment(actualYear).quarter(3);
                intervalle = 'month';
                break;
            case 'quarter 3':
                begin = moment(actualYear).quarter(3);
                end = moment(actualYear).quarter(4);
                intervalle = 'month';
                break;
            case 'quarter 4':
                begin = moment(actualYear).quarter(4);
                end = begin.add(3, 'months');
                intervalle = 'month';
                break;
            case 'this year':

                begin = moment().date(1).subtract(1, 'years');
                end = moment().add(1, "months").date(0);
                intervalle = 'month';
                break;
            case 'last year':
                begin = moment().date(1).subtract(2, 'years');
                end = moment().add(1, "months").date(0).subtract(1, 'years');
                intervalle = 'month';
                break;
            case 'custom':
                return;
                break;
        }

        $scope.beginDate = begin.toDate();
        $scope.endDate = end.toDate();

        $scope.dateChanged();
    }

    $scope.resetTopic = function () {
        console.log($scope.topic)
    }
    $scope.selected_date = $scope.dates[2].elements[0];
    $scope.selectDate($scope.selected_date);
    $scope.params.period = $scope.period;

    var createFilterFor = function (query) {
        var lowercaseQuery = angular.lowercase(query);
        return function filterFn(group) {
            if (!group.group) {
                return false;
            }
            return (group.group.toLowerCase().indexOf(lowercaseQuery) === 0
                || group.topics.some(function (arg) { return arg.id.toLowerCase().indexOf(lowercaseQuery) === 0 }));
        };
    }

    $scope.querySearch = function (query) {
        var results = query ? $scope.groups.filter(createFilterFor(query)) : $scope.groups;
        return results;

    }

    $scope.searchTextChange = function (text) {

    }

    $scope.selectedTopicValue = function (item) {
        if (item.subtopic) {
            return item.selected.id;
        } else {
            return item.group;

        }
    }
    /*
    var oldTopic;
    $scope.$watch(function () {
        return $("#topic-field").length;
    }, function (newVal, oldVal) {
        if (newVal !== oldVal) {
            var f = $("#topic-field").blur;
            $("#topic-field").addEventListener('blur', function (event) {
                //f.apply();
                $scope.searchText = oldTopic;
            }, false);
        }
    })

    */
    $scope.selectedItemChange = function (item) {
        var selected;
        if (item) {
            if (item.subtopic) {
                selected = item.selected;

                if (selected.id.toLowerCase() == "all") {
                    $scope.topic = [];
                    $scope.params.topics = null;
                } else {
                    $scope.topic = [selected];
                    $scope.params.topics = $scope.topic;
                }
            } else {
                selected = item.group;
                $scope.topic = item.topics;
                $scope.params.topics = $scope.topic;

            }
            //oldTopic = selected;

        }
        item.subtopic = false;
    }


    $scope.export = function (ev) {

    }
    $scope.showPosts = function (ev) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs')) && $scope.customFullscreen;
        $mdDialog.show({
            controller: DialogController,
            templateUrl: 'app/views/templates/show-posts-dialog.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            fullscreen: useFullScreen,
            resolve: {
                params: function () {
                    return ev;
                }



            }
        })
        .then(function (answer) {

        }, function () {
            $scope.status = 'You cancelled the dialog.';
        });
        $scope.$watch(function () {
            return $mdMedia('xs') || $mdMedia('sm');
        }, function (wantsFullScreen) {
            $scope.customFullscreen = (wantsFullScreen === true);
        });
    }

    function DialogController($scope, $mdDialog, params) {
        $scope.params = params;
        var endPoint = 'api/post';
        if (params.period) {
            endPoint += '?since=' + params.period.begin + '&until=' + params.period.end;
        }
        if (params.mainTopic) {
            endPoint += '&mainTopic=' + params.mainTopic;
        }

        if (params.topics && params.topics.length > 0) {
            for (var i = 0; i < params.topics.length; i++) {
                endPoint = endPoint + "&" + "topics=" + params.topics[i].id;
            }
        }

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.nextPage = function () {
            dataService.fireEndpoint($scope.next).then(
                       function successCallback(response) {
                           for (var i = 0; i < response.data.data.length; i++) {

                               $scope.posts.push(response.data.data[i]);
                           }

                           $scope.next = response.data.next;
                           $timeout(function () {
                               FB.XFBML.parse();
                           },
                           3000);
                       }, function errorCallback(err) {
                           $scope.message = err.data;

                       });
        }
        dataService.fireEndpoint(endPoint).then(
                        function successCallback(response) {
                            $scope.posts = response.data.data;
                            $scope.next = response.data.next;
                            $timeout(function () {
                                FB.XFBML.parse();
                            }, 3000);
                        }, function errorCallback(err) {
                            $scope.message = err.data;

                        });





    }


}



app.controller('homeController',
    [
    '$rootScope',
    '$scope',
    'topicsService',
    '$routeParams',
        function ($rootScope, $scope, topicsService, $routeParams, $location, $mdToast) {

            $scope.canShowPost = false;
            //$scope.options.legendTemplate = "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"
            $rootScope.path = 'OVERVIEW';
            $rootScope.sideNaveAdminMode(false);

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
                title: ['Score v2', 'Score', 'Positive', 'Negative'],
                type: 'Line',
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
                            /*compareEndpoint: 'api/operator/' + $routeParams.name + '/mentions',*/
                            type: 'Doughnut',
                            mode: 'uni-data',
                            rowspan: "4",
                            colspan: "1"
                        },
                        {
                            title: 'Share of Positive',
                            endpoint: 'api/operator/sentiment/pos/shared',
                            /*compareEndpoint: 'api/operator/' + $routeParams.name + '/mentions',*/
                            type: 'Doughnut',
                            mode: 'uni-data',
                            rowspan: "4",
                            colspan: "1"
                        }
            ];
        }
    ])








app.controller('loginController', ['$scope', '$location', 'oAuthService', function ($scope, $location, authService) {

    $scope.progress = false;
    authService.logOut();
    $scope.loginData = {
        email: "",
        password: ""
    };

    $scope.message = "";
    $scope.login = function () {
        $scope.progress = true;
        authService.login($scope.loginData).then(function (response) {
            $scope.progress = false;
            $location.path('/home');
        },
         function (err) {
             $scope.progress = false;
             $scope.message = err.error_description;
         });
    };

}]);







app.controller('navBarController',
    [
        '$rootScope',
        '$scope',
        'oAuthService',
        'accountsService',
        '$location',
        '$mdSidenav',
        '$mdToast',
         '$mdDialog',
         '$mdMedia',
        function ($rootScope, $scope, oAuthService, accountsService, $location, $mdSidenav, $mdToast, $mdDialog, $mdMedia) {
            $rootScope.path = "Ovreview";

            var userSections = [
                {
                    title: 'Overview',
                    path: '/home',
                    toggled: false,
                    icon: "home"
                },
                {
                    title: 'Operators',
                    toggled: true,
                    icon: "settings_input_antenna",
                    subsections: [
                                            {
                                                title: 'Ooredoo',
                                                path: '/pages/ooredoo',

                                            },
                                            {
                                                title: 'Djezzy',
                                                path: '/pages/djezzy'
                                            },
                                            {
                                                title: 'Mobilis',
                                                path: '/pages/mobilis'
                                            },
                                            {
                                                title: 'Algérie Télécom',
                                                path: '/pages/at'
                                            }
                    ]
                },
                {
                    title: 'Statistiques',
                    path: '/stats',
                    toggled: false,
                    icon: "equalizer"
                },
            ];
            var adminSections = [
                {
                    title: 'Users',
                    toggled: false,
                    path: '/admin/accounts',
                    icon: 'supervisor_account'

                },
                {
                    title: 'Tags',
                    toggled: false,
                    path: "/admin/tags",
                    icon: 'label'

                },
                {
                    title: 'Topics',
                    toggled: false,
                    path: "/admin/topics",
                    icon: 'loyalty',

                }
            ];
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
            $scope.openSubSection = function (sub) {
                if (typeof sub.path != "undefined") {
                    $location.path(sub.path);
                }
            }

            $scope.sectionToggle = function (section) {
                section.toggled = !section.toggled;

            }

            $scope.switchMode = function (admin) {
                $rootScope.sideNaveAdminMode(admin)
                if (admin) {
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
                    }, function (err) {
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


app.controller('pagesController',
     [
        '$scope',
        'pagesService',
        '$mdToast',
        '$mdDialog',
        '$mdMedia',
        function ($scope, pagesService, $mdToast, $mdDialog, $mdMedia) {
            'use strict';
            $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
            var pages = [];
            $scope.selected = [];
            $scope.count = function () {
                return users.length;
            };

            $scope.query = {
                order: 'userName',
                limit: 5,
                page: 1
            };

            $scope.getPages = function () {
                $scope.users = users.slice(($scope.query.page - 1) * $scope.query.limit,
                    ($scope.query.page) * ($scope.query.limit));
                $scope.selected = [];
            };


            pagesService.getPages().then(
            function successCallback(response) {
                users = response.data.result;

                $scope.getUsers();
            }, function errorCallback(err) {
                $scope.message = err.data;
                $mdToast.show($mdToast.simple().textContent(err.data));
            });




            function DialogController($scope, $mdDialog) {

                $scope.roles = [
                    'admin'
                ]
                $scope.hide = function () {
                    $mdDialog.hide();
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };
                $scope.add = function (user) {
                    user.roles = (typeof $scope.selectedRoles != 'undefined') ? $scope.selectedRoles : [];
                    user.roles.push('user');

                    var tmp = user;
                    tmp.userName = user.email;
                    user.password = user.firstName + user.lastName;
                    user.confirmPassword = user.password;

                    accountsService.addAccount(user).then(function (answer) {
                        $mdDialog.hide(tmp);
                    }, function (err) {
                        $scope.message = err.data;
                    });
                };
            }


        }])










app.controller('postDialogController',
[
    '$rootScope',
    '$scope',
    'postsService',
    '$routeParams',
    function ($rootScope, $scope, postsService, $routeParams, $location, $mdToast, $mdDialog, $mdMedia) {




    }
]);






app.controller('signupController',
    [
        '$scope',
        '$location',
        function ($scope, $location) {

        }
    ]);



app.controller('statsController',
    [
    '$rootScope',
    '$scope',
    'topicsService',
    '$routeParams',
        function ($rootScope, $scope, topicsService, $routeParams, $location, $mdToast) {

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
                tags.sort(function (a, b) {
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
            $scope.topicCount = function () {
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
                filter: ''
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
                        topic: function () {
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


                $scope.querySearch = function (query) {
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

                var previousTopic = {};
                if (topic) {
                    $scope.modeEdit = true;
                    previousTopic.tags = topic.tags.slice();
                    previousTopic.id = topic.id;

                    $scope.topic = topic;
                } else {
                    $scope.modeEdit = false;
                    $scope.topic = { id: "", tags: [] }
                }




                $scope.hide = function () {
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