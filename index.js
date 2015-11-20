/*** WeatherUnderground Z-Way HA module *******************************************

Version: 1.04
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
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

WeatherUnderground.prototype.deviceTypes = ['wind','uv','humidity','barometer'];
WeatherUnderground.prototype.windBeaufort = [
    1.1,    // 0
    5.5,
    11.9,
    19.7,
    28.7,
    38.8,
    49.9,   // 6
    61.8,
    74.6,
    88.1,
    102.4,
    117.4,
    Number.POSITIVE_INFINITY
];
WeatherUnderground.prototype.windIcons = [
    1,
    3,
    6,
    Number.POSITIVE_INFINITY
];
WeatherUnderground.prototype.init = function (config) {
    WeatherUnderground.super_.prototype.init.call(this, config);

    var self = this;
    
    this.location           = config.location.toString();
    this.apiKey             = config.apiKey.toString();
    this.unitTemperature    = config.unitTemperature.toString();
    this.unitSystem         = config.unitSystem.toString();
    this.langFile           = self.controller.loadModuleLang("WeatherUnderground");
    
    _.each(self.deviceTypes,function(deviceType) {
        var key = deviceType+'_device';
        self[deviceType+'Device'] = (typeof(self.config[key]) === 'undefined' ? true:self.config[key]);
    });

    self.addDevice('current',{
        probeTitle: 'WeatherUndergoundCurrent',
        scaleTitle: config.unitTemperature === "celsius" ? '°C' : '°F',
        title: self.langFile.current,
        timestamp: 0
    });
    
    self.addDevice('forecast',{
        probeTitle: 'WeatherUndergoundForecast',
        scaleTitle: config.unitTemperature === "celsius" ? '°C' : '°F',
        title: self.langFile.forecast
    });
    
    if (self.humidityDevice) {
        self.addDevice('humidity',{
            probeTitle: 'Humidity',
            icon: '/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/humidity.png',
            scaleTitle: '%',
            title: self.langFile.humidity
        });
    }
    
    if (self.windDevice) {
        self.addDevice('wind',{
            probeTitle: 'wind',
            scaleTitle: config.unitSystem === "metric" ? 'km/h' : 'mph',
            title: self.langFile.wind
        });
    }
    
    if (self.uvDevice) { 
        self.addDevice('uv',{
            probeTitle: 'Ultraviolet',
            icon: '/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/uv.png',
            title: self.langFile.uv
        });
    }

    if (self.barometerDevice) {
        self.addDevice('barometer',{
            probeTitle: 'BarometricPressure',
            scaleTitle: config.unitSystem === "metric" ? 'hPa' : 'inHg',
            icon: '/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/barometer0.png',
            title: self.langFile.barometer
        });
    }
     
    
    var currentTime     = (new Date()).getTime();
    var currentLevel    = self.devices['current'].get('metrics:level');
    var updateTime      = self.devices['current'].get('metrics:timestamp');
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
    
    if (typeof(self.devices) !== 'undefined') {
        _.each(self.devices,function(value, key) {
            self.controller.devices.remove(value.id);
        });
        self.devices = {};
    }
    
    WeatherUnderground.super_.prototype.stop.call(this);
};

WeatherUnderground.prototype.addDevice = function(prefix,defaults) {
    var self = this;
    
    var probeTitle = defaults.probeTitle;
    var deviceParams = {
        overlay: { 
            deviceType: "sensorMultilevel",
            metrics: { probeTitle: probeTitle }
        },
        defaults: {
            metrics: defaults
        },
        deviceId: "WeatherUnderground_"+prefix+"_" + this.id,
        moduleId: prefix+"_"+this.id
    };
    
    self.devices[prefix] = self.controller.devices.create(deviceParams);
    return self.devices[prefix];
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

WeatherUnderground.prototype.fetchWeather = function () {
    var self = this;
    
    var url = "http://api.wunderground.com/api/"+self.config.apiKey+"/conditions/forecast/astronomy/q/"+self.config.location+".json";
    
    http.request({
        url: url,
        async: true,
        success: function(response) { self.processResponse(response) },
        error: function(response) {
            console.error("[WeatherUnderground] Update error");
            console.logJS(response);
            self.controller.addNotification(
                "error", 
                self.langFile.err_fetch, 
                "module", 
                "WeatherUnderground"
            );
        }
    });
};

WeatherUnderground.prototype.processResponse = function(response) {
    console.log("[WeatherUnderground] Update");
    
    var self        = this;
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
    var currentTemperature = parseFloat(self.config.unitTemperature === "celsius" ? current.temp_c : current.temp_f);
    var currentHigh        = parseFloat(self.config.unitTemperature === "celsius" ? forecast[0].high.celsius : forecast[0].high.fahrenheit);
    var currentLow         = parseFloat(self.config.unitTemperature === "celsius" ? forecast[0].low.celsius : forecast[0].low.fahrenheit);
    self.devices.current.set("metrics:conditiongroup",self.transformCondition(current.icon));
    self.devices.current.set("metrics:condition",current.icon);
    //self.devices.current.set("metrics:title",current.weather);
    self.devices.current.set("metrics:level",currentTemperature);
    self.devices.current.set("metrics:temperature",currentTemperature);
    self.devices.current.set("metrics:icon", "http://icons.wxug.com/i/c/k/"+(daynight === 'night' ? 'nt_':'')+current.icon+".gif");
    self.devices.current.set("metrics:feelslike", parseFloat(self.config.unitTemperature === "celsius" ? current.feelslike_c : current.feelslike_f));
    self.devices.current.set("metrics:weather",current.weather);
    self.devices.current.set("metrics:pop",forecast[0].pop);
    self.devices.current.set("metrics:high",currentHigh);
    self.devices.current.set("metrics:low",currentLow);
    self.devices.current.set("metrics:raw",current);
    self.devices.current.set("metrics:timestamp",currentDate.getTime());
    
    // Handle forecast
    var forecastHigh = parseFloat(self.config.unitTemperature === "celsius" ? forecast[1].high.celsius : forecast[1].high.fahrenheit);
    var forecastLow = parseFloat(self.config.unitTemperature === "celsius" ? forecast[1].low.celsius : forecast[1].low.fahrenheit);
    self.devices.forecast.set("metrics:conditiongroup",self.transformCondition(forecast[1].icon));
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
    if (self.humidityDevice) {
        self.devices.humidity.set("metrics:level", parseInt(current.relative_humidity));
    }
    
    // Handle wind
    if (self.windDevice) {
        var wind = parseInt(current.wind_kph);
        var windGust = parseInt(current.wind_gust_kph);
        if (windGust > wind) {
            wind = (wind + windGust) / 2;
        }
        var beaufort = _.findIndex(self.windBeaufort,function(check) {
            return wind < check;
        });
        var icon = _.findIndex(self.windIcons,function(check) {
            return beaufort < check;
        });
        self.devices.wind.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/wind"+icon+".png");
        self.devices.wind.set("metrics:level", (self.config.unitSystem === "metric" ? current.wind_kph : current.wind_mph));
        self.devices.wind.set("metrics:dir", current.wind_dir);
        self.devices.wind.set("metrics:wind", parseFloat(self.config.unitSystem === "metric" ? current.wind_kph : current.wind_mph));
        self.devices.wind.set("metrics:windgust", parseFloat(self.config.unitSystem === "metric" ? current.wind_gust_kph : current.wind_gust_mph));
        self.devices.wind.set("metrics:winddregrees", parseFloat(current.wind_degrees));
        self.devices.wind.set("metrics:beaufort",beaufort);
        self.averageSet(self.devices.wind,'wind',wind);
    }
    
    // Handle humidity
    if (self.uvDevice) {
        var uv = parseInt(current.UV);
        var solarradiation = parseInt(current.solarradiation);
        self.averageSet(self.devices.uv,'solarradiation',solarradiation);
        self.devices.uv.set("metrics:solarradiation",solarradiation);
        self.averageSet(self.devices.uv,'uv',uv);
        self.devices.uv.set("metrics:level", uv);
    }

    // Handle barometer
    if (self.barometerDevice) {
        var pressure = parseFloat(self.config.unitSystem === "metric" ? current.pressure_mb : current.pressure_in);
        self.devices.barometer.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/barometer"+current.pressure_trend+".png");
        self.devices.barometer.set('metrics:level',pressure);
        self.devices.barometer.set('metrics:trend',current.pressure_trend);
    }
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

WeatherUnderground.prototype.averageSet = function(deviceObject,key,value,count) {
    count = count || 3;
    var list = deviceObject.get('metrics:'+key+'_list') || [];
    list.unshift(value);
    while (list.length > count) {
        list.pop();
    }
    var sum = _.reduce(list, function(i,j){ return i + j; }, 0);
    var avg = sum / list.length;

    deviceObject.set('metrics:'+key+'_list',list);
    deviceObject.set('metrics:'+key+'_avg',avg);
    
    return avg;
};


 
