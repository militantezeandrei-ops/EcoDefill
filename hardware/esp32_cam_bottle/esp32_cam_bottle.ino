/*
 * EcoDefill v2 — ESP32-CAM Bottle Detector
 * ==========================================
 * POWER  : 5V from Buck 3 (Heavy Processing Line — add heatsink to LM2596!)
 * BOARD  : AI Thinker ESP32-CAM
 * SENSOR : OV3660 (3MP — same GPIO pinout as OV2640 on AI Thinker PCB)
 *
 * OV3660 NOTES:
 *   - set_hmirror=1 required (OV3660 default horizontal orientation is mirrored).
 *   - set_vflip=1 required (sensor physically mounted inverted on AI Thinker PCB).
 *   - Better low-light performance → lower BRIGHTNESS_THRESH needed.
 *   - We use SVGA (800×600) for higher detection accuracy vs QVGA.
 *
 * ROLE  : Listen for "##IDENTIFY##" from Arduino Mega on UART0 RX.
 *         Capture a frame and determine if a BOTTLE is present.
 *         Reply with "##DETECT:BOTTLE##" or "##DETECT:NONE##" on UART0 TX.
 *
 * DETECTION METHOD:
 *   This sketch uses simple heuristics on the captured frame:
 *   1. Check if a tall, narrow cylindrical shape is present (aspect ratio + edge density)
 *   For true ML inference, replace analyzeFrame() with your TFLite model call.
 *
 * SERIAL PROTOCOL (UART0 GPIO1=TX, GPIO3=RX):
 *   Receives from Mega: "##IDENTIFY##\n"
 *   Sends to Mega:      "##DETECT:BOTTLE##\n"  or  "##DETECT:NONE##\n"
 *
 * WIRING:
 *   ESP32-CAM GPIO3 (RX0) ← Mega Pin 16 (TX2)  [5V→3.3V! Use voltage divider]
 *   ESP32-CAM GPIO1 (TX0) → Mega Pin 17 (RX2)  [3.3V→5V: safe]
 *   Common GND
 *
 * ⚠️  VOLTAGE DIVIDER on the 5V TX line from Mega → ESP32 RX:
 *     Mega TX2 (pin 16) → 1kΩ → ESP32-CAM GPIO3
 *                                ESP32-CAM GPIO3 → 2kΩ → GND
 *     This gives ≈3.3V which is safe for the ESP32-CAM GPIO.
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
#define CAPTURE_TIMEOUT  5000     // ms: max time for one capture attempt
// OV3660 low-light advantage → threshold reduced from 60 to 40
#define BRIGHTNESS_THRESH 40      // 0-255: minimum average brightness needed

// Detection thresholds for OV3660 SVGA (800×600) — sharper sensor = lower minimums
#define BOTTLE_EDGE_RATIO_MIN  0.06f   // Reduced from 0.08 — OV3660 edges are crisper
#define BOTTLE_ASPECT_MIN      1.5f    // Height/Width ratio — same (shape geometry unchanged)

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
  config.pixel_format = PIXFORMAT_GRAYSCALE;  // Grayscale for faster analysis
  // OV3660 supports SVGA (800x600) — more pixels = better aspect ratio accuracy
  config.frame_size   = FRAMESIZE_SVGA;       // 800x600 (was QVGA 320x240)
  config.jpeg_quality = 10;                   // Slightly better quality for OV3660
  config.fb_count     = 1;

  esp_err_t err = esp_camera_init(&config);
  return (err == ESP_OK);
}

// ── DETECTION LOGIC ───────────────────────────────────────────────────────────
/*
 * analyzeFrame():
 * Given a grayscale frame buffer, decide if a bottle is visible.
 *
 * Algorithm (simple heuristic — replace with TFLite model for production):
 *   1. Compute average brightness. If too dark → NONE (no item or too dim).
 *   2. Scan columns to find the widest contiguous bright region (the item).
 *   3. Scan rows to find the height of the bright region.
 *   4. If aspect ratio (height/width) > BOTTLE_ASPECT_MIN → likely a tall bottle.
 *   5. Compute edge density (gradient magnitude) — bottles have strong vertical edges.
 *
 * Returns true if a bottle is detected.
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
  Serial.printf("[BOTTLE-CAM] Avg brightness: %.1f\n", avgBright);
  if (avgBright < BRIGHTNESS_THRESH) {
    Serial.println("[BOTTLE-CAM] Too dark — item not visible");
    return false;
  }

  // 2. Find bounding box of bright (foreground) pixels
  // Foreground = pixels brighter than 60% of average
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

  float aspect = (float)blobH / blobW;
  Serial.printf("[BOTTLE-CAM] Blob W=%d H=%d aspect=%.2f\n", blobW, blobH, aspect);

  // 3. Edge density (count pixels where horizontal gradient > 20)
  int edgeCount = 0;
  for (int y = 0; y < H; y++) {
    for (int x = 1; x < W; x++) {
      int grad = abs((int)p[y * W + x] - (int)p[y * W + x - 1]);
      if (grad > 20) edgeCount++;
    }
  }
  float edgeDensity = (float)edgeCount / (W * H);
  Serial.printf("[BOTTLE-CAM] Edge density: %.4f\n", edgeDensity);

  // 4. Decision
  bool isBottle = (aspect >= BOTTLE_ASPECT_MIN) && (edgeDensity >= BOTTLE_EDGE_RATIO_MIN);
  Serial.printf("[BOTTLE-CAM] Decision: %s\n", isBottle ? "BOTTLE" : "NONE");
  return isBottle;
}

// ── IDENTIFICATION ROUTINE ────────────────────────────────────────────────────
void identify() {
  Serial.println("[BOTTLE-CAM] Capture requested...");

  camera_fb_t* fb = nullptr;
  unsigned long start = millis();

  // Warm up: discard first frame (camera AEC adjustment)
  fb = esp_camera_fb_get();
  if (fb) esp_camera_fb_return(fb);
  delay(200);

  // Capture real frame
  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[BOTTLE-CAM] Frame capture FAILED");
    Serial.println("##DETECT:NONE##");
    return;
  }

  bool detected = analyzeFrame(fb);
  esp_camera_fb_return(fb);

  if (detected) {
    Serial.println("##DETECT:BOTTLE##");
  } else {
    Serial.println("##DETECT:NONE##");
  }
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(BAUD_RATE);
  delay(1000);

  // Flash LED twice
  pinMode(33, OUTPUT);
  for (int i = 0; i < 4; i++) { digitalWrite(33, i % 2 == 0 ? LOW : HIGH); delay(120); }

  Serial.println(F("[BOTTLE-CAM] Initializing camera (OV3660)..."));
  if (!initCamera()) {
    Serial.println(F("[BOTTLE-CAM] ERROR: Camera init failed! Check GPIO0 jumper."));
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
    s->set_sharpness(s, 2);       // Max sharpness — critical for edge detection
    s->set_denoise(s, 0);         // Off — we need raw edges for the algorithm
  }

  Serial.println("##STATUS:BOTTLE_CAM_READY##");
  Serial.println("[BOTTLE-CAM] Waiting for ##IDENTIFY## command from Mega...");
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
