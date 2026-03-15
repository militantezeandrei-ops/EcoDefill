# EcoDefill Hardware Setup Guide

This guide details how to wire and flash the dual-board ESP32 architecture for the EcoDefill system.

## 1. Components Needed
*   1x ESP32 DevKit V1 (Main Controller)
*   1x ESP32-CAM AI-Thinker (Scanner)
*   1x 5V Relay Module (For water pump)
*   1x USB-to-TTL FTDI Programmer (For flashing the ESP32-CAM)
*   Jumper Wires
*   Breadboard

---

## 2. Wiring Diagram

### A. ESP32 DevKit to ESP32-CAM (Serial Communication)
We need to connect the two boards so the CAM can send scanned QR text to the DevKit.

| ESP32-CAM Pin | Connects to... | ESP32 DevKit Pin | Purpose |
| :--- | :--- | :--- | :--- |
| **5V** | ➜ | **VIN / 5V** | Power (ESP-CAM needs solid 5V) |
| **GND** | ➜ | **GND** | Common Ground |
| **U0TXD (GPIO 1)** | ➜ | **RX2 (GPIO 16)** | CAM sends scanned text to DevKit |

> [!CAUTION]
> It is highly recommended to power both boards from a dedicated 5V power supply (like a 5V 2A wall adapter) rather than relying solely on your computer's USB port, as the camera module draws significant current spikes.

### B. ESP32 DevKit to Relay Module (Water Dispenser)

| Relay Pin | Connects to... | ESP32 DevKit Pin | Purpose |
| :--- | :--- | :--- | :--- |
| **VCC** | ➜ | **5V / 3.3V** | Power for the Relay (check your relay specs) |
| **GND** | ➜ | **GND** | Common Ground |
| **IN (Signal)** | ➜ | **GPIO 23** | Triggers the switch |

---

## 3. Flashing the ESP32-CAM

The ESP32-CAM does **not** have a built-in USB port. You must use an FTDI programmer.

1.  Connect the FTDI programmer to the ESP32-CAM:
    *   FTDI `5V` ➜ CAM `5V`
    *   FTDI `GND` ➜ CAM `GND`
    *   FTDI `TX` ➜ CAM `U0RXD`
    *   FTDI `RX` ➜ CAM `U0TXD`
2.  **CRITICAL STEP:** Connect a jumper wire between `GPIO 0` and `GND` on the ESP32-CAM. This puts the board in "Flash Mode".
3.  Press the RESET button on the ESP32-CAM.
4.  In the Arduino IDE:
    *   Open `hardware/esp32_cam_scanner/esp32_cam_scanner.ino`
    *   Install the ESP32 board manager (`https://dl.espressif.com/dl/package_esp32_index.json`)
    *   Select Board: **AI Thinker ESP32-CAM**
    *   Install Library: `ESP32QRCodeReader`
    *   Click Upload.
5.  **Remove** the jumper wire between `GPIO 0` and `GND` and press reset again to run the code.

---

## 4. Flashing the Main ESP32 DevKit

1.  Plug the ESP32 directly into your computer via USB.
2.  In the Arduino IDE:
    *   Open `hardware/esp32_main_controller/esp32_main_controller.ino`
    *   Set your Wi-Fi credentials (`ssid` and `password`).
    *   Set the IP address of your Next.js server in `verifyApiUrl` and `statusApiUrl`.
3.  Select Board: **DOIT ESP32 DEVKIT V1**.
4.  Install Library: `ArduinoJson` (by Benoit Blanchon).
5.  Click Upload.

---

## 5. Testing the System

1.  Start your Next.js server (`npm run dev`) on your computer.
2.  Power on both ESP32 boards.
3.  Open the Serial Monitor for the Main ESP32 DevKit (baud rate 115200). It should say "Wi-Fi connected!".
4.  Open the EcoDefill app on your phone, generate a "Redeem" QR code.
5.  Point the ESP32-CAM at the QR code.
6.  The Serial Monitor should show:
    ```
    Scanned Token from CAM: [shortTokenHere]
    HTTP Response code: 200
    ```
7.  Within 3 seconds, the DevKit should poll the API, receive approval, and you will hear the relay "click" on and off!
