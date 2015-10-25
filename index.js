/*** WeatherUnderground Z-Way HA module *******************************************

Version: 1.00
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: maros@k-1.com <maros@k-1.com>
Description:
    This module checks weather updates via weatherundergound.com

******************************************************************************/

function WeatherUnderground (id, controller) {
    // Call superconstructor first (AutomationModule)
    WeatherUnderground.super_.call(this, id, controller);
    
    this.location           = undefined;
    this.apiKey             = undefined;
    this.unitTemperature    = undefined;
    this.unitSystem         = undefined;
    this.timer              = undefined;
    this.devices            = {};
}

inherits(WeatherUnderground, AutomationModule);

_module = WeatherUnderground;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

WeatherUnderground.prototype.init = function (config) {
    WeatherUnderground.super_.prototype.init.call(this, config);

    var self = this;
    
    this.location           = config.location.toString();
    this.apiKey             = config.apiKey.toString();
    this.unitTemperature    = config.unitTemperature.toString();
    this.unitSystem         = config.unitSystem.toString();
    var langFile            = self.controller.loadModuleLang("WeatherUnderground");
    
    self.addDevice('current',{
        probeTitle: 'weather_current',
        scaleTitle: config.unitTemperature === "celsius" ? '°C' : '°F',
        title: langFile.current
    });
    
    self.addDevice('humidity',{
        probeTitle: 'humidity',
        icon: '/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/humidity.png',
        scaleTitle: '%',
        title: langFile.humidity
    });
    
    self.addDevice('wind',{
        probeTitle: 'weather_wind',
        scaleTitle: config.unitSystem === "metric" ? 'km/h' : 'mph',
        title: langFile.wind
    });
    
    self.addDevice('forecast',{
        probeTitle: 'weather_forecast',
        scaleTitle: config.unitTemperature === "celsius" ? '°C' : '°F',
        title: langFile.forecast
    });
    
    var currentTime     = (new Date()).getTime();
    var updateTime      = self.devices['current'].get('updateTime') * 1000;
    var intervalTime    = parseInt(self.config.interval) * 60 * 1000;
    
    self.timer = setInterval(function() {
        self.fetchWeather(self);
    }, intervalTime);
    
    console.log('[WeatherUnderground] Last update time '+updateTime);
    if ((updateTime + intervalTime / 3) < currentTime) {
        self.fetchWeather(self);
    }
};

WeatherUnderground.prototype.stop = function () {
    var self = this;
    
    if (self.timer) {
        clearInterval(self.timer);
        self.timer = undefined;
    }
    
    if (typeof self.devices !== 'undefined') {
        _.each(self.devices,function(value, key) {
            self.controller.devices.remove(value.id);
        });
        self.devices = {};
    }
    
    WeatherUnderground.super_.prototype.stop.call(this);
};

WeatherUnderground.prototype.addDevice = function(prefix,overlay) {
    var self = this;
    
    var deviceParams = {
        overlay: overlay,
        deviceId: "WeatherUnderground_"+prefix+"_" + this.id,
        moduleId: prefix+"_"+this.id
    };
    deviceParams.overlay['deviceType'] = "sensorMultilevel";
    
    self.devices[prefix] = self.controller.devices.create(deviceParams);
    return self.devices[prefix];
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

WeatherUnderground.prototype.fetchWeather = function (instance) {
    var self = instance,
        moduleName = "WeatherUnderground";
    var langFile = self.controller.loadModuleLang(moduleName);
    var url = "http://api.wunderground.com/api/"+self.config.apiKey+"/conditions/forecast/astronomy/q/"+self.config.location+".json";
    
    http.request({
        url: url,
        async: true,
        success: function(response) { self.processResponse(instance,response) },
        error: function(response) {
            console.error("[WeatherUnderground] Update error");
            console.logJS(response);
            self.controller.addNotification("error", langFile.err_fetch, "module", moduleName);
        }
    });
};

WeatherUnderground.prototype.processResponse = function(instance,response) {
    console.log("[WeatherUnderground] Update");
    
    var self        = instance;
    var current     = response.data.current_observation;
    var currentDate = new Date();
    var sunrise     = response.data.sun_phase.sunrise;
    var sunset      = response.data.sun_phase.sunset;
    var forecast    = response.data.forecast.simpleforecast.forecastday;
    sunset.hour     = parseInt(sunset.hour);
    sunset.minute   = parseInt(sunset.minute);
    sunrise.hour    = parseInt(sunrise.hour);
    sunrise.minute  = parseInt(sunrise.minute);
    //console.logJS(response.data);
    
    var daynight = (
            currentDate.getHours() > sunrise.hour 
            || 
            (
                currentDate.getHours() === sunrise.hour 
                && currentDate.getMinutes() > sunrise.minute
            )
        ) 
        &&
        (
            currentDate.getHours() < sunset.hour 
            || 
            (
                currentDate.getHours() === sunset.hour 
                && currentDate.getMinutes() < sunset.minute
            )
        ) ? 'day':'night';
    
    // Handle current state
    var currentTemperature = (self.config.unitTemperature === "celsius" ? current.temp_c : current.temp_f);
    var currentHigh        = (self.config.unitTemperature === "celsius" ? forecast[0].high.celsius : forecast[0].high.fahrenheit);
    var currentLow         = (self.config.unitTemperature === "celsius" ? forecast[0].low.celsius : forecast[0].low.fahrenheit);
    self.devices.current.set("metrics:conditiongroup",this.transformCondition(current.icon));
    self.devices.current.set("metrics:condition",current.icon);
    //self.devices.current.set("metrics:title",current.weather);
    self.devices.current.set("metrics:level",currentTemperature);
    self.devices.current.set("metrics:temperature",currentTemperature);
    self.devices.current.set("metrics:icon", "http://icons.wxug.com/i/c/k/"+(daynight === 'night' ? 'nt_':'')+current.icon+".gif");
    self.devices.current.set("metrics:pressure", (self.config.unitSystem === "metric" ? current.pressure_mb : current.pressure_in));
    self.devices.current.set("metrics:feelslike", (self.config.unitTemperature === "celsius" ? current.feelslike_c : current.feelslike_f));
    self.devices.current.set("metrics:uv",current.uv);
    self.devices.current.set("metrics:solarradiation",current.solarradiation);
    self.devices.current.set("metrics:weather",current.weather);
    self.devices.current.set("metrics:pop",forecast[0].pop);
    self.devices.current.set("metrics:high",currentHigh);
    self.devices.current.set("metrics:low",currentLow);
    self.devices.current.set("metrics:raw",current);
    
    self.averageSet(self.devices.current,'uv',current.uv);
    self.averageSet(self.devices.current,'solarradiation',current.solarradiation);
    
    // Handle forecast
    var forecastHigh = (self.config.unitTemperature === "celsius" ? forecast[1].high.celsius : forecast[1].high.fahrenheit);
    var forecastLow = (self.config.unitTemperature === "celsius" ? forecast[1].low.celsius : forecast[1].low.fahrenheit);
    self.devices.forecast.set("metrics:conditiongroup",this.transformCondition(forecast[1].icon));
    self.devices.forecast.set("metrics:condition",forecast[1].icon);
    //self.devices.current.set("metrics:title",forecast[1].weather);
    self.devices.forecast.set("metrics:level", forecastLow + ' - ' + forecastHigh);
    self.devices.forecast.set("metrics:icon", "http://icons.wxug.com/i/c/k/"+forecast[1].icon+".gif");
    self.devices.forecast.set("metrics:pop",forecast[1].pop);
    self.devices.forecast.set("metrics:weather",forecast[1].conditions);
    self.devices.forecast.set("metrics:high",forecastHigh);
    self.devices.forecast.set("metrics:low",forecastLow);
    self.devices.forecast.set("metrics:raw",forecast);
    
    // Handle humidity
    self.devices.humidity.set("metrics:level", parseInt(current.relative_humidity));
    
    // Handle wind
    var wind = (parseInt(current.wind_kph) + parseInt(current.wind_gust_kph)) / 2;
    var windLevel = 0;
    if (wind >= 62) { // Beaufort 8
        windLevel = 3;
    } else if (wind >= 39) { // Beaufort 6
        windLevel = 2;
    } else if (wind >= 12) { // Beaufort 3
        windLevel = 1;
    }
    self.devices.wind.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/wind"+windLevel+".png");
    self.devices.wind.set("metrics:level", current.wind_dir + ' ' + (self.config.unitSystem === "metric" ? current.wind_kph : current.wind_mph));
    self.devices.wind.set("metrics:wind", (self.config.unitSystem === "metric" ? current.wind_kph : current.wind_mph));
    self.devices.wind.set("metrics:windgust", (self.config.unitSystem === "metric" ? current.wind_gust_kph : current.wind_gust_mph));
    self.devices.wind.set("metrics:winddregrees", current.wind_degrees);
    self.devices.wind.set("metrics:windlevel",windLevel);
    self.averageSet(self.devices.wind,'wind',wind);
    
};

WeatherUnderground.prototype.transformCondition = function(condition) {
    if (_.contains(["chanceflurries", "chancesleet", "chancesnow", "flurries","sleet","snow"], condition)) {
        return 'snow';
    } else if (_.contains(["chancetstorms", "chancerain", "rain" ,"tstorms"], condition)) {
        return 'poor';
    } else if (_.contains(["cloudy", "mostlycloudy","fog"], condition)) {
        return 'neutral'
    } else if (_.contains(["clear", "hazy", "mostlysunny", "partlysunny", "partlycloudy"], condition)) {
        return 'fair';
    }
    
    return 'unknown';
};

WeatherUnderground.prototype.averageSet = function(device,key,value,count) {
    count = count || 3;
    var list = device.get('metrics:'+key+'_list') || [];
    list.unshift(value);
    while (list.length > count) {
        list.pop();
    }
    var sum = _.reduce(list, function(i,j){ return i + j; }, 0);
    var avg = sum / list.length;

    device.set('metrics:'+key+'_list',list);
    device.set('metrics:'+key+'_avg',avg);
    
    return avg;
};


 