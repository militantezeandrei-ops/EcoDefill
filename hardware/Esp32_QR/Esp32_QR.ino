/*
 * EcoDefill v3 — ESP32-CAM QR Scanner (WiFi Mode)
 * =================================================
 *
 * BOARD : AI Thinker ESP32-CAM
 *
 * ROLE:
 *   1. Connect to hotspot WiFi.
 *   2. Run HTTP server on port 80.
 *   3. GET /scan    -> start QR scanning
 *   4. GET /cancel  -> stop scanning
 *   5. GET /capture -> camera snapshot for debugging
 *   6. Valid QR -> POST token to DevKit
 *
 * QR FIX:
 *   H-Mirror = OFF
 *   V-Flip   = ON
 *
 * This configuration successfully decoded:
 *   ECO-8FC21EE5
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32QRCodeReader.h>
#include "esp_camera.h"


// =====================================================
// USER CONFIG
// =====================================================

const char* WIFI_SSID =
  "Free";

const char* WIFI_PASSWORD =
  "1234pogi";

const char* DEVKIT_IP =
  "192.168.100.100";


// =====================================================
// STATIC IP
// =====================================================

IPAddress local_IP(
  192, 168, 100, 120
);

IPAddress gateway(
  192, 168, 100, 1
);

IPAddress subnet(
  255, 255, 255, 0
);


// =====================================================
// CONFIGURATION
// =====================================================

const unsigned long WIFI_TIMEOUT_MS =
  25000;

const unsigned long SCAN_COOLDOWN_MS =
  3000;


// =====================================================
// OBJECTS / STATE
// =====================================================

WebServer server(80);

ESP32QRCodeReader reader(
  CAMERA_MODEL_AI_THINKER
);


bool scanActive = false;

String lastPayload = "";

unsigned long lastScanTime = 0;

unsigned long lastScanLogAt = 0;

int scanFrameCount = 0;


// =====================================================
// CAMERA / QR TUNING
// =====================================================

void tuneCameraForQR()
{
  sensor_t* s =
    esp_camera_sensor_get();


  if (!s)
  {
    Serial.println(
      "[QR] ERROR: Camera sensor interface unavailable"
    );

    return;
  }


  Serial.println(
    "[QR] Applying proven QR camera settings..."
  );


  // ===================================================
  // IMPORTANT QR FIX
  // ===================================================
  //
  // H-Mirror caused ECC failures during testing.
  //
  // V-Flip ON:
  //   Corrects physical upside-down mounting.
  //
  // H-Mirror OFF:
  //   Prevents mirrored QR data.
  //

  s->set_vflip(
    s,
    1
  );

  s->set_hmirror(
    s,
    0
  );


  // ===================================================
  // IMAGE SETTINGS
  // ===================================================

  s->set_brightness(
    s,
    0
  );

  s->set_contrast(
    s,
    1
  );

  s->set_saturation(
    s,
    -2
  );

  s->set_sharpness(
    s,
    1
  );


  // ===================================================
  // AUTOMATIC IMAGE CONTROL
  // ===================================================

  s->set_whitebal(
    s,
    1
  );

  s->set_awb_gain(
    s,
    1
  );

  s->set_exposure_ctrl(
    s,
    1
  );

  s->set_gain_ctrl(
    s,
    1
  );


  // ===================================================
  // IMAGE CORRECTION
  // ===================================================

  s->set_bpc(
    s,
    1
  );

  s->set_wpc(
    s,
    1
  );

  s->set_raw_gma(
    s,
    1
  );

  s->set_lenc(
    s,
    1
  );


  Serial.println(
    "[QR] Camera configured: VFLIP=ON, HMIRROR=OFF"
  );
}


// =====================================================
// POST QR TOKEN TO DEVKIT
// =====================================================

void postQRToken(
  const String& token
)
{
  if (
    WiFi.status()
      != WL_CONNECTED
  )
  {
    Serial.println(
      "[QR] Cannot POST token: WiFi disconnected"
    );

    return;
  }


  HTTPClient http;


  String url =
    "http://" +
    String(DEVKIT_IP) +
    "/qr";


  Serial.print(
    "[QR] Sending token to DevKit: "
  );

  Serial.println(token);


  http.begin(url);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.setTimeout(
    8000
  );


  StaticJsonDocument<512> doc;

  doc["token"] =
    token;


  String body;

  serializeJson(
    doc,
    body
  );


  int code =
    http.POST(body);


  Serial.printf(
    "[QR] POST /qr -> HTTP %d\n",
    code
  );


  if (code > 0)
  {
    String response =
      http.getString();

    Serial.print(
      "[QR] DevKit response: "
    );

    Serial.println(response);
  }
  else
  {
    Serial.println(
      "[QR] ERROR: Failed to contact DevKit"
    );
  }


  http.end();
}


// =====================================================
// GET /scan
// =====================================================

void handleScan()
{
  scanActive = true;
  scanFrameCount = 0;
  lastScanLogAt = millis();
  lastPayload = "";

  // Drain any lingering decoded QR codes in the reader queue
  struct QRCodeData oldData;
  while (reader.receiveQrCode(&oldData, 5)) {
    // drain
  }

  Serial.println();
  Serial.println(
    "[QR] =================================="
  );
  Serial.println(
    "[QR] SCANNING ACTIVATED"
  );
  Serial.println(
    "[QR] Show QR code to camera"
  );
  Serial.println(
    "[QR] =================================="
  );

  server.send(
    200,
    "text/plain",
    "SCAN_STARTED"
  );
}


// =====================================================
// GET /cancel
// =====================================================

void handleCancel()
{
  scanActive = false;
  lastPayload = "";

  struct QRCodeData oldData;
  while (reader.receiveQrCode(&oldData, 5)) {
    // drain
  }

  Serial.println(
    "[QR] Scan cancelled by DevKit"
  );

  server.send(
    200,
    "text/plain",
    "CANCELLED"
  );
}


// =====================================================
// GET /ping
// =====================================================

void handlePing()
{
  StaticJsonDocument<256> doc;


  doc["status"] =
    "QR_CAM_OK";

  doc["scanActive"] =
    scanActive;

  doc["wifi"] =
    (
      WiFi.status()
        == WL_CONNECTED
    )
    ?
    "connected"
    :
    "disconnected";

  doc["psram"] =
    psramFound();

  doc["freeHeap"] =
    ESP.getFreeHeap();

  doc["lastQR"] =
    lastPayload;


  String body;


  serializeJson(
    doc,
    body
  );


  server.send(
    200,
    "application/json",
    body
  );
}


// =====================================================
// GET /capture
// =====================================================
//
// Debug only.
//
// I recommend NOT repeatedly refreshing this endpoint
// while actively scanning QR codes because both use the
// camera framebuffer.
//

void handleCapture()
{
  if (scanActive)
  {
    server.send(
      409,
      "text/plain",
      "Camera busy: QR scanning active"
    );

    return;
  }


  camera_fb_t* fb =
    esp_camera_fb_get();


  if (!fb)
  {
    server.send(
      500,
      "text/plain",
      "Camera capture failed"
    );

    return;
  }


  if (
    fb->format
      == PIXFORMAT_JPEG
  )
  {
    server.setContentLength(
      fb->len
    );


    server.send(
      200,
      "image/jpeg",
      ""
    );


    WiFiClient client =
      server.client();


    client.write(
      fb->buf,
      fb->len
    );
  }

  else
  {
    uint8_t* jpgBuffer =
      NULL;

    size_t jpgLength =
      0;


    bool converted =
      frame2jpg(
        fb,
        80,
        &jpgBuffer,
        &jpgLength
      );


    if (
      converted &&
      jpgBuffer &&
      jpgLength > 0
    )
    {
      server.setContentLength(
        jpgLength
      );


      server.send(
        200,
        "image/jpeg",
        ""
      );


      WiFiClient client =
        server.client();


      client.write(
        jpgBuffer,
        jpgLength
      );


      free(
        jpgBuffer
      );
    }

    else
    {
      server.send(
        500,
        "text/plain",
        "JPEG conversion failed"
      );
    }
  }


  esp_camera_fb_return(
    fb
  );
}


// =====================================================
// WIFI
// =====================================================

void connectWiFi()
{
  Serial.print(
    "[WiFi] Connecting to "
  );

  Serial.println(
    WIFI_SSID
  );


  WiFi.mode(
    WIFI_STA
  );


  WiFi.config(
    local_IP,
    gateway,
    subnet
  );


  WiFi.setAutoReconnect(
    true
  );


  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );


  unsigned long start =
    millis();


  while (
    WiFi.status()
      != WL_CONNECTED
    &&
    millis() - start
      < WIFI_TIMEOUT_MS
  )
  {
    delay(400);

    Serial.print(".");
  }


  Serial.println();


  if (
    WiFi.status()
      == WL_CONNECTED
  )
  {
    Serial.println(
      "[WiFi] CONNECTED"
    );


    Serial.print(
      "[WiFi] IP: "
    );

    Serial.println(
      WiFi.localIP()
    );


    Serial.print(
      "[WiFi] Gateway: "
    );

    Serial.println(
      WiFi.gatewayIP()
    );


    Serial.print(
      "[WiFi] RSSI: "
    );

    Serial.print(
      WiFi.RSSI()
    );

    Serial.println(
      " dBm"
    );
  }

  else
  {
    Serial.println(
      "[WiFi] CONNECTION FAILED"
    );
  }
}


// =====================================================
// SETUP
// =====================================================

void setup()
{
  Serial.begin(
    115200
  );


  Serial.setTimeout(
    50
  );


  delay(
    1500
  );


  Serial.println();

  Serial.println(
    "========================================"
  );

  Serial.println(
    " EcoDefill QR CAM - PRODUCTION"
  );

  Serial.println(
    "========================================"
  );


  // ===================================================
  // PSRAM CHECK
  // ===================================================

  Serial.print(
    "[QR] PSRAM: "
  );


  if (
    psramFound()
  )
  {
    Serial.println(
      "YES"
    );


    Serial.print(
      "[QR] PSRAM size: "
    );

    Serial.print(
      ESP.getPsramSize()
        / 1024
    );

    Serial.println(
      " KB"
    );
  }

  else
  {
    Serial.println(
      "NO"
    );


    Serial.println(
      "[QR] WARNING: QR decoding requires PSRAM"
    );
  }


  Serial.print(
    "[QR] Free heap: "
  );

  Serial.print(
    ESP.getFreeHeap()
      / 1024
  );

  Serial.println(
    " KB"
  );


  // ===================================================
  // STATUS LED
  // ===================================================

  pinMode(
    33,
    OUTPUT
  );


  for (
    int i = 0;
    i < 8;
    i++
  )
  {
    digitalWrite(
      33,
      i % 2 == 0
        ? LOW
        : HIGH
    );


    delay(
      150
    );
  }


  digitalWrite(
    33,
    HIGH
  );


  // ===================================================
  // WIFI
  // ===================================================

  Serial.println();

  Serial.println(
    "[QR] Connecting WiFi..."
  );


  int wifiAttempts =
    0;


  while (
    WiFi.status()
      != WL_CONNECTED
    &&
    wifiAttempts < 3
  )
  {
    connectWiFi();


    if (
      WiFi.status()
        != WL_CONNECTED
    )
    {
      wifiAttempts++;


      Serial.printf(
        "[WiFi] Retry %d/3 in 5 seconds...\n",
        wifiAttempts
      );


      delay(
        5000
      );
    }
  }


  // ===================================================
  // QR CAMERA
  // ===================================================

  Serial.println();

  Serial.println(
    "[QR] Initializing QR camera..."
  );


  reader.debug =
    false;


  reader.setup();


  delay(
    1000
  );


  // Apply the configuration that successfully decoded
  // ECO-8FC21EE5

  tuneCameraForQR();


  // IMPORTANT:
  // Use same core configuration as successful test.

  reader.beginOnCore(
    1
  );


  Serial.println(
    "[QR] QR decoder started on Core 1"
  );


  // ===================================================
  // HTTP SERVER
  // ===================================================

  server.on(
    "/scan",
    HTTP_GET,
    handleScan
  );


  server.on(
    "/cancel",
    HTTP_GET,
    handleCancel
  );


  server.on(
    "/ping",
    HTTP_GET,
    handlePing
  );


  server.on(
    "/capture",
    HTTP_GET,
    handleCapture
  );


  server.begin();


  Serial.println();

  Serial.println(
    "[QR] HTTP server started"
  );


  Serial.println(
    "[QR] Endpoints:"
  );

  Serial.println(
    "     /scan"
  );

  Serial.println(
    "     /cancel"
  );

  Serial.println(
    "     /ping"
  );

  Serial.println(
    "     /capture"
  );


  Serial.println();

  Serial.print(
    "[QR] Camera IP: http://"
  );

  Serial.println(
    WiFi.localIP()
  );


  Serial.println();

  Serial.println(
    "[QR] READY"
  );

  Serial.println(
    "[QR] Waiting for /scan from DevKit..."
  );
}


// =====================================================
// MAIN LOOP
// =====================================================

void loop()
{
  // Keep HTTP server responsive

  server.handleClient();


  // ===================================================
  // WIFI WATCHDOG
  // ===================================================

  if (
    WiFi.status()
      != WL_CONNECTED
  )
  {
    scanActive =
      false;


    Serial.println(
      "[WiFi] Connection lost."
    );


    connectWiFi();


    delay(
      50
    );

    return;
  }


  // ===================================================
  // IDLE
  // ===================================================

  if (
    !scanActive
  )
  {
    delay(
      10
    );

    return;
  }


  // ===================================================
  // SCANNING HEARTBEAT
  // ===================================================

  scanFrameCount++;


  if (
    millis()
      - lastScanLogAt
      >= 1500
  )
  {
    lastScanLogAt =
      millis();


    Serial.printf(
      "[QR] Scanning... attempts=%d heap=%d KB\n",
      scanFrameCount,
      ESP.getFreeHeap() / 1024
    );
  }


  // ===================================================
  // READ QR RESULT
  // ===================================================

  struct QRCodeData qrCodeData;


  if (
    !reader.receiveQrCode(
      &qrCodeData,
      100
    )
  )
  {
    delay(
      5
    );

    return;
  }


  // ===================================================
  // VALID QR
  // ===================================================

  if (
    qrCodeData.valid &&
    qrCodeData.payloadLen > 0
  )
  {
    String payload =
      "";


    for (
      int i = 0;
      i < qrCodeData.payloadLen;
      i++
    )
    {
      payload +=
        (char)
        qrCodeData.payload[i];
    }


    payload.trim();


    if (
      payload.length()
        > 0
    )
    {
      unsigned long now =
        millis();


      bool isDuplicate =
        (
          payload
            == lastPayload
        )
        &&
        (
          now
            - lastScanTime
            <= SCAN_COOLDOWN_MS
        );


      if (
        !isDuplicate
      )
      {
        lastPayload =
          payload;


        lastScanTime =
          now;


        // Stop immediately after one valid scan.

        scanActive =
          false;


        Serial.println();

        Serial.println(
          "========================================"
        );

        Serial.println(
          "[QR] DECODE SUCCESS"
        );


        Serial.print(
          "[QR] Token: "
        );

        Serial.println(
          payload
        );


        Serial.print(
          "[QR] Length: "
        );

        Serial.println(
          payload.length()
        );


        Serial.println(
          "========================================"
        );


        // Send token to DevKit

        postQRToken(
          payload
        );


        Serial.println(
          "[QR] Scan finished. Waiting for next /scan."
        );
      }

      else
      {
        Serial.println(
          "[QR] Duplicate token ignored."
        );
      }
    }
  }

  // ===================================================
  // INVALID QR
  // ===================================================

  else
  {
    Serial.print(
      "[QR] Decode failed: "
    );


    if (
      qrCodeData.payloadLen > 0
    )
    {
      for (
        int i = 0;
        i < qrCodeData.payloadLen;
        i++
      )
      {
        Serial.print(
          (char)
          qrCodeData.payload[i]
        );
      }
    }

    else
    {
      Serial.print(
        "Unknown decoder error"
      );
    }


    Serial.println();
  }


  delay(
    5
  );
}