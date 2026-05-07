/*
 * EcoDefill v3 — ESP32-CAM Cup Detector (WiFi Mode)
 * ===================================================
 * POWER  : 5V via programming board USB
 * BOARD  : AI Thinker ESP32-CAM
 * SENSOR : OV3660 (3MP)
 *
 * ROLE:
 *   1. Connect to hotspot WiFi.
 *   2. Listen for trigger from ESP32 Dev Kit via HTTP GET /identify.
 *   3. Capture frame and run cup heuristic detection.
 *   4. POST result JSON to Dev Kit: POST http://<DEVKIT_IP>/detect
 *      Body: { "cam": "CUP", "result": "CUP" }  or  { "cam": "CUP", "result": "NONE" }
 *
 * NO UART WIRING TO MEGA NEEDED — fully wireless.
 *
 * STATIC IP CONFIG:
 *   This CAM uses static IP 192.168.1.111 on the hotspot network.
 *   Change DEVKIT_IP to match your Dev Kit's actual IP on the hotspot.
 *
 * LIBRARIES:
 *   esp_camera  (bundled with ESP32 Arduino core)
 *   ArduinoJson by Benoit Blanchon (v6 or v7)
 *   WebServer   (bundled with ESP32 Arduino core)
 */

#include "esp_camera.h"
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ── USER CONFIG ───────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "ZTE_2.4G_iWhgQR"; // ← Same as Dev Kit
const char* WIFI_PASSWORD = "v3WSQWKw";        // ← Same as Dev Kit
const char* DEVKIT_IP     = "192.168.1.100";         // ← Dev Kit IP on hotspot

// Static IP for this CAM on the hotspot
IPAddress local_IP(192, 168, 1, 111);   // Different from Bottle CAM (.110)
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);

// ── CAMERA PIN MAP  (AI Thinker) ─────────────────────────────────────────────
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ── DETECTION CONFIG ─────────────────────────────────────────────────────────
#define BRIGHTNESS_THRESH      40
#define CUP_ASPECT_MAX         0.85f   // Height/Width < this → short/wide (cup)
#define CUP_ASPECT_MIN         0.30f   // Guard against noise
#define CUP_EDGE_RATIO_MIN     0.05f   // Min horizontal edge density
#define CUP_BLOB_FILL_MIN      0.08f   // Min 8% of frame occupied

// ── STATE ─────────────────────────────────────────────────────────────────────
WebServer server(80);
const unsigned long WIFI_TIMEOUT_MS = 20000;

// Forward declaration
void postResult(const char* result);

// ── CAMERA INIT ───────────────────────────────────────────────────────────────
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_GRAYSCALE;
  config.frame_size   = FRAMESIZE_SVGA;   // 800x600
  config.jpeg_quality = 10;
  config.fb_count     = 1;
  return (esp_camera_init(&config) == ESP_OK);
}

// ── SENSOR TUNING ─────────────────────────────────────────────────────────────
void tuneSensor() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) return;
  s->set_vflip(s, 1);
  s->set_hmirror(s, 1);
  s->set_brightness(s, 0);
  s->set_contrast(s, 1);
  s->set_saturation(s, -1);
  s->set_exposure_ctrl(s, 1);
  s->set_aec2(s, 1);
  s->set_ae_level(s, 0);
  s->set_sharpness(s, 2);
  s->set_denoise(s, 0);
}

// ── DETECTION LOGIC ───────────────────────────────────────────────────────────
bool analyzeFrame(camera_fb_t* fb) {
  if (!fb || fb->len == 0) return false;

  int W = fb->width;
  int H = fb->height;
  uint8_t* p = fb->buf;

  // 1. Average brightness
  long sum = 0;
  for (int i = 0; i < W * H; i++) sum += p[i];
  float avgBright = (float)sum / (W * H);
  Serial.printf("[CUP] Avg brightness: %.1f\n", avgBright);
  if (avgBright < BRIGHTNESS_THRESH) {
    Serial.println("[CUP] Too dark");
    return false;
  }

  // 2. Bounding box of foreground pixels
  uint8_t threshold = (uint8_t)(avgBright * 0.6f);
  int minX = W, maxX = 0, minY = H, maxY = 0;
  int foreCount = 0;
  for (int y = 0; y < H; y++) {
    for (int x = 0; x < W; x++) {
      if (p[y * W + x] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        foreCount++;
      }
    }
  }

  if (foreCount == 0) return false;
  int blobW = maxX - minX;
  int blobH = maxY - minY;
  if (blobW <= 0 || blobH <= 0) return false;

  float aspect   = (float)blobH / blobW;   // Cup → aspect < 1 (wider than tall)
  float blobFill = (float)foreCount / (W * H);
  Serial.printf("[CUP] Blob W=%d H=%d aspect=%.2f fill=%.3f\n", blobW, blobH, aspect, blobFill);

  // 3. Horizontal edge density (cups have strong top/bottom rim edges)
  int hEdgeCount = 0;
  for (int y = 1; y < H; y++) {
    for (int x = 0; x < W; x++) {
      int vGrad = abs((int)p[y * W + x] - (int)p[(y - 1) * W + x]);
      if (vGrad > 20) hEdgeCount++;
    }
  }
  float hEdgeDensity = (float)hEdgeCount / (W * H);
  Serial.printf("[CUP] Horiz edge density: %.4f\n", hEdgeDensity);

  // 4. Decision — cups are wide & short with horizontal rim edges
  bool isCup = (aspect >= CUP_ASPECT_MIN)
            && (aspect <= CUP_ASPECT_MAX)
            && (hEdgeDensity >= CUP_EDGE_RATIO_MIN)
            && (blobFill >= CUP_BLOB_FILL_MIN);

  Serial.printf("[CUP] Decision: %s\n", isCup ? "CUP" : "NONE");
  return isCup;
}

// ── CAPTURE AND POST RESULT ───────────────────────────────────────────────────
void doIdentify() {
  Serial.println("[CUP] Capture requested...");

  // Warmup frame
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb) esp_camera_fb_return(fb);
  delay(200);

  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CUP] Frame capture FAILED");
    postResult("NONE");
    return;
  }

  bool detected = analyzeFrame(fb);
  esp_camera_fb_return(fb);
  postResult(detected ? "CUP" : "NONE");
}

void postResult(const char* result) {
  HTTPClient http;
  String url = "http://" + String(DEVKIT_IP) + "/detect";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  StaticJsonDocument<64> doc;
  doc["cam"]    = "CUP";
  doc["result"] = result;
  String body; serializeJson(doc, body);

  int code = http.POST(body);
  http.end();
  Serial.printf("[CUP] POST /detect → %d (result=%s)\n", code, result);
}

// ── HTTP SERVER HANDLERS ──────────────────────────────────────────────────────
// GET /identify — Dev Kit calls this to trigger a capture
void handleIdentify() {
  server.send(200, "text/plain", "OK");
  doIdentify();
}

// GET /ping — connectivity check
void handlePing() {
  server.send(200, "text/plain", "CUP_CAM_OK");
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
  delay(1000);

  // Flash LED 3 times to distinguish from Bottle CAM (2 flashes)
  pinMode(33, OUTPUT);
  for (int i = 0; i < 6; i++) {
    digitalWrite(33, i % 2 == 0 ? LOW : HIGH); delay(150);
  }

  Serial.println("[CUP] Connecting WiFi...");
  connectWiFi();

  Serial.println("[CUP] Initializing camera (OV3660 SVGA)...");
  if (!initCamera()) {
    Serial.println("[CUP] ERROR: Camera init FAILED!");
    while (true) { digitalWrite(33, LOW); delay(100); digitalWrite(33, HIGH); delay(100); }
  }
  tuneSensor();

  server.on("/identify", handleIdentify);
  server.on("/ping",     handlePing);
  server.begin();

  Serial.println("[CUP] HTTP server started on port 80");
  Serial.println("[CUP] Ready — waiting for /identify requests from Dev Kit");
}

// ── LOOP ──────────────────────────────────────────────────────────────────────
void loop() {
  server.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  delay(5);
}
