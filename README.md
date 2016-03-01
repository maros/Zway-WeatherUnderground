# Zway-WeatherUnderground

Zway Automation module for fetching current condition and forecasts from the
WeatherUnderground API. Creates virtual devices for humidity, wind, current 
conditions, UV index, barometric pressure and forecasts.

See http://www.wunderground.com/weather/api/d/docs for details.

# Configuration

## location

Accepts any format that constitutes a valid API query. 

*   AIRPORTCODE
*   COUNTRY/CITY
*   pws:PWSID (personal weather station ID)
*   autoip (based on geo ip)
*   LAT,LNG

## unitTemperature

Display temperatures in Celsius or Fahrenheit

## unitSystem

Display metric or imperial units for air pressure and wind speed

## apiKey

Required API key for accessing the service. See 
http://www.wunderground.com/weather/api/ for obtaining an API key.

## uvDevice, windDevice, humidityDevice, barometerDevice

Flag that sets if devices should be created

# Virtual Devices

This module creates up to six virtual devices

## Current conditions

Displays the current condition as an icon and the current temperature. 
Additionally the following metrics are set

*    metrics:level Current temperature
*    metrics:temperature
*    metrics:condition: Current condition
*    metrics:conditiongroup: fair,neutral,poor or snow
*    metrics:feelslike
*    metrics:weather: Current weather summary
*    metrics:pop: probability of precipitation
*    metrics:high: expected high temperature today
*    metrics:low: expected low temperature today
*    metrics:percipintensity: Rain intensity in mm or inches / 1h
*    metrics:raw: raw current conditions data returned by the API

## Forecast

Displays the forecasted condition as an icon, and the expected temperature 
range.

*    metrics:level Forecast temperature range
*    metrics:condition: Current condition
*    metrics:conditiongroup: fair,neutral,poor or snow
*    metrics:weather: Current weather summary
*    metrics:pop: probability of precipitation
*    metrics:high: expected high temperature today
*    metrics:low: expected low temperature today
*    metrics:raw: raw forecast data returned by the API

## Wind

Displays the current wind speed. Wind strength is indicated by the icon.

*    metrics:level: Wind speed (wind / 2 + windgust / 2)
*    metrics:dir: Wind direction
*    metrics:wind: Base wind speed
*    metrics:wind_avg: Wind average of last three updates
*    metrics:windgust: Wind gust speeds
*    metrics:winddregrees: Wind degrees
*    metrics:beaufort: Wind strength in beaufort [0-12]

## Humidity

Displays the current humidity.

## UV

Displays the current UV index [0-11+]

*    metrics:uv_avg: UV index average of last three updates
*    metrics:solarradiation: in watts/m2
*    metrics:solarradiation_avg: Radiation average of last three updates

## Barometer

Displays the current air pressure. Rising and falling pressure is also 
indicated by the icon.

*    metrics:trend: Pressure trend

# Events

No events are emitted

# Installation

The prefered way of installing this module is via the "Zwave.me App Store"
available in 2.2.0 and higher. For stable module releases no access token is 
required. If you want to test the latest pre-releases use 'k1_beta' as 
app store access token.

For developers and users of older Zway versions installation via git is 
recommended.

```shell
cd /opt/z-way-server/automation/modules
git clone https://github.com/maros/Zway-WeatherUnderground.git WeatherUnderground --branch latest
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/userModules/WeatherUnderground
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

Parts of the barometer icon are from (http://www.flaticon.com/authors/yannick) 
, licensed under the Creative Commons 3.0 license.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
