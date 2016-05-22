/*** WeatherUnderground Z-Way HA module *******************************************

Version: 1.1
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
    this.update             = undefined;
    this.devices            = {};
}

inherits(WeatherUnderground, AutomationModule);

_module = WeatherUnderground;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

WeatherUnderground.prototype.deviceTypes = ['wind','uv','humidity','barometer','forecastLow','forecastHigh'];
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
    
    self.location           = config.location.toString();
    self.apiKey             = config.apiKey.toString();
    self.unitTemperature    = config.unitTemperature.toString();
    self.unitSystem         = config.unitSystem.toString();
    self.langFile           = self.controller.loadModuleLang("WeatherUnderground");
    var scaleTemperature    = self.unitTemperature === "celsius" ? '°C' : '°F';
    
    self.addDevice('current',{
        probeType: 'condition',
        probeTitle: 'WeatherUndergoundCurrent',
        scaleTitle: scaleTemperature,
        title: self.langFile.current
    });
    
    self.addDevice('forecast',{
        probeType: 'forecast_range',
        probeTitle: 'WeatherUndergoundForecast',
        scaleTitle: scaleTemperature,
        title: self.langFile.forecast
    });
    
    if (self.config.forecastLowDevice === true) {
        self.addDevice('forecastLow',{
            probeType: 'forecast_low',
            icon: 'temperature',
            scaleTitle: scaleTemperature,
            title: self.langFile.forecastLow
        });
    }
    
    if (self.config.forecastHighDevice === true) {
        self.addDevice('forecastHigh',{
            probeType: 'forecast_high',
            icon: 'temperature',
            scaleTitle: scaleTemperature,
            title: self.langFile.forecastHigh
        });
    }
    
    if (self.config.humidityDevice === true) {
        self.addDevice('humidity',{
            probeType: 'humidity',
            icon: '/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/humidity.png',
            scaleTitle: '%',
            title: self.langFile.humidity
        });
    }
    
    if (self.config.windDevice === true) {
        self.addDevice('wind',{
            probeType: 'wind',
            scaleTitle: config.unitSystem === "metric" ? 'km/h' : 'mph',
            title: self.langFile.wind
        });
    }
    
    if (self.config.uvDevice === true) { 
        self.addDevice('uv',{
            probeType: 'ultraviolet',
            icon: 'ultraviolet',
            title: self.langFile.uv
        });
    }
    
    if (self.config.solarDevice === true) { 
        self.addDevice('solar',{
            probeType: 'solar',
            scaleTitle: 'Watt/m²',
            icon: 'ultraviolet',
            title: self.langFile.solar
        });
    }
    
    if (self.config.barometerDevice === true) {
        self.addDevice('barometer',{
            probeType: 'barometer',
            scaleTitle: config.unitSystem === "metric" ? 'hPa' : 'inHg',
            icon: '/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/barometer0.png',
            title: self.langFile.barometer
        });
    }
    
    var currentTime     = (new Date()).getTime();
    var currentLevel    = self.devices.current.get('metrics:level');
    var updateTime      = self.devices.current.get('metrics:timestamp');
    var intervalTime    = parseInt(self.config.interval,10) * 60 * 1000;
    
    self.timer = setInterval(function() {
        self.fetchWeather(self);
    }, intervalTime);
    
    setTimeout(function() {
        if (typeof(updateTime) === 'undefined') {
            self.fetchWeather(self);
        } else {
            console.log('[WeatherUnderground] Last update time '+updateTime);
            if ((updateTime + intervalTime / 3) < currentTime) {
                self.fetchWeather(self);
            }
        }
    },1000);
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
    
    if (typeof(self.update) !== 'undefined') {
        clearTimeout(self.update);
    }
    
    WeatherUnderground.super_.prototype.stop.call(this);
};

WeatherUnderground.prototype.addDevice = function(prefix,defaults) {
    var self = this;
    
    var probeTitle  = defaults.probeTitle || '';
    var scaleTitle  = defaults.scaleTitle || '';
    var probeType   = defaults.probeType || prefix;
    delete defaults.probeType;
    delete defaults.probeTitle;
    delete defaults.scaleTitle;
    
    var deviceParams = {
        overlay: { 
            deviceType: "sensorMultilevel",
            probeType: probeType,
            metrics: { 
                probeTitle: probeTitle,
                scaleTitle: scaleTitle
            }
        },
        defaults: {
            metrics: defaults
        },
        deviceId: "WeatherUnderground_"+prefix+"_" + this.id,
        moduleId: prefix+"_"+this.id,
        handler: function(command) {
            if (command === 'update') {
                if (typeof(self.update) !== 'undefined') {
                    clearTimeout(self.update);
                }
                self.update = setTimeout(_.bind(self.fetchWeather,self),10*1000);
            }
        }
    };
    
    self.devices[prefix] = self.controller.devices.create(deviceParams);
    return self.devices[prefix];
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

WeatherUnderground.prototype.fetchWeather = function () {
    var self = this;
    
    if (typeof(self.update) !== 'undefined') {
        clearTimeout(self.update);
    }
    
    var url = "http://api.wunderground.com/api/"+self.config.apiKey+"/conditions/forecast/astronomy/q/"+self.config.location+".json";
    
    http.request({
        url: url,
        async: true,
        success: function(response) { self.processResponse(response); },
        error: function(response) {
            console.error("[WeatherUnderground] Update error: "+response.statusText);
            console.logJS(response);
            self.controller.addNotification(
                "error", 
                self.langFile.error_fetch, 
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
    sunset.hour     = parseInt(sunset.hour,10);
    sunset.minute   = parseInt(sunset.minute,10);
    sunrise.hour    = parseInt(sunrise.hour,10);
    sunrise.minute  = parseInt(sunrise.minute,10);
    console.logJS(response.data);
    
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
    var currentTemperature  = parseFloat(self.config.unitTemperature === "celsius" ? current.temp_c : current.temp_f);
    var currentHigh         = parseFloat(self.config.unitTemperature === "celsius" ? forecast[0].high.celsius : forecast[0].high.fahrenheit);
    var currentLow          = parseFloat(self.config.unitTemperature === "celsius" ? forecast[0].low.celsius : forecast[0].low.fahrenheit);
    var percipIntensity     = parseFloat(self.config.unitSystem === "metric" ? current.precip_1hr_metric : current.precip_1hr_in);
    var uv                  = parseInt(current.UV,10);
    var solarradiation      = parseInt(current.solarradiation,10);
    var temperatureList     = self.listSet(self.devices.current,"temperature_list",currentTemperature,3);
    var temperatureDiff     = _.last(temperatureList) - _.first(temperatureList);
    var changeTemperature   = 'unchanged';
    if (Math.abs(temperatureDiff) > 0.1) {
        if (temperatureDiff > 0) {
            changeTemperature = 'rise';
        } else {
            changeTemperature = 'fall';
        }
    }
    self.devices.current.set("metrics:temperatureChange",changeTemperature);
    
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
    self.devices.current.set("metrics:percipintensity",percipIntensity);
    self.devices.current.set("metrics:uv",uv);
    self.devices.current.set("metrics:solarradiation",solarradiation);
    
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
    
    // Forecast low/high humidity
    if (self.config.forecastLowDevice === true) {
        self.devices.forecastLow.set("metrics:level", forecastLow);
    }
    if (self.config.forecastHighDevice === true) {
        self.devices.forecastHigh.set("metrics:level", forecastHigh);
    }
    
    // Handle humidity
    if (self.config.humidityDevice === true) {
        self.devices.humidity.set("metrics:level", parseInt(current.relative_humidity,10));
    }
    
    // Handle wind
    if (self.config.windDevice === true) {
        var windKph = parseInt(current.wind_kph,10);
        var windKphGust = parseInt(current.wind_gust_mph,10);
        var windMph = parseInt(current.wind_kph,10);
        var windMphGust = parseInt(current.wind_gust_mph,10);
        if (windKphGust > windKph) {
            windKph = (windKph + windKphGust) / 2;
            windMph = (windMph + windMphGust) / 2;
        }
        var beaufort = _.findIndex(self.windBeaufort,function(check) {
            return windKph < check;
        });
        var icon = _.findIndex(self.windIcons,function(check) {
            return beaufort < check;
        });
        self.devices.wind.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/wind"+icon+".png");
        self.devices.wind.set("metrics:dir", current.wind_dir);
        self.devices.wind.set("metrics:wind", parseFloat(self.config.unitSystem === "metric" ? current.wind_kph : current.wind_mph));
        self.devices.wind.set("metrics:windgust", parseFloat(self.config.unitSystem === "metric" ? current.wind_gust_kph : current.wind_gust_mph));
        self.devices.wind.set("metrics:winddregrees", parseFloat(current.wind_degrees));
        self.devices.wind.set("metrics:beaufort",beaufort);
        self.averageSet(self.devices.wind,(self.config.unitSystem === "metric" ? windKph : windMph));
    }
    
    // Handle UV
    if (self.config.uvDevice === true) {
        self.averageSet(self.devices.uv,uv);
    }
    
    // Handle solar intensity
    if (self.config.solarDevice === true) {
        self.averageSet(self.devices.solar,solarradiation);
    }
    
    // Handle barometer
    if (self.config.barometerDevice === true) {
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
        return 'neutral';
    } else if (_.contains(["clear", "hazy", "mostlysunny", "partlysunny", "partlycloudy"], condition)) {
        return 'fair';
    }
    
    return 'unknown';
};

WeatherUnderground.prototype.listSet = function(deviceObject,key,value,count) {
    var varKey = 'metrics:'+key;
    var list = deviceObject.get(varKey) || [];
    count = count || 3;
    list.unshift(value);
    while (list.length > count) {
        list.pop();
    }
    deviceObject.set(varKey,list);
    return list;
};

WeatherUnderground.prototype.averageSet = function(deviceObject,value,count) {
    var list = this.listSet(deviceObject,'list',value,count);
    var sum = _.reduce(list, function(i,j){ return i + j; }, 0);
    var avg = sum / list.length;
    deviceObject.set('metrics:current',avg);
    deviceObject.set('metrics:level',avg);
    return avg;
};


 
