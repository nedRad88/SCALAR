'use strict'

app.controller('mainController', function($scope) {
    
    
    $scope.text = "Test"
    
    $scope.buttonClicked = function()
                {
                    
                    $scope.text = $scope.inputText
                    console.log('Text is ' + $scope.text);
                    
                    
                };
                
                
    $scope.$watch('text', function(){
        $scope.buttonText = $scope.text;
    })
}); 
