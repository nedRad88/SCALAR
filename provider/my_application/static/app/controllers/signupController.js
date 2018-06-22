'use strict';
app.controller('signupController', ['$scope', '$location','$mdToast', 'accountsService', 'oAuthService', function ($scope, $location,$mdToast, accountsService, authService) {
  

    $scope.message = "";
    $scope.progress = false;
    
    $scope.register = function () {
        
        $scope.progress = true;
        accountsService.register($scope.user).then(function (response) {
            
            
            $scope.progress = false;
            $location.url('/login');
            
          
            
        },
         function (err) {
             $scope.progress = false;
             $scope.message = err;
             $mdToast.show($mdToast.simple().textContent(err));
         });
    };

}]);