/*
 * EcoDefill v3 - ESP32-CAM Bottle Detector (WiFi Mode + Edge Impulse)
 * ===================================================================
 * POWER  : 5V via programming board USB
 * BOARD  : AI Thinker ESP32-CAM
 * SENSOR : OV3660 (3MP)
 *
 * ROLE:
 *   1. Connect to hotspot WiFi.
 *   2. Listen for trigger from ESP32 Dev Kit via HTTP GET /identify.
 *   3. Capture a frame, run Edge Impulse bottle detection, and POST result JSON:
 *      Body: { "cam": "BOTTLE", "result": "BOTTLE", "rid": 17 } or
 *            { "cam": "BOTTLE", "result": "NONE",   "rid": 17 }
 *
 * NO UART WIRING TO MEGA NEEDED - fully wireless.
 *
 * STATIC IP CONFIG:
 *   This CAM uses static IP 192.168.100.110 on the WiFi LAN.
 *   Change DEVKIT_IP to match your Dev Kit's actual IP on the LAN.
 *
 * LIBRARIES:
 *   esp_camera  (bundled with ESP32 Arduino core)
 *   ArduinoJson by Benoit Blanchon (v6 or v7)
 *   WebServer   (bundled with ESP32 Arduino core)
 *   Edge Impulse Arduino export installed as valid-items_inferencing
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "esp_camera.h"
#include "img_converters.h"
#include <valid-items_inferencing.h>
#include "edge-impulse-sdk/dsp/image/image.hpp"

// USER CONFIG
const char* WIFI_SSID     = "Free";
const char* WIFI_PASSWORD = "1234pogi";
const char* DEVKIT_IP     = "192.168.100.100";

// Static IP for this CAM on the WiFi LAN
IPAddress local_IP(192, 168, 100, 110);
IPAddress gateway(192, 168, 100, 1);   // Real hotspot gateway (confirmed)
IPAddress subnet(255, 255, 255, 0);

// CAMERA PIN MAP (AI Thinker)
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

// INFERENCE CONFIG
static constexpr uint32_t EI_CAMERA_RAW_FRAME_BUFFER_COLS = 320;
static constexpr uint32_t EI_CAMERA_RAW_FRAME_BUFFER_ROWS = 240;
static constexpr uint32_t EI_CAMERA_FRAME_BYTE_SIZE = 3;
static constexpr const char* EI_TARGET_LABEL = "Pet Bottle";
static constexpr bool EDGE_IMPULSE_DEBUG_NN = false;
WebServer server(80);
const unsigned long WIFI_TIMEOUT_MS = 20000;
static uint8_t* snapshot_buf = nullptr;
static bool camera_ready = false;

// Forward declarations
void postResult(const char* result, uint32_t requestId);
bool ensureSnapshotBuffer();
bool captureAndClassifyBottle(bool* detected);
bool captureImage(uint8_t* out_buf);
int eiCameraGetData(size_t offset, size_t length, float* out_ptr);

bool initCamera() {
  camera_config_t config = {};
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
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_QVGA;
  config.jpeg_quality = 12;
  config.fb_count     = 1;
  config.fb_location  = CAMERA_FB_IN_PSRAM;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[BOTTLE] Camera init failed: 0x%x\n", err);
    return false;
  }

  camera_ready = true;
  return true;
}

void tuneSensor() {
  sensor_t* s = esp_camera_sensor_get();
  if (!s) {
    return;
  }

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

bool ensureSnapshotBuffer() {
  if (snapshot_buf != nullptr) {
    return true;
  }

  const size_t snapshot_size = EI_CAMERA_RAW_FRAME_BUFFER_COLS *
                               EI_CAMERA_RAW_FRAME_BUFFER_ROWS *
                               EI_CAMERA_FRAME_BYTE_SIZE;
  snapshot_buf = static_cast<uint8_t*>(malloc(snapshot_size));
  if (snapshot_buf == nullptr) {
    Serial.printf("[BOTTLE] Snapshot allocation failed (%u bytes)\n",
                  static_cast<unsigned>(snapshot_size));
    return false;
  }

  return true;
}

bool captureImage(uint8_t* out_buf) {
  if (!camera_ready) {
    Serial.println("[BOTTLE] Camera is not initialized");
    return false;
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[BOTTLE] Frame capture failed");
    return false;
  }

  const bool converted = fmt2rgb888(fb->buf, fb->len, fb->format, out_buf);
  esp_camera_fb_return(fb);

  if (!converted) {
    Serial.println("[BOTTLE] RGB conversion failed");
    return false;
  }

  if (EI_CLASSIFIER_INPUT_WIDTH != EI_CAMERA_RAW_FRAME_BUFFER_COLS ||
      EI_CLASSIFIER_INPUT_HEIGHT != EI_CAMERA_RAW_FRAME_BUFFER_ROWS) {
    ei::image::processing::crop_and_interpolate_rgb888(
      out_buf,
      EI_CAMERA_RAW_FRAME_BUFFER_COLS,
      EI_CAMERA_RAW_FRAME_BUFFER_ROWS,
      out_buf,
      EI_CLASSIFIER_INPUT_WIDTH,
      EI_CLASSIFIER_INPUT_HEIGHT
    );
  }

  return true;
}

bool captureAndClassifyBottle(bool* detected) {
  if (detected == nullptr) {
    return false;
  }
  *detected = false;

  if (!ensureSnapshotBuffer()) {
    return false;
  }

  ei::signal_t signal;
  signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
  signal.get_data = &eiCameraGetData;

  if (!captureImage(snapshot_buf)) {
    return false;
  }

  ei_impulse_result_t result = {};
  EI_IMPULSE_ERROR err = run_classifier(&signal, &result, EDGE_IMPULSE_DEBUG_NN);
  if (err != EI_IMPULSE_OK) {
    Serial.printf("[BOTTLE] Classifier failed (%d)\n", static_cast<int>(err));
    return false;
  }

  Serial.printf("[BOTTLE] Inference timing: DSP=%d ms, Classification=%d ms, Anomaly=%d ms\n",
                result.timing.dsp,
                result.timing.classification,
                result.timing.anomaly);

  bool found_target = false;
  uint32_t found_count = 0;

  Serial.println("[BOTTLE] Bounding boxes:");
  for (uint32_t i = 0; i < result.bounding_boxes_count; ++i) {
    const ei_impulse_result_bounding_box_t& bb = result.bounding_boxes[i];
    if (bb.value <= 0.0f) {
      continue;
    }

    Serial.printf("[BOTTLE]   %s: %.5f [x=%u, y=%u, w=%u, h=%u]\n",
                  bb.label,
                  bb.value,
                  bb.x,
                  bb.y,
                  bb.width,
                  bb.height);

    if (strcmp(bb.label, EI_TARGET_LABEL) == 0) {
      found_target = true;
      ++found_count;
    }
  }

#if EI_CLASSIFIER_HAS_ANOMALY == 1
  Serial.printf("[BOTTLE] Anomaly score: %.5f\n", result.anomaly);
#endif

  *detected = found_target;

  if (found_count == 0) {
    Serial.println("[BOTTLE]   No objects detected");
  }

  Serial.printf("[BOTTLE] Pet Bottle detections: %u -> %s\n",
                found_count,
                *detected ? "BOTTLE" : "NONE");

  return true;
}

int eiCameraGetData(size_t offset, size_t length, float* out_ptr) {
  size_t pixel_ix = offset * 3;
  size_t out_ptr_ix = 0;

  while (length > 0) {
    out_ptr[out_ptr_ix] =
      (snapshot_buf[pixel_ix + 2] << 16) +
      (snapshot_buf[pixel_ix + 1] << 8) +
      snapshot_buf[pixel_ix];

    ++out_ptr_ix;
    pixel_ix += 3;
    --length;
  }

  return 0;
}

void doIdentify(uint32_t requestId) {
  Serial.printf("[BOTTLE] Forced capture requested (rid=%lu)...\n",
                static_cast<unsigned long>(requestId));

  camera_fb_t* warmup = esp_camera_fb_get();
  if (warmup) {
    esp_camera_fb_return(warmup);
  }
  delay(200);

  bool detected = false;
  if (!captureAndClassifyBottle(&detected)) {
    Serial.println("[BOTTLE] Inference failed - returning NONE");
    postResult("NONE", requestId);
    return;
  }

  postResult(detected ? "BOTTLE" : "NONE", requestId);
}

void postResult(const char* result, uint32_t requestId) {
  HTTPClient http;
  String url = "http://" + String(DEVKIT_IP) + "/detect";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  StaticJsonDocument<64> doc;
  doc["cam"] = "BOTTLE";
  doc["result"] = result;
  doc["rid"] = requestId;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  http.end();
  Serial.printf("[BOTTLE] POST /detect -> %d (result=%s rid=%lu)\n",
                code,
                result,
                static_cast<unsigned long>(requestId));
}

void handleIdentify() {
  uint32_t requestId = server.hasArg("rid")
    ? static_cast<uint32_t>(server.arg("rid").toInt())
    : 0;
  server.send(200, "text/plain", "OK");
  doIdentify(requestId);
}

void handlePing() {
  server.send(200, "text/plain", "BOTTLE_CAM_OK");
}

void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);

  if (!WiFi.config(local_IP, gateway, subnet)) {
    Serial.println("[WiFi] Static IP config failed");
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] FAILED - will retry in loop");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(33, OUTPUT);
  for (int i = 0; i < 4; i++) {
    digitalWrite(33, (i % 2 == 0) ? LOW : HIGH);
    delay(150);
  }

  Serial.println("[BOTTLE] Connecting WiFi...");
  connectWiFi();

  Serial.println("[BOTTLE] Initializing camera (OV3660 QVGA JPEG for Edge Impulse)...");
  if (!initCamera()) {
    Serial.println("[BOTTLE] ERROR: Camera init FAILED!");
    while (true) {
      digitalWrite(33, LOW);
      delay(100);
      digitalWrite(33, HIGH);
      delay(100);
    }
  }

  tuneSensor();

  if (!psramFound()) {
    Serial.println("[BOTTLE] WARNING: PSRAM not detected; image inference may fail");
  }

  server.on("/identify", handleIdentify);
  server.on("/ping", handlePing);
  server.begin();

  Serial.println("[BOTTLE] HTTP server started on port 80");
  Serial.println("[BOTTLE] Ready - waiting for /identify requests from Dev Kit");
}

void loop() {
  server.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  delay(5);
}

#if EI_CLASSIFIER_OBJECT_DETECTION != 1
#error "This sketch expects an Edge Impulse object detection export."
#endif
