


var app = angular.module('myApp', ['ngMaterial', 'angularRandomString', 'ngRoute', 'LocalStorageModule', 'chart.js', 'md.data.table', 'ngSanitize','ngAnimate',
    'ngAria',
    'ngMessages',
    'fc.paging',
    'mdPickers']);



app.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
});

app.directive('fileUpload', function () {
    return {
        scope: true,        //create a new scope
        link: function (scope, el, attrs) {
            el.bind('change', function (event) {
                var files = event.target.files;
                //iterate files since 'multiple' may be specified on the element
                for (var i = 0;i<files.length;i++) {
                    //emit event upward
                    scope.$emit("fileSelected", { file: files[i] });
                }                                       
            });
        }
    };
});

app.config(function($mdThemingProvider) {
    $mdThemingProvider.definePalette('red', {
        '50': '#ffffff',
        '100': '#ffbdbd',
        '200': '#ff8585',
        '300': '#ff3d3d',
        '400': '#ff1f1f',
        '500': '#ff0000',
        '600': '#e00000',
        '700': '#c20000',
        '800': '#a30000',
        '900': '#850000',
        'A100': '#ffffff',
        'A200': '#ffbdbd',
        'A400': '#ff1f1f',
        'A700': '#c20000',
        'contrastDefaultColor': 'light',
        'contrastDarkColors': '50 100 200 A100 A200'
    });

   

    $mdThemingProvider.theme('default')
        .primaryPalette('red', {
            'default': '600',
            'hue-1': '100', // use shade 100 for the <code>md-hue-1</code> class
            'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
            'hue-3': 'A100'

        });


});


app.constant('dashboardSections', {
    'userSections':[
                {  title: 'Overview',
                    path:'/home',
                    toggled: false,
                    icon: "home"
                },
                {
                    title: 'Competitions',
                    toggled: true,
                    icon: "settings_input_antenna",
                    subsections: [
                        {
                            title: 'Ongoing',
                            path: '/competitions/list',
                            icon : "timeline"
                                                
                        },
                        {
                            title: 'My competitions',
                            path: '/competitions/my_competitions',
                            icon : "favorite"
                        }
                    ]
                },
                {
                    title: 'Datastreams',
                    path:'/datastreams',
                    toggled: false,
                    icon: "equalizer"
                },
    ],
    'adminSections' : [
                {
                    title: 'Competitions',
                    toggled: false,
                    path: '/competitions',
                    icon: 'supervisor_account'
                    
                },
                {
                    title: 'Tags',
                    toggled: false,
                    path: "/admin/tags",
                    icon:'label'
                    
                },
                {
                    title: 'Topics',
                    toggled: false,
                    path: "/admin/topics",
                    icon:'loyalty',
                    
                }
    ]
});

// var oAuthServiceBase = 'http://localhost:5000/auth/';
// var ressourceServerBaseUri = 'http://localhost:5000/';

var ressourceServerBaseUri = 'http://app.streaming-challenge.com:5000/';
var oAuthServiceBase = 'http://app.streaming-challenge.com:5000/auth/';


//var oAuthServiceBase = 'http://streamingcompetition.francecentral.cloudapp.azure.com:5000/auth/';
//var ressourceServerBaseUri = 'http://streamingcompetition.francecentral.cloudapp.azure.com:5000/';



app.constant('ooredooAppSettings', {
    'oAuthServiceBaseUri': oAuthServiceBase,
    'ressourceServerBaseUri':ressourceServerBaseUri,
    'clientId': 'OoredooApp',
    'legendTemplateWithSeries':"<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
    'legendTemplate': "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<segments.length; i++){%><li><span style=\"display: inline-block; background-color:<%=segments[i].fillColor%>\"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>",
    'tooltipTemplate': "<%if (label){%><%=label%>: <%}%><%= value %>%",
    'colors_copy': ['#949FB1', '#46BFBD', '#FDB45C', '#4D5360'],
    'colors': { "Positive": '#46BFBD', 'Negative': '#FDB45C', 'Neutral': '#949FB1', "AT": '#AAADAD', 'Ooredoo': '#e00000', 'Djezzy': '#2C3E50', 'Mobilis': '#6DBCDB', 'Score': '#220B27' },
    'sentimentsColors': { 'positive': '#46BFBD', 'negative': '#FDB45C', 'neutral': '#949FB1' },
    'operatorsColors': { 'positive': '#46BFBD', 'negative': '#FDB45C', 'neutral': '#949FB1' }
});



app.config(function($routeProvider) {
    $routeProvider.when("/home", {
        controller: "homeController",
        templateUrl: "static/app/views/page.html",
        resolve: {
            settings: function () {
                return {
                    isAdminMode: false,
                    title: "Overview",
                    canShowPost: false,
                }
            }
        }
    });
    

    
    //$routeProvider.when("/", { redirectTo: "/home" });

    /**
    $routeProvider.when("/stats", {
        controller: "statsController",
        templateUrl: "static/app/views/stats.html",
        resolve: {
        settings: function () {
           return {
                    isAdminMode: false,
                    title: "Stats"
                    
                }
            }
        }
    });
    **/
    $routeProvider.when("/forbidden", {
        controller: "errorController",
        templateUrl: "static/app/views/forbidden.html"
    });
    
    $routeProvider.when("/login", {
        controller: "loginController",
        templateUrl: "static/app/views/login.html"
    });
    
    $routeProvider.when("/signup", {
        controller: "signupController",
        templateUrl: "static/app/views/signup.html"
    });
    
    $routeProvider.when("/competitions", {
        controller: "competitionController",
        templateUrl: "static/app/views/competition.html"
    });
    
    $routeProvider.when("/datastreams", {
        controller: "datastreamController",
        templateUrl: "static/app/views/datastream.html"
    });
    
    $routeProvider.when("/results/:competition", {
        controller: "pageController",
        templateUrl: "static/app/views/page.html"
    });
    

    $routeProvider.when("/admin/accounts", {
        controller: "accountsController",
        templateUrl: "static/app/views/accounts.html"
    });

   

    $routeProvider.when("/404", {
        templateUrl: "static/app/views/404.html"
    });
    
   
    $routeProvider.otherwise({ redirectTo: "/404" });

    
}).run(['$rootScope', '$location','oAuthService', function($rootScope, $location, oAuthService) {

    // register listener to watch route changes
    $rootScope.$on("$routeChangeStart", function (event, next, current) {
        
        console.log(oAuthService.authentication.isAuth)
        
        if (oAuthService.authentication.isAuth == false) {
            
            // no logged user, we should be going to #login
            if (next.templateUrl != "static/app/views/login.html" && next.templateUrl != 'static/app/views/signup.html' ) {
                $location.path("/login");
            }
        }
        Chart.defaults.global.animation = false;
        
    });
}]);


app.run(['oAuthService', function (authService) {
    authService.fillAuthData();
}]);

app.config(function ($httpProvider) {
    $httpProvider.interceptors.push('authInterceptorService');
});






