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
        defaults: {
            metrics: {
                probeTitle: 'Temperature'
            }
        },
        overlay: {
            metrics: {
                scaleTitle: config.unit_temperature === "celsius" ? '°C' : '°F',
                title: "Current Condition"
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
    var url = "http://api.wunderground.com/api/"+self.config.api_key+"/conditions/forecast/q/"+self.config.location+".json";
    
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
    var self = instance;
    var current = response.data.current_observation;
    
    self.devices.current.set("metrics:level", (self.config.units === "celsius" ? current.temp_c : current.temp_f));
    self.devices.current.set("metrics:icon", "http://icons.wxug.com/i/c/k/"+current.icon+".gif");
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
    
    
    var temp = Math.round((self.config.units === "celsius" ? res.data.main.temp - 273.15 : res.data.main.temp * 1.8 - 459.67) * 10) / 10,
        icon = "http://openweathermap.org/img/w/" + res.data.weather[0].icon + ".png";

    self.vDev.set("metrics:level", temp);
    self.vDev.set("metrics:icon", icon);
} catch (e) {
    self.controller.addNotification("error", langFile.err_parse, "module", moduleName);
}
**/
};

 