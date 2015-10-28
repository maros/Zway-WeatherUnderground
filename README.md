# Zway-WeatherUnderground

Zway Automation module for fetching current condition and forecasts from the
WeatherUnderground API. Creates virtual devices for humidity, wind, current 
conditions and forecasts.

See http://www.wunderground.com/weather/api/d/docs for details.

# Configuration

## location: 

Accepts any format that constitutes a valid API query. 

*   AIRPORTCODE
*   COUNTRY/CITY
*   pws:PWSID (personal weather station ID)
*   autoip (based on geo ip)
*   LAT,LNG

## unit_temperature

Display temperatures in Celsius or Fahrenheit

## unit_system

Display metric or imperial units for air pressure and wind speed

## api_key

Required API key for accessing the service. See 
http://www.wunderground.com/weather/api/ for obtaining an API key.

# Virtual Devices

This module creates four virtual devices

## Current conditions

Displays the current condition as an icon and the current temperature. 
Additionally the following metrics are set

*    metrics:level Current temperature
*    metrics:temperature
*    metrics:condition
*    metrics:conditiongroup: fair,neutral,rain or snow
*    metrics:feelslike
*    metrics:pressure
*    metrics:uv: [0-11]
*    metrics:solarradiation: in watts/m2
*    metrics:weather: Current weather
*    metrics:pop: probability of precipitation
*    metrics:high: expected high temperature today
*    metrics:low: expected low temperature today
*    metrics:raw: raw current conditions data returned by the API

## Forecast

Displays the forecasted condition as an icon, and the expected temperature 
range.

*    metrics:level Forecast temperature range
*    metrics:condition
*    metrics:conditiongroup: fair,neutral,rain or snow
*    metrics:weather: Current weather
*    metrics:pop: probability of precipitation
*    metrics:high: expected high temperature today
*    metrics:low: expected low temperature today
*    metrics:raw: raw forecast data returned by the API

## Wind

Displays the current wind speed. Wind level is indicated by the icon.

*    metrics:level: Wind speed
*    metrics:dir: Wind direction
*    metrics:windgust: Wind gust speeds
*    metrics:winddregrees: Wind degrees
*    metrics:windlevel: Wind strength [0-3]

## Humidity

Displays the current humidity.

# Events

No events are emitted

# Installation

```shell
cd /opt/z-way-server/automation/modules
git clone https://github.com/maros/Zway-WeatherUnderground.git WeatherUnderground --branch latest
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/modules/WeatherUnderground
git fetch --tags
# For latest released version
git checkout tags/latest
# For a specific version
git checkout tags/1.02
# For development version
git checkout -b master --track origin/master
```

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
