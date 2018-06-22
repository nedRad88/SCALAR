'use strict';
app.factory('datastreamService', ['$http', '$q', 'ooredooAppSettings', function ($http, $q, ooredooAppSettings) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var datastreamServiceFactory = {};
    var _getDatastreams = function (page, step) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/datastreams?page='+page+'&step='+step,
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
    
    var _getDatastreamInfo = function (datastream_id) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/datastreams/'+datastream_id,
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
    
    
    var _addDatastream = function (datastream, files) {
        
        
        var deferred = $q.defer();
        var req = {
            method: 'POST',
            url: 'api/datastreams',
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
                formData.append("datastream", angular.toJson(data.datastream));
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
            data: { datastream: datastream, files: files}
            
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
  
  

    datastreamServiceFactory.getDatastreams = _getDatastreams;
    datastreamServiceFactory.getDatastreamInfo = _getDatastreamInfo;
    datastreamServiceFactory.addDatastream = _addDatastream;
    
   

    return datastreamServiceFactory;
}]); 
