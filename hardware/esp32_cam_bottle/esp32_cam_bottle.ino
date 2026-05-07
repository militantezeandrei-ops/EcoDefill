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
 *   3. Capture frame and run Edge Impulse bottle classification.
 *   4. POST result JSON to Dev Kit: POST http://<DEVKIT_IP>/detect
 *      Body: { "cam": "BOTTLE", "result": "BOTTLE" } or
 *            { "cam": "BOTTLE", "result": "NONE" }
 *
 * NO UART WIRING TO MEGA NEEDED - fully wireless.
 *
 * STATIC IP CONFIG:
 *   This CAM uses static IP 192.168.1.110 on the hotspot network.
 *   Change DEVKIT_IP to match your Dev Kit's actual IP on the hotspot.
 *
 * LIBRARIES:
 *   esp_camera  (bundled with ESP32 Arduino core)
 *   ArduinoJson by Benoit Blanchon (v6 or v7)
 *   WebServer   (bundled with ESP32 Arduino core)
 *   Vendored Edge Impulse Arduino export in edge_impulse_model/
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "esp_camera.h"
#include "img_converters.h"
#include "ei_model_wrapper.h"

// USER CONFIG
const char* WIFI_SSID     = "ZTE_2.4G_iWhgQR";
const char* WIFI_PASSWORD = "v3WSQWKw";
const char* DEVKIT_IP     = "192.168.1.100";

// Static IP for this CAM on the hotspot
IPAddress local_IP(192, 168, 1, 110);
IPAddress gateway(192, 168, 1, 1);
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
static constexpr const char* EI_BOTTLE_LABEL = "bottle";
static constexpr bool EDGE_IMPULSE_DEBUG_NN = false;

// STATE
WebServer server(80);
const unsigned long WIFI_TIMEOUT_MS = 20000;
static uint8_t* snapshot_buf = nullptr;
static bool camera_ready = false;

// Forward declarations
void postResult(const char* result);
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

  size_t top_index = 0;
  float top_value = result.classification[0].value;

  Serial.println("[BOTTLE] Classification scores:");
  for (size_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; ++i) {
    const float value = result.classification[i].value;
    const char* label = ei_classifier_inferencing_categories[i];
    Serial.printf("[BOTTLE]   %s: %.5f\n", label, value);

    if (value > top_value) {
      top_value = value;
      top_index = i;
    }
  }

#if EI_CLASSIFIER_HAS_ANOMALY == 1
  Serial.printf("[BOTTLE] Anomaly score: %.5f\n", result.anomaly);
#endif

  const char* top_label = ei_classifier_inferencing_categories[top_index];
  *detected = (strcmp(top_label, EI_BOTTLE_LABEL) == 0);

  Serial.printf("[BOTTLE] Top-1: %s (%.5f) -> %s\n",
                top_label,
                top_value,
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

void doIdentify() {
  Serial.println("[BOTTLE] Capture requested...");

  camera_fb_t* warmup = esp_camera_fb_get();
  if (warmup) {
    esp_camera_fb_return(warmup);
  }
  delay(200);

  bool detected = false;
  if (!captureAndClassifyBottle(&detected)) {
    Serial.println("[BOTTLE] Inference failed - returning NONE");
    postResult("NONE");
    return;
  }

  postResult(detected ? "BOTTLE" : "NONE");
}

void postResult(const char* result) {
  HTTPClient http;
  String url = "http://" + String(DEVKIT_IP) + "/detect";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  StaticJsonDocument<64> doc;
  doc["cam"] = "BOTTLE";
  doc["result"] = result;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  http.end();
  Serial.printf("[BOTTLE] POST /detect -> %d (result=%s)\n", code, result);
}

void handleIdentify() {
  server.send(200, "text/plain", "OK");
  doIdentify();
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
