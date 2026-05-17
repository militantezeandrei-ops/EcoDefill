/*
 * EcoDefill v3 — ESP32-CAM QR Scanner (WiFi Mode)
 * =================================================
 * POWER  : 5V via programming board USB
 * BOARD  : AI Thinker ESP32-CAM
 * SENSOR : OV2640 (standard AI Thinker)
 *
 * ROLE:
 *   1. Connect to hotspot WiFi.
 *   2. Run HTTP server on port 80.
 *   3. On GET /scan from Dev Kit → start scanning for QR code.
 *   4. On GET /cancel from Dev Kit → stop scanning.
 *   5. When QR detected → POST token to Dev Kit: POST http://<DEVKIT_IP>/qr
 *      Body: { "token": "<qr_payload>" }
 *   6. LCD status is relayed via Dev Kit → Mega (no direct UART to Mega needed).
 *
 * NO UART WIRING TO MEGA NEEDED — fully wireless.
 *
 * STATIC IP CONFIG:
 *   This CAM uses static IP 192.168.100.120 on the WiFi LAN.
 *   (Dev Kit firmware references this IP as QR_CAM_IP)
 *
 * LIBRARIES (install via Library Manager):
 *   ESP32QRCodeReader  by Luiz H. Cassettari (search "ESP32 QR Code Reader")
 *   ArduinoJson        by Benoit Blanchon (v6 or v7)
 *   WebServer          (bundled with ESP32 Arduino core)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32QRCodeReader.h>
#include "esp_camera.h"

// ── USER CONFIG ───────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "Free"; // Same as Dev Kit
const char* WIFI_PASSWORD = "1234pogi";        // Same as Dev Kit
const char* DEVKIT_IP     = "192.168.100.100";  // Dev Kit IP on WiFi LAN

// Static IP for QR CAM
IPAddress local_IP(192, 168, 100, 120);   // Referenced in Dev Kit as QR_CAM_IP
IPAddress gateway(192, 168, 100, 1);      // Real hotspot gateway (confirmed)
IPAddress subnet(255, 255, 255, 0);

// ── CONFIG ────────────────────────────────────────────────────────────────────
const unsigned long WIFI_TIMEOUT_MS    = 20000;
const unsigned long SCAN_COOLDOWN_MS   = 3000;   // FIX: shorter cooldown for smoother repeated scans

// ── STATE ─────────────────────────────────────────────────────────────────────
WebServer            server(80);
ESP32QRCodeReader    reader(CAMERA_MODEL_AI_THINKER);
bool                 scanActive    = false;   // True when Dev Kit has requested a scan
String               lastPayload   = "";
unsigned long        lastScanTime  = 0;

// ── SENSOR TUNING ─────────────────────────────────────────────────────────────
void tuneSensor() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) return;
  s->set_vflip(s, 1);
  s->set_brightness(s, 1);
  s->set_contrast(s, 1);
  s->set_saturation(s, 0);
}

// ── POST QR TOKEN TO DEV KIT ──────────────────────────────────────────────────
void postQRToken(const String& token) {
  HTTPClient http;
  String url = "http://" + String(DEVKIT_IP) + "/qr";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  StaticJsonDocument<512> doc;
  doc["token"] = token;
  String body; serializeJson(doc, body);

  int code = http.POST(body);
  http.end();
  Serial.printf("[QR] POST /qr → %d\n", code);
}

// ── HTTP SERVER HANDLERS ──────────────────────────────────────────────────────

// GET /scan — Dev Kit calls this to activate QR scanning
void handleScan() {
  scanActive = true;
  Serial.println("[QR] Scan activated by Dev Kit");
  server.send(200, "text/plain", "SCAN_STARTED");
}

// GET /cancel — Dev Kit calls this to stop QR scanning
void handleCancel() {
  scanActive = false;
  Serial.println("[QR] Scan cancelled by Dev Kit");
  server.send(200, "text/plain", "CANCELLED");
}

// GET /ping — connectivity check
void handlePing() {
  server.send(200, "text/plain", "QR_CAM_OK");
}

// ── WIFI CONNECT ─────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("[WiFi] Connecting to "); Serial.println(WIFI_SSID);

  if (!WiFi.config(local_IP, gateway, subnet)) {
    Serial.println("[WiFi] Static IP config failed");
  }
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(400); Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Connected. IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] FAILED — will retry in loop");
  }
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);
  delay(1000);

  // Flash LED 4 times to distinguish (Bottle=2, Cup=3, QR=4)
  pinMode(33, OUTPUT);
  for (int i = 0; i < 8; i++) {
    digitalWrite(33, i % 2 == 0 ? LOW : HIGH); delay(150);
  }

  Serial.println("[QR] Connecting WiFi...");
  connectWiFi();

  delay(2000);  // Wait before camera init (WiFi stack settling)

  Serial.println("[QR] Starting QR reader (camera)...");
  reader.setup();
  reader.begin();
  tuneSensor();

  server.on("/scan",   handleScan);
  server.on("/cancel", handleCancel);
  server.on("/ping",   handlePing);
  server.begin();

  Serial.println("[QR] HTTP server started on port 80");
  Serial.println("[QR] Ready — idle. Waiting for /scan from Dev Kit");
}

// ── LOOP ──────────────────────────────────────────────────────────────────────
void loop() {
  // Always serve HTTP requests
  server.handleClient();

  // WiFi watchdog
  if (WiFi.status() != WL_CONNECTED) {
    scanActive = false;
    connectWiFi();
  }

  // Only attempt QR scan when activated
  if (!scanActive) {
    delay(10);
    return;
  }

  struct QRCodeData qrCodeData;
  if (!reader.receiveQrCode(&qrCodeData, 80)) {
    delay(5);
    return;
  }

  if (qrCodeData.valid && qrCodeData.payloadLen > 0) {
    String payload;
    for (int i = 0; i < qrCodeData.payloadLen; i++) {
      payload += (char)qrCodeData.payload[i];
    }
    payload.trim();

    if (payload.length() > 0) {
      unsigned long now = millis();
      bool isDuplicate = (payload == lastPayload) &&
                         ((now - lastScanTime) <= SCAN_COOLDOWN_MS);

      if (!isDuplicate) {
        lastPayload  = payload;
        lastScanTime = now;
        scanActive   = false;  // Auto-stop after one successful scan

        Serial.print("[QR] Detected: ");
        Serial.println(payload.substring(0, 20));

        postQRToken(payload);
      } else {
        Serial.println("[QR] Duplicate token ignored");
      }
    }
  }

  delay(10);
}
