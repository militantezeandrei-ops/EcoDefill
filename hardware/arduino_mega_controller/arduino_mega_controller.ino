/*
 * EcoDefill v2 — Arduino Mega 2560 — Main Orchestrator
 * =====================================================
 * POWER : 5V from Buck 2 (Clean Logic Line)
 *
 * ROLES :
 *  1. Orchestrate the full recycling & dispense flow
 *  2. Drive 6x MG996R Servos (signal pins here; VCC from Buck 1 @ 6V)
 *  3. Read 2x IR Sensors  (bottle slot, cup slot)
 *  4. Drive 3x Relay Modules (Pump, Solenoid 1, Solenoid 2) → switches 12V direct line
 *  5. Display status on LCD 20x4 I2C
 *  6. 2x Buttons:
 *       BTN1 = DISPENSE  (use local session pts, max 5 pts = 500ml per press)
 *       BTN2 = SCAN      (activate QR-CAM; auto-routes EARN or REDEEM from token)
 *  7. Serial1 (pins 18/19) ↔ ESP32-CAM QR
 *  8. Serial2 (pins 16/17) ↔ ESP32-CAM Bottle
 *  9. Serial3 (pins 14/15) ↔ ESP32-CAM Cup
 * 10. Serial0 (USB / pin 1) ↔ ESP32 DevKit (WiFi/API bridge)
 *
 * ⚠️  SERVO SAFETY RULE  (protects Buck 1 — LM2596 @ 6V max 3A)
 *     Never move more than 2 servos at the same time.
 *     Always add a 100 ms delay between any two servo-group moves.
 *     moveServoGroup() enforces this automatically.
 *
 * WIRING NOTES:
 *   Servo signal → Mega GPIO (listed below)
 *   Servo red    → Buck 1 +6V (NOT Mega 5V rail!)
 *   Servo black  → Common GND
 *   IR sensors   → Mega analog pins (used as digital INPUT_PULLUP)
 *   Relay IN     → Mega GPIO (active-LOW relay modules assumed)
 *   Relay COM/NO → 12V direct from junction box Hole 4
 *   1N4007 diode across each solenoid/pump coil (cathode to +12V)
 *
 * LIBRARIES (install via Library Manager):
 *   LiquidCrystal_I2C  by Frank de Brabander
 *   Servo              (built-in with Arduino IDE)
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

// ─── LCD ────────────────────────────────────────────────────────────────────
#define LCD_ADDR  0x27   // try 0x3F if screen stays blank
#define LCD_COLS  20
#define LCD_ROWS  4
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// ─── SERVO PINS  (signal only — power from Buck 1 @ 6V) ─────────────────────
// Two servos per mechanical group → never exceed 2 moving at once
#define SRV_BOTTLE_GATE   22   // Opens / closes the bottle input slot
#define SRV_BOTTLE_SORT   24   // Routes accepted bottle into the bin
#define SRV_CUP_GATE      26   // Opens / closes the cup input slot
#define SRV_CUP_SORT      28   // Routes accepted cup into the bin
#define SRV_BOTTLE_COMP   30   // Bottle bin compactor arm
#define SRV_CUP_COMP      32   // Cup bin compactor arm

Servo srvBottleGate, srvBottleSort;
Servo srvCupGate,    srvCupSort;
Servo srvBottleComp, srvCupComp;

// Angle presets — tweak to match your physical build
#define GATE_OPEN       90
#define GATE_CLOSED      0
#define SORT_ACTIVE_B   40    // Bottle bin direction
#define SORT_ACTIVE_C  140    // Cup bin direction
#define SORT_IDLE       90    // Neutral
#define COMP_PRESS     120
#define COMP_IDLE       20

// ─── IR SENSOR PINS ──────────────────────────────────────────────────────────
#define IR_BOTTLE_SLOT  A0   // LOW = object present in bottle slot
#define IR_CUP_SLOT     A1   // LOW = object present in cup slot

// ─── RELAY PINS  (signal → relay module → switches 12V line) ─────────────────
// Standard optocoupler relay modules are ACTIVE LOW
#define RELAY_PUMP   34
#define RELAY_SOL1   36
#define RELAY_SOL2   38
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// ─── BUTTONS ─────────────────────────────────────────────────────────────────
#define BTN_DISPENSE  2   // Dispense water using local session pts (INPUT_PULLUP)
#define BTN_SCAN      3   // Activate QR-CAM for EARN or REDEEM

// ─── TIMING ──────────────────────────────────────────────────────────────────
#define DEBOUNCE_MS        60UL
#define STATUS_CLEAR_MS  5000UL
#define CAM_TIMEOUT_MS   9000UL    // Max wait for a camera to reply
#define SOL_OPEN_DELAY_MS  80UL   // Solenoid opens before pump starts
#define SERVO_DELAY_MS    100UL   // ⚠️ Mandatory between servo groups (Buck 1)

// ─── DISPENSE RULES ──────────────────────────────────────────────────────────
#define ML_PER_POINT       100    // 1 point = 100ml water
#define MAX_PTS_PER_PRESS    5    // Max points per BTN_DISPENSE press = 500ml
// Dispense time: 100ml ≈ ~2000ms (calibrate to your pump flow rate)
#define MS_PER_100ML      2000UL  // ← Tune this to your actual pump

// ─── STATE MACHINE ───────────────────────────────────────────────────────────
enum State {
  ST_IDLE,
  ST_AWAIT_ITEM,      // Ready: waiting for bottle/cup insertion
  ST_IDENTIFYING,     // IR triggered; waiting for camera result
  ST_SCAN_WAIT,       // BTN_SCAN pressed; QR-CAM active; waiting for QR scan
  ST_DISPENSING,      // Water flowing
  ST_DONE             // Session complete
};
State machineState = ST_IDLE;

// ─── SESSION ─────────────────────────────────────────────────────────────────
int    sessionPts       = 0;      // Points accumulated this session (from recycling)
bool   bottleSlotActive = false;  // which slot triggered identification
bool   scanModeActive   = false;  // true = QR-CAM is listening for a scan

// ─── SERIAL BUFFERS ──────────────────────────────────────────────────────────
String qrBuf  = "";   // Serial1 ← QR-CAM
String botBuf = "";   // Serial2 ← Bottle-CAM
String cupBuf = "";   // Serial3 ← Cup-CAM
String devBuf = "";   // Serial0 ← ESP32 DevKit

// ─── DEBOUNCE ────────────────────────────────────────────────────────────────
bool lastDispense = HIGH, lastScan = HIGH;
unsigned long debDispense = 0, debScan = 0;

// ─── CAMERA TIMEOUT ──────────────────────────────────────────────────────────
bool camPending = false;
unsigned long camSentAt = 0;

// ─────────────────────────────────────────────────────────────────────────────
// LCD HELPERS
// ─────────────────────────────────────────────────────────────────────────────
void lcdLine(uint8_t row, const String& text) {
  lcd.setCursor(0, row);
  String s = text;
  while ((int)s.length() < LCD_COLS) s += ' ';
  lcd.print(s.substring(0, LCD_COLS));
}

void lcdShow(const String& r0,
             const String& r1 = "",
             const String& r2 = "",
             const String& r3 = "") {
  lcdLine(0, r0); lcdLine(1, r1); lcdLine(2, r2); lcdLine(3, r3);
}

void lcdIdle() {
  lcdShow("   EcoDefill v2.0   ",
          "Session pts: " + String(sessionPts),
          "[1]Dispense [2]Scan ",
          "Insert item to earn ");
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVO HELPERS  ⚠️ Max 2 servos per call; 100 ms enforced between groups
// ─────────────────────────────────────────────────────────────────────────────
void moveGroup(Servo& a, int pa, Servo& b, int pb) {
  a.write(pa);
  b.write(pb);
  delay(SERVO_DELAY_MS);   // ⚠️ Buck 1 protection — mandatory
}

void openBottleSlot() {
  Serial.println(F("[SERVO] Bottle slot OPEN"));
  moveGroup(srvBottleGate, GATE_OPEN, srvBottleSort, SORT_ACTIVE_B);
}
void closeBottleSlot() {
  Serial.println(F("[SERVO] Bottle slot CLOSE"));
  moveGroup(srvBottleGate, GATE_CLOSED, srvBottleSort, SORT_IDLE);
}
void openCupSlot() {
  Serial.println(F("[SERVO] Cup slot OPEN"));
  moveGroup(srvCupGate, GATE_OPEN, srvCupSort, SORT_ACTIVE_C);
}
void closeCupSlot() {
  Serial.println(F("[SERVO] Cup slot CLOSE"));
  moveGroup(srvCupGate, GATE_CLOSED, srvCupSort, SORT_IDLE);
}
void compactBottle() {
  srvBottleComp.write(COMP_PRESS);
  delay(800);
  srvBottleComp.write(COMP_IDLE);
  delay(SERVO_DELAY_MS);
}
void compactCup() {
  srvCupComp.write(COMP_PRESS);
  delay(800);
  srvCupComp.write(COMP_IDLE);
  delay(SERVO_DELAY_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// RELAY / DISPENSE
// ─────────────────────────────────────────────────────────────────────────────
void dispenseWater(unsigned long ms) {
  Serial.print(F("[PUMP] Dispensing ")); Serial.print(ms); Serial.println(F(" ms"));
  lcdShow("  Dispensing Water  ", "Please wait...      ");
  digitalWrite(RELAY_SOL1, RELAY_ON);
  delay(SOL_OPEN_DELAY_MS);              // solenoid opens first
  digitalWrite(RELAY_PUMP, RELAY_ON);
  delay(ms);
  digitalWrite(RELAY_PUMP, RELAY_OFF);
  delay(SOL_OPEN_DELAY_MS);
  digitalWrite(RELAY_SOL1, RELAY_OFF);
  Serial.println(F("[PUMP] Done"));
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVKIT COMMUNICATION
// Protocol OUT:  "CMD:VERIFY|<token>\n"           → DevKit determines EARN/REDEEM
//                "CMD:EARN|<type>|<pts>\n"         → Anonymous earn (no QR)
// Protocol IN :  "EARN:<pts>\n"                   → Points credited to mobile
//                "DISPENSE:<ms>\n"                 → Dispense water for <ms>
//                "RESULT:FAIL\n"                   → Server rejected token
// ─────────────────────────────────────────────────────────────────────────────
void devkitSend(const String& cmd) {
  Serial.print(F("[DEV-TX] ")); Serial.println(cmd);
  // Uncomment when DevKit is on dedicated serial:
  // Serial1.println(cmd);
}

void handleDevKit(const String& msg) {
  Serial.print(F("[DEV-RX] ")); Serial.println(msg);

  // ── REDEEM: server approved water dispense ───────────────────────────────
  if (msg.startsWith("DISPENSE:")) {
    int ms = msg.substring(9).toInt();
    if (ms > 0) {
      machineState = ST_DISPENSING;
      dispenseWater((unsigned long)ms);
      machineState = ST_AWAIT_ITEM;
      lcdShow("  Water Dispensed!  ",
              "Thanks for using    ",
              "EcoDefill! :)       ",
              "[1]Dispense [2]Scan ");
    }
  }
  // ── EARN: server confirmed points credited to mobile account ─────────────
  else if (msg.startsWith("EARN:")) {
    int credited = msg.substring(5).toInt();
    // Deduct transferred points from session (they're now on the mobile app)
    sessionPts -= credited;
    if (sessionPts < 0) sessionPts = 0;
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    lcdShow("Points Transferred! ",
            String(credited) + " pts sent to app ",
            "Session pts: " + String(sessionPts),
            "[1]Dispense [2]Scan ");
  }
  // ── General failure ───────────────────────────────────────────────────────
  else if (msg == "RESULT:FAIL") {
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    lcdShow("QR Not Recognized!  ",
            "Check your app or   ",
            "try again           ",
            "[1]Dispense [2]Scan ");
  }
  else if (msg == "RESULT:OK") {
    lcdLine(3, "Done!               ");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA MESSAGE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
// QR-CAM  →  "##QR:<token>##\n"  or  "##STATUS:<label>##\n"
//
// Token auto-routing:
//   DevKit receives CMD:VERIFY|<token> → POSTs to /api/verify-qr
//   Server determines if it's EARN or REDEEM from the token content
//   DevKit replies: "EARN:<pts>" or "DISPENSE:<ms>" or "RESULT:FAIL"
void handleQR(const String& raw) {
  if (raw.startsWith("##QR:") && raw.endsWith("##")) {
    // Only process QR while in scan mode (BTN_SCAN was pressed)
    if (!scanModeActive) return;

    String tok = raw.substring(5, raw.length() - 2);
    tok.trim();
    if (tok.length() < 8) return;

    Serial.print(F("[QR] Token received: "));
    Serial.println(tok.substring(0, 20));

    // Send to DevKit — server will determine EARN or REDEEM automatically
    lcdShow("QR Scanned!         ",
            "Verifying with      ",
            "server...           ",
            "Please wait         ");
    devkitSend("CMD:VERIFY|" + tok);
    scanModeActive = false;   // Don't process another scan until BTN_SCAN pressed again

  } else if (raw.startsWith("##STATUS:") && raw.endsWith("##")) {
    String s = raw.substring(9, raw.length() - 2);
    Serial.print(F("[QR-CAM] ")); Serial.println(s);
  }
}

// Bottle-CAM  →  "##DETECT:BOTTLE##\n"  or  "##DETECT:NONE##\n"
void handleBottleCam(const String& raw) {
  if (!raw.startsWith("##DETECT:") || !raw.endsWith("##")) return;
  String result = raw.substring(9, raw.length() - 2);
  camPending = false;
  Serial.print(F("[BOTTLE-CAM] ")); Serial.println(result);
  if (machineState != ST_IDENTIFYING || !bottleSlotActive) return;

  if (result == "BOTTLE") {
    sessionPts += 2;
    openBottleSlot();
    delay(1500);
    compactBottle();
    closeBottleSlot();
    lcdShow("Bottle Accepted!    ",
            "+2 Points Earned!   ",
            "Session: " + String(sessionPts) + " pts",
            "[1]Dispense [2]Scan ");
    // Anonymous earn logged to machine (no mobile link until BTN_SCAN)
    devkitSend("CMD:EARN|BOTTLE|2");
  } else {
    lcdShow("Not a Bottle!       ",
            "Item returned.      ",
            "[1]Dispense [2]Scan ");
  }
  machineState = ST_AWAIT_ITEM;
}

// Cup-CAM  →  "##DETECT:CUP##\n"  or  "##DETECT:NONE##\n"
void handleCupCam(const String& raw) {
  if (!raw.startsWith("##DETECT:") || !raw.endsWith("##")) return;
  String result = raw.substring(9, raw.length() - 2);
  camPending = false;
  Serial.print(F("[CUP-CAM] ")); Serial.println(result);
  if (machineState != ST_IDENTIFYING || bottleSlotActive) return;

  if (result == "CUP") {
    sessionPts += 1;
    openCupSlot();
    delay(1500);
    compactCup();
    closeCupSlot();
    lcdShow("Cup Accepted!       ",
            "+1 Point Earned!    ",
            "Session: " + String(sessionPts) + " pts",
            "[1]Dispense [2]Scan ");
    devkitSend("CMD:EARN|CUP|1");
  } else {
    lcdShow("Not a Cup!          ",
            "Item returned.      ",
            "[1]Dispense [2]Scan ");
  }
  machineState = ST_AWAIT_ITEM;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC SERIAL LINE READER
// ─────────────────────────────────────────────────────────────────────────────
void readSerial(HardwareSerial& port, String& buf,
                void (*handler)(const String&)) {
  while (port.available()) {
    char c = (char)port.read();
    if (c == '\n') {
      buf.trim();
      if (buf.length() > 0) handler(buf);
      buf = "";
    } else if (c != '\r') {
      if (buf.length() < 512) buf += c;
      else buf = "";
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

// ── BTN 1: DISPENSE ──────────────────────────────────────────────────────────
// Directly dispenses water using locally accumulated session points.
// Cap: 5 points per press = 500ml. User can press again for more.
void onDispensePressed() {
  if (machineState == ST_DISPENSING || machineState == ST_IDENTIFYING) return;

  if (sessionPts <= 0) {
    lcdShow("No Points!          ",
            "Insert bottles/cups ",
            "to earn points first",
            "[1]Dispense [2]Scan ");
    return;
  }

  // Cap at MAX_PTS_PER_PRESS (5 pts = 500ml)
  int ptsToUse = min(sessionPts, MAX_PTS_PER_PRESS);
  unsigned long dispenseMs = (unsigned long)ptsToUse * MS_PER_100ML;
  int mlToDispense = ptsToUse * ML_PER_POINT;

  Serial.printf("[BTN1] Dispensing %d pts = %dml (%lums)\n",
                ptsToUse, mlToDispense, dispenseMs);

  lcdShow("  Dispensing Water  ",
          String(mlToDispense) + "ml (" + String(ptsToUse) + " pts)",
          "Please wait...      ");

  machineState = ST_DISPENSING;
  dispenseWater(dispenseMs);

  // Deduct used points
  sessionPts -= ptsToUse;
  machineState = ST_AWAIT_ITEM;

  if (sessionPts > 0) {
    lcdShow("  Water Dispensed!  ",
            String(mlToDispense) + "ml served :)        ",
            "Remaining: " + String(sessionPts) + " pts",
            "[1]More  [2]Scan   ");
  } else {
    lcdShow("  Water Dispensed!  ",
            "Session complete!   ",
            "Thank you for       ",
            "recycling! :)       ");
    sessionPts = 0;
  }
}

// ── BTN 2: SCAN ───────────────────────────────────────────────────────────────
// Activates QR-CAM. User shows ONE of two QR types:
//   • EARN QR  (from mobile app) → session points credited to mobile account
//   • REDEEM QR (from mobile app) → mobile points → water dispensed
// The server auto-detects which type from the token. One scan = one action.
void onScanPressed() {
  if (machineState == ST_DISPENSING || machineState == ST_IDENTIFYING) return;
  if (scanModeActive) {
    // Already in scan mode — cancel it
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    lcdIdle();
    return;
  }

  scanModeActive = true;
  machineState   = ST_SCAN_WAIT;
  Serial.println(F("[BTN2] Scan mode activated"));

  lcdShow("  Scan QR Code      ",
          "Show EARN QR to     ",
          "transfer pts to app ",
          "or REDEEM for water ");

  // Tell QR-CAM to start scanning (it scans continuously anyway,
  // but the flag above gates whether Mega acts on the result)
}

// ─────────────────────────────────────────────────────────────────────────────
// IR SENSOR POLLING
// ─────────────────────────────────────────────────────────────────────────────
void checkIR() {
  if (machineState != ST_AWAIT_ITEM) return;

  bool botIR = (digitalRead(IR_BOTTLE_SLOT) == LOW);
  bool cupIR = (digitalRead(IR_CUP_SLOT)    == LOW);

  if (botIR) {
    Serial.println(F("[IR] Bottle slot triggered"));
    machineState     = ST_IDENTIFYING;
    bottleSlotActive = true;
    camPending       = true;
    camSentAt        = millis();
    Serial2.println(F("##IDENTIFY##"));
    lcdShow("Identifying...      ",
            "Bottle slot         ",
            "Please hold still   ");

  } else if (cupIR) {
    Serial.println(F("[IR] Cup slot triggered"));
    machineState     = ST_IDENTIFYING;
    bottleSlotActive = false;
    camPending       = true;
    camSentAt        = millis();
    Serial3.println(F("##IDENTIFY##"));
    lcdShow("Identifying...      ",
            "Cup slot            ",
            "Please hold still   ");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  // Debug + DevKit bridge (Serial0)
  Serial.begin(115200);
  // QR-CAM   (TX0=GPIO1 of CAM → RX1=pin19 of Mega; safe 3.3V→5V)
  Serial1.begin(115200);
  // Bottle-CAM  (TX0 of CAM → RX2=pin17)
  Serial2.begin(115200);
  // Cup-CAM     (TX0 of CAM → RX3=pin15)
  Serial3.begin(115200);

  // Buttons
  pinMode(BTN_DISPENSE, INPUT_PULLUP);
  pinMode(BTN_SCAN,     INPUT_PULLUP);

  // IR Sensors
  pinMode(IR_BOTTLE_SLOT, INPUT_PULLUP);
  pinMode(IR_CUP_SLOT,    INPUT_PULLUP);

  // Relays — ensure OFF at boot
  pinMode(RELAY_PUMP, OUTPUT); digitalWrite(RELAY_PUMP, RELAY_OFF);
  pinMode(RELAY_SOL1, OUTPUT); digitalWrite(RELAY_SOL1, RELAY_OFF);
  pinMode(RELAY_SOL2, OUTPUT); digitalWrite(RELAY_SOL2, RELAY_OFF);

  // Servos — attach and park in closed/idle position
  srvBottleGate.attach(SRV_BOTTLE_GATE); srvBottleGate.write(GATE_CLOSED);
  srvBottleSort.attach(SRV_BOTTLE_SORT); srvBottleSort.write(SORT_IDLE);
  delay(SERVO_DELAY_MS);
  srvCupGate.attach(SRV_CUP_GATE);       srvCupGate.write(GATE_CLOSED);
  srvCupSort.attach(SRV_CUP_SORT);       srvCupSort.write(SORT_IDLE);
  delay(SERVO_DELAY_MS);
  srvBottleComp.attach(SRV_BOTTLE_COMP); srvBottleComp.write(COMP_IDLE);
  srvCupComp.attach(SRV_CUP_COMP);       srvCupComp.write(COMP_IDLE);

  // LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcdShow("   EcoDefill v2.0   ",
          "  Booting up...     ",
          "  Please wait       ");
  delay(1500);
  lcdIdle();

  Serial.println(F("[MEGA] EcoDefill v2 ready. Load cell REMOVED."));
  Serial.println(F("[MEGA] Serial1=QR-CAM | Serial2=Bottle-CAM | Serial3=Cup-CAM"));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {

  // ── Read all serial ports ────────────────────────────────────────────────
  readSerial(Serial1, qrBuf,  handleQR);
  readSerial(Serial2, botBuf, handleBottleCam);
  readSerial(Serial3, cupBuf, handleCupCam);
  // DevKit replies come back on Serial0 (USB). If using dedicated serial, swap.
  readSerial(Serial,  devBuf, handleDevKit);

  // ── Button debounce ──────────────────────────────────────────────────────
  bool d = digitalRead(BTN_DISPENSE);
  if (d == LOW && lastDispense == HIGH && (millis() - debDispense) > DEBOUNCE_MS) {
    onDispensePressed(); debDispense = millis();
  }
  lastDispense = d;

  bool sc = digitalRead(BTN_SCAN);
  if (sc == LOW && lastScan == HIGH && (millis() - debScan) > DEBOUNCE_MS) {
    onScanPressed(); debScan = millis();
  }
  lastScan = sc;

  // ── IR polling ────────────────────────────────────────────────────────────
  checkIR();

  // ── Camera timeout guard ─────────────────────────────────────────────────
  if (camPending && machineState == ST_IDENTIFYING &&
      (millis() - camSentAt) > CAM_TIMEOUT_MS) {
    Serial.println(F("[MEGA] Camera timeout — item rejected"));
    camPending = false;
    machineState = ST_AWAIT_ITEM;
    lcdShow("No response from    ",
            "camera. Try again.  ");
  }
}
