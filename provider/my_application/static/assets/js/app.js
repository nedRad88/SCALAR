


var app = angular.module('myApp', ['ngMaterial', 'angularRandomString', 'ngRoute', 'LocalStorageModule', 'chart.js', 'md.data.table', 'ngSanitize']);




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


app.constant('dashboardSections', {
    'userSections':[
                {  title: 'Overview',
                    path:'/home',
                    toggled: false,
                    icon: "home"
                },
                {
                    title: 'Operators',
                    toggled: true,
                    icon: "settings_input_antenna",
                    subsections: [
                        {
                            title: 'Ooredoo',
                            path: '/pages/ooredoo',
                                                
                        },
                        {
                            title: 'Djezzy',
                            path: '/pages/djezzy'
                        },
                        {
                            title: 'Mobilis',
                            path: '/pages/mobilis'
                        },
                        {
                            title: 'Algérie Télécom',
                            path: '/pages/at'
                        }
                    ]
                },
                {
                    title: 'Statistiques',
                    path:'/stats',
                    toggled: false,
                    icon: "equalizer"
                },
    ],
    'adminSections' : [
                {
                    title: 'Users',
                    toggled: false,
                    path: '/admin/accounts',
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







