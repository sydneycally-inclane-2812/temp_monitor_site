/*
  ========================================================
  Pin   Number	  Label	Description
  D0	  GPIO16  	Wake up from deep sleep
  D1	  GPIO5	    I2C SDA (default) Trig
  D2	  GPIO4	    I2C SCL (default) Echo
  D3	  GPIO0	    Flash button, can be used as GPIO
  D4	  GPIO2	    Built-in LED, can be used as GPIO
  D5  	GPIO14	  SPI SCK
  D6  	GPIO12	  SPI MISO
  D7	  GPIO13	  SPI MOSI DHT
  D8  	GPIO15	  Flash pin, can be used as GPIO
  G	   GND	  Ground
  3V3	 3.3V	  3.3V power supply
  RST  RST	  Reset pin
  A0	 ADC0	  Analog input (0-1V)
  ========================================================

*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include "DHT.h"
#include <time.h>

#define MOTION 14
#define DHT_PIN 13
#define DHT_TYPE DHT11
#define PC_STATUS 5
#define RELAY_PIN 4

#define COOLDOWN 15

#define PASSKEY 
#ifndef STASSID
#define STASSID "Toan_Nhung_2024"
#define STAPSK "01012017"
#endif

unsigned long current_time = 0;
unsigned long last_ping = 0;
unsigned long last_pwr_trigger = 0;
unsigned long last_motion_recorded = 0;
unsigned long last_pwr = 0;

const char* ssid = STASSID;
const char* password = STAPSK;
const char* serverUrl = "https://instance-20250706-2221-main.tailfca295.ts.net/api/update_status";
const char* credentials = "damnimgoingtovietnam";

DHT dht(DHT_PIN, DHT_TYPE);

void send_to_server() {
  if (WiFi.status() == WL_CONNECTED) {
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    bool pc_status = digitalRead(PC_STATUS);

    if (!isnan(h) && !isnan(t)) {
      WiFiClientSecure client;
      client.setInsecure(); // For testing only, disables SSL cert check

      HTTPClient http;
      http.begin(client, serverUrl);
      http.addHeader("Content-Type", "application/json");

      // Builds the payload
      String payload = "{\"temperature\":";
      payload += String(t, 1);
      payload += ",\"humidity\":";
      payload += String(h, 1);
      payload += ",\"pc_status\":";
      payload += String(pc_status ? "ON" : "OFF");
      payload += ",\"last_motion_detected\":";
      payload += String(last_motion_recorded == 0 ? "Never" : String(last_motion_recorded));
      payload += ",\"credentials\":";
      payload += String(credentials);
      payload += "}";

      // Send payload, get response
      int httpCode = http.POST(payload);
      String response = http.getString();

      Serial.print("POST code: ");
      Serial.println(httpCode);
      Serial.print("Response: ");
      Serial.println(response);

      // Extracts the "last_pwr_trigger" field
      int triggerIndex = response.indexOf("\"last_pwr_trigger\":");
      if (triggerIndex != -1) {
        int startNumber = response.indexOf(":", triggerIndex);
        int endNumber = response.indexOf(",", startNumber);
        if (endNumber == -1) endNumber = response.indexOf("}", startNumber);
        
        String epochString = response.substring(startNumber + 1, endNumber);
        last_pwr_trigger = epochString.toInt();
      }

      // Check if last pwr trigger was newer than the one in memory, 
      if (last_pwr_trigger > last_pwr) {
        // Trigger the relay pin
        digitalWrite(RELAY_PIN, LOW);
        delay(300);
        digitalWrite(RELAY_PIN, HIGH);
        last_pwr = last_pwr_trigger;
      }

      http.end();
    } else {
      Serial.println("Failed to read from DHT sensor!");
    }
  } else {
    Serial.println("WiFi not connected!");
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  dht.begin();
  configTime(0,0,"pool.ntp.org");
  digitalWrite(RELAY_PIN, HIGH);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
}

void loop() {
  current_time = (unsigned long)time(nullptr);
  if (last_ping == 0 || current_time - last_ping >= COOLDOWN) {
    send_to_server();
  }
  // Checks the status of the motion sensor
  bool motion = digitalRead(MOTION);
  if (motion) {
    last_motion_recorded = current_time;
  }
  delay(100);
}

