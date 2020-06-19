'use strict';
app.factory('evaluationService', ['$http', '$q', 'ooredooAppSettings','oAuthService', function ($http, $q, ooredooAppSettings, oAuthService) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var evaluationServiceFactory = {};
    
    
    var _getEvaluation = function (competition_id) {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/evaluation/'+competition_id,
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
    
    var _getStandardEvaluationMeasures = function () {
        var deferred = $q.defer();
        var req = {
            method: 'GET',
            url: serviceBase + 'api/evaluation/measures',
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
    
    
    evaluationServiceFactory.getEvaluation = _getEvaluation;
    evaluationServiceFactory.getStandardEvaluationMeasures = _getStandardEvaluationMeasures;

    
    return evaluationServiceFactory;
}]);