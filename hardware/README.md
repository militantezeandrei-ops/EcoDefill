# EcoDefill Hardware Setup Guide

This guide explains how to wire, flash, and test the dual-board ESP32 architecture for the EcoDefill water dispensing system.

---

## 1. Components Needed

| Component | Qty | Notes |
| :--- | :--- | :--- |
| ESP32-CAM AI-Thinker | 1 | Camera + QR scanner |
| ESP32 DevKit V1 | 1 | Main controller, WiFi, relay control |
| 5V Relay Module | 1 | Controls water pump |
| USB-to-TTL FTDI Programmer | 1 | **Required** to flash the ESP32-CAM (it has no USB port) |
| Jumper Wires | Several | — |
| Breadboard | 1 | Optional, for prototyping |

---

## 2. Wiring Diagram

### A. ESP32-CAM → ESP32 DevKit (QR Data over Serial)

| ESP32-CAM Pin | → | ESP32 DevKit Pin | Purpose |
| :--- | :--- | :--- | :--- |
| **5V** | → | **VIN / 5V** | Power (CAM needs solid 5V) |
| **GND** | → | **GND** | Common ground |
| **U0TXD (GPIO 1)** | → | **RX2 (GPIO 16)** | CAM sends scanned QR text to DevKit |

> [!CAUTION]
> Power both boards from a dedicated **5V 2A** supply. The camera draws significant current spikes that may cause USB to brown out.

### B. ESP32 DevKit → Relay Module (Water Pump)

| Relay Pin | → | ESP32 DevKit Pin | Purpose |
| :--- | :--- | :--- | :--- |
| **VCC** | → | **5V / 3.3V** | Relay power (check your relay specs) |
| **GND** | → | **GND** | Common ground |
| **IN (Signal)** | → | **GPIO 23** | Triggers the water pump relay |

---

## 3. Flashing the ESP32-CAM

The ESP32-CAM has **no built-in USB port**. You need an FTDI programmer.

### 3a. Install Arduino IDE Dependencies

1. Open Arduino IDE → **File → Preferences**
2. Add to Additional Boards Manager URLs:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager**, search `esp32`, install **ESP32 by Espressif Systems**.
4. Go to **Tools → Manage Libraries**, install:
   - `ESP32QRCodeReader` (by Layla)

### 3b. Wire FTDI for Flashing

| FTDI Pin | → | ESP32-CAM Pin |
| :--- | :--- | :--- |
| **5V** | → | **5V** |
| **GND** | → | **GND** |
| **TX** | → | **U0RXD** |
| **RX** | → | **U0TXD** |

> [!IMPORTANT]
> **Flash Mode:** Connect a jumper between **GPIO0** and **GND** BEFORE powering/pressing RESET. Remove it AFTER a successful upload.

### 3c. Upload

1. Open `hardware/esp32_cam_scanner/esp32_cam_scanner.ino`
2. Set the correct WiFi credentials near the top of the file:
   ```cpp
   const char* WIFI_SSID     = "YourWiFiName";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   ```
3. In Arduino IDE → **Tools**:
   - Board: **AI Thinker ESP32-CAM**
   - Port: Select the FTDI COM port
4. Click **Upload**.
5. When done, **remove the GPIO0→GND jumper** and press RESET.
6. Open Serial Monitor (115200 baud) — you should see:
   ```
   [CAM] WiFi Connected! IP: 192.168.x.xxx
   [CAM] Open your browser to that IP to see the live camera stream.
   [CAM] QR Reader initialized.
   [CAM] Ready to scan QR codes!
   ```
7. **Note the IP address** — you'll need it to view the live stream.

---

## 4. Flashing the ESP32 Main Controller

1. Plug the DevKit into your computer via USB.
2. Open `hardware/esp32_main_controller/esp32_main_controller.ino`
3. Edit the configuration block at the top:
   ```cpp
   const char* WIFI_SSID     = "YourWiFiName";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   
   // Local dev server (run `npm run dev` first):
   const char* SERVER_BASE_URL = "http://192.168.x.xxx:3000";
   // OR production Vercel:
   // const char* SERVER_BASE_URL = "https://eco-defill.vercel.app";
   
   const char* MACHINE_ID = "MACHINE_01"; // Must match DB
   ```
4. In Arduino IDE → **Tools**:
   - Board: **DOIT ESP32 DEVKIT V1**
   - Port: Select the DevKit COM port
5. Install Library: **ArduinoJson** (by Benoit Blanchon)
6. Click **Upload**.
7. Open Serial Monitor (115200 baud). You should see:
   ```
   [WiFi] Connected!
   [WiFi] IP Address: 192.168.x.xxx
   [MAIN] Ready!
   [MAIN] Server: http://192.168.x.xxx:3000
   ```

---

## 5. Viewing the Live ESP32-CAM Stream

The ESP32-CAM firmware hosts a **live MJPEG stream** on your local network.

### Option A — Web Browser
Open: `http://<CAM_IP_ADDRESS>/`
- You'll see a live camera page with a `LIVE` indicator.
- The camera stream is at `http://<CAM_IP_ADDRESS>/stream`

### Option B — Admin Panel (In-App)
1. Open the EcoDefill admin panel → **Scanner tab**
2. Click the **ESP32-CAM** tab (instead of Webcam)
3. Enter the IP address of your ESP32-CAM
4. Click **Connect** — the live feed appears in the app itself

---

## 6. Testing the Full System

1. Start your Next.js dev server: `npm run dev`
2. Power on both ESP32 boards.
3. Serial Monitor for the DevKit should say `WiFi Connected!`
4. Open the student app → go to **Redeem Water** → select points → generate QR
5. Point the ESP32-CAM at the QR code.
6. Serial Monitor should show:
   ```
   [CAM→] Received token: abc123xyz
   [HTTP] POST to: http://192.168.x.x:3000/api/verify-qr
   [HTTP] Response (200): {"success":true,...}
   ```
7. Within 3 seconds, the relay should **click** (water flows) and you'll see:
   ```
   [PUMP] Dispensing water for 3000 ms
   [PUMP] Dispense complete.
   ```

---

## 7. LED Indicator Guide (Main DevKit — GPIO 2)

| LED Pattern | Meaning |
| :--- | :--- |
| Solid ON | WiFi connected, idle |
| Single blink | QR token received from CAM |
| Double blink | Token accepted by server (200 OK) |
| Triple blink | Dispense complete |
| Triple rapid blink | Server rejected token |
| 5x rapid blink | HTTP connection failed |
| 10x rapid blink | WiFi connection failed at startup |

---

## 8. Troubleshooting

| Problem | Solution |
| :--- | :--- |
| ESP32-CAM stream won't load | Confirm IP via Serial Monitor; ensure same WiFi network |
| Camera fails to initialize | Check GPIO0 jumper is REMOVED after flashing |
| QR code not detecting | Ensure adequate lighting; hold QR steady for 1–2 seconds |
| `HTTP Error: -1` | Server not reachable — check `SERVER_BASE_URL` IP and that `npm run dev` is running |
| Relay doesn't click | Verify GPIO 23 wiring; check relay VCC is 5V not 3.3V |
| `QR code has already been used` | QR tokens are single-use — student must generate a new one |
