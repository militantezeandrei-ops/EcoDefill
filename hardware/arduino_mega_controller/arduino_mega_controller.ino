/*
 * EcoDefill v3 — Arduino Mega 2560 — Main Orchestrator (WiFi Architecture)
 * ==========================================================================
 * POWER : 5V from Buck 2 (Clean Logic Line)
 *
 * ROLES:
 *  1. Orchestrate full recycling & dispense flow
 *  2. Drive 6x MG996R Servos (signal pins here; VCC from Buck 1 @ 6V)
 *  3. Read 2x IR Sensors (bottle slot, cup slot)
 *  4. Drive 3x Relay Modules (Pump, Solenoid 1, Solenoid 2)
 *  5. Display status on LCD 20x4 I2C
 *  6. 2x Buttons:
 *       BTN1 = DISPENSE (use local session pts, max 5 pts = 500ml per press)
 *       BTN2 = SCAN     (activate QR-CAM via WiFi through Dev Kit)
 *  7. Serial1 (pins 18/19) ↔ ESP32 DevKit (WiFi/API bridge + CAM hub)
 *
 * NEW v3 PROTOCOL (Mega ↔ ESP32 DevKit via Serial1):
 *  Mega → DevKit:
 *    "CMD:IDENTIFY_BOTTLE\n"     → Dev Kit calls Bottle CAM /identify
 *    "CMD:IDENTIFY_CUP\n"        → Dev Kit calls Cup CAM /identify
 *    "CMD:SCAN_QR\n"             → Dev Kit triggers QR-CAM to scan
 *    "CMD:CANCEL_QR\n"           → Dev Kit cancels QR scan
 *    "CMD:EARN_ANON|<type>|<pts>\n" → Dev Kit logs anonymous earn to backend
 *
 *  DevKit → Mega:
 *    "CAM:BOTTLE:VALID\n"        → Bottle confirmed → open bottle compartment
 *    "CAM:BOTTLE:INVALID\n"      → Not a bottle → reject
 *    "CAM:CUP:VALID\n"           → Cup confirmed → open cup compartment
 *    "CAM:CUP:INVALID\n"         → Not a cup → reject
 *    "QR:EARN:<pts>\n"           → QR earn → points credited to mobile
 *    "QR:DISPENSE:<ms>\n"        → QR redeem → dispense water for <ms> ms
 *    "QR:FAIL\n"                 → QR rejected
 *
 * WIRING (UART only — NO direct CAM wires):
 *   Mega TX1 (pin 18) → DevKit GPIO16 (RX2)  [5V→3.3V: 1kΩ/2kΩ divider]
 *   DevKit GPIO17 (TX2) → Mega RX1 (pin 19)  [3.3V→5V: safe, no resistor]
 *   Common GND
 *
 * SERVO SAFETY RULE ⚠️ (protects Buck 1 — LM2596 @ 6V max 3A):
 *   Never move more than 2 servos at the same time.
 *   Always add 100ms delay between servo groups.
 *
 * LIBRARIES (install via Library Manager):
 *   LiquidCrystal_I2C  by Frank de Brabander
 *   Servo              (built-in with Arduino IDE)
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

// ─── LCD ─────────────────────────────────────────────────────────────────────
#define LCD_ADDR  0x27   // try 0x3F if screen stays blank
#define LCD_COLS  20
#define LCD_ROWS  4
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// ─── SERVO PINS (signal only — power from Buck 1 @ 6V) ───────────────────────
#define SRV_BOTTLE_GATE    5   // Opens/closes bottle input slot
#define SRV_BOTTLE_SORT    6   // Routes accepted bottle into bin
#define SRV_CUP_GATE       8   // Opens/closes cup input slot
#define SRV_CUP_SORT       9   // Routes accepted cup into bin
#define SRV_BOTTLE_COMP    7   // Bottle bin compactor arm
#define SRV_CUP_COMP      10   // Cup bin compactor arm

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
#define IR_BOTTLE_SLOT  22   // LOW = object present in bottle slot
#define IR_CUP_SLOT     24   // LOW = object present in cup slot

// ─── PAPER SYSTEM PINS ───────────────────────────────────────────────────────
#define IR_PAPER_ENTRY  26   // LOW = paper detected at entry
#define IR_PAPER_VALID  27   // LOW = paper passed through
#define PAPER_MOTOR     11   // HIGH = motor off, LOW = motor on (relay)

// ─── ULTRASONIC SENSOR ───────────────────────────────────────────────────────
#define ULTRASONIC_TRIG  32
#define ULTRASONIC_ECHO  33
#define REFILL_DETECT_CM 12  // Container detected if distance <= 12cm

// ─── RELAY PINS (active-LOW relay modules) ────────────────────────────────────
#define RELAY_PUMP   34
#define RELAY_SOL1   36
#define RELAY_SOL2   38
#define RELAY_ON   LOW
#define RELAY_OFF  HIGH

// ─── BUTTONS ─────────────────────────────────────────────────────────────────
#define BTN_DISPENSE 30   // Green button — dispense water (INPUT_PULLUP)
#define BTN_SCAN     31   // Red button   — activate QR scan (INPUT_PULLUP)

// ─── TIMING ──────────────────────────────────────────────────────────────────
#define DEBOUNCE_MS       60UL
#define CAM_TIMEOUT_MS  9000UL   // Max wait for camera WiFi reply
#define SOL_OPEN_DELAY_MS 80UL   // Solenoid opens before pump starts
#define SERVO_DELAY_MS   100UL   // ⚠️ Mandatory between servo groups

// ─── DISPENSE RULES ──────────────────────────────────────────────────────────
#define ML_PER_POINT      100    // 1 point = 100ml water
#define MAX_PTS_PER_PRESS   5    // Max 5 pts per BTN_DISPENSE press = 500ml
#define MS_PER_100ML     2000UL  // ← Tune to your actual pump flow rate

// ─── STATE MACHINE ───────────────────────────────────────────────────────────
enum State {
  ST_IDLE,
  ST_AWAIT_ITEM,     // Ready: waiting for bottle/cup insertion
  ST_IDENTIFYING,    // IR triggered; waiting for camera result via WiFi
  ST_SCAN_WAIT,      // BTN_SCAN pressed; QR-CAM active via WiFi
  ST_DISPENSING,     // Water flowing
  ST_DONE
};
State machineState = ST_IDLE;

// ─── SESSION ─────────────────────────────────────────────────────────────────
int  sessionPts       = 0;
bool bottleSlotActive = false;  // Which slot triggered identification
bool scanModeActive   = false;

// ─── PAPER SYSTEM ────────────────────────────────────────────────────────────
int           paperCount    = 0;
int           paperPoints   = 0;
unsigned long paperOffTimer = 0;
bool          paperLocked   = false;

// ─── SERIAL BUFFER (Serial1 = DevKit) ────────────────────────────────────────
String devBuf = "";

// ─── DEBOUNCE ────────────────────────────────────────────────────────────────
bool lastDispense = HIGH, lastScan = HIGH;
unsigned long debDispense = 0, debScan = 0;

// ─── CAMERA TIMEOUT ──────────────────────────────────────────────────────────
bool          camPending = false;
unsigned long camSentAt  = 0;

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
  int totalPts = sessionPts + paperPoints;
  lcdShow("   EcoDefill v3.0   ",
          "Session pts: " + String(totalPts),
          "[1]Dispense [2]Scan ",
          "Insert item to earn ");
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVKIT COMMUNICATION
// ─────────────────────────────────────────────────────────────────────────────
void devkitSend(const String& cmd) {
  Serial.print(F("[→DEV] ")); Serial.println(cmd);
  Serial1.println(cmd);
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVO HELPERS  ⚠️ Max 2 servos per call; 100ms enforced between groups
// ─────────────────────────────────────────────────────────────────────────────
void moveGroup(Servo& a, int pa, Servo& b, int pb) {
  a.write(pa);
  b.write(pb);
  delay(SERVO_DELAY_MS);  // ⚠️ Buck 1 protection
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
  srvBottleComp.write(COMP_PRESS); delay(800);
  srvBottleComp.write(COMP_IDLE);  delay(SERVO_DELAY_MS);
}
void compactCup() {
  srvCupComp.write(COMP_PRESS); delay(800);
  srvCupComp.write(COMP_IDLE);  delay(SERVO_DELAY_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// RELAY / DISPENSE
// ─────────────────────────────────────────────────────────────────────────────
void dispenseWater(unsigned long ms) {
  Serial.print(F("[PUMP] Dispensing ")); Serial.print(ms); Serial.println(F("ms"));
  lcdShow("  Dispensing Water  ", "Please wait...");
  digitalWrite(RELAY_SOL1, RELAY_ON);
  delay(SOL_OPEN_DELAY_MS);
  digitalWrite(RELAY_PUMP, RELAY_ON);
  delay(ms);
  digitalWrite(RELAY_PUMP, RELAY_OFF);
  delay(SOL_OPEN_DELAY_MS);
  digitalWrite(RELAY_SOL1, RELAY_OFF);
  Serial.println(F("[PUMP] Done"));
}

// ─────────────────────────────────────────────────────────────────────────────
// ULTRASONIC HELPER
// ─────────────────────────────────────────────────────────────────────────────
long getDistanceCM() {
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, LOW);
  long dur = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
  if (dur == 0) return 999;
  return dur * 0.034 / 2;
}

bool refillContainerDetected() {
  long d = getDistanceCM();
  Serial.print(F("[US] Distance: ")); Serial.println(d);
  return (d > 0 && d <= REFILL_DETECT_CM);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVKIT MESSAGE HANDLER  (messages arriving FROM Dev Kit via Serial1)
// ─────────────────────────────────────────────────────────────────────────────
void handleDevKit(const String& msg) {
  Serial.print(F("[DEV→] ")); Serial.println(msg);

  // ── BOTTLE RESULT ─────────────────────────────────────────────────────────
  if (msg == "CAM:BOTTLE:VALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || !bottleSlotActive) return;

    sessionPts += 2;
    openBottleSlot();
    delay(1500);
    compactBottle();
    closeBottleSlot();
    lcdShow("Bottle Accepted!    ",
            "+2 Points Earned!   ",
            "Session: " + String(sessionPts) + " pts",
            "[1]Dispense [2]Scan ");
    devkitSend("CMD:EARN_ANON|BOTTLE|2");
    machineState = ST_AWAIT_ITEM;

  } else if (msg == "CAM:BOTTLE:INVALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || !bottleSlotActive) return;

    lcdShow("Not a Bottle!       ",
            "Item returned.      ",
            "                    ",
            "[1]Dispense [2]Scan ");
    machineState = ST_AWAIT_ITEM;

  // ── CUP RESULT ────────────────────────────────────────────────────────────
  } else if (msg == "CAM:CUP:VALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || bottleSlotActive) return;

    sessionPts += 1;
    openCupSlot();
    delay(1500);
    compactCup();
    closeCupSlot();
    lcdShow("Cup Accepted!       ",
            "+1 Point Earned!    ",
            "Session: " + String(sessionPts) + " pts",
            "[1]Dispense [2]Scan ");
    devkitSend("CMD:EARN_ANON|CUP|1");
    machineState = ST_AWAIT_ITEM;

  } else if (msg == "CAM:CUP:INVALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || bottleSlotActive) return;

    lcdShow("Not a Cup!          ",
            "Item returned.      ",
            "                    ",
            "[1]Dispense [2]Scan ");
    machineState = ST_AWAIT_ITEM;

  // ── QR REDEEM: dispense water ─────────────────────────────────────────────
  } else if (msg.startsWith("QR:DISPENSE:")) {
    int ms = msg.substring(12).toInt();
    if (ms > 0) {
      scanModeActive = false;
      machineState   = ST_DISPENSING;
      dispenseWater((unsigned long)ms);
      machineState = ST_AWAIT_ITEM;
      lcdShow("  Water Dispensed!  ",
              "Thanks for using    ",
              "EcoDefill! :)       ",
              "[1]Dispense [2]Scan ");
    }

  // ── QR EARN: points credited to mobile ────────────────────────────────────
  } else if (msg.startsWith("QR:EARN:")) {
    int credited = msg.substring(8).toInt();
    sessionPts -= credited;
    if (sessionPts < 0) sessionPts = 0;
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    lcdShow("Points Transferred! ",
            String(credited) + " pts sent to app",
            "Session: " + String(sessionPts) + " pts",
            "[1]Dispense [2]Scan ");

  // ── QR FAIL ───────────────────────────────────────────────────────────────
  } else if (msg == "QR:FAIL") {
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    lcdShow("QR Not Recognized!  ",
            "Check your app or   ",
            "try again.          ",
            "[1]Dispense [2]Scan ");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAPER HANDLER
// ─────────────────────────────────────────────────────────────────────────────
void handlePaper() {
  bool entryState = digitalRead(IR_PAPER_ENTRY);
  bool validState = digitalRead(IR_PAPER_VALID);

  if (!paperLocked) {
    if (entryState == LOW) {
      digitalWrite(PAPER_MOTOR, LOW);   // Motor ON
    } else {
      digitalWrite(PAPER_MOTOR, HIGH);  // Motor OFF
      if (paperOffTimer == 0) {
        paperOffTimer = millis();
        if (validState == LOW) {
          paperCount++;
          paperPoints = paperCount / 3;
          Serial.print(F("[PAPER] Count=")); Serial.print(paperCount);
          Serial.print(F(" pts=")); Serial.println(paperPoints);
        }
      }
    }
  }

  if (paperOffTimer > 0) {
    paperLocked = true;
    if (millis() - paperOffTimer >= 2000) {
      paperOffTimer = 0;
      paperLocked   = false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

// BTN1: DISPENSE — uses local session points directly
void onDispensePressed() {
  if (machineState == ST_DISPENSING || machineState == ST_IDENTIFYING) return;

  int totalPts = sessionPts + paperPoints;

  if (totalPts <= 0) {
    lcdShow("No Points!          ",
            "Insert bottles/cups ",
            "to earn points first",
            "[1]Dispense [2]Scan ");
    return;
  }

  if (!refillContainerDetected()) {
    lcdShow("No Container!       ",
            "Place bottle/tumbler",
            "under the nozzle    ",
            "[1]Dispense [2]Scan ");
    return;
  }

  int ptsToUse      = min(totalPts, MAX_PTS_PER_PRESS);
  unsigned long ms  = (unsigned long)ptsToUse * MS_PER_100ML;
  int ml            = ptsToUse * ML_PER_POINT;

  Serial.printf("[BTN1] Dispensing %d pts = %dml (%lums)\n", ptsToUse, ml, ms);

  lcdShow("  Dispensing Water  ",
          String(ml) + "ml (" + String(ptsToUse) + " pts)",
          "Please wait...      ");

  machineState = ST_DISPENSING;
  dispenseWater(ms);

  int fromPaper = min(ptsToUse, paperPoints);
  paperPoints -= fromPaper;
  sessionPts  -= (ptsToUse - fromPaper);
  if (sessionPts < 0) sessionPts = 0;
  machineState = ST_AWAIT_ITEM;

  if (sessionPts + paperPoints > 0) {
    lcdShow("  Water Dispensed!  ",
            String(ml) + "ml served :)",
            "Remaining: " + String(sessionPts + paperPoints) + " pts",
            "[1]More  [2]Scan   ");
  } else {
    lcdShow("  Water Dispensed!  ",
            "Session complete!   ",
            "Thank you for       ",
            "recycling! :)       ");
  }
}

// BTN2: SCAN — triggers QR-CAM via Dev Kit
void onScanPressed() {
  if (machineState == ST_DISPENSING || machineState == ST_IDENTIFYING) return;

  if (scanModeActive) {
    // Already scanning — cancel
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    devkitSend("CMD:CANCEL_QR");
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

  // Tell Dev Kit to activate QR-CAM
  devkitSend("CMD:SCAN_QR");
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
    devkitSend("CMD:IDENTIFY_BOTTLE");
    lcdShow("Identifying...      ",
            "Bottle slot         ",
            "Please hold still   ");

  } else if (cupIR) {
    Serial.println(F("[IR] Cup slot triggered"));
    machineState     = ST_IDENTIFYING;
    bottleSlotActive = false;
    camPending       = true;
    camSentAt        = millis();
    devkitSend("CMD:IDENTIFY_CUP");
    lcdShow("Identifying...      ",
            "Cup slot            ",
            "Please hold still   ");
  }
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
// SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  // Debug serial (USB)
  Serial.begin(115200);
  // Serial1 (pins 18/19) ↔ ESP32 DevKit
  Serial1.begin(115200);

  // Buttons
  pinMode(BTN_DISPENSE, INPUT_PULLUP);
  pinMode(BTN_SCAN,     INPUT_PULLUP);

  // IR Sensors
  pinMode(IR_BOTTLE_SLOT, INPUT_PULLUP);
  pinMode(IR_CUP_SLOT,    INPUT_PULLUP);

  // Paper system
  pinMode(IR_PAPER_ENTRY, INPUT);
  pinMode(IR_PAPER_VALID, INPUT);
  pinMode(PAPER_MOTOR, OUTPUT);
  digitalWrite(PAPER_MOTOR, HIGH);  // Motor OFF at boot

  // Ultrasonic
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);

  // Relays — ensure OFF at boot
  pinMode(RELAY_PUMP, OUTPUT); digitalWrite(RELAY_PUMP, RELAY_OFF);
  pinMode(RELAY_SOL1, OUTPUT); digitalWrite(RELAY_SOL1, RELAY_OFF);
  pinMode(RELAY_SOL2, OUTPUT); digitalWrite(RELAY_SOL2, RELAY_OFF);

  // Servos — attach and park closed/idle
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
  lcdShow("   EcoDefill v3.0   ",
          "  Booting up...     ",
          "  WiFi Arch Ready   ");
  delay(1500);
  lcdIdle();

  Serial.println(F("[MEGA] EcoDefill v3 ready."));
  Serial.println(F("[MEGA] Serial1 = ESP32 DevKit (WiFi hub)"));
  Serial.println(F("[MEGA] All CAMs communicate wirelessly via Dev Kit"));

  machineState = ST_AWAIT_ITEM;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  // Read DevKit replies
  readSerial(Serial1, devBuf, handleDevKit);

  // Button debounce
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

  // IR polling
  checkIR();

  // Paper system
  handlePaper();

  // Camera timeout guard (WiFi can be slower — 9s timeout)
  if (camPending && machineState == ST_IDENTIFYING &&
      (millis() - camSentAt) > CAM_TIMEOUT_MS) {
    Serial.println(F("[MEGA] Camera WiFi timeout — item rejected"));
    camPending   = false;
    machineState = ST_AWAIT_ITEM;
    lcdShow("Camera timeout!     ",
            "WiFi may be slow.   ",
            "Try again.          ",
            "[1]Dispense [2]Scan ");
  }
}
