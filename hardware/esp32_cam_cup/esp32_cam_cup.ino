/*
 * EcoDefill v3 - ESP32-CAM Cup Detector (WiFi + Edge Impulse)
 * ===========================================================
 * POWER  : 5V via programming board USB
 * BOARD  : AI Thinker ESP32-CAM
 * SENSOR : OV3660 (3MP)
 *
 * ROLE:
 *   1. Connect to hotspot WiFi.
 *   2. Listen for trigger from ESP32 Dev Kit via HTTP GET /identify.
 *   3. Capture frame and run Edge Impulse FOMO cup detection.
 *   4. POST result JSON to Dev Kit: POST http://<DEVKIT_IP>/detect
 *      Body: { "cam": "CUP", "result": "CUP", "rid": 9 }
 *         or { "cam": "CUP", "result": "NONE", "rid": 9 }
 *
 * MODEL:  cup (impulse #1) — FOMO object detection
 *   Labels: "invalid_object" (index 0), "valid" (index 1)
 *   Input : 96×96 grayscale
 *   A cup is detected when ≥1 bounding box has label "valid"
 *   above EI_CLASSIFIER_OBJECT_DETECTION_THRESHOLD (0.5).
 *
 * LIBRARY:
 *   Install cup_inferencing from:
 *   ei-cup-arduino-1.0.1-impulse-#1/cup_inferencing
 *   (add as .zip or copy folder to Arduino libraries directory)
 *
 * NO UART WIRING TO MEGA NEEDED - fully wireless.
 *
 * STATIC IP CONFIG:
 *   This CAM uses static IP 192.168.100.111 on the WiFi LAN.
 *   Change DEVKIT_IP to match your Dev Kit's actual IP on the LAN.
 */

#include "esp_camera.h"
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <cup_inferencing.h>
#include "edge-impulse-sdk/dsp/image/image.hpp"

// ── USER CONFIG ───────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "Free";
const char* WIFI_PASSWORD = "1234pogi";
const char* DEVKIT_IP     = "192.168.100.100";

// Static IP for this CAM on the WiFi LAN
IPAddress local_IP(192, 168, 100, 111);
IPAddress gateway(192, 168, 100, 1);   // Real hotspot gateway (confirmed)
IPAddress subnet(255, 255, 255, 0);

// ── CAMERA PIN MAP (AI Thinker) ───────────────────────────────────────────────
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

// ── INFERENCE CONFIG ──────────────────────────────────────────────────────────
// Capture at QVGA (320×240), then crop/resize to model input (96×96).
#define EI_CAMERA_RAW_FRAME_BUFFER_COLS  320
#define EI_CAMERA_RAW_FRAME_BUFFER_ROWS  240
#define EI_CAMERA_FRAME_BYTE_SIZE        3

// Detection label from the new model
static const char* CUP_VALID_LABEL = "valid";

// ── STATE ─────────────────────────────────────────────────────────────────────
WebServer server(80);
const unsigned long WIFI_TIMEOUT_MS = 20000;
static bool   cameraInitialized = false;
static bool   debug_nn          = false;
static uint8_t* snapshotBuf     = nullptr;

// ── CAMERA CONFIG ─────────────────────────────────────────────────────────────
static camera_config_t camera_config = {
  .pin_pwdn     = PWDN_GPIO_NUM,
  .pin_reset    = RESET_GPIO_NUM,
  .pin_xclk     = XCLK_GPIO_NUM,
  .pin_sscb_sda = SIOD_GPIO_NUM,
  .pin_sscb_scl = SIOC_GPIO_NUM,
  .pin_d7       = Y9_GPIO_NUM,
  .pin_d6       = Y8_GPIO_NUM,
  .pin_d5       = Y7_GPIO_NUM,
  .pin_d4       = Y6_GPIO_NUM,
  .pin_d3       = Y5_GPIO_NUM,
  .pin_d2       = Y4_GPIO_NUM,
  .pin_d1       = Y3_GPIO_NUM,
  .pin_d0       = Y2_GPIO_NUM,
  .pin_vsync    = VSYNC_GPIO_NUM,
  .pin_href     = HREF_GPIO_NUM,
  .pin_pclk     = PCLK_GPIO_NUM,
  .xclk_freq_hz = 20000000,
  .ledc_timer   = LEDC_TIMER_0,
  .ledc_channel = LEDC_CHANNEL_0,
  .pixel_format = PIXFORMAT_JPEG,
  .frame_size   = FRAMESIZE_QVGA,
  .jpeg_quality = 12,
  .fb_count     = 1,
  .fb_location  = CAMERA_FB_IN_PSRAM,
  .grab_mode    = CAMERA_GRAB_WHEN_EMPTY,
};

// ── FORWARD DECLARATIONS ──────────────────────────────────────────────────────
void    postResult(const char* result, uint32_t requestId);
bool    eiCameraInit();
bool    eiCameraCapture(uint32_t imgWidth, uint32_t imgHeight, uint8_t* outBuf);
static int eiCameraGetData(size_t offset, size_t length, float* outPtr);

// ── SENSOR TUNING ─────────────────────────────────────────────────────────────
void tuneSensor() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) return;

  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, 0);
  }
  s->set_contrast(s, 1);
  s->set_exposure_ctrl(s, 1);
  s->set_aec2(s, 1);
  s->set_ae_level(s, 0);
}

// ── CAMERA INIT ───────────────────────────────────────────────────────────────
bool eiCameraInit() {
  if (cameraInitialized) return true;

  esp_err_t err = esp_camera_init(&camera_config);
  if (err != ESP_OK) {
    Serial.printf("[CUP] Camera init failed: 0x%x\n", err);
    return false;
  }

  tuneSensor();
  cameraInitialized = true;
  return true;
}

// ── SNAPSHOT BUFFER MANAGEMENT ────────────────────────────────────────────────
bool allocateSnapshotBuffer() {
  if (snapshotBuf) return true;

  const size_t sz = EI_CAMERA_RAW_FRAME_BUFFER_COLS *
                    EI_CAMERA_RAW_FRAME_BUFFER_ROWS *
                    EI_CAMERA_FRAME_BYTE_SIZE;

  snapshotBuf = psramFound()
    ? (uint8_t*)ps_malloc(sz)
    : (uint8_t*)malloc(sz);

  if (!snapshotBuf) {
    Serial.printf("[CUP] Failed to allocate snapshot buf (%u bytes)\n", (unsigned)sz);
    return false;
  }
  return true;
}

void releaseSnapshotBuffer() {
  if (!snapshotBuf) return;
  free(snapshotBuf);
  snapshotBuf = nullptr;
}

// ── CAMERA CAPTURE + RESIZE ───────────────────────────────────────────────────
bool eiCameraCapture(uint32_t imgWidth, uint32_t imgHeight, uint8_t* outBuf) {
  if (!cameraInitialized) {
    Serial.println("[CUP] Camera not initialized");
    return false;
  }

  // Warmup frame — discards stale exposure
  camera_fb_t* warmup = esp_camera_fb_get();
  if (warmup) {
    esp_camera_fb_return(warmup);
    delay(120);
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CUP] Camera capture failed");
    return false;
  }

  bool converted = fmt2rgb888(fb->buf, fb->len, PIXFORMAT_JPEG, outBuf);
  esp_camera_fb_return(fb);

  if (!converted) {
    Serial.println("[CUP] JPEG→RGB888 conversion failed");
    return false;
  }

  // Crop/resize from 320×240 to model input (96×96)
  if (imgWidth != EI_CAMERA_RAW_FRAME_BUFFER_COLS ||
      imgHeight != EI_CAMERA_RAW_FRAME_BUFFER_ROWS) {
    ei::image::processing::crop_and_interpolate_rgb888(
      outBuf,
      EI_CAMERA_RAW_FRAME_BUFFER_COLS,
      EI_CAMERA_RAW_FRAME_BUFFER_ROWS,
      outBuf,
      imgWidth,
      imgHeight
    );
  }

  return true;
}

// ── EI DATA CALLBACK ─────────────────────────────────────────────────────────
static int eiCameraGetData(size_t offset, size_t length, float* outPtr) {
  size_t pixelIx    = offset * 3;
  size_t pixelsLeft = length;
  size_t outIx      = 0;

  while (pixelsLeft != 0) {
    // Pack RGB888 into a single float (matching EI SDK expectation)
    outPtr[outIx] =
      (snapshotBuf[pixelIx + 2] << 16) +
      (snapshotBuf[pixelIx + 1] << 8)  +
       snapshotBuf[pixelIx];
    outIx++;
    pixelIx += 3;
    pixelsLeft--;
  }
  return 0;
}

// ── INFERENCE ─────────────────────────────────────────────────────────────────
// Returns true if ≥1 bounding box has label "valid" above threshold.
bool runCupInference() {
  if (!allocateSnapshotBuffer()) return false;

  ei::signal_t signal;
  signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
  signal.get_data     = &eiCameraGetData;

  if (!eiCameraCapture(EI_CLASSIFIER_INPUT_WIDTH, EI_CLASSIFIER_INPUT_HEIGHT, snapshotBuf)) {
    return false;
  }

  ei_impulse_result_t result = { 0 };
  EI_IMPULSE_ERROR err = run_classifier(&signal, &result, debug_nn);
  if (err != EI_IMPULSE_OK) {
    Serial.printf("[CUP] run_classifier failed (%d)\n", err);
    return false;
  }

  Serial.printf("[CUP] Timing: DSP=%d ms  Inference=%d ms\n",
                result.timing.dsp, result.timing.classification);

  bool detected = false;
  uint32_t validCount = 0;

  Serial.println("[CUP] Bounding boxes:");
  for (uint32_t i = 0; i < result.bounding_boxes_count; i++) {
    ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
    if (bb.value <= 0.0f) continue;

    Serial.printf("[CUP]   %s (%.3f) x=%u y=%u w=%u h=%u\n",
                  bb.label, bb.value, bb.x, bb.y, bb.width, bb.height);

    if (strcmp(bb.label, CUP_VALID_LABEL) == 0 &&
        bb.value >= EI_CLASSIFIER_OBJECT_DETECTION_THRESHOLD) {
      detected = true;
      validCount++;
    }
  }

  if (result.bounding_boxes_count == 0) {
    Serial.println("[CUP]   (no detections)");
  }

  Serial.printf("[CUP] Decision: %s  (valid boxes: %lu)\n",
                detected ? "CUP" : "NONE",
                (unsigned long)validCount);
  return detected;
}

// ── POST RESULT TO DEV KIT ────────────────────────────────────────────────────
void postResult(const char* result, uint32_t requestId) {
  HTTPClient http;
  String url = "http://" + String(DEVKIT_IP) + "/detect";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  StaticJsonDocument<64> doc;
  doc["cam"]    = "CUP";
  doc["result"] = result;
  doc["rid"]    = requestId;
  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  http.end();
  Serial.printf("[CUP] POST /detect → %d  (result=%s rid=%lu)\n",
                code, result, (unsigned long)requestId);
}

// ── IDENTIFY HANDLER ─────────────────────────────────────────────────────────
void doIdentify(uint32_t requestId) {
  Serial.printf("[CUP] Capture requested (rid=%lu)...\n", (unsigned long)requestId);

  bool detected = runCupInference();
  postResult(detected ? "CUP" : "NONE", requestId);
  releaseSnapshotBuffer();
}

void handleIdentify() {
  uint32_t requestId = server.hasArg("rid")
    ? static_cast<uint32_t>(server.arg("rid").toInt())
    : 0;
  server.send(200, "text/plain", "OK");
  doIdentify(requestId);
}

// ── PING HANDLER ─────────────────────────────────────────────────────────────
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
    Serial.println("[WiFi] FAILED - will retry in loop");
  }
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  // Flash LED 6 times (Cup CAM identifier: 6 blinks)
  pinMode(33, OUTPUT);
  for (int i = 0; i < 6; i++) {
    digitalWrite(33, i % 2 == 0 ? LOW : HIGH);
    delay(150);
  }

  Serial.println("[CUP] EcoDefill v3 Cup CAM booting...");
  Serial.printf("[CUP] PSRAM: %s\n", psramFound() ? "YES" : "NO");

  connectWiFi();

  if (!eiCameraInit()) {
    Serial.println("[CUP] ERROR: Camera init failed — halting");
    while (true) {
      digitalWrite(33, LOW); delay(100);
      digitalWrite(33, HIGH); delay(100);
    }
  }

  server.on("/identify", handleIdentify);
  server.on("/ping",     handlePing);
  server.begin();

  Serial.printf("[CUP] Model: %s  input=%dx%d  labels=%d\n",
                EI_CLASSIFIER_PROJECT_NAME,
                EI_CLASSIFIER_INPUT_WIDTH,
                EI_CLASSIFIER_INPUT_HEIGHT,
                EI_CLASSIFIER_LABEL_COUNT);
  Serial.printf("[CUP] Detection threshold: %.2f\n",
                EI_CLASSIFIER_OBJECT_DETECTION_THRESHOLD);
  Serial.println("[CUP] HTTP server started on port 80");
  Serial.println("[CUP] Ready — waiting for /identify from Dev Kit");
}

// ── LOOP ──────────────────────────────────────────────────────────────────────
void loop() {
  server.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  delay(5);
}

// ── COMPILE GUARD ─────────────────────────────────────────────────────────────
#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_CAMERA
#error "Invalid model for current sensor — ensure cup_inferencing library is installed"
#endif

#if EI_CLASSIFIER_OBJECT_DETECTION != 1
#error "This sketch expects a FOMO object detection model, not a classification model"
#endif
