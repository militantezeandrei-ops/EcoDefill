#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>

#define LCD_ADDR  0x27
#define LCD_COLS  20
#define LCD_ROWS  4
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// SERVO PINS
#define SRV_BOTTLE_GATE  5
#define SRV_BOTTLE_EXIT  6
#define SRV_BOTTLE_BIN   3   // Was pin 2 (INT4 interrupt pin — conflicts with Servo timer on Mega)

#define SRV_CUP_GATE     8
#define SRV_CUP_EXIT     9
#define SRV_CUP_BIN     10

Servo srvBottleGate, srvBottleExit, srvBottleBin;
Servo srvCupGate, srvCupExit, srvCupBin;

// SERVO ANGLES
#define GATE_OPEN       80
#define GATE_CLOSED     10   // 10° min (0° is outside valid PWM range for many servos)
#define SORT_ACTIVE_B   40
#define SORT_ACTIVE_C  140
#define SORT_IDLE       90
#define SERVO_DELAY_MS  250UL
#define SERVO_CLOSE_DELAY_MS 1500UL

#define EXIT_HOLD_MS   1200UL
#define EXIT_OPEN       90
#define EXIT_CLOSED     10   // 10° min (safe minimum)
#define BIN_OPEN        90
#define BIN_CLOSED      10   // 10° min (safe minimum)

// IR SENSOR PINS
#define IR_BOTTLE_SLOT   22
#define IR_BOTTLE_VALID  23
#define IR_CUP_SLOT      24
#define IR_CUP_VALID     25

// PAPER SYSTEM - 1 IR ONLY
#define IR_PAPER_ENTRY  26
#define PAPER_ACTIVE    LOW
#define PAPER_NEEDED    3
#define PAPER_DEBOUNCE  1200UL

// RELAY PINS
#define RELAY_PUMP   34
#define RELAY_SOL1   36
#define RELAY_SOL2   38

#define PUMP_ON   LOW
#define PUMP_OFF  HIGH

#define SOL1_ON   HIGH
#define SOL1_OFF  LOW

// BUTTONS
#define BTN_DISPENSE 30
#define BTN_SCAN     31
#define BTN_RELEASED LOW
#define BTN_PRESSED  HIGH

// ULTRASONIC
#define ULTRASONIC_TRIG  32
#define ULTRASONIC_ECHO  33
#define REFILL_DETECT_CM 12

// TIMING
#define CAM_TIMEOUT_MS          9000UL
#define GATE_STAGE_TIMEOUT_MS   4000UL
#define SOL_OPEN_DELAY          80UL
#define BUSY_MSG_COOLDOWN_MS    2000UL
#define BUSY_MSG_SHOW_MS        900UL
#define SCAN_PRESS_GUARD_MS     2500UL
#define SCAN_CANCEL_GUARD_MS    2000UL
#define QR_SCAN_REARM_MS        3000UL
#define DISPENSE_GUARD_MS       2500UL
#define QR_SCAN_TIMEOUT_MS      15000UL

// DISPENSE
#define ML_PER_POINT        100
#define MAX_PTS_PER_PRESS   5
#define MS_PER_100ML        2000UL

enum State {
  ST_IDLE,
  ST_AWAIT_ITEM,
  ST_GATE_OPEN,
  ST_IDENTIFYING,
  ST_SCAN_WAIT,
  ST_QR_READY,
  ST_DISPENSING,
  ST_DONE
};

State machineState = ST_IDLE;

// SESSION
int sessionPts = 0;
bool bottleSlotActive = false;
bool scanModeActive = false;

// SERIAL
String devBuf = "";
String lastLcdRow[4] = {"", "", "", ""};

// BUTTON GUARDS
unsigned long lastScanPressAt = 0;
unsigned long lastDispensePressAt = 0;
unsigned long qrScanStartedAt = 0;
unsigned long scanButtonBlockedUntil = 0;
bool scanButtonReleaseRequired = false;

// CAMERA
bool camPending = false;
unsigned long camSentAt = 0;
unsigned long gateOpenedAt = 0;

// SENSOR ARMING
bool bottleSlotArmed = true;
bool cupSlotArmed = true;

// PAPER SYSTEM
int paperCount = 0;
unsigned long lastPaperDetectAt = 0;
bool paperWasDetected = false;

// BUSY MESSAGE
unsigned long lastBusyMsgAt = 0;
bool busyMsgActive = false;
unsigned long busyMsgShownAt = 0;
unsigned long pendingQrDispenseMs = 0;
int pendingQrDispenseMl = 0;

// LCD FUNCTIONS
void lcdLine(uint8_t row, const String& text) {
  String s = text;
  while ((int)s.length() < LCD_COLS) s += ' ';
  s = s.substring(0, LCD_COLS);

  if (lastLcdRow[row] == s) return;
  lastLcdRow[row] = s;

  lcd.setCursor(0, row);
  lcd.print(s);
}

void lcdShow(const String& r0,
             const String& r1 = "",
             const String& r2 = "",
             const String& r3 = "") {
  lcdLine(0, r0);
  lcdLine(1, r1);
  lcdLine(2, r2);
  lcdLine(3, r3);
}

void lcdIdle() {
  lcdShow("   EcoDefill v3.0   ",
          "Points: " + String(sessionPts),
          "[1]Get Water [2]QR  ",
          "Insert item to earn ");
}

void clearPendingQrDispense() {
  pendingQrDispenseMs = 0;
  pendingQrDispenseMl = 0;
}

void lcdShowPendingQrDispense() {
  lcdShow(" QR Redeem Success  ",
          String(pendingQrDispenseMl) + "ml approved     ",
          "Place cup, press[1]",
          "to dispense water  ");
}

void blockScanButton(bool requireRelease) {
  scanButtonBlockedUntil = millis() + QR_SCAN_REARM_MS;
  if (requireRelease && digitalRead(BTN_SCAN) == BTN_PRESSED) {
    scanButtonReleaseRequired = true;
  }
}

// DEVKIT
void devkitSend(const String& cmd) {
  Serial.print(F("[->DEV] "));
  Serial.println(cmd);
  Serial1.print(cmd);
Serial1.print('\n');
}

// ULTRASONIC
long getDistanceCM() {
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);

  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);

  digitalWrite(ULTRASONIC_TRIG, LOW);

  long dur = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
  return (dur == 0) ? 999 : dur * 0.034 / 2;
}

bool refillContainerDetected() {
  long d = getDistanceCM();
  return (d > 0 && d <= REFILL_DETECT_CM);
}

// SERVO FUNCTIONS
void moveServoSmooth(Servo& s, int pos) {
  s.write(pos);
  delay(SERVO_DELAY_MS);
}

void openBottleSlot() {
  Serial.println(F("[SERVO] Bottle GATE open"));
  moveServoSmooth(srvBottleGate, GATE_OPEN);
  delay(200);

  Serial.println(F("[SERVO] Bottle SORT active"));
  moveServoSmooth(srvBottleBin, SORT_ACTIVE_B);
}

void closeBottleSlot() {
  Serial.println(F("[SERVO] Bottle slot CLOSE"));
  delay(SERVO_CLOSE_DELAY_MS);

  Serial.println(F("[SERVO] Bottle SORT idle"));
  moveServoSmooth(srvBottleBin, SORT_IDLE);
  delay(200);

  Serial.println(F("[SERVO] Bottle GATE close"));
  moveServoSmooth(srvBottleGate, GATE_CLOSED);
}

void openCupSlot() {
  Serial.println(F("[SERVO] Cup GATE open"));
  moveServoSmooth(srvCupGate, GATE_OPEN);
  delay(200);

  Serial.println(F("[SERVO] Cup SORT active"));
  moveServoSmooth(srvCupBin, SORT_ACTIVE_C);
}

void closeCupSlot() {
  Serial.println(F("[SERVO] Cup slot CLOSE"));
  delay(SERVO_CLOSE_DELAY_MS);

  Serial.println(F("[SERVO] Cup SORT idle"));
  moveServoSmooth(srvCupBin, SORT_IDLE);
  delay(200);

  Serial.println(F("[SERVO] Cup GATE close"));
  moveServoSmooth(srvCupGate, GATE_CLOSED);
}

void compactBottle() {
  Serial.println(F("[SERVO] Bottle BIN open first"));
  srvBottleBin.write(BIN_OPEN);
  delay(SERVO_DELAY_MS);

  Serial.println(F("[SERVO] Bottle EXIT open"));
  srvBottleExit.write(EXIT_OPEN);
  delay(EXIT_HOLD_MS);

  srvBottleExit.write(EXIT_CLOSED);
  delay(SERVO_CLOSE_DELAY_MS);

  srvBottleBin.write(BIN_CLOSED);
  delay(SERVO_CLOSE_DELAY_MS);
}

void returnBottleInvalid() {
  Serial.println(F("[SERVO] Bottle EXIT only"));
  srvBottleExit.write(EXIT_OPEN);
  delay(EXIT_HOLD_MS);

  srvBottleExit.write(EXIT_CLOSED);
  delay(SERVO_CLOSE_DELAY_MS);
}

void compactCup() {
  Serial.println(F("[SERVO] Cup BIN open first"));
  srvCupBin.write(BIN_OPEN);
  delay(SERVO_DELAY_MS);

  Serial.println(F("[SERVO] Cup EXIT open"));
  srvCupExit.write(EXIT_OPEN);
  delay(EXIT_HOLD_MS);

  srvCupExit.write(EXIT_CLOSED);
  delay(SERVO_CLOSE_DELAY_MS);

  srvCupBin.write(BIN_CLOSED);
  delay(SERVO_CLOSE_DELAY_MS);
}

void returnCupInvalid() {
  Serial.println(F("[SERVO] Cup EXIT only"));
  srvCupExit.write(EXIT_OPEN);
  delay(EXIT_HOLD_MS);

  srvCupExit.write(EXIT_CLOSED);
  delay(SERVO_CLOSE_DELAY_MS);
}

// WATER DISPENSE
void dispenseWater(unsigned long ms) {
  lcdShow("  Dispensing Water  ",
          "Please wait...      ",
          "Pump running...     ",
          "                    ");

 digitalWrite(RELAY_PUMP, PUMP_OFF);
digitalWrite(RELAY_SOL1, SOL1_OFF);
delay(150);

digitalWrite(RELAY_SOL1, SOL1_ON);
delay(SOL_OPEN_DELAY);

digitalWrite(RELAY_PUMP, PUMP_ON);
delay(ms);

digitalWrite(RELAY_PUMP, PUMP_OFF);
delay(250);

digitalWrite(RELAY_SOL1, SOL1_OFF);
delay(250);

digitalWrite(RELAY_PUMP, PUMP_OFF);
digitalWrite(RELAY_SOL1, SOL1_OFF);
}

// HANDLE DEVKIT MESSAGES
void handleDevKit(const String& msg) {
  Serial.print(F("[DEV->] "));
  Serial.println(msg);

  if (msg == "CAM:BOTTLE:VALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || !bottleSlotActive) return;

    sessionPts += 1;

    lcdShow("  Bottle Accepted!  ",
            "Sorting item now... ",
            "+1 Point Earned!    ",
            "                    ");

    compactBottle();
    devkitSend("CMD:EARN_ANON|BOTTLE|1");

    lcdShow("  Bottle Accepted!  ",
            "+1 Point Earned!    ",
            "Total: " + String(sessionPts) + " pts",
            "Returning home...   ");

    delay(1500);
    machineState = ST_AWAIT_ITEM;
    lcdIdle();
  }

  else if (msg == "CAM:BOTTLE:INVALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || !bottleSlotActive) return;

    lcdShow("  Not a Bottle!     ",
            "Returning item...   ",
            "Please take it back.",
            "                    ");

    returnBottleInvalid();

    lcdShow("  Not a Bottle!     ",
            "Try inserting again.",
            "Returning home...   ",
            "                    ");

    delay(1200);
    machineState = ST_AWAIT_ITEM;
    lcdIdle();
  }

  else if (msg == "CAM:CUP:VALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || bottleSlotActive) return;

    sessionPts += 1;

    lcdShow("   Cup Accepted!    ",
            "Sorting item now... ",
            "+1 Point Earned!    ",
            "                    ");

    compactCup();
    devkitSend("CMD:EARN_ANON|CUP|1");

    lcdShow("   Cup Accepted!    ",
            "+1 Point Earned!    ",
            "Total: " + String(sessionPts) + " pts",
            "Returning home...   ");

    delay(1500);
    machineState = ST_AWAIT_ITEM;
    lcdIdle();
  }

  else if (msg == "CAM:CUP:INVALID") {
    camPending = false;
    if (machineState != ST_IDENTIFYING || bottleSlotActive) return;

    lcdShow("    Not a Cup!      ",
            "Returning item...   ",
            "Please take it back.",
            "                    ");

    returnCupInvalid();

    lcdShow("    Not a Cup!      ",
            "Try inserting again.",
            "Returning home...   ",
            "                    ");

    delay(1200);
    machineState = ST_AWAIT_ITEM;
    lcdIdle();
  }

  else if (msg == "QR:FOUND") {
  blockScanButton(true);
  lcdShow(" QR Code Detected! ",
          "Please wait...     ",
          "Verifying account  ",
          "Do not scan again  ");
}

  else if (msg.startsWith("QR:REDEEM:")) {

    
    
    // Format from DevKit: QR:REDEEM:<dispenseMs>|<studentName>|<redeemedPoints>
    String data = msg.substring(10);
    int sep1 = data.indexOf('|');
    int sep2 = data.indexOf('|', sep1 + 1);

    if (sep1 < 0 || sep2 < 0) {
      blockScanButton(true);
      scanModeActive = false;
      qrScanStartedAt = 0;
      machineState = ST_AWAIT_ITEM;
      lcdShow(" QR Data Error!     ",
              "Invalid redeem data ",
              "Please scan again.  ",
              "Returning home...   ");
      delay(1500);
      lcdIdle();
      return;
    }

    int ms = data.substring(0, sep1).toInt();
    String studentName = data.substring(sep1 + 1, sep2);
    int redeemedPts = data.substring(sep2 + 1).toInt();

    if (ms > 0) {
      blockScanButton(true);
      pendingQrDispenseMs = ms;
      pendingQrDispenseMl = ms / 20; // DevKit uses 20ms per ml

      scanModeActive = false;
      qrScanStartedAt = 0;
      machineState = ST_QR_READY;

      lcdShow(" QR Redeem Success ",
              studentName,
              "Redeem: " + String(redeemedPts) + " pts",
              "Press [1] dispense ");
    }
  }

  else if (msg.startsWith("QR:RECEIVE:")) {
    // Format from DevKit: QR:RECEIVE:<points>|<studentName>
    String data = msg.substring(11);
    int sep = data.indexOf('|');

    if (sep < 0) {
      blockScanButton(true);
      scanModeActive = false;
      qrScanStartedAt = 0;
      machineState = ST_AWAIT_ITEM;
      lcdShow(" QR Data Error!     ",
              "Invalid point data  ",
              "Please scan again.  ",
              "Returning home...   ");
      delay(1500);
      lcdIdle();
      return;
    }

    int credited = data.substring(0, sep).toInt();
    String studentName = data.substring(sep + 1);

    sessionPts -= credited;
    if (sessionPts < 0) sessionPts = 0;

    blockScanButton(true);
    scanModeActive = false;
    qrScanStartedAt = 0;
    clearPendingQrDispense();
    machineState = ST_AWAIT_ITEM;

    lcdShow(" Points Received!   ",
            studentName,
            String(credited) + " pts sent to app",
            "Left: " + String(sessionPts) + " pts");

    delay(2500);
    lcdIdle();
  }

  // Backward compatibility if DevKit still sends old messages
  else if (msg.startsWith("QR:DISPENSE:")) {
    int ms = msg.substring(12).toInt();
    if (ms > 0) {
      blockScanButton(true);
      pendingQrDispenseMs = ms;
      pendingQrDispenseMl = ms / 20;
      scanModeActive = false;
      qrScanStartedAt = 0;
      machineState = ST_QR_READY;
      lcdShow(" QR Redeem Success ",
              "Student",
              String(pendingQrDispenseMl) + "ml approved",
              "Press [1] dispense ");
    }
  }

  else if (msg.startsWith("QR:EARN:")) {
    int credited = msg.substring(8).toInt();
    sessionPts -= credited;
    if (sessionPts < 0) sessionPts = 0;
    blockScanButton(true);
    scanModeActive = false;
    qrScanStartedAt = 0;
    machineState = ST_AWAIT_ITEM;
    lcdShow(" Points Received!   ",
            "Student",
            String(credited) + " pts sent to app",
            "Left: " + String(sessionPts) + " pts");
    delay(2500);
    lcdIdle();
  }

  else if (msg == "QR:FAIL") {
    blockScanButton(true);
    scanModeActive = false;
    qrScanStartedAt = 0;
    machineState = ST_AWAIT_ITEM;

    lcdShow("  QR Not Valid!     ",
            "Open app and try    ",
            "a fresh QR code.    ",
            "Returning home...   ");

    delay(1500);
    lcdIdle();
  }
}

// DISPENSE BUTTON ACTION
void onDispensePressed() {
  if ((millis() - lastDispensePressAt) < DISPENSE_GUARD_MS) return;
  lastDispensePressAt = millis();

  if (scanModeActive || machineState == ST_SCAN_WAIT) return;

  if (pendingQrDispenseMs > 0 && machineState == ST_QR_READY) {
    if (!refillContainerDetected()) {

  lcdShow(" Waiting for Cup/   ",
              "Tumbler or Bottle   ",
              "No cup detected!    ",
              "QR water is waiting ");

      delay(1500);
      lcdShowPendingQrDispense();
      return;
}

    machineState = ST_DISPENSING;

    lcdShow("  Dispensing Water  ",
            String(pendingQrDispenseMl) + "ml approved     ",
            "QR redeem accepted  ",
            "Please wait...      ");

    dispenseWater(pendingQrDispenseMs);
    clearPendingQrDispense();
    machineState = ST_AWAIT_ITEM;

    lcdShow("  Water Dispensed!  ",
            "QR redeem complete  ",
            "Thank you for using ",
            "EcoDefill!          ");

    delay(1500);
    lcdIdle();
    return;
  }

  if (machineState == ST_DISPENSING ||
      machineState == ST_IDENTIFYING ||
      machineState == ST_GATE_OPEN) {

    if ((millis() - lastBusyMsgAt) > BUSY_MSG_COOLDOWN_MS) {
      lastBusyMsgAt = millis();
      busyMsgActive = true;
      busyMsgShownAt = millis();

      lcdShow("  Please Wait...    ",
              "System is busy.     ",
              "Try again shortly.  ",
              "                    ");
    }
    return;
  }

  if (sessionPts <= 0) {
    lcdShow("  No Points Yet!    ",
            "Insert bottle/cup   ",
            "to earn points.     ",
            "Returning home...   ");
    delay(1200);
    lcdIdle();
    return;
  }

  if (!refillContainerDetected()) {
    lcdShow(" Waiting for Cup/   ",
            "Tumbler or Bottle   ",
            "No cup detected!    ",
            "Place under nozzle  ");

    delay(1500);
    lcdIdle();
    return;
  }

  int ptsToUse = min(sessionPts, MAX_PTS_PER_PRESS);
  unsigned long ms = (unsigned long)ptsToUse * MS_PER_100ML;
  int ml = ptsToUse * ML_PER_POINT;

  machineState = ST_DISPENSING;

  lcdShow("  Dispensing Water  ",
          String(ml) + "ml will dispense",
          String(ptsToUse) + " pts used",
          "Please wait...      ");

  dispenseWater(ms);

  sessionPts -= ptsToUse;
  if (sessionPts < 0) sessionPts = 0;

  machineState = ST_AWAIT_ITEM;

  lcdShow("  Water Dispensed!  ",
          String(ml) + "ml served!",
          "Remaining: " + String(sessionPts) + " pts",
          "Returning home...   ");

  delay(1500);
  lcdIdle();
}

// QR SCAN BUTTON ACTION
void onScanPressed() {
  if ((millis() - lastScanPressAt) < SCAN_PRESS_GUARD_MS) return;
  if (millis() < scanButtonBlockedUntil) return;
  if (scanButtonReleaseRequired) return;
  lastScanPressAt = millis();

  if (scanModeActive || machineState == ST_SCAN_WAIT) {
    if (qrScanStartedAt > 0 &&
        (millis() - qrScanStartedAt) < SCAN_CANCEL_GUARD_MS) {
      Serial.println(F("[BTN] QR CANCEL IGNORED (guard)"));
      return;
    }

    scanModeActive = false;
    qrScanStartedAt = 0;
    machineState = ST_AWAIT_ITEM;

    devkitSend("CMD:CANCEL_QR");

    lcdShow(" QR Scan Cancelled  ",
            "Returning to menu   ",
            "                    ",
            "Returning home...   ");

    delay(800);
    lcdIdle();
    return;
  }

  if (pendingQrDispenseMs > 0 || machineState == ST_QR_READY) {
    lcdShow(" QR Ready To Pour   ",
            String(pendingQrDispenseMl) + "ml is reserved ",
            "Press [1] dispense ",
            "before new QR scan ");

    delay(1200);
    lcdShowPendingQrDispense();
    return;
  }

  if (machineState == ST_DISPENSING ||
      machineState == ST_IDENTIFYING ||
      machineState == ST_GATE_OPEN) {

    if ((millis() - lastBusyMsgAt) > BUSY_MSG_COOLDOWN_MS) {
      lastBusyMsgAt = millis();
      busyMsgActive = true;
      busyMsgShownAt = millis();

      lcdShow("  Please Wait...    ",
              "System is busy.     ",
              "Try again shortly.  ",
              "                    ");
    }
    return;
  }

  scanModeActive = true;
  machineState = ST_SCAN_WAIT;
  qrScanStartedAt = millis();
  blockScanButton(true);

  // Send current local points too. Backend can use this amount when the QR is for transferring points to the app.
  devkitSend("CMD:SCAN_QR|" + String(sessionPts));

  lcdShow(" QR Scanning...    ",
          "Please wait        ",
          "Hold QR in camera  ",
          "Do not move QR     ");
}

// UPDATED IR CHECKING
// Bottle and cup logic copied/improved from second code
void checkIR() {
  if (scanModeActive || machineState == ST_SCAN_WAIT) return;

  bool bottleValidLow = digitalRead(IR_BOTTLE_VALID) == LOW;
  bool cupValidLow    = digitalRead(IR_CUP_VALID) == LOW;

  bool validationBusy = bottleValidLow || cupValidLow;

  if (digitalRead(IR_BOTTLE_SLOT) == HIGH) bottleSlotArmed = true;
  if (digitalRead(IR_CUP_SLOT) == HIGH) cupSlotArmed = true;

  if (machineState == ST_AWAIT_ITEM) {

    // Prevent opening another gate if item is still inside validation chamber
    if (validationBusy) {
      lcdShow(" Validation Busy    ",
              "Item still inside   ",
              "Please wait...      ",
              "                    ");
      return;
    }

    bool botSlotLow = digitalRead(IR_BOTTLE_SLOT) == LOW;
    bool cupSlotLow = digitalRead(IR_CUP_SLOT) == LOW;

    if (botSlotLow && bottleSlotArmed && !cupSlotLow) {
      bottleSlotArmed = false;
      bottleSlotActive = true;
      gateOpenedAt = millis();

      openBottleSlot();
      machineState = ST_GATE_OPEN;

      lcdShow("Bottle detected     ",
              "Gate opened         ",
              "Move to chamber...  ",
              "                    ");
      return;
    }

    if (cupSlotLow && cupSlotArmed && !botSlotLow) {
      cupSlotArmed = false;
      bottleSlotActive = false;
      gateOpenedAt = millis();

      openCupSlot();
      machineState = ST_GATE_OPEN;

      lcdShow("Cup detected        ",
              "Gate opened         ",
              "Move to chamber...  ",
              "                    ");
      return;
    }
  }

  if (machineState == ST_GATE_OPEN) {
    bool validLow = bottleSlotActive ? bottleValidLow : cupValidLow;

    if (validLow) {
      camPending = true;
      camSentAt = millis();
      machineState = ST_IDENTIFYING;

      if (bottleSlotActive) {
        closeBottleSlot();
        devkitSend("CMD:IDENTIFY_BOTTLE");

        lcdShow("Identifying...      ",
                "Bottle chamber      ",
                "Please hold still   ",
                "                    ");
      } else {
        closeCupSlot();
        devkitSend("CMD:IDENTIFY_CUP");

        lcdShow("Identifying...      ",
                "Cup chamber         ",
                "Please hold still   ",
                "                    ");
      }
      return;
    }

    if ((millis() - gateOpenedAt) > GATE_STAGE_TIMEOUT_MS) {
      if (bottleSlotActive) closeBottleSlot();
      else closeCupSlot();

      machineState = ST_AWAIT_ITEM;

      lcdShow("Validation timeout  ",
              "Please re-insert    ",
              "item properly       ",
              "Returning home...   ");

      delay(1200);
      lcdIdle();
    }
  }
}

void checkPaperIR() {
  if (machineState != ST_AWAIT_ITEM || scanModeActive) return;

  bool paperDetected = digitalRead(IR_PAPER_ENTRY) == PAPER_ACTIVE;

  if (paperDetected && !paperWasDetected &&
      millis() - lastPaperDetectAt > PAPER_DEBOUNCE) {

    paperWasDetected = true;
    lastPaperDetectAt = millis();
    paperCount++;

    lcdShow(" Paper Detected!    ",
            "Count: " + String(paperCount) + "/3",
            "Please wait...      ",
            "Insert next paper   ");

    delay(800);

    if (paperCount >= PAPER_NEEDED) {
      paperCount = 0;
      sessionPts++;

      lcdShow(" Paper Accepted!    ",
              "+1 Point Earned     ",
              "Total: " + String(sessionPts) + " pts",
              "Returning home...   ");

      delay(1500);
      lcdIdle();
    }
  }

  if (!paperDetected) {
    paperWasDetected = false;
  }
}

// SERIAL READER
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

// SETUP
void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);

  // 3-pin button modules:
  // S/OUT -> Arduino pin
  // VCC   -> 5V
  // GND   -> GND
  // not pressed = LOW
  // pressed     = HIGH
  pinMode(BTN_DISPENSE, INPUT);
  pinMode(BTN_SCAN, INPUT);

  pinMode(IR_BOTTLE_SLOT, INPUT_PULLUP);
  pinMode(IR_BOTTLE_VALID, INPUT_PULLUP);
  pinMode(IR_CUP_SLOT,    INPUT_PULLUP);
  pinMode(IR_CUP_VALID,   INPUT_PULLUP);

  pinMode(IR_PAPER_ENTRY, INPUT_PULLUP);

  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);

  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_SOL1, OUTPUT);
  pinMode(RELAY_SOL2, OUTPUT);

  digitalWrite(RELAY_PUMP, PUMP_OFF);
digitalWrite(RELAY_SOL1, SOL1_OFF);
digitalWrite(RELAY_SOL2, SOL1_OFF);

  // Safety delay: keep pump/solenoids OFF during relay startup
  delay(300);

  srvBottleGate.attach(SRV_BOTTLE_GATE);
  srvBottleGate.write(GATE_CLOSED);

  srvBottleExit.attach(SRV_BOTTLE_EXIT);
  srvBottleExit.write(EXIT_CLOSED);

  delay(SERVO_DELAY_MS);

  srvBottleBin.attach(SRV_BOTTLE_BIN);
  srvBottleBin.write(BIN_CLOSED);

  delay(SERVO_DELAY_MS);

  srvCupGate.attach(SRV_CUP_GATE);
  srvCupGate.write(GATE_CLOSED);

  srvCupExit.attach(SRV_CUP_EXIT);
  srvCupExit.write(EXIT_CLOSED);

  delay(SERVO_DELAY_MS);

  srvCupBin.attach(SRV_CUP_BIN);
  srvCupBin.write(BIN_CLOSED);

  delay(SERVO_DELAY_MS);

  // FIXED LCD BEGIN
 lcd.begin(LCD_COLS, LCD_ROWS);
  lcd.backlight();
  lcd.clear();

  for (int i = 0; i < 4; i++) lastLcdRow[i] = "";

  lcdShow("   EcoDefill v3.0   ",
          "   Starting up...   ",
          "  Please wait...    ",
          "                    ");

  delay(1500);

  machineState = ST_AWAIT_ITEM;
  lcdIdle();

  Serial.println(F("[MEGA] Ready."));
}

// LOOP
void loop() {
  readSerial(Serial1, devBuf, handleDevKit);

  checkPaperIR();

  // DISPENSE BUTTON - 3-pin module stable debounce
  static bool lastStableDispense = BTN_RELEASED;
  static bool lastRawDispense = BTN_RELEASED;
  static unsigned long lastDispenseChange = 0;

  bool rawDispense = digitalRead(BTN_DISPENSE);

  if (rawDispense != lastRawDispense) {
    lastDispenseChange = millis();
    lastRawDispense = rawDispense;
  }

  if ((millis() - lastDispenseChange) > 120) {
    if (rawDispense != lastStableDispense) {
      lastStableDispense = rawDispense;

      if (lastStableDispense == BTN_PRESSED) {
        Serial.println(F("[BTN] DISPENSE PRESSED"));
        onDispensePressed();
      }
    }
  }

  // QR BUTTON - 3-pin module stable debounce
  static bool lastStableScan = BTN_RELEASED;
  static bool lastRawScan = BTN_RELEASED;
  static unsigned long lastScanChange = 0;

  bool rawScan = digitalRead(BTN_SCAN);

  if (rawScan != lastRawScan) {
    lastScanChange = millis();
    lastRawScan = rawScan;
  }

  if ((millis() - lastScanChange) > 120) {
    if (rawScan != lastStableScan) {
      lastStableScan = rawScan;

      if (lastStableScan == BTN_RELEASED) {
        scanButtonReleaseRequired = false;
      }

      if (lastStableScan == BTN_PRESSED) {
        Serial.println(F("[BTN] QR PRESSED"));
        onScanPressed();
      }
    }
  }

  checkIR();

  // CAMERA TIMEOUT
  if (camPending &&
      machineState == ST_IDENTIFYING &&
      (millis() - camSentAt) > CAM_TIMEOUT_MS) {

    Serial.println(F("[MEGA] Camera timeout - returning item"));
    camPending = false;

    if (bottleSlotActive) {
      returnBottleInvalid();
    } else {
      returnCupInvalid();
    }

    machineState = ST_AWAIT_ITEM;

    lcdShow("  Camera Timeout!   ",
            "WiFi is slow.       ",
            "Item returned.      ",
            "Returning home...   ");

    delay(1200);
    lcdIdle();
  }

  // QR TIMEOUT
  if (scanModeActive &&
      machineState == ST_SCAN_WAIT &&
      qrScanStartedAt > 0 &&
      (millis() - qrScanStartedAt) > QR_SCAN_TIMEOUT_MS) {

    scanModeActive = false;
    qrScanStartedAt = 0;
    machineState = ST_AWAIT_ITEM;

    devkitSend("CMD:CANCEL_QR");

    lcdShow("   QR Timeout!      ",
            "No QR detected.     ",
            "Returning to menu.  ",
            "Returning home...   ");

    delay(1000);
    lcdIdle();
  }

  // BUSY MESSAGE RETURN
  if (busyMsgActive &&
      (millis() - busyMsgShownAt) > BUSY_MSG_SHOW_MS) {

    busyMsgActive = false;

    if (machineState == ST_AWAIT_ITEM && !scanModeActive) {
      lcdIdle();
    }
  }
  // SAFETY: pump and solenoid must stay OFF when not dispensing
  if (machineState != ST_DISPENSING) {
  digitalWrite(RELAY_PUMP, PUMP_OFF);
  digitalWrite(RELAY_SOL1, SOL1_OFF);
}

}
