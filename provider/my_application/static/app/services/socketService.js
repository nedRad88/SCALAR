'use strict';
app.factory('socketService', ['$rootScope', function ($rootScope) {

    
    
    //var socket = io.connect('http://localhost:5000');
    
    var dataServiceFactory = {};
    
    var _on = function (eventName, callback) {
      socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    }
    
    var _emit = function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
   
    dataServiceFactory.on = _on;
    dataServiceFactory.emit = _emit;
    
    
    
    
    return dataServiceFactory;
}]);