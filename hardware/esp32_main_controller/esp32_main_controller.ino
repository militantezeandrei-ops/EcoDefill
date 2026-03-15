#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---------------- WIFI ----------------
const char* ssid = "ZTE_2.4G_iWhgQR";
const char* password = "v3WSQWKw";

// ---------------- API ----------------
const char* verifyApiUrl = "http://192.168.1.10:3000/api/verify-qr";
const char* statusApiUrl = "http://192.168.1.10:3000/api/machine-status?machineId=MACHINE_01";

const char* machineId = "MACHINE_01";

// ---------------- PINS ----------------
const int RELAY_PIN = 23;         // Water pump relay
const int LED_INDICATOR_PIN = 2;  // Built-in LED

// ---------------- STATE ----------------
unsigned long lastStatusPoll = 0;
const int POLL_INTERVAL_MS = 3000;

// ========================================================
// SETUP
// ========================================================
void setup() {

  Serial.begin(115200);

  // Serial2 for ESP32-CAM communication
  Serial2.begin(115200, SERIAL_8N1, 16, 17);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  pinMode(LED_INDICATOR_PIN, OUTPUT);
  digitalWrite(LED_INDICATOR_PIN, LOW);

  // WiFi connect
  Serial.print("Connecting to WiFi");

  WiFi.begin(ssid, password);
  WiFi.setAutoReconnect(true);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  digitalWrite(LED_INDICATOR_PIN, HIGH);
}

// ========================================================
// SEND TOKEN TO SERVER
// ========================================================
void sendTokenToServer(String token) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;

  http.begin(verifyApiUrl);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["token"] = token;
  doc["machineId"] = machineId;

  String payload;
  serializeJson(doc, payload);

  Serial.println("Sending Token:");
  Serial.println(payload);

  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {

    Serial.print("Server Response Code: ");
    Serial.println(httpResponseCode);

    String response = http.getString();
    Serial.println(response);

  } else {

    Serial.print("HTTP Error: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

// ========================================================
// POLL SERVER FOR DISPENSE COMMAND
// ========================================================
void pollMachineStatus() {

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;

  http.begin(statusApiUrl);

  int httpResponseCode = http.GET();

  if (httpResponseCode > 0) {

    String response = http.getString();
    Serial.println("Machine Status Response:");
    Serial.println(response);

    StaticJsonDocument<512> doc;

    DeserializationError error = deserializeJson(doc, response);

    if (!error) {

      bool approved = doc["approved"];

      if (approved) {

        int dispenseTimeMs = doc["dispenseTimeMs"];

        Serial.print("Dispensing water for ");
        Serial.print(dispenseTimeMs);
        Serial.println(" ms");

        digitalWrite(RELAY_PIN, HIGH);
        digitalWrite(LED_INDICATOR_PIN, HIGH);

        delay(dispenseTimeMs);

        digitalWrite(RELAY_PIN, LOW);
        digitalWrite(LED_INDICATOR_PIN, LOW);

        Serial.println("Dispense Complete");
      }
    }

  } else {

    Serial.print("Status Request Failed: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

// ========================================================
// MAIN LOOP
// ========================================================
void loop() {

  // 1️⃣ Receive QR token from ESP32-CAM
  if (Serial2.available()) {

    String scannedToken = Serial2.readStringUntil('\n');
    scannedToken.trim();

    if (scannedToken.length() > 0) {

      Serial.print("Token Received: ");
      Serial.println(scannedToken);

      // Blink LED
      digitalWrite(LED_INDICATOR_PIN, LOW);
      delay(50);
      digitalWrite(LED_INDICATOR_PIN, HIGH);

      sendTokenToServer(scannedToken);
    }
  }

  // 2️⃣ Poll server every few seconds
  if (millis() - lastStatusPoll > POLL_INTERVAL_MS) {

    pollMachineStatus();
    lastStatusPoll = millis();
  }
}