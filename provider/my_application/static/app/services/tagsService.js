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
            data : tag

        }
        $http(req).then(
            function successCallback(response) {
                deferred.resolve(response);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    var _deleteTags = function(tags) {
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

    var _editTag=function(id, newTag) {
        var deferred = $q.defer();
        var req = {
            method: 'PUT',
            url: serviceBase + 'api/tag/'+id,
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
            data:keywords

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