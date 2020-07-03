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