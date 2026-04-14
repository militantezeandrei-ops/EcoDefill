/*
 * EcoDefill - Arduino Mega 2560 Controller (Option A)
 * ====================================================
 * ROLES:
 *   1. Button 1 → Increment local point counter → display on LCD 20x4
 *   2. Button 2 → Show "Scan QR" prompt on LCD
 *   3. Listen on Serial1 (RX1=Pin19) for status messages from ESP32-CAM
 *   4. Parse "##STATUS:..." lines from ESP32-CAM and show on LCD
 *
 * LIBRARIES REQUIRED (install via Arduino IDE → Library Manager):
 *   - LiquidCrystal_I2C   by Frank de Brabander
 *   - Wire                 (built-in)
 *
 * WIRING:
 *   --- LCD 20x4 (I2C) ---
 *   LCD SDA    → Arduino Mega Pin 20 (SDA)
 *   LCD SCL    → Arduino Mega Pin 21 (SCL)
 *   LCD VCC    → 5V
 *   LCD GND    → GND
 *
 *   --- Buttons (active LOW with INPUT_PULLUP) ---
 *   Button 1   → Pin 2  + GND   (no external resistor needed)
 *   Button 2   → Pin 3  + GND   (no external resistor needed)
 *
 *   --- ESP32-CAM UART (ONE-WAY: CAM → Mega only) ---
 *   ESP32-CAM GPIO1 (TX0) → Mega Pin 19 (RX1)
 *   Common GND            → GND
 *   NOTE: 3.3V TX from ESP32-CAM to 5V Mega RX is electrically safe.
 *         DO NOT connect Mega TX (5V) to ESP32-CAM RX (3.3V) without
 *         a voltage divider — this test only needs one-way reception.
 *
 * LCD I2C ADDRESS:
 *   Most common: 0x27  — if LCD stays blank, try changing to 0x3F below.
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ── LCD CONFIG ──────────────────────────────────────────────────────────────
#define LCD_I2C_ADDR  0x27   // ← Change to 0x3F if screen stays blank
#define LCD_COLS      20
#define LCD_ROWS      4

LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

// ── PINS ────────────────────────────────────────────────────────────────────
const int BTN1_PIN = 2;   // Add point button
const int BTN2_PIN = 3;   // QR scan prompt button

// ── STATE ───────────────────────────────────────────────────────────────────
int  localPoints    = 0;
bool lastBtn1       = HIGH;
bool lastBtn2       = HIGH;
unsigned long lastDebounce1 = 0;
unsigned long lastDebounce2 = 0;
const unsigned long DEBOUNCE_MS = 60;

// Status message auto-clear timer
unsigned long statusShownAt   = 0;
const unsigned long STATUS_CLEAR_MS = 4000;   // clear status after 4s
bool statusActive = false;

// Serial buffer for ESP32-CAM messages
String camBuffer = "";

// ── HELPERS ─────────────────────────────────────────────────────────────────
void lcdPrint(uint8_t col, uint8_t row, const char* text, bool clearRest = true) {
  lcd.setCursor(col, row);
  lcd.print(text);
  if (clearRest) {
    for (int i = strlen(text) + col; i < LCD_COLS; i++) lcd.print(' ');
  }
}

void lcdPrint(uint8_t col, uint8_t row, const String& text, bool clearRest = true) {
  lcdPrint(col, row, text.c_str(), clearRest);
}

void updatePointsRow() {
  String line = "Points: " + String(localPoints);
  lcdPrint(0, 1, line);
}

// Show a status on rows 2–3 and start the auto-clear timer
void showStatus(const String& row2, const String& row3 = "") {
  lcdPrint(0, 2, row2);
  lcdPrint(0, 3, row3.length() > 0 ? row3 : "                    ");
  statusShownAt = millis();
  statusActive  = true;
}

// Restore idle footer after timer expires
void restoreIdleFooter() {
  lcdPrint(0, 2, "Status: Idle        ");
  lcdPrint(0, 3, "Btn1:+pt Btn2:Scan  ");
  statusActive = false;
}

// Parse "##STATUS:<payload>##" lines from ESP32-CAM
void handleCamMessage(const String& raw) {
  // Only handle lines containing our protocol marker
  int start = raw.indexOf("##STATUS:");
  if (start < 0) return;

  int end = raw.indexOf("##", start + 9);
  if (end < 0) return;

  String status = raw.substring(start + 9, end);
  Serial.print("[CAM] STATUS: ");
  Serial.println(status);

  if (status == "READY") {
    showStatus("CAM: Ready!         ", "Show QR to camera   ");
  } else if (status == "WIFI_OK") {
    showStatus("WiFi: Connected!    ", "                    ");
  } else if (status == "WIFI_FAIL") {
    showStatus("WiFi: FAILED!       ", "Check credentials   ");
  } else if (status == "SCANNING") {
    showStatus("Scanning QR...      ", "Hold steady...      ");
  } else if (status == "SCAN_OK") {
    showStatus("QR OK! Points Added!", "Check your app :)   ");
    localPoints = 0;
    updatePointsRow();
  } else if (status == "SCAN_FAIL") {
    showStatus("QR Failed!          ", "Try again...        ");
  } else if (status == "NO_WIFI") {
    showStatus("No WiFi!            ", "Cannot redeem now   ");
  } else if (status.startsWith("TOKEN:")) {
    // First 14 chars of token for debug
    String short_tok = status.substring(6, min((int)status.length(), 20));
    showStatus("Token received:     ", short_tok);
  }
}

// ── SETUP ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial1.begin(115200);   // RX1=Pin19 ← receives from ESP32-CAM GPIO1(TX0)

  pinMode(BTN1_PIN, INPUT_PULLUP);
  pinMode(BTN2_PIN, INPUT_PULLUP);

  // Init LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Splash screen
  lcdPrint(0, 0, "  EcoDefill Test    ");
  lcdPrint(0, 1, "Points: 0           ");
  lcdPrint(0, 2, "Status: Booting...  ");
  lcdPrint(0, 3, "Btn1:+pt Btn2:Scan  ");

  delay(1500);
  lcdPrint(0, 2, "Status: Ready       ");

  Serial.println("[MEGA] EcoDefill Mega Controller ready.");
  Serial.println("[MEGA] Serial1 listening for ESP32-CAM...");
}

// ── LOOP ────────────────────────────────────────────────────────────────────
void loop() {

  // ── Button 1: Add point ─────────────────────────────────────────────────
  bool btn1 = digitalRead(BTN1_PIN);
  if (btn1 == LOW && lastBtn1 == HIGH && (millis() - lastDebounce1) > DEBOUNCE_MS) {
    if (localPoints < 10) {
      localPoints++;
      updatePointsRow();
      showStatus("+1 Point Added!     ", "Total: " + String(localPoints) + " pts         ");
      Serial.print("[BTN1] Points += 1 -> ");
      Serial.println(localPoints);
    } else {
      showStatus("Limit Reached!      ", "Max 10 pts allowed  ");
    }
    lastDebounce1 = millis();
  }
  lastBtn1 = btn1;

  // ── Button 2: Upload points ────────────────────────────────────────────
  bool btn2 = digitalRead(BTN2_PIN);
  if (btn2 == LOW && lastBtn2 == HIGH && (millis() - lastDebounce2) > DEBOUNCE_MS) {
    if (localPoints > 0) {
      showStatus("Uploading Points... ", "Scan QR code now    ");
      // Send command to ESP32: UPLOAD:X
      Serial1.print("UPLOAD:");
      Serial1.println(localPoints);
      Serial.print("[BTN2] Telling ESP32 to upload ");
      Serial.print(localPoints);
      Serial.println(" points.");
    } else {
      showStatus("No Points to Upload!", "Press Btn1 first    ");
    }
    lastDebounce2 = millis();
  }
  lastBtn2 = btn2;

  // ── Receive from ESP32-CAM via Serial1 ──────────────────────────────────
  while (Serial1.available()) {
    char c = (char)Serial1.read();
    if (c == '\n') {
      camBuffer.trim();
      if (camBuffer.length() > 0) {
        handleCamMessage(camBuffer);
      }
      camBuffer = "";
    } else if (c != '\r') {
      // Guard against buffer overflow
      if (camBuffer.length() < 256) {
        camBuffer += c;
      } else {
        camBuffer = "";
      }
    }
  }

  // ── Auto-clear status after timer ───────────────────────────────────────
  if (statusActive && (millis() - statusShownAt) >= STATUS_CLEAR_MS) {
    restoreIdleFooter();
  }
}
