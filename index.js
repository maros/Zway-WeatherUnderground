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
    
    this.addDevice('wind',{
        defaults: {
            metrics: {
                probeTitle: 'Wind'
            }
        },
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
    var self = instance;
    var current = response.data.current_observation;
    var astronomy = response.data.astronomy;
    var currentdate = new Date();
    var daynight = (
            astronomy.current_time.hour > astronomy.sunrise.hour 
            || 
            (
                astronomy.current_time.hour === astronomy.sunrise.hour 
                && astronomy.current_time.minute > austronomy.sunrise.minute
            )
        ) 
        &&
        (
            astronomy.current_time.hour < astronomy.sunset.hour 
            || 
            (
                astronomy.current_time.hour === astronomy.sunset.hour 
                && astronomy.current_time.minute < austronomy.sunset.minute
            )
        ) ? 'day':'night';
    
    console.logJS(response);
    self.devices.current.set("metrics:level", (self.config.unit_temperature === "celsius" ? current.temp_c : current.temp_f));
    self.devices.current.set("metrics:icon", "http://icons.wxug.com/i/c/k/"+(daynight == 'night' ? 'ng_':'')+current.icon+".gif");
    
    self.devices.wind.set("metrics:icon", "");
    self.devices.wind.set("metrics:level", (self.config.unit_system === "metric" ? current.wind_kph : current.wind_mph));
    self.devices.wind.set("metrics:windgust", (self.config.unit_system === "metric" ? current.wind_gust_kph : current.wind_gust_mph));
    self.devices.wind.set("metrics:winddregrees", current.wind_degrees);

    //self.devices.wind.set("metrics:icon", (self.config.unit_system === "metric" ? current.wind_gust_kph : current.wind_gust_mph));


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

 