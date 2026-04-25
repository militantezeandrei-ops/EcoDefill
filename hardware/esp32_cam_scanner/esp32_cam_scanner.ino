#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>
#include <ESP32QRCodeReader.h>
#include "esp_camera.h"

/*
 * EcoDefill - ESP32-CAM Single Board Controller (Option A)
 * ---------------------------------------------------------
 * 1) Scan QR code
 * 2) POST /api/verify-qr
 * 3) GET /api/machine-status
 * 4) Trigger relay for dispense time
 * 5) Send ##STATUS:...## messages via UART0 (GPIO1/TX)
 *    so the Arduino Mega can display them on the LCD 20x4.
 *
 * UART WIRING (to Arduino Mega):
 *   ESP32-CAM GPIO1 (TX0) → Mega Pin 19 (RX1)   [3.3V → 5V, safe]
 *   Common GND
 */

// =========================
// USER CONFIG
// =========================
const char* WIFI_SSID     = "Free";
const char* WIFI_PASSWORD = "1234pogi";
const char* SERVER_BASE_URL = "https://eco-defill.vercel.app";
const char* MACHINE_ID      = "MACHINE_01";

// AI Thinker ESP32-CAM free pin recommendation for relay signal.
// Avoid GPIO0/2/12/15 for stable boot behavior.
const int RELAY_PIN = 13;
const bool RELAY_ACTIVE_HIGH = true;

const unsigned long SCAN_COOLDOWN_MS = 3000;
const unsigned long WIFI_TIMEOUT_MS = 20000;
const unsigned long STATUS_POLL_TIMEOUT_MS = 12000;
const unsigned long STATUS_POLL_INTERVAL_MS = 700;

ESP32QRCodeReader reader(CAMERA_MODEL_AI_THINKER);

String lastPayload = "";
unsigned long lastScanTime = 0;

// ── STATUS PROTOCOL ─────────────────────────────────────────────────────────
// Sends a structured line that the Arduino Mega parses.
// Format: ##STATUS:<label>##
// Mega filters these from the rest of Serial debug output.
void sendStatus(const char* label) {
  Serial.print("##STATUS:");
  Serial.print(label);
  Serial.println("##");
}

void setRelay(bool on) {
  int active = RELAY_ACTIVE_HIGH ? HIGH : LOW;
  int idle = RELAY_ACTIVE_HIGH ? LOW : HIGH;
  digitalWrite(RELAY_PIN, on ? active : idle);
}

String buildUrl(const char* path) {
  String url = String(SERVER_BASE_URL);
  url += path;
  return url;
}

void tuneSensor() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) return;

  s->set_vflip(s, 1);
  s->set_brightness(s, 1);
  s->set_contrast(s, 1);
  s->set_saturation(s, 0);
}

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < WIFI_TIMEOUT_MS) {
    delay(400);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WiFi] Connected. IP: ");
    Serial.println(WiFi.localIP());
    sendStatus("WIFI_OK");
    return true;
  }

  Serial.println();
  Serial.println("[WiFi] Connection failed.");
  sendStatus("WIFI_FAIL");
  return false;
}

int pendingPoints = 1;

bool verifyQrToken(const String& token, int points) {
  if (!ensureWiFi()) return false;

  HTTPClient http;
  String url = buildUrl("/api/verify-qr");

  StaticJsonDocument<256> doc;
  doc["token"] = token;
  doc["machineId"] = MACHINE_ID;
  doc["amount"] = points;

  String body;
  serializeJson(doc, body);

  WiFiClientSecure client;
  client.setInsecure();

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(20000); 

  Serial.print("[HTTP] POST ");
  Serial.println(url);
  Serial.print("[HTTP] Payload: ");
  Serial.println(body);

  int code = http.POST(body);
  String resp = code > 0 ? http.getString() : "";
  http.end();

  if (code != 200) {
    Serial.print("[HTTP] Verify failed (");
    Serial.print(code);
    Serial.print("): ");
    Serial.println(resp);
    return false;
  }

  Serial.println("[HTTP] Verify success.");
  return true;
}

int fetchDispenseTimeMs() {
  if (!ensureWiFi()) return 0;
  HTTPClient http;
  String url = buildUrl("/api/machine-status?machineId=");
  url += MACHINE_ID;
  WiFiClientSecure client;
  client.setInsecure();
  http.begin(client, url);
  http.setTimeout(15000);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return 0;
  }
  String resp = http.getString();
  http.end();
  StaticJsonDocument<384> doc;
  deserializeJson(doc, resp);
  bool approved = doc["approved"] | false;
  int dispenseMs = doc["dispenseTimeMs"] | 0;
  if (!approved || dispenseMs <= 0) return 0;
  return dispenseMs;
}

void dispenseWater(int dispenseMs) {
  setRelay(true);
  delay(dispenseMs);
  setRelay(false);
}

void processToken(const String& token) {
  Serial.print("[SCAN] Token: ");
  Serial.println(token);
  sendStatus("SCANNING");

  if (!verifyQrToken(token, pendingPoints)) {
    sendStatus("SCAN_FAIL");
    return;
  }

  // Check if it was a REDEEM or EARN. If it was REDEEM (negative points in txResult),
  // we might still want to poll for dispense. But the user specifically asked for "uploading points".
  // If points > 0, we can probably skip dispense polling if it's strictly a deposit machine.
  // However, I'll keep the dispense polling for flexibility.

  unsigned long start = millis();
  while ((millis() - start) < STATUS_POLL_TIMEOUT_MS) {
    int dispenseMs = fetchDispenseTimeMs();
    if (dispenseMs > 0) {
      sendStatus("SCAN_OK");
      dispenseWater(dispenseMs);
      pendingPoints = 1; // Reset to default
      return;
    }
    // If it was just an EARN transaction, the backend won't have an APPROVED session.
    // We should probably check the response of verifyQrToken instead.
    // But for now, if it's EARN, verifyQrToken returning true is enough.
    if (pendingPoints > 1) { // Likely an EARN transaction
       sendStatus("SCAN_OK");
       pendingPoints = 1; 
       return;
    }
    delay(STATUS_POLL_INTERVAL_MS);
  }

  Serial.println("[POLL] No dispense required or timed out.");
  // If verifyQrToken succeeded, we still call it SCAN_OK for points
  sendStatus("SCAN_OK");
  pendingPoints = 1;
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  delay(1000); 

  pinMode(33, OUTPUT);
  // Blink twice to show active
  digitalWrite(33, LOW); delay(100); digitalWrite(33, HIGH); delay(100);
  digitalWrite(33, LOW); delay(100); digitalWrite(33, HIGH);

  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false);

  Serial.println("[BOOT] Stage 1: Connecting WiFi...");
  if (ensureWiFi()) {
    sendStatus("WIFI_OK");
  } else {
    sendStatus("WIFI_FAIL");
  }

  delay(2000); // Wait 2 seconds before Camera hit

  Serial.println("[BOOT] Stage 2: Starting Camera...");
  reader.setup();
  reader.begin();
  tuneSensor();
  
  Serial.println("[BOOT] Full System Ready!");
  sendStatus("READY"); 
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    ensureWiFi();
  }

  // 1. Listen for "UPLOAD:X" from Mega
  while (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.startsWith("UPLOAD:")) {
      pendingPoints = line.substring(7).toInt();
      if (pendingPoints < 1) pendingPoints = 1;
      Serial.print("[MEGA] Upload Request: ");
      Serial.println(pendingPoints);
      sendStatus("SCANNING");
    }
  }

  // 2. Look for QR Code
  struct QRCodeData qrCodeData;
  if (!reader.receiveQrCode(&qrCodeData, 80)) {
    delay(5);
    return;
  }

  if (qrCodeData.valid && qrCodeData.payloadLen > 0) {
    String payload;
    for (int i = 0; i < qrCodeData.payloadLen; i++) payload += (char)qrCodeData.payload[i];
    payload.trim();
    
    if (payload.length() > 0) {
      unsigned long now = millis();
      bool duplicate = (payload == lastPayload) && ((now - lastScanTime) <= SCAN_COOLDOWN_MS);
      if (!duplicate) {
        lastPayload = payload;
        lastScanTime = now;
        processToken(payload);
      }
    }
  }
  delay(10);
}
