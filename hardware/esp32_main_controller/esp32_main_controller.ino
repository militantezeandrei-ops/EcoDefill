/*
 * EcoDefill v2 — ESP32 DevKit V1 — WiFi / API Bridge
 * ====================================================
 * POWER : 5V from Buck 2 (Clean Logic Line)
 * BOARD : DOIT ESP32 DEVKIT V1
 *
 * ROLE  : Acts as the ONLY WiFi-capable board that talks to the Vercel server.
 *         Receives commands from Arduino Mega via Serial2 (GPIO 16 RX).
 *         Executes API calls and replies back to Mega.
 *         Controls Relay for Pump + Solenoids (signals to relay board).
 *
 * COMMAND PROTOCOL (Mega → DevKit via Serial2):
 *   "CMD:EARN|<type>|<pts>\n"              → Anonymous earn (bottle/cup)
 *   "CMD:EARN|<type>|<pts>|<token>\n"      → Authenticated earn
 *   "CMD:REDEEM|<token>|<pts>\n"           → Redeem water (QR flow)
 *
 * REPLY PROTOCOL (DevKit → Mega via Serial2 TX):
 *   "RESULT:OK\n"
 *   "RESULT:FAIL\n"
 *   "DISPENSE:<ms>\n"    → Mega activates pump/solenoids for <ms> ms
 *
 * WIRING:
 *   Mega TX0 (pin 1)   → DevKit RX2 (GPIO 16)   [5V→3.3V: use 1k/2k divider]
 *   DevKit TX2 (GPIO17)→ Mega RX0 (pin 0)        [3.3V→5V: safe]
 *   Relay IN (Pump)    → DevKit GPIO 23           (active-LOW module)
 *   Relay IN (Sol1)    → DevKit GPIO 25
 *   Relay IN (Sol2)    → DevKit GPIO 26
 *   All GNDs connected
 *
 * NOTE: Relay VCC from Buck 2 (5V); relay COM/NO on 12V direct line from
 *       junction box Hole 4. Fit 1N4007 flyback diode across each load coil.
 *
 * LIBRARIES (install via Library Manager):
 *   ArduinoJson  by Benoit Blanchon (v6 or v7)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ── USER CONFIG ───────────────────────────────────────────────────────────────
const char* WIFI_SSID       = "Free";
const char* WIFI_PASSWORD   = "1234pogi";
const char* SERVER_BASE_URL = "https://eco-defill.vercel.app";
const char* MACHINE_ID      = "MACHINE_01";   // Must match your DB record

// ── PINS ──────────────────────────────────────────────────────────────────────
const int LED_PIN    = 2;   // Built-in LED (GPIO 2)
// Relays are on Mega side now (driven by Mega relay pins 34/36/38).
// DevKit only needs WiFi + Serial bridge in this architecture.
// If you want DevKit to also drive a relay, uncomment:
// const int RELAY_PUMP = 23;  const int RELAY_SOL1 = 25;  const int RELAY_SOL2 = 26;

// ── TIMING ────────────────────────────────────────────────────────────────────
const unsigned long WIFI_TIMEOUT_MS  = 20000;
const unsigned long HTTP_TIMEOUT_MS  = 20000;
const unsigned long POLL_INTERVAL_MS = 3000;

// ── STATE ─────────────────────────────────────────────────────────────────────
String serial2Buf = "";
unsigned long lastPollAt = 0;
bool pendingPoll = false;   // True after a REDEEM command, waiting for dispense approval

// ── HELPERS ───────────────────────────────────────────────────────────────────
String buildUrl(const char* path) {
  return String(SERVER_BASE_URL) + path;
}

void blink(int n, int ms = 100) {
  for (int i = 0; i < n; i++) {
    digitalWrite(LED_PIN, HIGH); delay(ms);
    digitalWrite(LED_PIN, LOW);  delay(ms);
  }
}

bool connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(400); Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Connected. IP: ");
    Serial.println(WiFi.localIP());
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

// ── API: EARN POINTS ─────────────────────────────────────────────────────────
// Anonymous:      POST /api/add-point  { machineId, itemType, amount }
// Authenticated:  POST /api/add-point  { machineId, itemType, amount, token }
void apiEarn(const String& itemType, int pts, const String& token = "") {
  if (!ensureWiFi()) {
    Serial2.println("RESULT:FAIL");
    return;
  }

  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  String url = buildUrl("/api/add-point");
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  StaticJsonDocument<256> doc;
  doc["machineId"] = MACHINE_ID;
  doc["itemType"]  = itemType;
  doc["amount"]    = pts;
  if (token.length() > 0) doc["token"] = token;

  String body; serializeJson(doc, body);
  Serial.print("[HTTP] POST earn: "); Serial.println(body);

  int code = http.POST(body);
  String resp = code > 0 ? http.getString() : "";
  http.end();

  Serial.printf("[HTTP] earn → %d %s\n", code, resp.c_str());

  if (code == 200 || code == 201) {
    Serial2.println("RESULT:OK");
    blink(2, 80);
  } else {
    Serial2.println("RESULT:FAIL");
    blink(3, 50);
  }
}

// ── API: VERIFY QR (REDEEM) ──────────────────────────────────────────────────
// POST /api/verify-qr  { token, machineId, amount }
// On success, server queues a DISPENSE session — we then poll /api/machine-status
bool apiVerifyQR(const String& token, int pts) {
  if (!ensureWiFi()) return false;

  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  http.begin(client, buildUrl("/api/verify-qr"));
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  StaticJsonDocument<256> doc;
  doc["token"]     = token;
  doc["machineId"] = MACHINE_ID;
  doc["amount"]    = pts;
  String body; serializeJson(doc, body);

  Serial.print("[HTTP] POST verify-qr: "); Serial.println(body);
  int code = http.POST(body);
  String resp = code > 0 ? http.getString() : "";
  http.end();

  Serial.printf("[HTTP] verify-qr → %d %s\n", code, resp.c_str());
  return (code == 200);
}

// ── API: POLL MACHINE STATUS (post-redeem) ───────────────────────────────────
// GET /api/machine-status?machineId=MACHINE_01
// Returns { approved: bool, dispenseTimeMs: int }
void pollMachineStatus() {
  if (!ensureWiFi()) return;

  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  String url = buildUrl("/api/machine-status?machineId=");
  url += MACHINE_ID;
  http.begin(client, url);
  http.setTimeout(15000);

  int code = http.GET();
  if (code != 200) {
    http.end();
    return;
  }

  String resp = http.getString();
  http.end();

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, resp)) return;

  bool approved   = doc["approved"] | false;
  int  dispenseMs = doc["dispenseTimeMs"] | 0;

  if (approved && dispenseMs > 0) {
    Serial.printf("[POLL] APPROVED! Dispense %d ms\n", dispenseMs);
    Serial2.print("DISPENSE:");
    Serial2.println(dispenseMs);
    pendingPoll = false;   // Stop polling
    blink(3, 100);
  }
}

// ── COMMAND PARSER ────────────────────────────────────────────────────────────
// Supported commands from Mega:
//   CMD:VERIFY|<token>         → Auto-detect EARN or REDEEM from server response
//   CMD:EARN|<type>|<pts>      → Anonymous earn (log to machine, no user account)
//
// Replies to Mega:
//   EARN:<pts>                 → Points credited to mobile account
//   DISPENSE:<ms>              → Mega should open pump for <ms> milliseconds
//   RESULT:FAIL                → Server rejected the token
void handleCommand(const String& line) {
  Serial.print("[CMD] Received: "); Serial.println(line);
  if (!line.startsWith("CMD:")) return;

  String body = line.substring(4);
  int p1 = body.indexOf('|');
  if (p1 < 0) return;

  String verb = body.substring(0, p1);
  String rest = body.substring(p1 + 1);

  // ── CMD:VERIFY|<token> ────────────────────────────────────────────────────
  // Unified QR handler. POSTs to /api/verify-qr.
  // Server response determines the action:
  //   { action:"EARN",   points: N }   → reply "EARN:<N>" to Mega
  //   { action:"REDEEM", dispenseTimeMs: N } → reply "DISPENSE:<N>" to Mega
  if (verb == "VERIFY") {
    String token = rest;
    token.trim();
    if (token.length() < 8) { Serial2.println("RESULT:FAIL"); return; }

    Serial.printf("[VERIFY] Token: ...%s\n", token.substring(token.length() - 8).c_str());

    if (!ensureWiFi()) { Serial2.println("RESULT:FAIL"); return; }

    WiFiClientSecure client; client.setInsecure();
    HTTPClient http;
    http.begin(client, buildUrl("/api/verify-qr"));
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT_MS);

    StaticJsonDocument<256> doc;
    doc["token"]     = token;
    doc["machineId"] = MACHINE_ID;
    String body2; serializeJson(doc, body2);

    Serial.print("[HTTP] POST verify-qr: "); Serial.println(body2);
    int code = http.POST(body2);
    String resp = code > 0 ? http.getString() : "";
    http.end();

    Serial.printf("[HTTP] verify-qr → %d %s\n", code, resp.c_str());

    if (code != 200) {
      Serial2.println("RESULT:FAIL");
      return;
    }

    // Parse response to determine action
    StaticJsonDocument<512> res;
    if (deserializeJson(res, resp)) {
      Serial2.println("RESULT:FAIL");
      return;
    }

    // Check for REDEEM: server approved dispense
    int dispenseMs = res["dispenseTimeMs"] | 0;
    if (dispenseMs > 0) {
      Serial.printf("[VERIFY] REDEEM approved → DISPENSE %d ms\n", dispenseMs);
      Serial2.print("DISPENSE:");
      Serial2.println(dispenseMs);
      blink(3, 100);
      return;
    }

    // Check for EARN: server credited points to mobile account
    int earnedPts = res["points"] | res["pointsEarned"] | res["amount"] | 0;
    if (earnedPts > 0) {
      Serial.printf("[VERIFY] EARN confirmed → %d pts credited to mobile\n", earnedPts);
      Serial2.print("EARN:");
      Serial2.println(earnedPts);
      blink(2, 80);
      return;
    }

    // Fallback: success but no actionable data
    Serial.println("[VERIFY] Success but no actionable fields in response");
    Serial2.println("RESULT:OK");
  }

  // ── CMD:EARN|<type>|<pts> ─────────────────────────────────────────────────
  // Anonymous earn — logs the recycling event to the machine.
  // No QR involved: points tracked locally on machine only until BTN_SCAN used.
  else if (verb == "EARN") {
    int p2 = rest.indexOf('|');
    if (p2 < 0) return;
    String itemType = rest.substring(0, p2);
    int    pts      = rest.substring(p2 + 1).toInt();
    Serial.printf("[EARN] Anon: type=%s pts=%d\n", itemType.c_str(), pts);
    // Log to backend (anonymous transaction)
    apiEarn(itemType, pts, "");
  }
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("[DEVKIT] EcoDefill v2 WiFi Bridge booting...");

  // Serial2 = link to Mega (RX2=GPIO16, TX2=GPIO17)
  Serial2.begin(115200, SERIAL_8N1, 16, 17);
  Serial2.setTimeout(20);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  connectWiFi();

  Serial.println("[DEVKIT] Ready. Waiting for commands from Mega on Serial2...");
}

// ── LOOP ──────────────────────────────────────────────────────────────────────
void loop() {
  // WiFi health check
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_PIN, LOW);
    connectWiFi();
  }

  // Read commands from Mega (Serial2)
  while (Serial2.available()) {
    char ch = (char)Serial2.read();
    if (ch == '\n') {
      serial2Buf.trim();
      if (serial2Buf.length() > 0) handleCommand(serial2Buf);
      serial2Buf = "";
    } else if (ch != '\r') {
      if (serial2Buf.length() < 600) serial2Buf += ch;
      else serial2Buf = "";
    }
  }

  // Poll machine-status after a REDEEM command
  if (pendingPoll && millis() - lastPollAt >= POLL_INTERVAL_MS) {
    pollMachineStatus();
    lastPollAt = millis();
  }

  delay(10);
}
