/*
 * EcoDefill v3 — Arduino Mega 2560 — Main Orchestrator (WiFi Architecture)
 * ==========================================================================
 *
 * SERVO ROLES (YOUR FLOW):
 *   Servo 1 (GATE)  = Input slot gate — opens to let item in, then CLOSES while scanning
 *   Servo 2 (EXIT)  = Validation chamber exit — opens to release item (both VALID & INVALID)
 *   Servo 3 (BIN)   = Bin compartment gate — opens ONLY on VALID, opens BEFORE Servo 2
 *
 * IR SENSORS:
 *   IR_SLOT   (pin 22/24) = Detects item inserted into input slot → opens Gate (Srv1)
 *   IR_VALID  (pin 23/25) = Detects item reached validation chamber → closes Gate, triggers camera
 *
 * FLOW (Bottle example, same for Cup):
 *   1. IR_BOTTLE_SLOT LOW  → open Servo1 (Gate), show "Insert bottle into slot"
 *   2. IR_BOTTLE_VALID LOW → close Servo1 (Gate), send CMD:IDENTIFY_BOTTLE, show "Scanning..."
 *   3. CAM:BOTTLE:VALID    → open Srv3 (Bin gate) FIRST, then Srv2 (Exit), show "Accepted!"
 *   4. CAM:BOTTLE:INVALID  → open Srv2 (Exit) ONLY, show "Not accepted, item returned"
 *
 * BUTTONS:
 *   BTN1 (pin 30) = Dispense water using session points
 *   BTN2 (pin 31) = Activate QR scan mode
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

// ─── LCD ─────────────────────────────────────────────────────────────────────
#define LCD_ADDR  0x27
#define LCD_COLS  20
#define LCD_ROWS  4
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// ─── SERVO PINS ───────────────────────────────────────────────────────────────
// BOTTLE
#define SRV_BOTTLE_GATE  5   // Servo 1: Input slot gate
#define SRV_BOTTLE_EXIT  6   // Servo 2: Validation chamber exit
#define SRV_BOTTLE_BIN   7   // Servo 3: Bottle bin compartment gate

// CUP
#define SRV_CUP_GATE     8   // Servo 1: Input slot gate
#define SRV_CUP_EXIT     9   // Servo 2: Validation chamber exit
#define SRV_CUP_BIN     10   // Servo 3: Cup bin compartment gate

Servo srvBottleGate, srvBottleExit, srvBottleBin;
Servo srvCupGate,    srvCupExit,    srvCupBin;

// Angle presets — tweak to match your build
#define GATE_OPEN    90
#define GATE_CLOSED   0
#define EXIT_OPEN    90
#define EXIT_CLOSED   0
#define BIN_OPEN     90
#define BIN_CLOSED    0
#define SERVO_DELAY_MS  150UL  // Between servo moves (Buck 1 protection)
#define GATE_SERVO_DELAY_MS 80UL
#define EXIT_HOLD_MS   2000UL  // How long exit stays open to release item

// ─── IR SENSOR PINS ──────────────────────────────────────────────────────────
#define IR_BOTTLE_SLOT   22   // LOW = bottle inserted into input slot
#define IR_BOTTLE_VALID  23   // LOW = bottle reached validation chamber
#define IR_CUP_SLOT      24   // LOW = cup inserted into input slot
#define IR_CUP_VALID     25   // LOW = cup reached validation chamber

// ─── RELAY PINS ──────────────────────────────────────────────────────────────
#define RELAY_PUMP   34
#define RELAY_SOL1   36
#define RELAY_SOL2   38
#define RELAY_ON   LOW
#define RELAY_OFF  HIGH

// ─── BUTTONS ─────────────────────────────────────────────────────────────────
#define BTN_DISPENSE 30
#define BTN_SCAN     31

// ─── ULTRASONIC ──────────────────────────────────────────────────────────────
#define ULTRASONIC_TRIG  32
#define ULTRASONIC_ECHO  33
#define REFILL_DETECT_CM 12

// ─── TIMING ──────────────────────────────────────────────────────────────────
#define DEBOUNCE_MS      60UL
#define CAM_TIMEOUT_MS 9000UL
#define GATE_STAGE_TIMEOUT_MS 1000UL
#define SOL_OPEN_DELAY   80UL

// ─── DISPENSE ────────────────────────────────────────────────────────────────
#define ML_PER_POINT     100
#define MAX_PTS_PER_PRESS  5
#define MS_PER_100ML    2000UL

// ─── STATE MACHINE ───────────────────────────────────────────────────────────
enum State {
  ST_IDLE,
  ST_AWAIT_ITEM,      // Waiting for item insertion
  ST_GATE_OPEN,       // Gate open, waiting for item to reach validation IR
  ST_IDENTIFYING,     // Item in validation chamber, camera scanning
  ST_SCAN_WAIT,       // QR scan mode active
  ST_DISPENSING,
  ST_DONE
};
State machineState = ST_IDLE;

// ─── SESSION ─────────────────────────────────────────────────────────────────
int  sessionPts       = 0;
bool bottleSlotActive = false;
bool scanModeActive   = false;

// ─── SERIAL BUFFER ───────────────────────────────────────────────────────────
String devBuf = "";

// ─── DEBOUNCE ────────────────────────────────────────────────────────────────
bool lastDispense = HIGH, lastScan = HIGH;
unsigned long debDispense = 0, debScan = 0;

// ─── CAMERA TIMEOUT ──────────────────────────────────────────────────────────
bool          camPending = false;
unsigned long camSentAt  = 0;
unsigned long gateOpenedAt = 0;
bool gateValidationSeen = false;

// Prevent repeated slot triggers while IR stays LOW.
bool bottleSlotArmed = true;
bool cupSlotArmed    = true;

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
  lcdShow("   EcoDefill v3.0   ",
          "Points: " + String(sessionPts),
          "[1]Get Water [2]QR  ",
          "Insert item to earn ");
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVKIT COMMUNICATION
// ─────────────────────────────────────────────────────────────────────────────
void devkitSend(const String& cmd) {
  Serial.print(F("[->DEV] ")); Serial.println(cmd);
  Serial1.println(cmd);
}

// ─────────────────────────────────────────────────────────────────────────────
// ULTRASONIC
// ─────────────────────────────────────────────────────────────────────────────
long getDistanceCM() {
  digitalWrite(ULTRASONIC_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, LOW);
  long dur = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
  return (dur == 0) ? 999 : dur * 0.034 / 2;
}

bool refillContainerDetected() {
  long d = getDistanceCM();
  return (d > 0 && d <= REFILL_DETECT_CM);
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVO HELPERS — max 2 at a time, delay between groups
// ─────────────────────────────────────────────────────────────────────────────

// BOTTLE — open gate (Srv1) to accept item
void openBottleGate() {
  Serial.println(F("[SERVO] Bottle GATE open"));
  srvBottleGate.write(GATE_OPEN);
  delay(GATE_SERVO_DELAY_MS);
}

// BOTTLE — close gate (Srv1) after item enters validation chamber
void closeBottleGate() {
  Serial.println(F("[SERVO] Bottle GATE closed"));
  srvBottleGate.write(GATE_CLOSED);
  delay(GATE_SERVO_DELAY_MS);
}

// BOTTLE VALID: Srv3 (bin gate) opens FIRST, then Srv2 (exit) opens
void releaseBottleValid() {
  Serial.println(F("[SERVO] Bottle BIN gate open (Srv3 first)"));
  srvBottleBin.write(BIN_OPEN);
  delay(SERVO_DELAY_MS);

  Serial.println(F("[SERVO] Bottle EXIT open (Srv2)"));
  srvBottleExit.write(EXIT_OPEN);
  delay(EXIT_HOLD_MS);

  // Close in reverse: exit first, then bin gate
  srvBottleExit.write(EXIT_CLOSED);
  delay(SERVO_DELAY_MS);
  srvBottleBin.write(BIN_CLOSED);
  delay(SERVO_DELAY_MS);
}

// BOTTLE INVALID: Srv2 (exit) opens ONLY — item returned to user
void returnBottleInvalid() {
  Serial.println(F("[SERVO] Bottle EXIT open - returning item (Srv2 only)"));
  srvBottleExit.write(EXIT_OPEN);
  delay(EXIT_HOLD_MS);
  srvBottleExit.write(EXIT_CLOSED);
  delay(SERVO_DELAY_MS);
}

// CUP — same structure
void openCupGate() {
  Serial.println(F("[SERVO] Cup GATE open"));
  srvCupGate.write(GATE_OPEN);
  delay(GATE_SERVO_DELAY_MS);
}

void closeCupGate() {
  Serial.println(F("[SERVO] Cup GATE closed"));
  srvCupGate.write(GATE_CLOSED);
  delay(GATE_SERVO_DELAY_MS);
}

void releaseCupValid() {
  Serial.println(F("[SERVO] Cup BIN gate open (Srv3 first)"));
  srvCupBin.write(BIN_OPEN);
  delay(SERVO_DELAY_MS);

  Serial.println(F("[SERVO] Cup EXIT open (Srv2)"));
  srvCupExit.write(EXIT_OPEN);
  delay(EXIT_HOLD_MS);

  srvCupExit.write(EXIT_CLOSED);
  delay(SERVO_DELAY_MS);
  srvCupBin.write(BIN_CLOSED);
  delay(SERVO_DELAY_MS);
}

void returnCupInvalid() {
  Serial.println(F("[SERVO] Cup EXIT open - returning item (Srv2 only)"));
  srvCupExit.write(EXIT_OPEN);
  delay(EXIT_HOLD_MS);
  srvCupExit.write(EXIT_CLOSED);
  delay(SERVO_DELAY_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPENSE
// ─────────────────────────────────────────────────────────────────────────────
void dispenseWater(unsigned long ms) {
  lcdShow("  Dispensing Water  ",
          "Please wait...      ");
  digitalWrite(RELAY_SOL1, RELAY_ON);
  delay(SOL_OPEN_DELAY);
  digitalWrite(RELAY_PUMP, RELAY_ON);
  delay(ms);
  digitalWrite(RELAY_PUMP, RELAY_OFF);
  delay(SOL_OPEN_DELAY);
  digitalWrite(RELAY_SOL1, RELAY_OFF);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVKIT MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────────────────────
void handleDevKit(const String& msg) {
  Serial.print(F("[DEV->] ")); Serial.println(msg);

  // ── BOTTLE VALID ──────────────────────────────────────────────────────────
  if (msg == "CAM:BOTTLE:VALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || !bottleSlotActive) return;

    lcdShow("  Bottle Accepted!  ",
            "Opening bin gate... ",
            "Sorting item now... ",
            "                    ");
    sessionPts += 2;
    releaseBottleValid();   // Srv3 FIRST, then Srv2
    devkitSend("CMD:EARN_ANON|BOTTLE|2");

    lcdShow("  Bottle Accepted!  ",
            "+2 Points Earned!   ",
            "Total: " + String(sessionPts) + " pts        ",
            "[1]Water  [2]QR Scan");
    machineState = ST_AWAIT_ITEM;

  // ── BOTTLE INVALID ────────────────────────────────────────────────────────
  } else if (msg == "CAM:BOTTLE:INVALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || !bottleSlotActive) return;

    lcdShow("  Not a Bottle!     ",
            "Returning your item.",
            "Please take it back.",
            "                    ");
    returnBottleInvalid();  // Srv2 only, Srv3 stays closed
    lcdShow("  Not a Bottle!     ",
            "Try inserting again.",
            "                    ",
            "[1]Water  [2]QR Scan");
    machineState = ST_AWAIT_ITEM;

  // ── CUP VALID ─────────────────────────────────────────────────────────────
  } else if (msg == "CAM:CUP:VALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || bottleSlotActive) return;

    lcdShow("   Cup Accepted!    ",
            "Opening bin gate... ",
            "Sorting item now... ",
            "                    ");
    sessionPts += 1;
    releaseCupValid();      // Srv3 FIRST, then Srv2
    devkitSend("CMD:EARN_ANON|CUP|1");

    lcdShow("   Cup Accepted!    ",
            "+1 Point Earned!    ",
            "Total: " + String(sessionPts) + " pts        ",
            "[1]Water  [2]QR Scan");
    machineState = ST_AWAIT_ITEM;

  // ── CUP INVALID ───────────────────────────────────────────────────────────
  } else if (msg == "CAM:CUP:INVALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || bottleSlotActive) return;

    lcdShow("    Not a Cup!      ",
            "Returning your item.",
            "Please take it back.",
            "                    ");
    returnCupInvalid();     // Srv2 only
    lcdShow("    Not a Cup!      ",
            "Try inserting again.",
            "                    ",
            "[1]Water  [2]QR Scan");
    machineState = ST_AWAIT_ITEM;

  // ── QR REDEEM ─────────────────────────────────────────────────────────────
  } else if (msg.startsWith("QR:DISPENSE:")) {
    int ms = msg.substring(12).toInt();
    if (ms > 0) {
      scanModeActive = false;
      machineState   = ST_DISPENSING;
      dispenseWater((unsigned long)ms);
      lcdShow("  Water Dispensed!  ",
              "Thank you for using ",
              "EcoDefill!          ",
              "[1]Water  [2]QR Scan");
      machineState = ST_AWAIT_ITEM;
    }

  // ── QR EARN ───────────────────────────────────────────────────────────────
  } else if (msg.startsWith("QR:EARN:")) {
    int credited = msg.substring(8).toInt();
    sessionPts -= credited;
    if (sessionPts < 0) sessionPts = 0;
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    lcdShow("Points Transferred! ",
            String(credited) + " pts sent to app  ",
            "Remaining: " + String(sessionPts) + " pts    ",
            "[1]Water  [2]QR Scan");

  // ── QR FAIL ───────────────────────────────────────────────────────────────
  } else if (msg == "QR:FAIL") {
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    lcdShow("  QR Not Valid!     ",
            "Open app and try    ",
            "a fresh QR code.    ",
            "[1]Water  [2]QR Scan");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
void onDispensePressed() {
  // Block if busy
  if (scanModeActive || machineState == ST_SCAN_WAIT ||
      machineState == ST_DISPENSING || machineState == ST_IDENTIFYING ||
      machineState == ST_GATE_OPEN) {
    lcdShow("  Please Wait...    ",
            "System is busy.     ",
            "Try again shortly.  ",
            "                    ");
    delay(1500);
    return;
  }

  if (sessionPts <= 0) {
    lcdShow("  No Points Yet!    ",
            "Insert a bottle     ",
            "or cup to earn pts. ",
            "[1]Water  [2]QR Scan");
    return;
  }

  if (!refillContainerDetected()) {
    lcdShow(" No Cup Detected!   ",
            "Place your cup or   ",
            "bottle under nozzle.",
            "[1]Water  [2]QR Scan");
    return;
  }

  int ptsToUse     = min(sessionPts, MAX_PTS_PER_PRESS);
  unsigned long ms = (unsigned long)ptsToUse * MS_PER_100ML;
  int ml           = ptsToUse * ML_PER_POINT;

  lcdShow("  Dispensing Water  ",
          String(ml) + "ml (" + String(ptsToUse) + " pts used) ",
          "Please wait...      ",
          "                    ");

  machineState = ST_DISPENSING;
  dispenseWater(ms);
  sessionPts -= ptsToUse;
  if (sessionPts < 0) sessionPts = 0;
  machineState = ST_AWAIT_ITEM;

  if (sessionPts > 0) {
    lcdShow("  Water Dispensed!  ",
            String(ml) + "ml served!        ",
            "Remaining: " + String(sessionPts) + " pts    ",
            "[1]More   [2]QR Scan");
  } else {
    lcdShow("  Water Dispensed!  ",
            "All points used up. ",
            "Recycle more items! ",
            "                    ");
  }
}

void onScanPressed() {
  if (machineState == ST_DISPENSING || machineState == ST_IDENTIFYING ||
      machineState == ST_GATE_OPEN) {
    lcdShow("  Please Wait...    ",
            "System is busy.     ",
            "Try again shortly.  ",
            "                    ");
    delay(1500);
    return;
  }

  if (scanModeActive) {
    // Cancel scan
    scanModeActive = false;
    machineState   = ST_AWAIT_ITEM;
    devkitSend("CMD:CANCEL_QR");
    lcdShow(" QR Scan Cancelled  ",
            "                    ",
            "                    ",
            "[1]Water  [2]QR Scan");
    delay(1200);
    lcdIdle();
    return;
  }

  scanModeActive = true;
  machineState   = ST_SCAN_WAIT;
  devkitSend("CMD:SCAN_QR");

  lcdShow(" Show Your QR Code  ",
          "Hold QR in front of ",
          "the camera above.   ",
          "Press [2] to cancel ");
}

// ─────────────────────────────────────────────────────────────────────────────
// IR POLLING — two-stage: slot IR → gate open → validation IR → camera
// ─────────────────────────────────────────────────────────────────────────────
void checkIR() {
  // ── STAGE 1: Slot IR → open gate ────────────────────────────────────────
  if (machineState == ST_AWAIT_ITEM) {
    bool botSlotLow = (digitalRead(IR_BOTTLE_SLOT) == LOW);
    bool cupSlotLow = (digitalRead(IR_CUP_SLOT)    == LOW);

    if (!botSlotLow) bottleSlotArmed = true;
    if (!cupSlotLow) cupSlotArmed = true;

    if (botSlotLow && bottleSlotArmed) {
      bottleSlotArmed = false;
      Serial.println(F("[IR] Bottle slot triggered - opening gate"));
      bottleSlotActive = true;
      machineState     = ST_GATE_OPEN;
      gateOpenedAt     = millis();
      gateValidationSeen = false;
      openBottleGate();
      lcdShow("  Bottle Detected!  ",
              "Gate is opening...  ",
              "Insert your bottle  ",
              "into the slot.      ");

    } else if (cupSlotLow && cupSlotArmed) {
      cupSlotArmed = false;
      Serial.println(F("[IR] Cup slot triggered - opening gate"));
      bottleSlotActive = false;
      machineState     = ST_GATE_OPEN;
      gateOpenedAt     = millis();
      gateValidationSeen = false;
      openCupGate();
      lcdShow("   Cup Detected!    ",
              "Gate is opening...  ",
              "Insert your cup     ",
              "into the slot.      ");
    }
  }

  // ── STAGE 2: Validation IR → close gate → trigger camera ───────────────
  if (machineState == ST_GATE_OPEN) {
    bool botValid = (digitalRead(IR_BOTTLE_VALID) == LOW);
    bool cupValid = (digitalRead(IR_CUP_VALID)    == LOW);

    if ((bottleSlotActive && botValid) || (!bottleSlotActive && cupValid)) {
      gateValidationSeen = true;
    }

    if ((millis() - gateOpenedAt) >= GATE_STAGE_TIMEOUT_MS) {
      if (gateValidationSeen) {
        if (bottleSlotActive) {
          Serial.println(F("[IR] Bottle validated in 1s window - closing gate"));
          closeBottleGate();
          machineState = ST_IDENTIFYING;
          camPending   = true;
          camSentAt    = millis();
          devkitSend("CMD:IDENTIFY_BOTTLE");
          lcdShow("  Scanning Item...  ",
                  "Camera is checking  ",
                  "if its a bottle.    ",
                  "Please wait...      ");
        } else {
          Serial.println(F("[IR] Cup validated in 1s window - closing gate"));
          closeCupGate();
          machineState = ST_IDENTIFYING;
          camPending   = true;
          camSentAt    = millis();
          devkitSend("CMD:IDENTIFY_CUP");
          lcdShow("  Scanning Item...  ",
                  "Camera is checking  ",
                  "if its a cup.       ",
                  "Please wait...      ");
        }
      } else {
        Serial.println(F("[IR] 1s gate window ended - closing gate"));
        if (bottleSlotActive) {
          closeBottleGate();
        } else {
          closeCupGate();
        }
        machineState = ST_AWAIT_ITEM;
        lcdShow("No item in chamber. ",
                "Gate closed for safe",
                "Please insert again.",
                "[1]Water  [2]QR Scan");
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERIAL LINE READER
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
  Serial.begin(115200);
  Serial1.begin(115200);  // UART to ESP32 Dev Kit (pins 18/19)

  // Buttons
  pinMode(BTN_DISPENSE, INPUT_PULLUP);
  pinMode(BTN_SCAN,     INPUT_PULLUP);

  // IR Sensors
  pinMode(IR_BOTTLE_SLOT,  INPUT_PULLUP);
  pinMode(IR_BOTTLE_VALID, INPUT_PULLUP);
  pinMode(IR_CUP_SLOT,     INPUT_PULLUP);
  pinMode(IR_CUP_VALID,    INPUT_PULLUP);

  // Ultrasonic
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);

  // Relays OFF at boot
  pinMode(RELAY_PUMP, OUTPUT); digitalWrite(RELAY_PUMP, RELAY_OFF);
  pinMode(RELAY_SOL1, OUTPUT); digitalWrite(RELAY_SOL1, RELAY_OFF);
  pinMode(RELAY_SOL2, OUTPUT); digitalWrite(RELAY_SOL2, RELAY_OFF);

  // Servos — all closed/idle at boot
  srvBottleGate.attach(SRV_BOTTLE_GATE); srvBottleGate.write(GATE_CLOSED);
  srvBottleExit.attach(SRV_BOTTLE_EXIT); srvBottleExit.write(EXIT_CLOSED);
  delay(SERVO_DELAY_MS);
  srvBottleBin.attach(SRV_BOTTLE_BIN);   srvBottleBin.write(BIN_CLOSED);
  delay(SERVO_DELAY_MS);
  srvCupGate.attach(SRV_CUP_GATE);       srvCupGate.write(GATE_CLOSED);
  srvCupExit.attach(SRV_CUP_EXIT);       srvCupExit.write(EXIT_CLOSED);
  delay(SERVO_DELAY_MS);
  srvCupBin.attach(SRV_CUP_BIN);         srvCupBin.write(BIN_CLOSED);

  // LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcdShow("   EcoDefill v3.0   ",
          "   Starting up...   ",
          "  Please wait...    ",
          "                    ");
  delay(1500);
  lcdIdle();

  machineState = ST_AWAIT_ITEM;
  Serial.println(F("[MEGA] Ready."));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  // Read Dev Kit replies
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

  // IR polling (two-stage gate logic)
  checkIR();

  // Camera WiFi timeout guard
  if (camPending && machineState == ST_IDENTIFYING &&
      (millis() - camSentAt) > CAM_TIMEOUT_MS) {
    Serial.println(F("[MEGA] Camera timeout - returning item"));
    camPending = false;

    // Return item safely (open exit only, bin stays closed)
    if (bottleSlotActive) {
      returnBottleInvalid();
    } else {
      returnCupInvalid();
    }

    machineState = ST_AWAIT_ITEM;
    lcdShow("  Camera Timeout!   ",
            "WiFi is slow.       ",
            "Item returned.      ",
            "Please try again.   ");
  }
}
