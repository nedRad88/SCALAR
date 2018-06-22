'use strict';
app.factory('accountsService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.oAuthServiceBaseUri;
    var accountsServiceFactory = {};
    var _getAllAccounts = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/account',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _addAccount = function (user) {
        var notify = (user.notify) ? "?notify=true" : "?notify=false";
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/account/register' + notify,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: user

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    }

    var _editAccount = function (user, id) {
        var notify = (user.notify) ? "?notify=true" : "?notify=false";
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + 'api/account/' + id + '/' + notify,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: user

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    }
    var _deleteAccounts = function (users) {
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/account/delete',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: users

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    }

    var _resetAccountPassword = function (userName, new_password) {
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + 'api/account/' + userName + '/password',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: '"' + new_password + '"'

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }


    var _changePassword = function (query) {


        var deferred = $q.defer();

        var req = {
            method: 'PUT',
            url: serviceBase + 'api/account/me/password',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: query
        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;

    }
    accountsServiceFactory.getAllAccounts = _getAllAccounts;
    accountsServiceFactory.addAccount = _addAccount;
    accountsServiceFactory.editAccount = _editAccount;
    accountsServiceFactory.deleteAccounts = _deleteAccounts;
    accountsServiceFactory.resetAccountPassword = _resetAccountPassword;
    accountsServiceFactory.changePassword = _changePassword;
    return accountsServiceFactory;
}]);



app.factory('authInterceptorService', ['$q', '$location', 'localStorageService', function ($q, $location, localStorageService) {

    var authInterceptorServiceFactory = {};

    var _request = function (config) {

        config.headers = config.headers || {};

        var authData = localStorageService.get('authorizationData');
        if (authData) {
            config.headers.Authorization = 'Bearer ' + authData.token;
        }

        return config;
    }

    var _responseError = function (rejection) {
        if (rejection.status === 401) {
            $location.path("/login");
        }
        return $q.reject(rejection);
    }

    authInterceptorServiceFactory.request = _request;
    authInterceptorServiceFactory.responseError = _responseError;

    return authInterceptorServiceFactory;
}]);




app.factory('dataService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var dataServiceFactory = {};
    var _fireEndPoint = function (endpoint) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + endpoint,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }
    var _reportComment = function (id, pol) {
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + "api/comment/" + id + "/report",
            data: '"' + pol + '"',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);

            }, function errorCallback(err) {
                deferred.reject(err);
            });
        return deferred.promise;
    }
    dataServiceFactory.fireEndpoint = _fireEndPoint;
    dataServiceFactory.reportComment = _reportComment;
    return dataServiceFactory;
}]);




app.factory('oAuthService', ['$http', '$q', 'localStorageService', 'ooredooAppSettings', function ($http, $q, localStorageService, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.oAuthServiceBaseUri;
    var authServiceFactory = {};

    var _authentication = {
        isAuth: false,
        me: ""
    };

    var _saveRegistration = function (registration) {

        return $http.post(serviceBase + 'api/account/register', registration).then(function (response) {
            return response;
        });

    };

    var _login = function (loginData) {

        var data = "grant_type=password&username=" + loginData.email + "&password=" + loginData.password;

        var deferred = $q.defer();

        $http.post(serviceBase + 'token', data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).success(function (response) {
            var req = {
                method: 'GET',
                url: serviceBase + 'api/account/me',
                headers: {
                    'Authorization': 'Bearer ' + response.access_token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                data: ""

            }
            $http(req).then(
                function successCallback(resp) {
                    localStorageService.set('authorizationData', { token: response.access_token, me: resp.data });
                    _authentication.isAuth = true;
                    _authentication.me = resp.data;
                    deferred.resolve(response);
                }, function errorCallback(err) {
                    _logOut();
                    deferred.reject(err);
                });


        }).error(function (err, status) {
            _logOut();
            deferred.reject(err);
        });

        return deferred.promise;

    };

    var _logOut = function () {

        localStorageService.remove('authorizationData');

        _authentication.isAuth = false;
        _authentication.me = "";

    };

    var _fillAuthData = function () {

        var authData = localStorageService.get('authorizationData');
        if (authData) {
            _authentication.isAuth = true;
            _authentication.me = authData.me;
        }

    }



    authServiceFactory.saveRegistration = _saveRegistration;
    authServiceFactory.login = _login;
    authServiceFactory.logOut = _logOut;
    authServiceFactory.fillAuthData = _fillAuthData;
    authServiceFactory.authentication = _authentication;


    return authServiceFactory;
}]);





app.factory('pagesService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var accountsServiceFactory = {};
    var _getAllPages = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/page',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    accountsServiceFactory.getAllPages = _getAllPages;


    return accountsServiceFactory;
}]);






app.factory('postsService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var postsServiceFactory = {};

    var _getPosts = function (params) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/post' + params,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'

            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _getPostComments = function (id) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/post' + id,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'

            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    postsServiceFactory.getPosts = _getPosts;
    postsServiceFactory.getPostComments = _getPostComments;


    return postsServiceFactory;
}]);





app.factory('tagsService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var tagsServiceFactory = {};

    var _getAllTags = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/tag',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'

            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _addTag = function (tag) {
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/tag',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: tag

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _deleteTags = function (tags) {
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/tag/delete',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: tags

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _editTag = function (id, newTag) {
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + 'api/tag/' + id,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: newTag

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _suggestKeywords = function (keywords) {
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/tag/suggest',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'

            },
            data: keywords

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }
    tagsServiceFactory.getAllTags = _getAllTags;
    tagsServiceFactory.addTag = _addTag;
    tagsServiceFactory.deleteTags = _deleteTags;
    tagsServiceFactory.editTag = _editTag;
    tagsServiceFactory.suggestKeywords = _suggestKeywords;

    return tagsServiceFactory;
}]);




app.factory('topicsService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var topicsServiceFactory = {};

    var _getAllTopics = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/topics',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'

            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }


    var _getAllGroups = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/groups',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'

            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _getAllTopicsByGroup = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/topics/groups',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'

            },

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _addTopic = function (topic) {
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/topics',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: topic

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _deleteTopics = function (topics) {
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: serviceBase + 'api/topics/delete',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: topics

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }
    var _editTopic = function (id, newTopic) {
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + 'api/topics/' + id,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: newTopic

        }
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }
    topicsServiceFactory.getAllTopics = _getAllTopics;
    topicsServiceFactory.getAllTopicsByGroup = _getAllTopicsByGroup;
    topicsServiceFactory.addTopic = _addTopic;
    topicsServiceFactory.deleteTopics = _deleteTopics;
    topicsServiceFactory.editTopic = _editTopic;
    topicsServiceFactory.getAllGroups = _getAllGroups;
    return topicsServiceFactory;
}]);