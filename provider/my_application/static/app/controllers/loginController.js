'use strict';
app.controller('loginController', ['$scope', '$location', '$mdToast', 'oAuthService', function ($scope, $location,$mdToast, authService) {

    $scope.progress = false;
    $scope.message=''
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
            console.log(response)
            $location.path('/competitions');
        },
         function (err) {
             $scope.progress = false;
             console.log(err)
             $scope.message = err;
             $mdToast.show($mdToast.simple().textContent(err));
         });
    };
    
    
    
    $scope.goTo = function(endpoint){
        $location.url(endpoint);
        
    };

}]);