#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>
#include <ESP32QRCodeReader.h>
#include "esp_camera.h"

/*
 * EcoDefill - ESP32-CAM Single Board Controller
 * ----------------------------------------------
 * 1) Scan QR code
 * 2) POST /api/verify-qr
 * 3) GET /api/machine-status
 * 4) Trigger relay for dispense time
 */

// =========================
// USER CONFIG
// =========================
const char* WIFI_SSID     = "militante";
const char* WIFI_PASSWORD = "militante22";
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
    return true;
  }

  Serial.println();
  Serial.println("[WiFi] Connection failed.");
  return false;
}

bool verifyQrToken(const String& token) {
  if (!ensureWiFi()) return false;

  HTTPClient http;
  String url = buildUrl("/api/verify-qr");

  StaticJsonDocument<256> doc;
  doc["token"] = token;
  doc["machineId"] = MACHINE_ID;

  String body;
  serializeJson(doc, body);

  WiFiClientSecure client;
  client.setInsecure();

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(20000); // Increased timeout for slower Vercel responses

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
  http.setTimeout(15000); // 15 seconds for polling

  int code = http.GET();
  if (code != 200) {
    String resp = code > 0 ? http.getString() : "";
    Serial.print("[POLL] Status failed (");
    Serial.print(code);
    Serial.print("): ");
    Serial.println(resp);
    http.end();
    return 0;
  }

  String resp = http.getString();
  http.end();

  StaticJsonDocument<384> doc;
  DeserializationError err = deserializeJson(doc, resp);
  if (err) {
    Serial.print("[POLL] JSON parse error: ");
    Serial.println(err.c_str());
    return 0;
  }

  bool approved = doc["approved"] | false;
  int dispenseMs = doc["dispenseTimeMs"] | 0;
  Serial.print("[POLL] approved=");
  Serial.print(approved ? "true" : "false");
  Serial.print(" dispenseTimeMs=");
  Serial.println(dispenseMs);
  if (!approved || dispenseMs <= 0) return 0;

  return dispenseMs;
}

void dispenseWater(int dispenseMs) {
  Serial.print("[PUMP] Dispensing for ");
  Serial.print(dispenseMs);
  Serial.println(" ms");

  setRelay(true);
  delay(dispenseMs);
  setRelay(false);

  Serial.println("[PUMP] Dispense complete.");
}

void processToken(const String& token) {
  Serial.print("[SCAN] Token: ");
  Serial.println(token);

  if (!verifyQrToken(token)) {
    return;
  }

  unsigned long start = millis();
  while ((millis() - start) < STATUS_POLL_TIMEOUT_MS) {
    int dispenseMs = fetchDispenseTimeMs();
    if (dispenseMs > 0) {
      dispenseWater(dispenseMs);
      return;
    }
    delay(STATUS_POLL_INTERVAL_MS);
  }

  Serial.println("[POLL] Timed out waiting for approved status.");
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false);

  Serial.println("[BOOT] ESP32-CAM single-board mode");
  Serial.print("[BOOT] Machine ID: ");
  Serial.println(MACHINE_ID);
  Serial.print("[BOOT] Server: ");
  Serial.println(SERVER_BASE_URL);

  reader.setup();
  reader.begin();
  tuneSensor();

  ensureWiFi();
  Serial.println("[CAM] Ready. Show QR code.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    ensureWiFi();
  }

  struct QRCodeData qrCodeData;
  if (!reader.receiveQrCode(&qrCodeData, 80)) {
    delay(5);
    return;
  }

  if (!qrCodeData.valid || qrCodeData.payloadLen <= 0) {
    return;
  }

  String payload;
  payload.reserve(qrCodeData.payloadLen);
  for (int i = 0; i < qrCodeData.payloadLen; i++) {
    payload += (char)qrCodeData.payload[i];
  }
  payload.trim();
  if (payload.length() == 0) return;

  unsigned long now = millis();
  bool duplicate = (payload == lastPayload) && ((now - lastScanTime) <= SCAN_COOLDOWN_MS);
  if (duplicate) {
    return;
  }

  lastPayload = payload;
  lastScanTime = now;
  processToken(payload);
  delay(10);
}
