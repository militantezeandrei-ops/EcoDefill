# EcoDefill — Hardware Architecture & Firmware Guide

This document details the complete hardware configuration, circuit pinouts, network topology, communication protocols, and firmware breakdown for the **EcoDefill v3** machine.

---

## 1. High-Level Hardware Architecture

The EcoDefill machine utilizes a modular multi-controller topology:

```
                                +---------------------------+
                                |  Next.js Cloud Backend    |
                                |  (eco-defill.vercel.app)  |
                                +-------------+-------------+
                                              ^
                                              | HTTPS (TLS)
                                              v
+------------------------+      +-------------+-------------+      +------------------------+
|   ESP32-CAM: Bottle    |      |     ESP32 DevKit V1       |      |     ESP32-CAM: Cup     |
|   Static: .110         | <--> |     Static: .100          | <--> |     Static: .111       |
|   OV2640 Image Capture | WiFi |     Local HTTP Server     | WiFi |     Edge Impulse FOMO  |
+------------------------+      +-------------+-------------+      +------------------------+
                                              ^
                                              | WiFi (Local HTTP)
                                              v
                                +-------------+-------------+
                                |    ESP32-CAM: QR Code     |
                                |    Static: .120           |
                                |    Screen / Token Scanner |
                                +---------------------------+
                                              ^
                                              | Serial2 UART (115200 baud)
                                              v
                                +-------------+-------------+
                                |     Arduino Mega 2560     |
                                |  Main Machine Controller  |
                                +-------------+-------------+
                                              |
      +-------------------+-------------------+-------------------+-------------------+
      |                   |                   |                   |                   |
      v                   v                   v                   v                   v
[ 6x Servos ]      [ 5x IR Sensors ]   [ 2x Pushbuttons ]   [ Relays & Pump ]   [ 20x4 I2C LCD ]
- Bottle Gate      - Bottle Slot       - [1] Dispense Water - 12V Diaphragm     - Address: 0x27
- Bottle Exit      - Bottle Chamber    - [2] Scan QR Mode     Water Pump        - Real-time
- Bottle Bin       - Cup Slot                               - Solenoid Valve 1    Status
- Cup Gate         - Cup Chamber                            - Solenoid Valve 2
- Cup Exit         - Paper Entry
- Cup Bin
```

---

## 2. IP Network Configuration (2.4 GHz WiFi Subnet)

All ESP32 microcontrollers communicate wirelessly over a dedicated local 2.4 GHz WiFi hotspot or router network.

| Device | Board Model | Static IP | Port | Firmware File | Primary Role |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **DevKit Hub** | DOIT ESP32 DEVKIT V1 | `192.168.100.100` | `80` | `hardware/Esp32_Devkit/Esp32_Devkit.ino` | WiFi-to-UART bridge, REST server, API client |
| **Bottle CAM** | AI-Thinker ESP32-CAM | `192.168.100.110` | `80` | `hardware/Esp32_Bottles/Esp32_Bottle.ino` | Image capture & bottle validation |
| **Cup CAM** | AI-Thinker ESP32-CAM | `192.168.100.111` | `80` | `hardware/Esp32_Cup/Esp32_Cup.ino` | Edge Impulse FOMO cup classification |
| **QR CAM** | AI-Thinker ESP32-CAM | `192.168.100.120` | `80` | `hardware/Esp32_QR/Esp32_QR.ino` | High-speed QR decoding (`V-Flip=ON`) |
| **Gateway** | WiFi Router / Hotspot | `192.168.100.1` | - | - | Subnet: `255.255.255.0`, DNS: `8.8.8.8` |

---

## 3. Microcontroller Firmware Breakdown

### 1. Arduino Mega Controller (`hardware/ArduinoMega/mega3.ino`)
* **Role**: Orchestrates all physical hardware actuators, mechanical gates, sensor debouncing, LCD display states, and water dispensing.
* **Key Mechanisms**:
  * **Servo Smooth Stepping**: `moveServoSmooth(servo, target)` moves servos with controlled velocity to prevent mechanical jerking.
  * **Sorting Chambers**: Controls independent entry gates, compaction bins, and rejection exit flaps for bottles and cups.
  * **Paper Detection**: Debounced single-beam IR sensor counting paper sheets (`PAPER_NEEDED = 3` sheets per 1 point).
  * **Water Dispensing Timing**: Calibrated at `20ms per ml` (e.g., 100ml = 2000ms pump activation).
  * **Fail-Safe Relay Interlocks**: Relays and solenoids are forced `LOW/OFF` on startup and idle to prevent unintentional water release.

### 2. ESP32 DevKit Bridge (`hardware/Esp32_Devkit/Esp32_Devkit.ino`)
* **Role**: Acts as the intelligent networking coordinator between local cameras, the Arduino Mega, and the cloud backend.
* **Key Mechanisms**:
  * **Non-Blocking Serial Parser**: Buffers and normalizes incoming `CMD:` strings across UART `Serial2`.
  * **Asynchronous Camera Triggering**: Issues HTTP requests (`GET /identify` or `GET /scan`) to the target ESP32-CAM and responds immediately.
  * **Secure HTTPS Client**: Direct TLS connection to `https://eco-defill.vercel.app/api/verify-qr` with JSON payloads.
  * **Reboot-Free Operation**: Maintains continuous WiFi connection without restarting on session completion.

### 3. ESP32-CAM QR Scanner (`hardware/Esp32_QR/Esp32_QR.ino`)
* **Role**: Dedicated high-speed camera scanner for phone and web QR codes.
* **Key Mechanisms**:
  * **Sensor Tuning**: Configures `set_vflip = 1` and `set_hmirror = 0` to fix phone camera orientation and eliminate ECC decode failures.
  * **Dedicated FreeRTOS Core**: Executes the `ESP32QRCodeReader` on Core 1 (`reader.beginOnCore(1)`).
  * **Queue Drain & Fast Halt**: Drains stale camera framebuffers before scanning and stops camera processing immediately upon decode.
  * **Cooldown Guard**: Prevents multi-triggering within 3000ms of a successful scan.

### 4. ESP32-CAM Bottle Detector (`hardware/Esp32_Bottles/Esp32_Bottle.ino`)
* **Role**: Validates whether the item placed in the bottle chamber is an authentic plastic bottle.
* **Key Mechanisms**: Responds to `GET /identify`, grabs camera frame, classifies object, and sends `POST http://192.168.100.100/detect` with `{"cam":"BOTTLE","result":"BOTTLE"}`.

### 5. ESP32-CAM Cup Detector (`hardware/Esp32_Cup/Esp32_Cup.ino`)
* **Role**: Classifies single-use cups using an embedded machine learning model.
* **Key Mechanisms**: Runs Edge Impulse FOMO (Faster Objects, More Objects) neural network inference directly on the ESP32-CAM chip, then posts validation to the DevKit.

---

## 4. Pinout & Wiring Tables

### Arduino Mega 2560 Pin Assignments:

| Pin | Type | Connected Device | Function / Logic |
| :---: | :---: | :--- | :--- |
| **5** | PWM | `srvBottleGate` Servo | Bottle entry gate (0° Closed, 80° Open) |
| **6** | PWM | `srvBottleExit` Servo | Bottle rejection/exit flap (10° Closed, 90° Open) |
| **3** | PWM | `srvBottleBin` Servo | Bottle bin sorting flap (10° Closed, 90° Open) |
| **8** | PWM | `srvCupGate` Servo | Cup entry gate (0° Closed, 80° Open) |
| **9** | PWM | `srvCupExit` Servo | Cup rejection flap (10° Closed, 90° Open) |
| **10** | PWM | `srvCupBin` Servo | Cup bin sorting flap (10° Closed, 90° Open) |
| **22** | Digital In (Pullup) | Bottle Slot IR Sensor | Detects bottle at insertion point (Active LOW) |
| **23** | Digital In (Pullup) | Bottle Chamber IR Sensor | Detects bottle inside validation area |
| **24** | Digital In (Pullup) | Cup Slot IR Sensor | Detects cup at insertion point (Active LOW) |
| **25** | Digital In (Pullup) | Cup Chamber IR Sensor | Detects cup inside validation area |
| **26** | Digital In (Pullup) | Paper Entry IR Sensor | Counts paper insertions |
| **30** | Digital In | Dispense Pushbutton | Button 1: Dispenses earned/redeemed water |
| **31** | Digital In | QR Scan Pushbutton | Button 2: Activates QR scanner mode |
| **32** | Digital Out | Ultrasonic Trigger | Refill container detection (Echo: Pin 33) |
| **33** | Digital In | Ultrasonic Echo | Refill container distance measurement |
| **34** | Digital Out | Water Pump Relay | Active LOW (Energizes 12V diaphragm pump) |
| **36** | Digital Out | Solenoid Valve 1 Relay | Active HIGH (Opens water delivery line) |
| **38** | Digital Out | Solenoid Valve 2 Relay | Active HIGH (Auxiliary line) |
| **18** | UART TX1 | DevKit GPIO 16 (RX2) | Mega TX $\rightarrow$ DevKit RX (via 1k/2k voltage divider) |
| **19** | UART RX1 | DevKit GPIO 17 (TX2) | DevKit TX $\rightarrow$ Mega RX |
| **SDA / SCL** | I2C | 20x4 LCD Display | I2C Data & Clock (Address: `0x27`) |

### ESP32 DevKit V1 Pin Assignments:

| Pin | Connected Device | Voltage / Logic Notes |
| :---: | :--- | :--- |
| **GPIO 16 (RX2)** | Arduino Mega Pin 18 (TX1) | Use 1kΩ / 2kΩ resistor divider to step down Mega 5V to 3.3V |
| **GPIO 17 (TX2)** | Arduino Mega Pin 19 (RX1) | Direct connection (3.3V logic is safely read by Mega 5V input) |
| **GPIO 2** | Built-in Status LED | Activity indicator & error blink patterns |
| **GND / 5V (VIN)** | Common Ground & 5V Power | Shared system ground with Arduino Mega and Power Supply |

---

## 5. UART Communication Protocol (Mega $\leftrightarrow$ DevKit)

All messages are ASCII text lines terminated by `\n` at **115200 baud**.

```
  ARDUINO MEGA                                    ESP32 DEVKIT
       |                                               |
       | ---------- CMD:IDENTIFY_BOTTLE -------------> | (Triggers Bottle CAM)
       | <--------- CAM:BOTTLE:VALID ----------------- | (Bottle confirmed)
       |                                               |
       | ---------- CMD:SCAN_QR|<points> ------------> | (Starts QR Scan)
       | <--------- QR:FOUND ------------------------- | (QR Detected by Camera)
       | <--------- QR:REDEEM:<ms>|<name>|<pts> ------ | (Backend approved redeem)
       | <--------- QR:RECEIVE:<pts>|<name> ---------- | (Backend approved earn)
       | <--------- QR:FAIL -------------------------- | (Invalid token/error)
       |                                               |
       | ---------- CMD:CANCEL_QR -------------------> | (User pressed cancel)
       | ---------- CMD:EARN_ANON|BOTTLE|1 ----------> | (Logs anonymous earn)
       | ---------- CMD:WATER_LEVEL|Full Tank -------> | (Periodic heartbeat)
```
