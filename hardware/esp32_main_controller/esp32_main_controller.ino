/*
 * EcoDefill v3 — ESP32 DevKit V1 — WiFi Hub & API Bridge
 * ========================================================
 * POWER  : 5V via USB Type-C
 * BOARD  : DOIT ESP32 DEVKIT V1
 *
 * ROLE:
 *   1. Runs a local HTTP server on port 80 (local WiFi network)
 *      that the 3 ESP32-CAMs POST their results to.
 *   2. Forwards camera results to Arduino Mega via Serial2 (UART).
 *   3. Receives commands from Mega via Serial2 and calls backend API.
 *   4. Replies to Mega with DISPENSE / EARN / RESULT messages.
 *
 * HTTP ENDPOINTS (for ESP32-CAMs):
 *   POST /detect   body: {"cam":"BOTTLE","result":"BOTTLE"}  or {"cam":"BOTTLE","result":"NONE"}
 *   POST /detect   body: {"cam":"CUP","result":"CUP"}        or {"cam":"CUP","result":"NONE"}
 *   POST /qr       body: {"token":"<qr_payload>"}
 *   POST /qrscan   body: {} — triggers QR-CAM to scan (Dev Kit sends to QR-CAM via WiFi)
 *
 * UART PROTOCOL (Mega ↔ DevKit via Serial2):
 *   Mega  → DevKit : "CMD:EARN_ANON|<type>|<pts>\n"   Anonymous earn log
 *                    "CMD:DISPENSE_LOCAL|<pts>\n"       Local dispense (no QR)
 *                    "CMD:SCAN_QR\n"                    Trigger QR scan mode
 *                    "CMD:CANCEL_QR\n"                  Cancel QR scan mode
 *   DevKit → Mega  : "CAM:BOTTLE:VALID\n"              Bottle confirmed
 *                    "CAM:BOTTLE:INVALID\n"             Not a bottle
 *                    "CAM:CUP:VALID\n"                  Cup confirmed
 *                    "CAM:CUP:INVALID\n"                Not a cup
 *                    "QR:RECEIVE:<pts>|<name>\n"          QR scan → transfer local points to app
 *                    "QR:REDEEM:<ms>|<name>|<pts>\n"     QR scan → redeem water result
 *                    "QR:FAIL\n"                        QR rejected
 *
 * WIRING:
 *   Mega TX1 (pin 18) → DevKit GPIO16 (RX2)  [5V→3.3V: use 1kΩ/2kΩ divider]
 *   DevKit GPIO17 (TX2) → Mega RX1 (pin 19)  [3.3V→5V: safe, no resistor]
 *   Common GND
 *
 * LIBRARIES (install via Library Manager):
 *   ArduinoJson  by Benoit Blanchon (v6 or v7)
 *   WebServer    (bundled with ESP32 Arduino core)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ── USER CONFIG ───────────────────────────────────────────────────────────────
const char* WIFI_SSID       = "Free";
const char* WIFI_PASSWORD   = "1234pogi";
const char* SERVER_BASE_URL = "https://eco-defill.vercel.app";
const char* SERVER_HOST     = "eco-defill.vercel.app";
const char* MACHINE_ID      = "MACHINE_01";

// IPs of each CAM on the WiFi LAN (must match static IPs in each CAM firmware)
const char* BOTTLE_CAM_IP   = "192.168.100.110";  // ← Must match Bottle CAM static IP
const char* CUP_CAM_IP      = "192.168.100.111";  // ← Must match Cup CAM static IP
const char* QR_CAM_IP       = "192.168.100.120";  // ← Must match QR-CAM static IP
IPAddress DEVKIT_LOCAL_IP(192, 168, 100, 100);
IPAddress DEVKIT_GATEWAY(192, 168, 100, 1);   // Real hotspot gateway (confirmed)
IPAddress DEVKIT_SUBNET(255, 255, 255, 0);
IPAddress DEVKIT_DNS1(8, 8, 8, 8);    // Google DNS primary
IPAddress DEVKIT_DNS2(8, 8, 4, 4);    // Google DNS fallback

// ── PINS ──────────────────────────────────────────────────────────────────────
const int LED_PIN = 2;   // Built-in LED

// ── TIMING ────────────────────────────────────────────────────────────────────
const unsigned long WIFI_TIMEOUT_MS  = 20000;
const unsigned long HTTP_TIMEOUT_MS  = 20000;
const unsigned long QR_CANCEL_GUARD_MS = 2000;
const unsigned long CAM_RESULT_TIMEOUT_MS = 12000;
const unsigned long QR_TOKEN_DUPLICATE_WINDOW_MS = 20000;
const unsigned long QR_RESTART_DELAY_MS = 1500;

// ── STATE ─────────────────────────────────────────────────────────────────────
WebServer server(80);
String serial2Buf  = "";
bool   qrModeActive = false;   // True when Mega wants QR scan
unsigned long qrScanActivatedAt = 0;
int qrScanRequestedPoints = 0;
String lastQrToken = "";
unsigned long lastQrTokenAt = 0;
bool restartPending = false;
unsigned long restartAt = 0;
bool bottleDetectPending = false;
bool cupDetectPending = false;
unsigned long bottleDetectRequestedAt = 0;
unsigned long cupDetectRequestedAt = 0;

// ── HELPERS ───────────────────────────────────────────────────────────────────
void blink(int n, int ms = 100) {
  for (int i = 0; i < n; i++) {
    digitalWrite(LED_PIN, HIGH); delay(ms);
    digitalWrite(LED_PIN, LOW);  delay(ms);
  }
}

bool connectWiFi() {
  Serial.print("[WiFi] Connecting to "); Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  if (!WiFi.config(DEVKIT_LOCAL_IP, DEVKIT_GATEWAY, DEVKIT_SUBNET, DEVKIT_DNS1, DEVKIT_DNS2)) {
    Serial.println("[WiFi] Static IP config failed");
  }
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(400); Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Connected.  IP      : "); Serial.println(WiFi.localIP());
    Serial.print("[WiFi]             Gateway : "); Serial.println(WiFi.gatewayIP());
    Serial.print("[WiFi]             DNS1    : "); Serial.println(WiFi.dnsIP(0));
    Serial.print("[WiFi]             DNS2    : "); Serial.println(WiFi.dnsIP(1));
    digitalWrite(LED_PIN, HIGH);
    return true;
  }
  Serial.println("[WiFi] FAILED");
  blink(10, 50);
  return false;
}

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  return connectWiFi();
}

void logHttpTransportFailure(const char* label, HTTPClient& http, int code) {
  Serial.printf("[HTTP] %s transport failure: %d (%s)\n",
                label,
                code,
                http.errorToString(code).c_str());
  Serial.print("[HTTP] WiFi status: ");
  Serial.println(WiFi.status());
  Serial.print("[HTTP] Local IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[HTTP] DNS1: ");
  Serial.println(WiFi.dnsIP(0));
  Serial.print("[HTTP] DNS2: ");
  Serial.println(WiFi.dnsIP(1));
}

void logBackendReachability(const char* phase) {
  IPAddress resolvedIp;
  int dnsResult = WiFi.hostByName(SERVER_HOST, resolvedIp);
  Serial.printf("[NET] %s DNS %s -> %d", phase, SERVER_HOST, dnsResult);
  if (dnsResult == 1) {
    Serial.print(" ip=");
    Serial.print(resolvedIp);
  }
  Serial.println();

  WiFiClient tcpClient;
  bool tcpOk = tcpClient.connect(SERVER_HOST, 443);
  Serial.printf("[NET] %s TCP %s:443 -> %s\n",
                phase,
                SERVER_HOST,
                tcpOk ? "OK" : "FAIL");
  if (tcpOk) {
    tcpClient.stop();
  }

  WiFiClientSecure tlsClient;
  tlsClient.setInsecure();
  bool tlsOk = tlsClient.connect(SERVER_HOST, 443);
  Serial.printf("[NET] %s TLS %s:443 -> %s\n",
                phase,
                SERVER_HOST,
                tlsOk ? "OK" : "FAIL");
  if (tlsOk) {
    tlsClient.stop();
  }
}

String normalizeMegaCommand(const String& raw) {
  int cmdStart = raw.indexOf("CMD:");
  if (cmdStart < 0) {
    return "";
  }

  String cleaned = raw.substring(cmdStart);
  cleaned.trim();
  return cleaned;
}

String sanitizeMegaSegment(const String& raw) {
  String out = "";
  for (size_t i = 0; i < raw.length(); ++i) {
    char c = raw.charAt(i);
    const bool allowed =
      (c >= 'A' && c <= 'Z') ||
      (c >= 'a' && c <= 'z') ||
      (c >= '0' && c <= '9') ||
      c == ':' || c == '_' || c == '|';

    if (allowed) {
      out += c;
    }
  }
  out.trim();
  return out;
}

String normalizeQrToken(String token) {
  token.trim();
  if (token.startsWith("eco-") || token.startsWith("ECO-")) {
    token.toUpperCase();
  }
  return token;
}

bool isPrintableSerialByte(char ch) {
  return ch >= 32 && ch <= 126;
}

void scheduleRestartAfterQR(const char* reason) {
  restartPending = true;
  restartAt = millis() + QR_RESTART_DELAY_MS;
  Serial.printf("[DEV] Restart scheduled after QR flow (%s)\n", reason);
}

void processMegaCommand(const String& cmd) {
  Serial.print("[MEGA→] "); Serial.println(cmd);

  if (cmd == "CMD:IDENTIFY_BOTTLE") {
    triggerBottleCam();

  } else if (cmd == "CMD:IDENTIFY_CUP") {
    triggerCupCam();

  } else if (cmd == "CMD:SCAN_QR" || cmd.startsWith("CMD:SCAN_QR|")) {
    qrModeActive = true;
    qrScanActivatedAt = millis();
    qrScanRequestedPoints = 0;
    int sep = cmd.indexOf('|');
    if (sep > 0) {
      qrScanRequestedPoints = cmd.substring(sep + 1).toInt();
    }
    triggerQRCam();

  } else if (cmd == "CMD:CANCEL_QR") {
    if (qrModeActive && (millis() - qrScanActivatedAt) < QR_CANCEL_GUARD_MS) {
      Serial.println("[MEGA→] Ignored early CMD:CANCEL_QR");
      return;
    }
    qrModeActive = false;
    qrScanActivatedAt = 0;
    qrScanRequestedPoints = 0;
    cancelQRCam();

  } else if (cmd.startsWith("CMD:EARN_ANON|")) {
    String rest = cmd.substring(14);
    int sep = rest.indexOf('|');
    if (sep > 0) {
      String type = rest.substring(0, sep);
      int pts = rest.substring(sep + 1).toInt();
      apiEarnAnon(type, pts);
    }
  } else {
    Serial.println("[MEGA→] Ignored unrecognized command");
  }
}

// ── MEGA COMMUNICATION ────────────────────────────────────────────────────────
void toMega(const String& msg) {
  Serial.print("[→MEGA] "); Serial.println(msg);
  Serial2.println(msg);
}

// ── BACKEND: VERIFY QR TOKEN ─────────────────────────────────────────────────
// Sends token to /api/verify-qr
// Backend REDEEM response: { success:true, waterAmount:<ml>, pointsDeducted:<N>, userName:"..." }
// Backend EARN   response: { success:true, waterAmount:0,   pointsDeducted:<-N>, userName:"..." }
void apiVerifyQR(const String& token, int pointsToTransfer) {
  if (!ensureWiFi()) {
    toMega("QR:FAIL");
    scheduleRestartAfterQR("wifi-unavailable");
    return;
  }

  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  http.begin(client, String(SERVER_BASE_URL) + "/api/verify-qr");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  StaticJsonDocument<256> req;
  req["token"]     = token;
  req["machineId"] = MACHINE_ID;
  req["amount"]    = pointsToTransfer;
  String body; serializeJson(req, body);

  Serial.print("[HTTP] POST verify-qr: "); Serial.println(body);
  int code = http.POST(body);
  String resp = code > 0 ? http.getString() : "";
  if (code <= 0) {
    logHttpTransportFailure("verify-qr", http, code);
    logBackendReachability("verify-qr");
  }
  http.end();
  Serial.printf("[HTTP] verify-qr → %d %s\n", code, resp.c_str());

  if (code != 200) {
    toMega("QR:FAIL");
    scheduleRestartAfterQR("verify-http-fail");
    return;
  }

  StaticJsonDocument<512> res;
  if (deserializeJson(res, resp)) {
    toMega("QR:FAIL");
    scheduleRestartAfterQR("verify-json-fail");
    return;
  }

  // Student name from backend. Mega LCD will display this.
  String userName = res["userName"] | "Student";
  userName.replace("|", " ");     // keep UART separator safe
  userName.trim();
  if (userName.length() == 0) userName = "Student";

  // ── REDEEM path ───────────────────────────────────────────────────────────
  // Backend returns waterAmount in ml. Convert ml → ms for Mega.
  // ML_PER_POINT = 100, MS_PER_100ML = 2000 → 1 ml = 20 ms
  int waterAmountMl = res["waterAmount"] | 0;
  int pointsDeducted = res["pointsDeducted"] | 0;

  if (waterAmountMl > 0) {
    int dispenseMs = waterAmountMl * 20;  // 100ml = 2000ms (20ms per ml)
    int redeemedPts = pointsDeducted;
    if (redeemedPts < 0) redeemedPts = -redeemedPts;
    if (redeemedPts <= 0) redeemedPts = waterAmountMl / 100;

    // Clear duplicate guard so a newly generated QR is not falsely blocked
    lastQrToken = "";
    lastQrTokenAt = 0;

    // Format: QR:REDEEM:<dispenseMs>|<studentName>|<redeemedPoints>
    toMega("QR:REDEEM:" + String(dispenseMs) + "|" + userName + "|" + String(redeemedPts));
    blink(3, 100);
    scheduleRestartAfterQR("redeem-complete");
    return;
  }

  // ── RECEIVE / TRANSFER path ───────────────────────────────────────────────
  // pointsDeducted is negative when points are received by app from machine.
  if (pointsDeducted < 0) {
    int pts = -pointsDeducted;

    // Clear duplicate guard so a freshly generated earn QR is not blocked
    lastQrToken = "";
    lastQrTokenAt = 0;

    // Format: QR:RECEIVE:<points>|<studentName>
    toMega("QR:RECEIVE:" + String(pts) + "|" + userName);
    blink(2, 80);
    scheduleRestartAfterQR("receive-complete");
    return;
  }

  toMega("QR:FAIL");
  scheduleRestartAfterQR("verify-no-result");
}

// ── BACKEND: ANONYMOUS EARN LOG ───────────────────────────────────────────────
void apiEarnAnon(const String& itemType, int pts) {
  if (!ensureWiFi()) return;

  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  http.begin(client, String(SERVER_BASE_URL) + "/api/add-point");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  StaticJsonDocument<256> req;
  req["machineId"] = MACHINE_ID;
  req["itemType"]  = itemType;
  req["amount"]    = pts;
  String body; serializeJson(req, body);

  int code = http.POST(body);
  if (code <= 0) {
    logHttpTransportFailure("earn-anon", http, code);
    logBackendReachability("earn-anon");
  }
  http.end();
  Serial.printf("[HTTP] earn-anon %s %dpts → %d\n", itemType.c_str(), pts, code);
}

// ── QR-CAM TRIGGER (tell QR-CAM to scan) ─────────────────────────────────────
// ── ITEM CAM TRIGGERS ───────────────────────────────────────────────────────
// GET /identify on Bottle CAM — CAM captures, analyzes, POSTs result back here
void triggerBottleCam() {
  if (!ensureWiFi()) {
    bottleDetectPending = false;
    toMega("CAM:BOTTLE:INVALID");
    return;
  }
  bottleDetectPending = true;
  bottleDetectRequestedAt = millis();
  HTTPClient http;
  String url = "http://" + String(BOTTLE_CAM_IP) + "/identify";
  http.begin(url);
  http.setTimeout(10000);
  int code = http.GET();
  http.end();
  Serial.printf("[DEV] Triggered Bottle CAM /identify → HTTP %d\n", code);
  if (code != 200) {
    bottleDetectPending = false;
    bottleDetectRequestedAt = 0;
    toMega("CAM:BOTTLE:INVALID");
  }
  // On success, result comes back asynchronously via POST /detect
}

// GET /identify on Cup CAM
void triggerCupCam() {
  if (!ensureWiFi()) {
    cupDetectPending = false;
    toMega("CAM:CUP:INVALID");
    return;
  }
  cupDetectPending = true;
  cupDetectRequestedAt = millis();
  HTTPClient http;
  String url = "http://" + String(CUP_CAM_IP) + "/identify";
  http.begin(url);
  http.setTimeout(10000);
  int code = http.GET();
  http.end();
  Serial.printf("[DEV] Triggered Cup CAM /identify → HTTP %d\n", code);
  if (code != 200) {
    cupDetectPending = false;
    cupDetectRequestedAt = 0;
    toMega("CAM:CUP:INVALID");
  }
}

void triggerQRCam() {
  if (!ensureWiFi()) return;
  HTTPClient http;
  String url = "http://" + String(QR_CAM_IP) + "/scan";
  http.begin(url);
  http.setTimeout(5000);
  int code = http.GET();
  http.end();
  Serial.printf("[DEV] Triggered QR-CAM scan → HTTP %d\n", code);
  if (code != 200) logQRCamPing("scan");
}

void cancelQRCam() {
  if (!ensureWiFi()) return;
  HTTPClient http;
  String url = "http://" + String(QR_CAM_IP) + "/cancel";
  http.begin(url);
  http.setTimeout(5000);
  int code = http.GET();
  http.end();
  Serial.printf("[DEV] Cancelled QR-CAM scan → HTTP %d\n", code);
  if (code != 200) logQRCamPing("cancel");
}

void logQRCamPing(const char* phase) {
  if (!ensureWiFi()) {
    Serial.printf("[DEV] QR-CAM /ping during %s → WiFi unavailable\n", phase);
    return;
  }

  HTTPClient http;
  String url = "http://" + String(QR_CAM_IP) + "/ping";
  http.begin(url);
  http.setTimeout(3000);

  int code = http.GET();
  String body = code > 0 ? http.getString() : "";
  http.end();

  Serial.printf("[DEV] QR-CAM /ping during %s → HTTP %d", phase, code);
  if (body.length() > 0) {
    Serial.print(" body=");
    Serial.print(body);
  }
  Serial.println();
}

// ── HTTP SERVER HANDLERS ──────────────────────────────────────────────────────

// POST /detect  — Bottle or Cup CAM sends detection result here
// Body JSON: { "cam": "BOTTLE", "result": "BOTTLE" }
//            { "cam": "CUP",    "result": "CUP" }
//            { "cam": "BOTTLE", "result": "NONE" }
void handleDetect() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "POST only");
    return;
  }

  String body = server.arg("plain");
  StaticJsonDocument<128> doc;
  if (deserializeJson(doc, body)) {
    server.send(400, "text/plain", "Bad JSON");
    return;
  }

  String cam    = doc["cam"]    | "";
  String result = doc["result"] | "";
  cam.toUpperCase();
  result.toUpperCase();

  Serial.printf("[HTTP] /detect  cam=%s result=%s\n", cam.c_str(), result.c_str());

  if (cam == "BOTTLE") {
    if (!bottleDetectPending) {
      Serial.println("[HTTP] /detect  ignored stale BOTTLE result");
      server.send(200, "text/plain", "IGNORED");
      return;
    }
    bottleDetectPending = false;
    bottleDetectRequestedAt = 0;
    if (result == "BOTTLE") {
      toMega("CAM:BOTTLE:VALID");
    } else {
      toMega("CAM:BOTTLE:INVALID");
    }
  } else if (cam == "CUP") {
    if (!cupDetectPending) {
      Serial.println("[HTTP] /detect  ignored stale CUP result");
      server.send(200, "text/plain", "IGNORED");
      return;
    }
    cupDetectPending = false;
    cupDetectRequestedAt = 0;
    if (result == "CUP") {
      toMega("CAM:CUP:VALID");
    } else {
      toMega("CAM:CUP:INVALID");
    }
  }

  server.send(200, "text/plain", "OK");
}

// POST /qr  — QR-CAM sends scanned token here
// Body JSON: { "token": "<qr_payload>" }
void handleQR() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "POST only");
    return;
  }

  String body = server.arg("plain");
  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, body)) {
    server.send(400, "text/plain", "Bad JSON");
    return;
  }

  String token = doc["token"] | "";
  token = normalizeQrToken(token);
  Serial.print("[HTTP] /qr  token: "); Serial.println(token.substring(0, 20));

  server.send(200, "text/plain", "OK");  // Respond fast before blocking API call

  if (token.length() >= 8) {
    const unsigned long now = millis();
    const bool isRecentDuplicate =
      (token == lastQrToken) &&
      ((now - lastQrTokenAt) <= QR_TOKEN_DUPLICATE_WINDOW_MS);

    if (isRecentDuplicate) {
      Serial.println("[HTTP] /qr  duplicate token suppressed");
      if (qrModeActive) {
        qrModeActive = false;
        qrScanActivatedAt = 0;
        qrScanRequestedPoints = 0;
        toMega("QR:FAIL");
        scheduleRestartAfterQR("duplicate-token");
      }
      return;
    }

    if (qrModeActive) {
      // Normal path: Mega triggered a QR scan and QR-CAM found a code
      int pointsToTransfer = qrScanRequestedPoints;
      lastQrToken = token;
      lastQrTokenAt = now;
      qrModeActive = false;
      qrScanActivatedAt = 0;
      qrScanRequestedPoints = 0;
      toMega("QR:FOUND");
      delay(50);
      apiVerifyQR(token, pointsToTransfer);
    } else {
      // Token arrived but Mega didn't request a scan (race/stale scan)
      // Notify Mega so the LCD doesn't hang
      Serial.println("[HTTP] /qr  WARNING: token received but qrModeActive=false — sending QR:FAIL");
      qrScanRequestedPoints = 0;
      toMega("QR:FAIL");
      scheduleRestartAfterQR("stale-token");
    }
  }
}

// GET /ping  — CAMs can check connectivity
void handlePing() {
  server.send(200, "text/plain", "PONG");
}

// ── COMMAND PARSER (Mega → DevKit via Serial2) ────────────────────────────────
void handleMegaCommand(const String& line) {
  Serial.print("[MEGA RAW→] ");
  Serial.println(line);

  String raw = normalizeMegaCommand(line);
  if (raw.length() == 0) {
    Serial.println("[MEGA→] Ignored non-command serial noise");
    return;
  }

  int start = 0;
  bool handledAny = false;

  while (true) {
    int cmdStart = raw.indexOf("CMD:", start);
    if (cmdStart < 0) {
      break;
    }

    int nextCmd = raw.indexOf("CMD:", cmdStart + 4);

    String segment = (nextCmd < 0)
                       ? raw.substring(cmdStart)
                       : raw.substring(cmdStart, nextCmd);

    String cmd = sanitizeMegaSegment(segment);

    cmd.trim();

    int idx = cmd.indexOf("CMD:");
    if (idx >= 0) {
      cmd = cmd.substring(idx);
    }

    if (cmd.length() > 0) {
      handledAny = true;
      processMegaCommand(cmd);
    }

    if (nextCmd < 0) {
      break;
    }

    start = nextCmd;
  }

  if (!handledAny) {
    Serial.println("[MEGA→] Ignored non-command serial noise");
  }
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("[DEVKIT] EcoDefill v3 booting...");

  // Serial2 = UART link to Mega (RX2=GPIO16, TX2=GPIO17)
  Serial2.begin(9600, SERIAL_8N1, 16, 17);
  Serial2.setTimeout(20);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  connectWiFi();

  // Register HTTP endpoints
  server.on("/detect", handleDetect);
  server.on("/qr",     handleQR);
  server.on("/ping",   handlePing);
  server.begin();

  Serial.println("[DEVKIT] HTTP server started on port 80");
  Serial.print("[DEVKIT] DevKit IP: "); Serial.println(WiFi.localIP());
  Serial.print("[DEVKIT] QR-CAM target IP: "); Serial.println(QR_CAM_IP);
  logQRCamPing("startup");
  Serial.println("[DEVKIT] Ready. Waiting for Mega commands...");
}

// ── LOOP ──────────────────────────────────────────────────────────────────────
void loop() {
  // Serve incoming HTTP requests from CAMs
  server.handleClient();

  // WiFi watchdog
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_PIN, LOW);
    connectWiFi();
  }

  const unsigned long now = millis();
  if (bottleDetectPending &&
      (now - bottleDetectRequestedAt) > CAM_RESULT_TIMEOUT_MS) {
    bottleDetectPending = false;
    bottleDetectRequestedAt = 0;
    Serial.println("[DEV] Bottle CAM result window expired");
  }
  if (cupDetectPending &&
      (now - cupDetectRequestedAt) > CAM_RESULT_TIMEOUT_MS) {
    cupDetectPending = false;
    cupDetectRequestedAt = 0;
    Serial.println("[DEV] Cup CAM result window expired");
  }

  if (restartPending && now >= restartAt) {
    restartPending = false;
    Serial.println("[DEV] Restarting ESP32 DevKit after QR flow...");
    Serial.flush();
    Serial2.flush();
    delay(50);
    ESP.restart();
  }

  // Read commands from Mega (Serial2)
  while (Serial2.available()) {
    char ch = (char)Serial2.read();
    if (ch == '\n') {
      serial2Buf.trim();
      if (serial2Buf.length() > 0) handleMegaCommand(serial2Buf);
      serial2Buf = "";
    } else if (ch == '\r') {
      continue;
    } else if (isPrintableSerialByte(ch)) {
      if (serial2Buf.length() < 256) serial2Buf += ch;
      else serial2Buf = "";
    } else {
      serial2Buf = "";
    }
  }

  delay(5);
}
  
