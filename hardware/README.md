# EcoDefill v2 — Hardware Setup Guide

> **Architecture Change:** Load cell removed. Now uses 3× ESP32-CAM for
> bottle detection, cup detection, and QR scanning.

---

## 1. Power Distribution (Junction Box — 12V 5A PSU)

| Hole | Buck / Direct | Component | Voltage | Notes |
|:----:|:-------------|:----------|:-------:|:------|
| 1 | Buck 1 (LM2596) | 6× MG996R Servos | **6V** | **Noisy line.** Keep 1000µF cap on output. ⚠️ Max 2 servos moving at once! |
| 2 | Buck 2 (LM2596) | Mega 2560, ESP32 DevKit, LCD, IR sensors | **5V** | Clean Logic line. Runs cool. |
| 3 | Buck 3 (LM2596) | 3× ESP32-CAM | **5V** | Heavy Processing — **add heatsink** to LM2596 chip! |
| 4 | Direct 12V | Water Pump, Solenoid 1, Solenoid 2 | **12V** | Bypasses all bucks. Use 1N4007 flyback diodes on each load. |

> ⚠️ **Servo Rule:** The LM2596 maxes out at **3A** (hot at 2A). Buck 1 will
> shut down if you move more than 2 servos at once. The firmware enforces a
> mandatory **100ms delay between servo group moves** automatically.

---

## 2. Board Roles

| Board | Qty | Role | Power |
|:------|:---:|:-----|:------|
| Arduino Mega 2560 | 1 | **Main Orchestrator** — state machine, servos, relays, LCD, buttons, IR | Buck 2 (5V) |
| ESP32 DevKit V1 | 1 | **WiFi / API Bridge** — talks to Vercel server, returns dispense time | Buck 2 (5V) |
| ESP32-CAM #1 | 1 | **Bottle Detector** | Buck 3 (5V) |
| ESP32-CAM #2 | 1 | **Cup Detector** | Buck 3 (5V) |
| ESP32-CAM #3 | 1 | **QR Scanner** | Buck 3 (5V) |

---

## 3. Wiring

### 3a. Serial Communication (Mega ↔ All Boards)

| Mega Port | Mega Pins | Connects to | Direction |
|:----------|:----------|:------------|:----------|
| Serial1 | TX1=18, **RX1=19** | QR-CAM GPIO1 (TX0) | CAM→Mega only (safe, 3.3V→5V) |
| Serial2 | **TX2=16**, RX2=17 | Bottle-CAM UART0 | Bidirectional — use voltage divider on Mega TX2 |
| Serial3 | **TX3=14**, RX3=15 | Cup-CAM UART0 | Bidirectional — use voltage divider on Mega TX3 |
| Serial0 | TX0=1, RX0=0 | ESP32 DevKit Serial2 (GPIO16/17) | Bidirectional — use voltage divider on Mega TX0 |

> ⚠️ **Voltage Divider (Mega 5V TX → ESP32 3.3V RX):**
> ```
> Mega TX ──[ 1kΩ ]──┬── ESP32 RX
>                    │
>                  [ 2kΩ ]
>                    │
>                   GND
> ```
> This gives ≈3.3V at the ESP32 RX. Required on **every** Mega TX line.

### 3b. Servo Wiring

| Servo | Function | Mega Signal Pin | VCC | GND |
|:------|:---------|:----------------|:----|:----|
| srvBottleGate | Bottle input slot gate | **Pin 22** | Buck 1 +6V | Common GND |
| srvBottleSort | Bottle sorting gate | **Pin 24** | Buck 1 +6V | Common GND |
| srvCupGate    | Cup input slot gate | **Pin 26** | Buck 1 +6V | Common GND |
| srvCupSort    | Cup sorting gate | **Pin 28** | Buck 1 +6V | Common GND |
| srvBottleComp | Bottle bin compactor | **Pin 30** | Buck 1 +6V | Common GND |
| srvCupComp    | Cup bin compactor | **Pin 32** | Buck 1 +6V | Common GND |

### 3c. IR Sensors

| Sensor | Mega Pin | Detects |
|:-------|:---------|:--------|
| Bottle slot IR | **A0** | Object inserted in bottle input chute |
| Cup slot IR    | **A1** | Object inserted in cup input chute |

### 3d. Relay Modules → 12V Loads

| Relay | Mega Signal Pin | Controls | Notes |
|:------|:----------------|:---------|:------|
| Relay 1 | **Pin 34** | Water Pump | Active-LOW. 1N4007 across pump motor |
| Relay 2 | **Pin 36** | Solenoid Valve 1 | Active-LOW. 1N4007 across solenoid coil |
| Relay 3 | **Pin 38** | Solenoid Valve 2 | Active-LOW. 1N4007 across solenoid coil |

Relay VCC → Buck 2 (5V). Relay COM/NO → 12V direct (Hole 4).

### 3e. Buttons & LCD

| Component | Mega Pin | Notes |
|:----------|:---------|:------|
| BTN_START  | Pin 2 | INPUT_PULLUP (connect to GND) |
| BTN_CANCEL | Pin 3 | INPUT_PULLUP (connect to GND) |
| LCD SDA    | Pin 20 | I2C SDA |
| LCD SCL    | Pin 21 | I2C SCL |
| LCD VCC    | 5V (Buck 2) | — |

---

## 4. Firmware Files

| File | Board | Flash With |
|:-----|:------|:-----------|
| `arduino_mega_controller/arduino_mega_controller.ino` | Mega 2560 | Arduino IDE → MEGA 2560 |
| `esp32_main_controller/esp32_main_controller.ino` | ESP32 DevKit V1 | Arduino IDE → DOIT DEVKIT V1 |
| `esp32_cam_qr/esp32_cam_qr.ino` | ESP32-CAM #3 (QR) | FTDI → AI Thinker ESP32-CAM |
| `esp32_cam_bottle/esp32_cam_bottle.ino` | ESP32-CAM #1 (Bottle) | FTDI → AI Thinker ESP32-CAM |
| `esp32_cam_cup/esp32_cam_cup.ino` | ESP32-CAM #2 (Cup) | FTDI → AI Thinker ESP32-CAM |

### Before uploading, edit in each file:
```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MACHINE_ID    = "MACHINE_01";   // Must match your DB
```

---

## 5. System Flow

```
User approaches machine
        │
        ▼
[Optional] Scan QR with ESP32-CAM #3
        │  Token sent → Mega Serial1
        │
        ▼
Insert bottle or cup
        │  IR sensor triggers
        ▼
Mega sends ##IDENTIFY## → ESP32-CAM #1 (bottle slot)
                       OR ESP32-CAM #2 (cup slot)
        │
        ▼
Camera replies ##DETECT:BOTTLE## / ##DETECT:CUP## / ##DETECT:NONE##
        │
        ▼
Mega opens servo gate → item falls in → compact → close gate
        │
        ▼
Mega sends CMD:EARN|<type>|<pts>[|<token>] → ESP32 DevKit
        │  DevKit POSTs to /api/add-point
        │  DevKit replies RESULT:OK / RESULT:FAIL
        │
        ▼
User presses START (with QR loaded) to REDEEM water
        │
        ▼
Mega sends CMD:REDEEM|<token>|<pts> → ESP32 DevKit
        │  DevKit POSTs to /api/verify-qr
        │  DevKit polls /api/machine-status
        │  DevKit replies DISPENSE:<ms>
        │
        ▼
Mega opens Solenoid 1 → starts Pump → waits <ms> → closes all
```

---

## 6. Communication Protocols

### Mega ↔ Camera (both directions same port)
| Direction | Message | Meaning |
|:----------|:--------|:--------|
| Mega → CAM | `##IDENTIFY##` | Take a photo and identify |
| CAM → Mega | `##DETECT:BOTTLE##` | Bottle confirmed |
| CAM → Mega | `##DETECT:CUP##` | Cup confirmed |
| CAM → Mega | `##DETECT:NONE##` | Nothing detected |
| CAM → Mega | `##QR:<token>##` | QR token scanned |
| CAM → Mega | `##STATUS:<label>##` | Status update |

### Mega → DevKit
| Message | Meaning |
|:--------|:--------|
| `CMD:EARN\|BOTTLE\|2` | Anonymous bottle earn (2 pts) |
| `CMD:EARN\|CUP\|1\|<token>` | Authenticated cup earn (1 pt) |
| `CMD:REDEEM\|<token>\|5` | Redeem 5 pts for water |

### DevKit → Mega
| Message | Meaning |
|:--------|:--------|
| `RESULT:OK` | API call succeeded |
| `RESULT:FAIL` | API call failed |
| `DISPENSE:<ms>` | Dispense water for ms milliseconds |

---

## 7. Troubleshooting

| Problem | Solution |
|:--------|:---------|
| Servos stalling / Buck 1 hot | Check firmware never moves >2 servos at once. Add 100ms delay. |
| ESP32-CAM reboots during capture | Buck 3 instability — check heatsink on LM2596; cap on Buck 3 output |
| Camera always returns NONE | Adjust `BRIGHTNESS_THRESH`, check lighting above the insertion slot |
| Mega not receiving from camera | Check voltage divider; confirm baudrate 115200 on all ports |
| DevKit never dispatches DISPENSE | Check `/api/machine-status` returns `{ approved: true, dispenseTimeMs: N }` |
| LCD blank | Try I2C address `0x3F` instead of `0x27` in `arduino_mega_controller.ino` |
| Solenoid buzzes but no water | Solenoid valve may need >100ms to fully open — increase `SOL_OPEN_DELAY_MS` |
