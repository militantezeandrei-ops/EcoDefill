/*
 * EcoDefill - ESP32-CAM QR + Live Stream (single camera owner)
 * =============================================================
 * Port 80: Status Page
 * Port 81: MJPEG Stream
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <esp_camera.h>
#include <img_converters.h>
#include "quirc/quirc.h"

const char* WIFI_SSID     = "militante";
const char* WIFI_PASSWORD = "militante22";

WebServer  httpServer(80);
WiFiServer streamServer(81);

String lastScanned = "";
unsigned long lastScanTime = 0;
const unsigned long SCAN_COOLDOWN_MS = 3000;

struct quirc* qrDecoder = nullptr;
uint16_t qrWidth = 0;
uint16_t qrHeight = 0;

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;

  // AI Thinker ESP32-CAM pins
  config.pin_d0       = 5;
  config.pin_d1       = 18;
  config.pin_d2       = 19;
  config.pin_d3       = 21;
  config.pin_d4       = 36;
  config.pin_d5       = 39;
  config.pin_d6       = 34;
  config.pin_d7       = 35;
  config.pin_xclk     = 0;
  config.pin_pclk     = 22;
  config.pin_vsync    = 25;
  config.pin_href     = 23;
  config.pin_sccb_sda = 26;
  config.pin_sccb_scl = 27;
  config.pin_pwdn     = 32;
  config.pin_reset    = -1;

  // Grayscale for fast QR decode; stream converts to JPEG.
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_GRAYSCALE;
  config.frame_size   = FRAMESIZE_QVGA;
  config.jpeg_quality = 15;
  config.fb_count     = 1;
  config.grab_mode    = CAMERA_GRAB_LATEST;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) return false;

  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_framesize(s, FRAMESIZE_QVGA);
    s->set_brightness(s, 1);
    s->set_contrast(s, 2);
    s->set_hmirror(s, 0);
    s->set_vflip(s, 0);
  }
  return true;
}

void decodeQrFromFrame(camera_fb_t* fb) {
  if (!qrDecoder || !fb || fb->format != PIXFORMAT_GRAYSCALE) return;

  if (qrWidth != fb->width || qrHeight != fb->height) {
    if (quirc_resize(qrDecoder, fb->width, fb->height) < 0) return;
    qrWidth = fb->width;
    qrHeight = fb->height;
  }

  uint8_t* image = quirc_begin(qrDecoder, nullptr, nullptr);
  if (!image) return;
  memcpy(image, fb->buf, fb->len);
  quirc_end(qrDecoder);

  int count = quirc_count(qrDecoder);
  if (count <= 0) return;

  for (int i = 0; i < count; i++) {
    struct quirc_code code;
    struct quirc_data data;
    quirc_decode_error_t err;

    quirc_extract(qrDecoder, i, &code);
    err = quirc_decode(&code, &data);
    if (err) continue;

    String token = "";
    for (int j = 0; j < data.payload_len; j++) {
      token += (char)data.payload[j];
    }
    token.trim();

    if (token.length() == 0) continue;
    if (token != lastScanned || (millis() - lastScanTime > SCAN_COOLDOWN_MS)) {
      Serial.println(token); // Send to main ESP32 through UART
      lastScanned = token;
      lastScanTime = millis();
    }
  }
}

void streamAndScanTask(void* pv) {
  WiFiClient client;
  bool hasClient = false;
  uint32_t frameCount = 0;
  unsigned long lastFpsLogMs = millis();

  while (true) {
    if (!hasClient) {
      WiFiClient incoming = streamServer.available();
      if (incoming) {
        client = incoming;
        hasClient = true;
        Serial.println("[STREAM] Client connected");

        unsigned long headerEnd = millis() + 2000;
        while (client.connected() && millis() < headerEnd) {
          if (!client.available()) {
            vTaskDelay(1 / portTICK_PERIOD_MS);
            continue;
          }
          String line = client.readStringUntil('\n');
          if (line == "\r" || line.length() == 0) break;
        }

        client.print(
          "HTTP/1.1 200 OK\r\n"
          "Content-Type: multipart/x-mixed-replace;boundary=frame\r\n"
          "Cache-Control: no-cache, no-store, must-revalidate\r\n"
          "Connection: close\r\n"
          "\r\n"
        );
      }
    }

    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      vTaskDelay(5 / portTICK_PERIOD_MS);
      continue;
    }

    // Decode QR from the same frame used for stream.
    decodeQrFromFrame(fb);

    if (hasClient && client.connected()) {
      uint8_t* jpgBuf = nullptr;
      size_t jpgLen = 0;
      if (frame2jpg(fb, 15, &jpgBuf, &jpgLen)) {
        client.printf(
          "--frame\r\n"
          "Content-Type: image/jpeg\r\n"
          "Content-Length: %u\r\n"
          "\r\n",
          (unsigned)jpgLen
        );
        client.write(jpgBuf, jpgLen);
        client.print("\r\n");
        free(jpgBuf);

        frameCount++;
        unsigned long nowMs = millis();
        if (nowMs - lastFpsLogMs >= 1000) {
          Serial.printf("[STREAM] fps=%lu\n", (unsigned long)frameCount);
          frameCount = 0;
          lastFpsLogMs = nowMs;
        }
      } else {
        Serial.println("[STREAM] frame2jpg failed");
      }
    } else if (hasClient) {
      client.stop();
      hasClient = false;
      Serial.println("[STREAM] Client disconnected");
    }

    esp_camera_fb_return(fb);
    vTaskDelay(1 / portTICK_PERIOD_MS);
  }
}

void setup() {
  Serial.begin(115200);

  if (!initCamera()) {
    while (1) {
      Serial.println("Camera init failed");
      delay(1000);
    }
  }

  qrDecoder = quirc_new();
  if (!qrDecoder) {
    while (1) {
      Serial.println("QR decoder init failed");
      delay(1000);
    }
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  String ip = WiFi.localIP().toString();
  Serial.println("\nIP: " + ip);
  Serial.println("Status page: http://" + ip + "/");
  Serial.println("MJPEG stream: http://" + ip + ":81/");

  httpServer.on("/", []() {
    String ip = WiFi.localIP().toString();
    String html = "<html><body style='background:#000;color:#fff;text-align:center;'>";
    html += "<h1>EcoDefill Live + QR Scan</h1>";
    html += "<p>Scanning and streaming run together from same frame.</p>";
    html += "<img src='http://" + ip + ":81' style='width:100%;max-width:600px;'>";
    html += "</body></html>";
    httpServer.send(200, "text/html", html);
  });
  httpServer.begin();
  streamServer.begin();

  xTaskCreatePinnedToCore(streamAndScanTask, "cam_loop", 8192, nullptr, 2, nullptr, 1);
}

void loop() {
  httpServer.handleClient();
  vTaskDelay(5 / portTICK_PERIOD_MS);
}

