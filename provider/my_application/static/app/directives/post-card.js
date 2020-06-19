app.directive('postCard',
    [
        '$rootScope',
        'dataService',
        'ooredooAppSettings',
        '$mdToast',
        '$q',
        '$window',
        '$sce',
        function ($rootScope,dataService, ooredooAppSettings, $mdToast, $q, $window, $sce) {

    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    return {
        restrict: 'EA',
        transclude: 'true',
        scope: {
            post: "=",
            params: "="

        },
        templateUrl: 'app/views/templates/post-card.html',
        link: function (scope, element, attrs) {
            
            scope.comments = [];
            scope.filter = "none";
            var endPoint = 'api/post/'+scope.post.id+"/comments";
            if ($rootScope.params.period) {
                endPoint += '?since=' + $rootScope.params.period.begin + '&until=' + $rootScope.params.period.end;
            }
            if ($rootScope.params.mainTopic) {
                endPoint += '&mainTopic=' + $rootScope.params.mainTopic;
            }
            
            if ($rootScope.params.topics && $rootScope.params.topics.length > 0) {
                for (var i = 0; i < $rootScope.params.topics.length; i++) {
                    endPoint = endPoint + "&" + "topics=" + $rootScope.params.topics[i].id;
                }
            }

            scope.openLink = function (link) {
                $window.open(link, '_blank');
            };


            scope.showAll = function () {
                scope.comments = [];
                scope.filter = "all";
                dataService.fireEndpoint(endPoint).then(
                           function successCallback(response) {
                               for (var i = 0; i < response.data.data.length; i++) {
                                   scope.comments.push(response.data.data[i]);
                               }

                               scope.next = response.data.next;
                           }, function errorCallback(err) {
                               scope.message = err.data;

                           });
            }

            scope.showNegative = function () {
                scope.comments = [];
                scope.filter = "neg";
                dataService.fireEndpoint(endPoint + "&sentiment=neg").then(
                           function successCallback(response) {
                               for (var i = 0; i < response.data.data.length; i++) {
                                   scope.comments.push(response.data.data[i]);
                               }

                               scope.next = response.data.next;
                           }, function errorCallback(err) {
                               scope.message = err.data;

                           });
            }

            scope.showPositive = function () {
                scope.comments = [];
                scope.filter = "pos";
                dataService.fireEndpoint(endPoint + "&sentiment=pos").then(
                           function successCallback(response) {
                               for (var i = 0; i < response.data.data.length; i++) {
                                   scope.comments.push(response.data.data[i]);
                               }

                               scope.next = response.data.next;
                           }, function errorCallback(err) {
                               scope.message = err.data;

                           });
            }

           /*
            if (scope.post.type == "video") {
                if(scope.post.link.indexOf("youtu") != -1){
                    scope.post.type = "youtube"
                } else {
                    element.ready(function () {
                        FB.XFBML.parse();
                    });
                }
                
            }
            */



            scope.urlify = function urlify(text) {
                var urlRegex = /(https?:\/\/[^\s]+)/g;
                if (text)
                    return text.replace(urlRegex, function(url) {
                        return '<a href="' + url + ' " target="_blank">' + url + '</a>';
                    });
            }
            scope.nextPage = function () {
                dataService.fireEndpoint(scope.next).then(
                            function successCallback(response) {
                                for (var i = 0; i < response.data.data.length; i++) {
                                    scope.comments.push(response.data.data[i]);
                                }
                                scope.next = response.data.next;
                            }, function errorCallback(err) {
                                scope.message = err.data;

                            });
            }
            
            scope.reportComment = function (comment) {
                dataService.reportComment(comment.id, comment.newSentiment).then(
                           function successCallback(response) {
                               comment.sentiment = comment.newSentiment;
                               comment.report = false;
                           }, function errorCallback(err) {


                           });
            }

        }


    }

   
}]);