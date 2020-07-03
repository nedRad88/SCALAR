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
app.factory('competitionService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var competitionServiceFactory = {};
    var _getCompetitions = function (status, page, step) {
        
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/competitions?status='+status+'&page='+page+'&step='+step,
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
    
    var _getCompetitionInfo = function (competition_id) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/competitions/'+competition_id,
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
    
    var _addCompetition = function (competition, files) {
        
        
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: 'api/competitions',
            headers: {
                'Accept': 'application/json',
                //'Content-Type': 'multipart/form-data'
                'Content-Type': undefined
            
            },
            //data: competition,
            
            
            transformRequest: function (data) {

                var formData = new FormData();
                //need to convert our json object to a string version of json otherwise
                // the browser will do a 'toString()' on the object which will result 
                // in the value '[Object object]' on the server.
                formData.append("competition", angular.toJson(data.competition));
                //now add all of the assigned files
                //console.log(data.files)
                
                for (var i = 0; i < data.files.length; i++) {
                    //add each file to the form data and iteratively name them
                    //console.log(i)
                    formData.append("file", data.files[i]);
                }
                /**
                while(formData.values().next() != undefined){
                    var t = formData.values().next()
                    console.log(t)
                    
                }**/
                return formData;
            },
            data: { competition: competition, files: files}
            
            //Create an object that contains the model and files which will be transformed
            // in the above transformRequest method
            
            

        }
        console.log(req)
        $http(req).then(
            function successCallback(resp) {
                deferred.resolve(resp);
            }, function errorCallback(err) {
                deferred.reject(err);
            });

        return deferred.promise;


    }
  

    competitionServiceFactory.getCompetitions = _getCompetitions;
    competitionServiceFactory.getCompetitionInfo = _getCompetitionInfo;
    competitionServiceFactory.addCompetition = _addCompetition;
   

    return competitionServiceFactory;
}]); 
