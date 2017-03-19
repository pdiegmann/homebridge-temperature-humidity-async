# homebridge-temperature-humidity-async
Async handling of temperature and humidity sensors for HomeBridge.

# Installation

1. Install homebridge: `npm install -g homebridge`
1. Install homebridge-temperature-humidity-async: `npm install --global
   homebridge-temperature-humidity-async`
1. Update your configuration file.

# Configuration

See `sample-config.json`:
```json
{
  "accessory": "TemperatureHumidityAsyncSensor",
  "name": "Office",
  "port": 8554,
  "senderId": 1424479,
  "offsets": {
    "temperature": 2.5,
    "humidity": 0.0
  }
}
```
