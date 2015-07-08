/*** WeatherUnderground Z-Way HA module *******************************************

Version: 1.0.0
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: maros@k-1.com <maros@k-1.com>
Description:
    This module checks weather updates via weatherundergound.com

******************************************************************************/


function WeatherUnderground (id, controller) {
    // Call superconstructor first (AutomationModule)
    WeatherUnderground.super_.call(this, id, controller);
}

inherits(WeatherUnderground, AutomationModule);

_module = WeatherUnderground;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

WeatherUnderground.prototype.init = function (config) {
    WeatherUnderground.super_.prototype.init.call(this, config);

    executeFile("lib/underscore_deep_extend.js");

    var self = this;
    
    this.location = config.location.toString();
    this.api_key = config.api_key.toString();
    this.location = config.location.toString();
    this.unit_temperature = config.unit_temperature.toString();
    this.unit_system = config.unit_system.toString();
    this.devices = {};
    
    this.addDevice('current',{
        overlay: {
            metrics: {
                scaleTitle: config.unit_temperature === "celsius" ? '°C' : '°F',
                title: "Condition"
            }
        },
    });
    
    this.addDevice('humidity',{
        defaults: {
            deviceType: 'humidity',
            metrics: {
                title: "Humidity"
            }
        },
        overlay: {
            metrics: {
                icon: '/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/humidity.png',
                scaleTitle: '%',
            }
        },
    });
    
    this.addDevice('wind',{
        overlay: {
            metrics: {
                scaleTitle: config.unit_system === "metric" ? 'km/h' : 'mph',
                title: "Wind"
            }
        },
    });

    this.timer = setInterval(function() {
        self.fetchWeather(self);
    }, 3600*1000);
    self.fetchWeather(self);
};

WeatherUnderground.prototype.stop = function () {
    WeatherUnderground.super_.prototype.stop.call(this);
    
    var self = this;
    
    if (this.timer) {
        clearInterval(this.timer);
    }

    if (typeof this.devices !== 'undefined') {
        _.each(this.devices,function(value, key, list) {
            self.controller.devices.remove(value.id);
        });
        this.devices = {};
    }
};

WeatherUnderground.prototype.addDevice = function(prefix,params) {
    var self = this;
    
    var device_params = _.deepExtend(
        params,
        {
            deviceId: "WeatherUnderground_"+prefix+"_" + this.id,
            defaults: {
                deviceType: "sensorMultilevel",
            },
            overlay: {},
            moduleId: prefix+"_"+this.id
        }
    );
    
    this.devices[prefix] = self.controller.devices.create(device_params);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

WeatherUnderground.prototype.fetchWeather = function (instance) {
    var self = instance,
        moduleName = "WeatherUnderground";
    var langFile = self.controller.loadModuleLang(moduleName);
    var url = "http://api.wunderground.com/api/"+self.config.api_key+"/conditions/forecast/astronomy/q/"+self.config.location+".json";
    
    http.request({
        url: url,
        async: true,
        success: function(response) { self.processResponse(instance,response) },
        error: function() {
            self.controller.addNotification("error", langFile.err_fetch, "module", moduleName);
        }
    });
};

WeatherUnderground.prototype.processResponse = function(instance,response) {
    var self        = instance;
    var current     = response.data.current_observation;
    var forecast    = response.data.forecast.simpleforecast;
    var current_date = new Date();
    var sunrise     = response.data.sun_phase.sunrise;
    var sunset      = response.data.sun_phase.sunset;
    sunset.hour     = parseInt(sunset.hour);
    sunset.minute   = parseInt(sunset.minute);
    sunrise.hour    = parseInt(sunrise.hour);
    sunrise.minute  = parseInt(sunrise.minute);
    
    var daynight = (
            current_date.getHours() > sunrise.hour 
            || 
            (
                current_date.getHours() === sunrise.hour 
                && current_date.getMinutes() > sunrise.minute
            )
        ) 
        &&
        (
            current_date.getHours() < sunset.hour 
            || 
            (
                current_date.getHours() === sunset.hour 
                && current_date.getMinutes() < sunset.minute
            )
        ) ? 'day':'night';
    
    
    // Handle current state
    self.devices.current.set("metrics:level", (self.config.unit_temperature === "celsius" ? current.temp_c : current.temp_f));
    self.devices.current.set("metrics:icon", "http://icons.wxug.com/i/c/k/"+(daynight === 'night' ? 'nt_':'')+current.icon+".gif");
    self.devices.current.set("metrics:pressure", (self.config.unit_system === "metric" ? current.pressure_mb : current.pressure_in));
    self.devices.current.set("metrics:feelslike", (self.config.unit_temperature === "celsius" ? current.feelslike_c : current.feelslike_f));
    self.devices.current.set("metrics:uv", current.uv);
    self.devices.current.set("metrics:solarradiation", current.solarradiation);
    //self.devices.current.set("metrics:icon", );
    
    // Handle humidity
    self.devices.humidity.set("metrics:level", parseInt(current.relative_humidity));
    
    // Handle wind
    var wind = (parseInt(current.wind_kph) + parseInt(current.wind_gust_kph)) / 2;
    var wind_level = 0;
    if (wind >= 62) { // Beaufort 8
        wind_level = 3;
    } else if (wind >= 39) { // Beaufort 6
        wind_level = 2;
    } else if (wind >= 12) { // Beaufort 3
        wind_level = 1;
    }
    self.devices.wind.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/WeatherUnderground/wind"+wind_level+".png");
    self.devices.wind.set("metrics:level", (self.config.unit_system === "metric" ? current.wind_kph : current.wind_mph));
    self.devices.wind.set("metrics:windgust", (self.config.unit_system === "metric" ? current.wind_gust_kph : current.wind_gust_mph));
    self.devices.wind.set("metrics:winddregrees", current.wind_degrees);
    self.devices.wind.set("metrics:windlevel",wind_level);
    
/*
    data.temp_f
    data.temp_c
    data.relative_humidity
    data.wind_mph": 22.0,
    data.wind_gust_mph": "28.0",
    data.wind_kph": 35.4,
    data.wind_gust_kph": "45.1",
    
    data.solarradiation
    data.UV
    data.weather
    data.icon
    data.precip_1hr_metric
    data.precip_1hr_in
    
    data.pressure_mb
    data.pressure_in
    
    data.observation_location.city
    
    data.forecast.X.
    
    
    var temp = Math.round((self.config.unit_temperature === "celsius" ? res.data.main.temp - 273.15 : res.data.main.temp * 1.8 - 459.67) * 10) / 10,
        icon = "http://openweathermap.org/img/w/" + res.data.weather[0].icon + ".png";

    self.vDev.set("metrics:level", temp);
    self.vDev.set("metrics:icon", icon);
} catch (e) {
    self.controller.addNotification("error", langFile.err_parse, "module", moduleName);
}
**/
};

 