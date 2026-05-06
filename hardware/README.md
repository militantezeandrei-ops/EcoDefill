# EcoDefill v3 Hardware Setup Guide

This document matches the current firmware in `hardware/`:

- Arduino Mega 2560 runs the local machine state logic
- ESP32 DevKit V1 is the Wi-Fi bridge and backend API client
- 3 ESP32-CAM boards communicate with the DevKit over Wi-Fi only

The cameras do not connect directly to the Mega by serial in this version.

## 1. System Architecture

```text
Bottle/Cup/QR ESP32-CAMs <---- Wi-Fi ----> ESP32 DevKit <---- UART ----> Arduino Mega
                                                     |
                                                     +---- HTTPS ----> eco-defill.vercel.app
```

## 2. Board Roles

| Board | Qty | Role |
|:------|:---:|:-----|
| Arduino Mega 2560 | 1 | Main state machine, LCD, buttons, IR sensors, servos, relays |
| ESP32 DevKit V1 | 1 | Local HTTP server, QR/API bridge, UART bridge to Mega |
| ESP32-CAM Bottle | 1 | Bottle detection |
| ESP32-CAM Cup | 1 | Cup detection |
| ESP32-CAM Scanner | 1 | QR scanning |

## 3. Network Requirements

All ESP32 boards must connect to the same 2.4 GHz Wi-Fi network or phone hotspot.

Current firmware expects this subnet:

| Device | Static IP |
|:-------|:----------|
| ESP32 DevKit | `192.168.43.100` |
| Bottle CAM | `192.168.43.110` |
| Cup CAM | `192.168.43.111` |
| QR CAM | `192.168.43.120` |
| Gateway | `192.168.43.1` |
| Subnet mask | `255.255.255.0` |

Requirements:

- All four ESP32 sketches must use the same `WIFI_SSID` and `WIFI_PASSWORD`
- The hotspot/router must actually use the `192.168.43.x` subnet, or you must update all four sketches
- AP/client isolation must be disabled so local devices can reach each other
- Internet access is needed for the DevKit when calling the backend APIs

## 4. UART Wiring Between Mega and DevKit

This is the only required serial connection in the current design.

| Mega | ESP32 DevKit | Notes |
|:-----|:-------------|:------|
| TX1 pin 18 | GPIO16 (RX2) | Use a voltage divider, Mega is 5V and ESP32 RX is 3.3V |
| RX1 pin 19 | GPIO17 (TX2) | Direct connection is acceptable |
| GND | GND | Common ground required |

Voltage divider for Mega TX1 -> ESP32 RX2:

```text
Mega TX1 ---[1k]---+--- ESP32 GPIO16
                   |
                  [2k]
                   |
                  GND
```

## 5. Mega Pin Map

### Servos

| Function | Pin |
|:---------|:----|
| Bottle gate | `5` |
| Bottle exit | `6` |
| Bottle bin | `7` |
| Cup gate | `8` |
| Cup exit | `9` |
| Cup bin | `10` |

### IR Sensors

| Function | Pin |
|:---------|:----|
| Bottle slot sensor | `22` |
| Bottle valid/chamber sensor | `23` |
| Cup slot sensor | `24` |
| Cup valid/chamber sensor | `25` |
| Paper entry | `26` |
| Paper valid | `27` |

### Buttons, Ultrasonic, Relays, LCD

| Function | Pin |
|:---------|:----|
| Dispense button | `30` |
| QR scan button | `31` |
| Ultrasonic trig | `32` |
| Ultrasonic echo | `33` |
| Pump relay | `34` |
| Solenoid 1 relay | `36` |
| Solenoid 2 relay | `38` |
| LCD SDA | `20` |
| LCD SCL | `21` |

## 6. Power Requirements

Recommended power layout:

| Rail | Suggested Load |
|:-----|:---------------|
| 6V high-current rail | MG996R servos |
| 5V logic rail | Mega, ESP32 DevKit, LCD, sensors |
| 5V camera rail | 3x ESP32-CAM modules |
| 12V load rail | Pump and solenoids |

Notes:

- ESP32-CAM boards are sensitive to voltage sag; give them a stable 5V supply
- All grounds must be common
- Relays driving inductive loads should use flyback protection if not already built into the modules
- Avoid moving too many servos at once on a weak supply

## 7. Firmware Files

| File | Target Board |
|:-----|:-------------|
| `arduino_mega_controller/arduino_mega_controller.ino` | Arduino Mega 2560 |
| `esp32_main_controller/esp32_main_controller.ino` | ESP32 DevKit V1 |
| `esp32_cam_bottle/esp32_cam_bottle.ino` | AI Thinker ESP32-CAM |
| `esp32_cam_cup/esp32_cam_cup.ino` | AI Thinker ESP32-CAM |
| `esp32_cam_scanner/esp32_cam_scanner.ino` | AI Thinker ESP32-CAM |

Before uploading, verify:

- Wi-Fi SSID and password match in all ESP32 sketches
- `MACHINE_ID` is correct in the DevKit sketch
- Static IPs match across the DevKit and all CAM sketches

## 8. HTTP and UART Protocol

### Mega -> DevKit over UART

| Message | Meaning |
|:--------|:--------|
| `CMD:IDENTIFY_BOTTLE` | Trigger bottle CAM |
| `CMD:IDENTIFY_CUP` | Trigger cup CAM |
| `CMD:SCAN_QR` | Start QR scan mode |
| `CMD:CANCEL_QR` | Cancel QR scan mode |
| `CMD:EARN_ANON|BOTTLE|2` | Log anonymous bottle earn |
| `CMD:EARN_ANON|CUP|1` | Log anonymous cup earn |

### DevKit -> Mega over UART

| Message | Meaning |
|:--------|:--------|
| `CAM:BOTTLE:VALID` | Bottle accepted |
| `CAM:BOTTLE:INVALID` | Bottle rejected |
| `CAM:CUP:VALID` | Cup accepted |
| `CAM:CUP:INVALID` | Cup rejected |
| `QR:EARN:<pts>` | QR converted local points into app credit |
| `QR:DISPENSE:<ms>` | QR approved water dispense time |
| `QR:FAIL` | QR rejected or request failed |

### DevKit Local HTTP Server

| Endpoint | Used By | Purpose |
|:---------|:--------|:--------|
| `POST /detect` | Bottle/Cup CAMs | Send item detection result |
| `POST /qr` | QR CAM | Send scanned QR token |
| `GET /ping` | Any CAM | Connectivity check |

### CAM HTTP Endpoints

| Device | Endpoint | Purpose |
|:-------|:---------|:--------|
| Bottle CAM | `GET /identify` | Capture and classify bottle |
| Cup CAM | `GET /identify` | Capture and classify cup |
| QR CAM | `GET /scan` | Start scanning |
| QR CAM | `GET /cancel` | Stop scanning |
| All CAMs | `GET /ping` | Connectivity check |

## 9. Expected Runtime Flow

1. Mega detects an item at the slot IR sensor
2. Mega opens the appropriate gate
3. Chamber IR sensor confirms the item is in position
4. Mega sends `CMD:IDENTIFY_BOTTLE` or `CMD:IDENTIFY_CUP` to the DevKit
5. DevKit calls the correct CAM over Wi-Fi
6. CAM posts `BOTTLE`, `CUP`, or `NONE` back to the DevKit
7. DevKit sends `CAM:...` result back to Mega
8. Mega sorts the item and updates points

QR flow:

1. Mega sends `CMD:SCAN_QR`
2. DevKit calls QR CAM `/scan`
3. QR CAM posts token to DevKit `/qr`
4. DevKit verifies token with backend
5. DevKit sends `QR:EARN:<pts>`, `QR:DISPENSE:<ms>`, or `QR:FAIL` back to Mega

## 10. Bring-Up Checklist

- Flash all five boards with the matching firmware in this folder
- Confirm all ESP32 boards boot and join the same Wi-Fi network
- Confirm DevKit is reachable at `192.168.43.100`
- Confirm Bottle CAM responds at `http://192.168.43.110/ping`
- Confirm Cup CAM responds at `http://192.168.43.111/ping`
- Confirm QR CAM responds at `http://192.168.43.120/ping`
- Confirm Mega and DevKit share ground
- Confirm Mega `Serial1` baud rate is `115200`
- Confirm the voltage divider is present on Mega TX1 -> DevKit RX2
- Confirm backend URLs are reachable from the DevKit

## 11. Troubleshooting

| Problem | Check |
|:--------|:------|
| DevKit cannot trigger CAMs | Wrong SSID/password, wrong static IP, client isolation enabled |
| CAM posts fail | `DEVKIT_IP` mismatch or DevKit not on the network |
| Mega never receives result | UART wiring wrong, no common ground, missing voltage divider, wrong baud |
| QR always fails | No internet on DevKit, backend token invalid, QR posted while scan mode inactive |
| CAMs reboot during capture | Weak 5V supply to ESP32-CAM |
| Detection always returns invalid | Lighting or thresholds need tuning |
| LCD is blank | Check I2C address, power, SDA/SCL wiring |
