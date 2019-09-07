app.directive('comparableChart', ['dataService','oAuthService', 'ooredooAppSettings', '$mdToast', '$q', function (dataService,oAuthService, ooredooAppSettings, $mdToast, $q) {
    var serviceBase = ooredooAppSettings.ressourceServerBaseUri;
    var legendTemplate = ooredooAppSettings.legendTemplateWithSeries;
    return {
        restrict: 'EA',
        transclude: 'true',
        scope: {
            title: "=",
            endpoint: "=",
            fields:"=",
            type: "@",
            period: "=",
            params: "=",
            s: '=',
            competition: "=",
            config: "=",
            isCustomDate: "=",
            topic: "=filter",
            indexOfSerie : "="
        },
        templateUrl: 'static/app/views/templates/comparable-chart.html',
        link: function (scope) {

            var config;
            var init;
            if (scope.config) {
                config = scope.config;
                init = (config.init) ? config.init : { type: 'day', time: 'Today', avg:false };
            } else {
                config = {};
                init = { type : 'day', time:'Today', avg:false}
            }

            scope.user_id = oAuthService.authentication.me.uid
            scope.measures = []
            scope.selectField = function () {
            
                
                var selected_field = JSON.parse(scope.selected_field)
                scope.measures = selected_field.measures
                console.log(scope.measures)
            };
            
            scope.selectMeasure = function (selected_measure) {
            
                console.log(scope.selected_measure)
                var selected_field = JSON.parse(scope.selected_field)
                scope.endpoint ="/topic/" + scope.competition+"/"+selected_field.name+"/"+scope.selected_measure + "/" +scope.user_id ;
                console.log(scope.endpoint)
                
            };
            scope.units = ["Hour","Day"];
            

            scope.selectUnit = function(unit) {
                scope.selectedUnit = unit;
                pushRequests(unit.toLowerCase());
            }

            scope.switchChartType = function() {
                if (scope.type=="bar") {
                    scope.type = "line";
                } else {
                    scope.type = "bar";
                }
            }
            var avg = function (array) {
                var avgs = [];
                for (var i = 0; i < array.length; i++) {
                    var tmp = 0;
                    for (var j = 0; j < array[i].length; j++) {
                        tmp = tmp + array[i][j];
                    }
                    avgs[i] = [];
                    for (var j = 0; j < array[i].length; j++) {
                        avgs[i].push(array[i][j] * 100 / tmp);
                    }
                }
                return avgs;
            }


            // if true show the custom button
            scope.custom = (typeof config.custom != "undefined") ? config.custom : true;

            // if true initial display will be by average
            scope.isAverage = init.avg;

            var initialTab = init.type;
            var initialTime = init.time;

            //
            scope.data = [];
            scope.labels = [];
            // to save data when chaging the dispplay mode
            var copy = {};

            //charts options , 

            scope.options = {
                scales: { yAxes: [{id: 'y-axis-1', type: 'linear', position: 'left',ticks: {min: 0, max:0}}]},
                responsive: true,
                animation : false,
                maintainAspectRatio: false,
                legendTemplate: legendTemplate, legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                       
                    }
                }
            };

            scope.colors = []//['#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
            /**
            for (var j = 0; j < scope.endpoints.length; j++) {

                scope.colors.push(ooredooAppSettings.colors[scope.endpoints[j].name]);
            }**/
            scope.param = {};
            scope.param.colors = angular.copy(scope.colors);//['#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
            

            // beginDate & endDate are user just for the biding
            scope.beginDate = new Date();
            scope.endDate = new Date();

            scope.loading = true;

            var loadData = function (time) {
                scope.data = [];
                scope.labels = [];
                copy = {};
                scope.selected = [];

                var intervalle = '';
                if (scope.isCustomDate) {
                    scope.since = moment(scope.period.begin);
                    scope.until = moment(scope.period.end);
                    var duration = moment.duration(scope.until.diff(scope.since)).asDays();
                    if (duration < 3) {
                        intervalle = 'hour';
                    } else if (duration <= 30) {
                        intervalle = 'day';
                    } else if (duration > 30 && duration < 120) {
                        intervalle = 'week';
                    }
                    else {
                        intervalle = 'month';
                    }
                } else {
                    switch (time) {
                        case 'Today':
                            scope.since = moment();
                            scope.until = moment().add(1, 'days');
                            intervalle = 'hour';
                            break;
                        case 'Yesterday':
                            scope.since = moment().subtract(1, 'days');
                            scope.until = moment();
                            intervalle = 'hour';
                            break;

                        case 'This week':
                            scope.since = moment().subtract(6, 'days');
                            scope.until = moment().add(1, 'days');
                            intervalle = 'day';
                            break;
                        case 'Last week':
                            scope.since = moment().subtract(14, 'days');
                            scope.until = moment().subtract(6, 'days');
                            intervalle = 'day';
                            break;
                        case 'This month':
                            scope.since = moment().subtract(1, 'months').add(1, 'days');
                            scope.until = moment().add(1,'days');
                            intervalle = 'day';
                            break;
                        case 'Last month':
                            scope.since = moment().subtract(2, 'months');
                            scope.until = moment().subtract(1, 'months');
                            intervalle = 'day';
                            break;
                        case 'This year':
                            scope.since = moment().days(0).subtract(1, 'years');
                            scope.until = moment().days(0);
                            intervalle = 'month';
                            break;
                        case 'Last year':
                            scope.since = moment().days(0).subtract(2, 'years');
                            scope.until = moment().days(0).subtract(1, 'years');
                            intervalle = 'month';
                            break;
                        default:
                            break;
                    }
                    scope.beginDate = scope.since.toDate();
                    scope.endDate = scope.until.toDate();
                }
                scope.selectedUnit = intervalle.toUpperCase();
                pushRequests(intervalle);
            }

            
            var pushRequests = function (intervalle) {
                scope.loading = true;
                var series = [];

                scope.data = [];
                scope.avgs = [];
                scope.series = [];
                scope.selected = [];
                scope.labels = [];

                copy.data = [];
                copy.avgs = [];
                copy.series = [];
                
                scope.source = new EventSource(scope.endpoint);
                var series=[]
                var labels = []

                scope.source.onmessage = function(e){
                    
                    var response_data = JSON.parse(e.data)
                    console.log(response_data)
                    
                    
                    global_response = response_data.results
                           
                    for (var u = 0; u< global_response.length; u++){
                        
                        
                        user_data = global_response[u]
                        
                        
                        if (scope.series.indexOf(user_data['user_id']) == -1 && user_data['user_id'] != undefined && user_data != undefined){
                            //console.log(user_data['user_id'])
                            scope.series.push(user_data['user_id'])
                        }
                        
                        
                        user_results = user_data['results']
                        
    
                        var data = [];
                        
                        
                        
                        for (var i = 0; i < user_results.length; i++) {
                            
                            try {
                                var label = angular.fromJson(user_results[i].label);
                                user_results[i].label = label;
                            } catch (e) {

                            }

                            if (typeof user_results[i].label !== "string") {
                                var d = user_results[i].label;
                                var date = [d.Year, d.Month - 1, d.Day, d.Hour, d.Minute, d.Second];
                                var m = moment(date);
                                

                                var l = "";
                                if (i === 0) {
                                    l = m.format('YYYY/MM/DD HH:mm:ss');
                                    
                                
                                    
                                } else {

                                            l = m.format('YYYY/MM/DD HH:mm:ss');
                                

                                    
                                }
                                
                                
                                switch (intervalle) {
                                    
                                    case "day":
                                        var t = m.add(1, "days");
                                        break;
                                    case "hour":
                                        var t = m.add(1, "hours");
                                        break;
                                    
                                    default:
                                }
                                
                                
                                if(labels.indexOf(l) == -1){
                                    labels.push(l);
                                }
                                
                            } else {
                                labels.push(user_results[i].label);
                            }
                            value = user_results[i].data;
                            
                            
                            max = scope.options.scales.yAxes[0].ticks.max;
                            if(value > max ){
                                scope.options.scales.yAxes[0].ticks.max = value
                                
                            }
                            
                            min = scope.options.scales.yAxes[0].ticks.min 
                            if (value < min ){
                                scope.options.scales.yAxes[0].ticks.min = value
                                
                            }
                            data.push(Number(user_results[i].data).toFixed(3));
                        }

                        
                        //console.log(response_data)
                        
                        if(response_data.status == "INIT"){
                            
                            scope.data.push(data);
                            //console.log(scope.data)
                        }
                        else{
                            
                            if(scope.data[u] != undefined){
                                scope.data[u].push(data[0])
                                //console.log(scope.data)
                            }
                            
                            
                        }
                        
                        
                        
                    }
                    
                            
                    scope.legend = true;
                    scope.labels = labels;
                    scope.selected = [];
                    scope.selected = scope.series.slice();


                    
                  

                    copy.data = scope.data.slice();
                    copy.series = scope.series.slice();
                    copy.avgs = avg(copy.data);
                    scope.switchDataMode(scope.isAverage);
                    scope.copy = copy;
                    scope.loading = false;
                    
                        
                    scope.$apply();
                    
                    
                    
                    
                    
                }
            

            }
            
            scope.loadData = loadData;

            var changeRange = function (ran) {
                scope.isCustomDate = false;
                switch (ran) {
                    case 'day':
                        scope.times = ["Today", "Yesterday"];
                        break;
                    case 'week':
                        scope.times = ["This week", "Last week"];
                        break;
                    case 'month':
                        scope.times = ["This month", "Last month"];
                        break;
                    case 'year':
                        scope.times = ["This year", "Last year"];
                        break;
                    case 'custom':
                        scope.isCustomDate = true;
                    default:
                        break;
                }
                if (initialTime && scope.times) {
                    var i = scope.times.indexOf(initialTime);
                    selected_time = (i >= 0) ? scope.times[i] : scope.times[0];
                    initialTime = undefined;
                } else {
                    selected_time = scope.times[0];
                }
                scope.selectedDate = selected_time;
                scope.loadData(selected_time);
            }

            scope.changeRange = changeRange;
            
            var lock = true;
            scope.$watch('period', function () {
                if (lock) {
                    lock = false;
                    return;
                }
                scope.update();

            });
            scope.$watch('endpoint', function () {
                console.log(scope.endpoint)
                
                
                scope.data = [];
                scope.avgs = [];
                scope.series = [];
                scope.selected = [];
                scope.labels = [];

                copy.data = [];
                copy.avgs = [];
                copy.series = [];
                
                if (scope.endpoint){
                    scope.source = new EventSource(scope.endpoint);
                
                var series=[]
                var labels = []
                
                scope.source.onmessage = function(e){
                    
                    var response_data = JSON.parse(e.data)
                    console.log(response_data)
                    
                    
                    global_response = response_data.results
                           
                    for (var u = 0; u< global_response.length; u++){
                        
                        
                        user_data = global_response[u]
                        
                        
                        if (scope.series.indexOf(user_data['user_id']) == -1 && user_data['user_id'] != undefined && user_data != undefined){
                            //console.log(user_data['user_id'])
                            scope.series.push(user_data['user_id'])
                        }
                        
                        
                        user_results = user_data['results']
                        
    
                        var data = [];
                        
                        
                        
                        for (var i = 0; i < user_results.length; i++) {
                            
                            try {
                                var label = angular.fromJson(user_results[i].label);
                                user_results[i].label = label;
                            } catch (e) {

                            }

                            if (typeof user_results[i].label !== "string") {
                                var d = user_results[i].label;
                                var date = [d.Year, d.Month - 1, d.Day, d.Hour, d.Minute, d.Second];
                                var m = moment(date);
                                

                                var l = "";
                                if (i === 0) {
                                    l = m.format('YYYY/MM/DD HH:mm:ss');
                                    
                                
                                    
                                } else {

                                            l = m.format('YYYY/MM/DD HH:mm:ss');
                                

                                    
                                }
                                
                                
                                if(labels.indexOf(l) == -1){
                                    labels.push(l);
                                }
                                
                            } else {
                                labels.push(user_results[i].label);
                            }
                            value = user_results[i].data;
                            
                            
                            max = scope.options.scales.yAxes[0].ticks.max;
                            if(value > max ){
                                scope.options.scales.yAxes[0].ticks.max = value
                                
                            }
                            
                            min = scope.options.scales.yAxes[0].ticks.min 
                            if (value < min ){
                                scope.options.scales.yAxes[0].ticks.min = value
                                
                            }
                            data.push(Number(user_results[i].data).toFixed(3));
                        }

                        
                        //console.log(response_data)
                        
                        if(response_data.status == "INIT"){
                            
                            scope.data.push(data);
                            //console.log(scope.data)
                        }
                        else{
                            
                            if(scope.data[u] != undefined){
                                scope.data[u].push(data[0])
                                //console.log(scope.data)
                            }
                            
                            
                        }
                        
                        
                        
                    }
                    
                            
                    scope.legend = true;
                    scope.labels = labels;
                    scope.selected = [];
                    scope.selected = scope.series.slice();


                    
                  

                    copy.data = scope.data.slice();
                    copy.series = scope.series.slice();
                    copy.avgs = avg(copy.data);
                    scope.switchDataMode(scope.isAverage);
                    scope.copy = copy;
                    scope.loading = false;
                    
                        
                    scope.$apply();
                    
                    
                    
                    
                }
                }
            

            

            });

            scope.$watch('topic', function () {
                scope.update();

            });

            scope.update = function() {
                if (scope.isCustomDate) {
                    scope.loadData("custom");
                } else {
                    scope.changeRange(initialTab);
                }
            }




            // filters  logic
            var insertAtIndex;

            scope.toggle = function (item, list) {
                var idx = list.indexOf(item);
                var index;
                if (idx > -1) {
                    list.splice(idx, 1);
                    index = scope.series.indexOf(item);
                    scope.data.splice(index, 1);
                    scope.colors.splice(index, 1);
                    scope.series.splice(index, 1);
                }
                else {
                    index = copy.series.indexOf(item);
                    scope.series = insertAtIndex(scope.series, item, index - (copy.series.length - scope.selected.length) + 1);
                    scope.colors = insertAtIndex(scope.colors, scope.param.colors[index], index - (copy.series.length - scope.selected.length) + 1);
                    if (scope.isAverage) {
                        scope.data = insertAtIndex(scope.data, copy.avgs[index], index - (copy.series.length - scope.selected.length) + 1);
                    } else {
                        scope.data = insertAtIndex(scope.data, copy.data[index], index - (copy.series.length - scope.selected.length) + 1);
                    }
                    list.push(item);
                }
            };
            scope.exists = function (item, list) {
                return list.indexOf(item) > -1;
            };

            insertAtIndex = function(array, item, index) {
                var part1 = array.slice(0, index);
                var part2 = array.slice(index, array.length);
                part1.push(item);
                return part1.concat(part2);
                
            };
            scope.switchDataMode = function (mode) {
                scope.isAverage = mode;
                switch (mode) {
                    case true:
                        scope.data = copy.avgs.slice();
                        break;
                    case false:
                        scope.data = copy.data.slice();
                        break;

                }

                scope.series = copy.series.slice();
                scope.selected = copy.series.slice();
            }
        }

    }
}]);
