/*
 * EcoDefill v2 — ESP32-CAM Cup Detector
 * =======================================
 * POWER  : 5V from Buck 3 (Heavy Processing Line — add heatsink to LM2596!)
 * BOARD  : AI Thinker ESP32-CAM
 * SENSOR : OV3660 (3MP — same GPIO pinout as OV2640 on AI Thinker PCB)
 *
 * OV3660 NOTES:
 *   - set_hmirror=1 required (OV3660 default horizontal orientation is mirrored).
 *   - set_vflip=1 required (sensor physically mounted inverted on AI Thinker PCB).
 *   - Better low-light performance → BRIGHTNESS_THRESH lowered to 40.
 *   - We use SVGA (800×600) for higher detection accuracy vs QVGA.
 *
 * ROLE  : Listen for "##IDENTIFY##" from Arduino Mega on UART0 RX.
 *         Capture a frame and determine if a CUP is present.
 *         Reply with "##DETECT:CUP##" or "##DETECT:NONE##" on UART0 TX.
 *
 * DETECTION METHOD:
 *   Uses simple heuristics on the captured grayscale frame:
 *   1. Average brightness check (too dark = no item).
 *   2. Blob aspect ratio — cups are WIDE and SHORT (opposite of bottles).
 *   3. Edge density — cups have strong horizontal top/bottom edges.
 *   Replace analyzeFrame() with TFLite model for production accuracy.
 *
 * SERIAL PROTOCOL (UART0 GPIO1=TX, GPIO3=RX):
 *   Receives from Mega: "##IDENTIFY##\n"
 *   Sends to Mega:      "##DETECT:CUP##\n"  or  "##DETECT:NONE##\n"
 *
 * WIRING:
 *   ESP32-CAM GPIO3 (RX0) ← Mega Pin 14 (TX3)  [5V→3.3V! Use voltage divider]
 *   ESP32-CAM GPIO1 (TX0) → Mega Pin 15 (RX3)  [3.3V→5V: safe]
 *   Common GND
 *
 * ⚠️  VOLTAGE DIVIDER on the 5V TX line from Mega → ESP32 RX:
 *     Mega TX3 (pin 14) → 1kΩ → ESP32-CAM GPIO3
 *                                ESP32-CAM GPIO3 → 2kΩ → GND
 *
 * LIBRARIES:
 *   esp_camera  (bundled with ESP32 Arduino core)
 */

#include "esp_camera.h"
#include <Arduino.h>

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

// ── CONFIG ────────────────────────────────────────────────────────────────────
#define BAUD_RATE        115200
// OV3660 low-light advantage → threshold reduced from 60 to 40
#define BRIGHTNESS_THRESH 40      // 0-255: minimum average brightness

// Cup detection thresholds for OV3660 SVGA (800×600) — cups are WIDE and SHORT
#define CUP_ASPECT_MAX     0.85f  // Height/Width < this → short/wide shape
#define CUP_ASPECT_MIN     0.30f  // Guard against noise (too flat = not a cup)
#define CUP_EDGE_RATIO_MIN 0.05f  // Reduced — OV3660 horizontal edges are sharper
#define CUP_BLOB_FILL_MIN  0.08f  // 8% of SVGA frame (larger than QVGA fill requirement)

String rxBuf = "";

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
  // OV3660 supports SVGA (800x600) — better accuracy than QVGA
  config.frame_size   = FRAMESIZE_SVGA;   // 800x600 (was QVGA 320x240)
  config.jpeg_quality = 10;
  config.fb_count     = 1;

  return (esp_camera_init(&config) == ESP_OK);
}

// ── DETECTION LOGIC ───────────────────────────────────────────────────────────
/*
 * analyzeFrame():
 * Cups are wider than they are tall, with distinct horizontal edges at the rim
 * and base. The detection logic is the INVERSE of the bottle detector.
 *
 * Returns true if a cup is detected.
 */
bool analyzeFrame(camera_fb_t* fb) {
  if (!fb || fb->len == 0) return false;

  int W = fb->width;
  int H = fb->height;
  uint8_t* p = fb->buf;

  // 1. Average brightness
  long sum = 0;
  for (int i = 0; i < W * H; i++) sum += p[i];
  float avgBright = (float)sum / (W * H);
  Serial.printf("[CUP-CAM] Avg brightness: %.1f\n", avgBright);
  if (avgBright < BRIGHTNESS_THRESH) {
    Serial.println("[CUP-CAM] Too dark");
    return false;
  }

  // 2. Find bounding box of foreground pixels
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

  float aspect    = (float)blobH / blobW;     // cups → aspect < 1.0
  float blobFill  = (float)foreCount / (W * H);

  Serial.printf("[CUP-CAM] Blob W=%d H=%d aspect=%.2f fill=%.3f\n",
                blobW, blobH, aspect, blobFill);

  // 3. Horizontal edge density (cups have strong top & bottom rims)
  int hEdgeCount = 0;
  for (int y = 1; y < H; y++) {
    for (int x = 0; x < W; x++) {
      int vGrad = abs((int)p[y * W + x] - (int)p[(y - 1) * W + x]);
      if (vGrad > 20) hEdgeCount++;
    }
  }
  float hEdgeDensity = (float)hEdgeCount / (W * H);
  Serial.printf("[CUP-CAM] Horiz edge density: %.4f\n", hEdgeDensity);

  // 4. Decision
  bool isCup = (aspect >= CUP_ASPECT_MIN)
            && (aspect <= CUP_ASPECT_MAX)
            && (hEdgeDensity >= CUP_EDGE_RATIO_MIN)
            && (blobFill >= CUP_BLOB_FILL_MIN);

  Serial.printf("[CUP-CAM] Decision: %s\n", isCup ? "CUP" : "NONE");
  return isCup;
}

// ── IDENTIFICATION ROUTINE ────────────────────────────────────────────────────
void identify() {
  Serial.println("[CUP-CAM] Capture requested...");

  // Warm up frame (discard AEC adjustment)
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb) esp_camera_fb_return(fb);
  delay(200);

  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CUP-CAM] Frame capture FAILED");
    Serial.println("##DETECT:NONE##");
    return;
  }

  bool detected = analyzeFrame(fb);
  esp_camera_fb_return(fb);

  Serial.println(detected ? "##DETECT:CUP##" : "##DETECT:NONE##");
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(BAUD_RATE);
  delay(1000);

  // Flash LED 3 times (distinguishes from Bottle-CAM's 2 flashes)
  pinMode(33, OUTPUT);
  for (int i = 0; i < 6; i++) { digitalWrite(33, i % 2 == 0 ? LOW : HIGH); delay(120); }

  Serial.println(F("[CUP-CAM] Initializing camera (OV3660)..."));
  if (!initCamera()) {
    Serial.println(F("[CUP-CAM] ERROR: Camera init failed!"));
    while (true) { digitalWrite(33, LOW); delay(100); digitalWrite(33, HIGH); delay(100); }
  }

  // OV3660 sensor tuning
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_vflip(s, 1);           // AI Thinker PCB mounts sensor inverted
    s->set_hmirror(s, 1);         // OV3660 requires horizontal mirror correction
    s->set_brightness(s, 0);      // Auto (OV3660 handles exposure natively)
    s->set_contrast(s, 1);
    s->set_saturation(s, -1);     // Irrelevant for grayscale; reduce for stability
    s->set_exposure_ctrl(s, 1);
    s->set_aec2(s, 1);
    s->set_ae_level(s, 0);
    s->set_sharpness(s, 2);       // Max sharpness — critical for horizontal rim edges
    s->set_denoise(s, 0);         // Off — raw edges needed for analysis
  }

  Serial.println("##STATUS:CUP_CAM_READY##");
  Serial.println("[CUP-CAM] Waiting for ##IDENTIFY## from Mega...");
}

// ── LOOP ──────────────────────────────────────────────────────────────────────
void loop() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      rxBuf.trim();
      if (rxBuf == "##IDENTIFY##") {
        identify();
      }
      rxBuf = "";
    } else if (c != '\r') {
      if (rxBuf.length() < 64) rxBuf += c;
      else rxBuf = "";
    }
  }
  delay(5);
}
