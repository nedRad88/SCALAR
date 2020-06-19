'use strict';
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