var Service, Characteristic;
var pjson = require('./package.json');
var config = require('./sample-config.json');
var path = require('path');
var request = require('request');

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory('homebridge-temperature-humidity-async', 'TemperatureHumidityAsyncSensor', TemperatureHumidityAsyncAccessory);
};

function TemperatureHumidityAsyncAccessory(log, config) {
  this.log = log;
  this.name = config.name || "Temperature Humidity Sensor";
  this.manufacturer = config.manufacturer || "N/A";
  this.version = config.version || pjson.version;
  this.offsets = config.offsets || { temperature: 0.0, humidity: 0.0 };
  this.senderId = config.senderId || 1234;
  this.senderId += "";
  
  this.receptionServer = config.receptionServer || { protocol: "http", host: "127.0.0.1", port: 8554 }

  var exec = require('child_process').exec;
  var path = require('path');

  var execPath = path.join(__dirname, "ReceptionServer.js");
  exec(["node", execPath, "port=" + this.receptionServer.port].join(' '), function (error, stdout, stderr) {
    error = error || stderr;
    if(error && (error + "").indexOf("EADDRINUSE") < 0) {
      this.log("Something went wrong: " + error);
    }
  }.bind(this));

  return this;
}

function round(number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
};

TemperatureHumidityAsyncAccessory.prototype.getTemperature = function(callback) {
  this.getTemperatureAndHumidity(function(err, json) {
    if (err) {
      callback(err);
    } else if (!json || !json.temperature) {
      callback("invalid response");
    } else {
      callback(null, round(json.temperature, 1))
    }
  });
};

TemperatureHumidityAsyncAccessory.prototype.getHumidity = function(callback) {
  this.getTemperatureAndHumidity(function(err, json) {
    if (err) {
      callback(err);
    } else if (!json || !json.humidity) {
      callback("invalid response");
    } else {
      callback(null, round(json.humidity, 0))
    }
  });
};

TemperatureHumidityAsyncAccessory.prototype.getTemperatureAndHumidity = function(callback) {
  request({
      url: this.receptionServer.protocol + '://' + this.receptionServer.host + ':' + this.receptionServer.port + '/get/' + this.senderId,
      method: 'GET'
  }, function(err, res, body) {
    if (!err && body) {
      try {
        var json = JSON.parse(body);
        if (json && json.temperature && json.humidity) {
          if (this.offsets) {
            if (this.offsets.temperature && !isNaN(this.offsets.temperature)) {
              json.temperature += this.offsets.temperature;
            }
            if (this.offsets.humidity && !isNaN(this.offsets.humidity)) {
              json.humidity += this.offsets.humidity;
            }
          }
          callback(null, json);
        } else {
          callback("invalid response");
        }
      } catch (e) {
        console.error(e);
        callback(null);
      }
    } else {
      console.log(err);
      callback(null);
    }
  }.bind(this));
};

TemperatureHumidityAsyncAccessory.prototype.getServices = function () {
    var services = [];

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Name, this.name)
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.SoftwareRevision, this.version)
      .setCharacteristic(Characteristic.SerialNumber, this.senderId);
    services.push(this.informationService);

    this.temperatureService = new Service.TemperatureSensor('Temperature');
    this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getTemperature.bind(this));
    services.push(this.temperatureService);

    this.humidityService = new Service.HumiditySensor('Humidity');
    this.humidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', this.getHumidity.bind(this));
    services.push(this.humidityService);

    return services;
};
