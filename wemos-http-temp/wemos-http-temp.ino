#include <FS.h> 
#include <ArduinoJson.h>
#include <ESP8266WiFi.h>          //ESP8266 Core WiFi Library (you most likely already have this in your sketch)
#include <WEMOS_SHT3X.h>
#include <DNSServer.h>            //Local DNS Server used for redirecting all requests to the configuration portal
#include <ESP8266WebServer.h>     //Local WebServer used to serve the configuration portal
#include <WiFiManager.h>          //https://github.com/tzapu/WiFiManager WiFi Configuration Magic
#include <ESP8266HTTPClient.h>

bool shouldSaveConfig = false;
SHT3X sht30(0x45);
char dataReceiverHost[40];
char senderId[40];

void configModeCallback (WiFiManager *myWiFiManager) {
  Serial.println("Entered config mode");
  Serial.println(WiFi.softAPIP());
  // print the ssid that we should connect to to configure the ESP8266
  Serial.print("Created config portal AP ");
  Serial.println(myWiFiManager->getConfigPortalSSID());
}

void saveConfigCallback () {
  shouldSaveConfig = true;
}

void setup() {
  Serial.begin(115200);
  
  String strChipId = String(ESP.getChipId());
  strChipId.toCharArray(senderId, strChipId.length());

  Serial.println("mounting FS...");

  if (SPIFFS.begin()) {
    Serial.println("mounted file system");
    if (SPIFFS.exists("/config.json")) {
      Serial.println("reading config file");
      File configFile = SPIFFS.open("/config.json", "r");
      if (configFile) {
        Serial.println("opened config file");
        size_t size = configFile.size();
        // Allocate a buffer to store contents of the file.
        std::unique_ptr<char[]> buf(new char[size]);

        configFile.readBytes(buf.get(), size);
        DynamicJsonBuffer jsonBuffer;
        JsonObject& json = jsonBuffer.parseObject(buf.get());
        json.printTo(Serial);
        if (json.success()) {
          Serial.println();
          Serial.println("parsed json");

          strcpy(senderId, json["senderId"]);
          strcpy(dataReceiverHost, json["dataReceiverHost"]);

        } else {
          Serial.println("failed to load json config");
        }
      }
    }
  } else {
    Serial.println("failed to mount FS");
  }

  WiFiManager wifiManager;
  wifiManager.setDebugOutput(false);
  //wifiManager.resetSettings();
  wifiManager.setAPCallback(configModeCallback);
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  
  WiFiManagerParameter dataReceiverHostParameter("DataReceiverHost", "Data Receiver URL", dataReceiverHost, 40);
  wifiManager.addParameter(&dataReceiverHostParameter);
  WiFiManagerParameter senderIdParameter("SenderId", "Sender ID", senderId, 40);
  wifiManager.addParameter(&senderIdParameter);
  
  // first parameter is name of access point, second is the password
  //wifiManager.setDebugOutput(false);
  if(!wifiManager.autoConnect()) {
    Serial.println("failed to connect and hit timeout");
    //reset and try again, or maybe put it to deep sleep
    delay(1000);
    ESP.reset();
    delay(1000);
  }

  strcpy(senderId, senderIdParameter.getValue());
  strcpy(dataReceiverHost, dataReceiverHostParameter.getValue());

  if (shouldSaveConfig) {
    Serial.println("saving config");
    DynamicJsonBuffer jsonBuffer;
    JsonObject& json = jsonBuffer.createObject();
    json["senderId"] = senderId;
    json["dataReceiverHost"] = dataReceiverHost;

    File configFile = SPIFFS.open("/config.json", "w");
    if (!configFile) {
      Serial.println("failed to open config file for writing");
    }

    json.printTo(Serial);
    json.printTo(configFile);
    configFile.close();
  }


  //if you get here you have connected to the WiFi
  Serial.println("");
  Serial.println("WiFi connected");

  Serial.println(WiFi.localIP());
}

void loop() {
  sht30.get();
  Serial.print("Temperature in Celsius : ");
  Serial.println(sht30.cTemp);
  Serial.print("Temperature in Fahrenheit : ");
  Serial.println(sht30.fTemp);
  Serial.print("Relative Humidity : ");
  Serial.println(sht30.humidity);
  Serial.println();
  
  StaticJsonBuffer<500> jsonBuffer;
  JsonObject& json = jsonBuffer.createObject();
  json["temperature"] = sht30.cTemp;
  json["humidity"] = sht30.humidity;
  json["sender"] = senderId;
  writeJSON(json);
        
  Serial.println("Sleeping now");
  ESP.deepSleep(60 * 1000000);
  delay(100);
}

void writeJSON(JsonObject& json) {
  HTTPClient http;
  http.begin(dataReceiverHost);
  http.addHeader("Content-Type", "application/json");
  
  String out;
  json.printTo(out);
  int httpCode = http.POST(out);
  String payload = http.getString();
  http.end();

  Serial.print("Response Code: ");
  Serial.println(httpCode);
  Serial.println(payload);
  
  Serial.println();
  Serial.println("closing connection");
}

