/*
 * EcoDefill - ESP32 Main Controller
 * ====================================
 * Board: DOIT ESP32 DEVKIT V1
 *
 * ROLES:
 *  1. Receives scanned QR tokens from the ESP32-CAM via Serial2 (GPIO 16).
 *  2. POSTs the token to the EcoDefill server's /api/verify-qr endpoint.
 *  3. Polls /api/machine-status every few seconds.
 *  4. Activates the relay (water pump) when the server sends an APPROVED status.
 *
 * LIBRARIES REQUIRED (Install via Arduino Library Manager):
 *  - ArduinoJson  (by Benoit Blanchon, v6.x or v7.x)
 *
 * WIRING:
 *  ESP32-CAM U0TXD (GPIO1) --> ESP32 DevKit RX2 (GPIO 16)
 *  Relay IN                 --> ESP32 DevKit GPIO 23
 *  All GNDs connected together
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>

// ======================================================
// CONFIGURATION — Edit these values before uploading
// ======================================================

// WiFi credentials
const char* WIFI_SSID     = "militante";
const char* WIFI_PASSWORD = "militante22";

// EcoDefill Server URL (use your LAN IP when running locally, e.g. http://192.168.x.x:3000)
// For production Vercel deployment use: https://eco-defill.vercel.app
const char* SERVER_BASE_URL = "https://eco-defill.vercel.app";

// Machine identifier (must match what is registered in your database)
const char* MACHINE_ID = "MACHINE_01";

// ======================================================
// PINS
// ======================================================
const int RELAY_PIN        = 23;  // Relay IN signal → controls water pump
const int LED_INDICATOR    = 2;   // Built-in LED (GPIO 2 on most DevKit boards)

// ======================================================
// TIMING
// ======================================================
const unsigned long POLL_INTERVAL_MS = 3000;       // How often to poll /machine-status
const unsigned long WIFI_TIMEOUT_MS  = 15000;      // Max time to wait for WiFi

// ======================================================
// STATE
// ======================================================
unsigned long lastPollTime   = 0;
unsigned long lastTokenSentAt = 0;
bool          isDispensingWater = false;
String        serial2Buffer = "";

// ======================================================
// HELPERS
// ======================================================
String buildUrl(const char* path) {
  String url = String(SERVER_BASE_URL);
  url += path;
  return url;
}

void blinkLed(int times, int delayMs = 100) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_INDICATOR, HIGH);
    delay(delayMs);
    digitalWrite(LED_INDICATOR, LOW);
    delay(delayMs);
  }
}

bool isPrintableToken(const String& token) {
  if (token.length() < 8 || token.length() > 512) return false;
  for (size_t i = 0; i < token.length(); i++) {
    char c = token.charAt(i);
    if (c < 33 || c > 126) return false;
  }
  return true;
}

// ======================================================
// WIFI
// ======================================================
void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setAutoReconnect(true);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("[WiFi] Connected!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
    // Solid LED = WiFi connected
    digitalWrite(LED_INDICATOR, HIGH);
  } else {
    Serial.println();
    Serial.println("[WiFi] FAILED to connect! Check credentials and router.");
    // Rapid blink = error
    blinkLed(10, 50);
  }
}

// ======================================================
// SEND QR TOKEN TO SERVER
// ======================================================
void sendTokenToServer(const String& token) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi not connected, skipping POST.");
    return;
  }

  HTTPClient http;
  String url = buildUrl("/api/verify-qr");

  Serial.print("[HTTP] POST to: ");
  Serial.println(url);

  WiFiClientSecure client;
  client.setInsecure();

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000); // 8 second timeout

  // Build JSON body
  StaticJsonDocument<256> doc;
  doc["token"]     = token;
  doc["machineId"] = MACHINE_ID;

  String payload;
  serializeJson(doc, payload);

  Serial.print("[HTTP] Payload: ");
  Serial.println(payload);

  int responseCode = http.POST(payload);

  if (responseCode > 0) {
    String response = http.getString();
    Serial.print("[HTTP] Response (");
    Serial.print(responseCode);
    Serial.print("): ");
    Serial.println(response);

    if (responseCode == 200) {
      // Quick double blink = scan accepted
      blinkLed(2, 80);
    } else {
      // Triple rapid blink = scan rejected/error
      blinkLed(3, 50);
    }
  } else {
    Serial.print("[HTTP] Request failed. Error: ");
    Serial.println(http.errorToString(responseCode));
    blinkLed(5, 30);
  }

  http.end();
}

// ======================================================
// POLL SERVER FOR DISPENSE COMMAND
// ======================================================
void pollMachineStatus() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (isDispensingWater) return; // Don't poll while dispensing

  HTTPClient http;
  String url = buildUrl("/api/machine-status?machineId=");
  url += MACHINE_ID;

  WiFiClientSecure client;
  client.setInsecure();

  http.begin(client, url);
  http.setTimeout(5000);

  int responseCode = http.GET();

  if (responseCode == 200) {
    String response = http.getString();
    Serial.print("[POLL] Status: ");
    Serial.println(response);

    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, response);

    if (!err) {
      bool approved = doc["approved"] | false;

      if (approved) {
        int dispenseMs = doc["dispenseTimeMs"] | 3000;

        Serial.print("[PUMP] Dispensing water for ");
        Serial.print(dispenseMs);
        Serial.println(" ms");

        isDispensingWater = true;

        // Activate relay (water flows)
        digitalWrite(RELAY_PIN, HIGH);
        digitalWrite(LED_INDICATOR, HIGH);

        delay(dispenseMs);

        // Deactivate relay
        digitalWrite(RELAY_PIN, LOW);
        digitalWrite(LED_INDICATOR, LOW);

        isDispensingWater = false;

        Serial.println("[PUMP] Dispense complete.");
        blinkLed(3, 100); // Three blinks = done
        digitalWrite(LED_INDICATOR, HIGH); // Restore LED to ON
      }
    }
  } else if (responseCode > 0) {
    String response = http.getString();
    Serial.print("[POLL] Non-200 response (");
    Serial.print(responseCode);
    Serial.print("): ");
    Serial.println(response);
  } else {
    Serial.print("[POLL] Connection error: ");
    Serial.println(http.errorToString(responseCode));
  }

  http.end();
}

// ======================================================
// SETUP
// ======================================================
void setup() {
  Serial.begin(115200);  // USB Serial (for debugging)
  delay(500);
  Serial.println("\n[MAIN] EcoDefill Main Controller Booting...");

  // Serial2 = receives QR tokens from ESP32-CAM
  // RX2 = GPIO 16, TX2 = GPIO 17 (TX2 unused, but configured anyway)
  Serial2.begin(115200, SERIAL_8N1, 16, 17);
  Serial2.setTimeout(20);
  Serial.println("[MAIN] Serial2 (GPIO 16) listening for ESP32-CAM data...");

  // Configure pins
  pinMode(RELAY_PIN,     OUTPUT);
  pinMode(LED_INDICATOR, OUTPUT);
  digitalWrite(RELAY_PIN,     LOW);
  digitalWrite(LED_INDICATOR, LOW);

  // Connect to WiFi
  connectWiFi();

  Serial.println("[MAIN] Ready!");
  Serial.print("[MAIN] Server: ");
  Serial.println(SERVER_BASE_URL);
  Serial.print("[MAIN] Machine ID: ");
  Serial.println(MACHINE_ID);
}

// ======================================================
// MAIN LOOP
// ======================================================
void loop() {

  // 1. Check WiFi health — auto-reconnect if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Connection lost. Reconnecting...");
    digitalWrite(LED_INDICATOR, LOW);
    connectWiFi();
  }

  // 2. Receive QR token from ESP32-CAM via Serial2.
  // Protocol: "QR:<token>\n"
  while (Serial2.available()) {
    char ch = (char)Serial2.read();

    if (ch == '\n') {
      serial2Buffer.trim();

      if (serial2Buffer.startsWith("QR:")) {
        String token = serial2Buffer.substring(3);
        token.trim();

        if (isPrintableToken(token)) {
          Serial.print("[CAM->] Received token: ");
          Serial.println(token);

          // Blink once to acknowledge receipt
          digitalWrite(LED_INDICATOR, LOW);
          delay(50);
          digitalWrite(LED_INDICATOR, HIGH);

          // Send token to EcoDefill server
          sendTokenToServer(token);
          lastTokenSentAt = millis();
        } else {
          Serial.print("[CAM->] Ignored invalid token payload: ");
          Serial.println(token);
        }
      }

      serial2Buffer = "";
    } else if (ch != '\r') {
      if (serial2Buffer.length() < 600) {
        serial2Buffer += ch;
      } else {
        serial2Buffer = "";
      }
    }
  }

  // 3. Poll machine-status every POLL_INTERVAL_MS
  if (millis() - lastPollTime >= POLL_INTERVAL_MS) {
    pollMachineStatus();
    lastPollTime = millis();
  }

  delay(10);
}

