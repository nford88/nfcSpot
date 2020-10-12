/*
  Rui Santos
  Complete project details at https://RandomNerdTutorials.com
  
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files.
  
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
*/

// Import required libraries
#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>

// Replace with your network credentials
const char *ssid = "";
const char *password = "";

// Set LED GPIO
const int ledPin = 2;
// Stores LED state
String ledState;

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);

// Replaces placeholder with LED state value
String processor(const String &var)
{
  Serial.println(var);
  if (var == "STATE")
  {
    if (digitalRead(ledPin))
    {
      ledState = "ON";
    }
    else
    {
      ledState = "OFF";
    }
    Serial.print(ledState);
    return ledState;
  }
  else if (var == "TEMPERATURE")
  {
    return "";
  }
  else if (var == "HUMIDITY")
  {
    return "";
  }
  else if (var == "PRESSURE")
  {
    return "";
  }
}

void setup()
{
  // Serial port for debugging purposes
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);

  // Initialize SPIFFS
  if (!SPIFFS.begin())
  {
    Serial.println("An Error has occurred while mounting SPIFFS");
    return;
  }

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    digitalWrite(ledPin, LOW);
    delay(1000);
    Serial.println("Connecting to WiFi..");
    digitalWrite(ledPin, HIGH);
    delay(1000);
  }

  // Print ESP32 Local IP Address
  Serial.println(WiFi.localIP());

  server.on("/hello", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "Hello from ESP32 server route");
  });

  // Route for root / web page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/index.html", String(), false, processor);
  });

  // Route for root / web page
  server.on("/test", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/test.html", String(), false, processor);
  });

  // Route to load style.css file
  server.on("/app.js", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(SPIFFS, "/app.js", "text/javascript");
  });

  server.on("/spot", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->redirect("https://ie.spotify.com");
  });

  server.on("/readme", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/plain", "hello");
  });

  // Route to set GPIO to HIGH
  server.on("/on", HTTP_GET, [](AsyncWebServerRequest *request) {
    digitalWrite(ledPin, HIGH);
    request->send(SPIFFS, "/index.html", String(), false, processor);
  });

  // Route to set GPIO to LOW
  server.on("/off", HTTP_GET, [](AsyncWebServerRequest *request) {
    digitalWrite(ledPin, LOW);
    request->send(SPIFFS, "/index.html", String(), false, processor);
  });

  // Start server
  server.begin();
}

void loop()
{
}