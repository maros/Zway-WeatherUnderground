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

    var self = this;
    
    this.location = config.location.toString();
    this.api_key = config.api_key.toString();
    this.location = config.location.toString();
    this.unit_temperature = config.unit_temperature.toString();
    this.unit_system = config.unit_system.toString();
    this.device = {};
    
    this.device.current = self.controller.devices.create({
        deviceId: "WeatherUnderground_Current_" + this.id,
        defaults: {
            deviceType: "sensorMultilevel",
            metrics: {
                probeTitle: 'Temperature'
            }
        },
        overlay: {
            metrics: {
                scaleTitle: this.unit_temperature === "celsius" ? '°C' : '°F',
                title: "Current Condition"
            }
        },
        moduleId: "Current_"+this.id
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

    if (typeof this.device !== 'undefined') {
        _.each(this.devices,function(value, key, list) {
            
            self.controller.devices.remove(value.id);
        });
        this.vDev = null;
    }
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

WeatherUnderground.prototype.fetchWeather = function () {
    var self = instance,
        moduleName = "WeatherUnderground",
        langFile = self.controller.loadModuleLang(moduleName);
    
    var url = "http://api.wunderground.com/api/"+self.config.api_key+"/conditions/forecast/q/"+self.config.location+".json";
    
    http.request({
        url: url,
        async: true,
        success: function(res) {
            try {
                var temp = Math.round((self.config.units === "celsius" ? res.data.main.temp - 273.15 : res.data.main.temp * 1.8 - 459.67) * 10) / 10,
                    icon = "http://openweathermap.org/img/w/" + res.data.weather[0].icon + ".png";
    
                self.vDev.set("metrics:level", temp);
                self.vDev.set("metrics:icon", icon);
            } catch (e) {
                self.controller.addNotification("error", langFile.err_parse, "module", moduleName);
            }
        },
        error: function() {
            self.controller.addNotification("error", langFile.err_fetch, "module", moduleName);
        }
    });
}

 