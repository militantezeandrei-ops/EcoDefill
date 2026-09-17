# EcoDefill Documentation Hub

Welcome to the **EcoDefill** technical documentation suite. This folder contains comprehensive, up-to-date documentation covering the entire system from cloud infrastructure to physical microcontroller firmware.

---

## 📚 Documentation Index

Click on any document below to view its full details:

1. 🛠️ [**Software, Tools & Dependencies Guide**](SOFTWARE_AND_DEPENDENCIES.md)
   * Complete list of required runtimes (Node.js, Flutter 3.47+, OpenJDK 17 LTS, Arduino IDE).
   * Web dependencies (`package.json`), Flutter dependencies (`pubspec.yaml`), and Arduino C++ libraries.
   * Workstation setup instructions from scratch.

2. 🔌 [**Hardware Architecture & Firmware Guide**](HARDWARE_ARCHITECTURE_AND_FIRMWARE.md)
   * System topology and block diagrams.
   * Complete breakdown of all 5 firmware sketches (`mega3.ino`, `Esp32_Devkit.ino`, `Esp32_QR.ino`, `Esp32_Bottle.ino`, `Esp32_Cup.ino`).
   * 2.4 GHz WiFi network configuration & static IP map (`192.168.100.x`).
   * Arduino Mega 2560 & ESP32 DevKit pinout tables.
   * UART ASCII communication protocol specification.

3. 📱 [**Flutter Mobile App Architecture Guide**](MOBILE_APP_ARCHITECTURE.md)
   * Mobile app folder structure (`core/` and `features/`).
   * Riverpod state management & Dio network layer.
   * QR token lifecycle and real-time 1.0-second status polling engine.
   * Step-by-step instructions for running on device or building release APKs.

4. 🌐 [**Web & API Backend Architecture Guide**](WEB_AND_API_BACKEND.md)
   * Next.js 14 App Router architecture and Vercel edge deployment.
   * PostgreSQL database models via Prisma ORM (`User`, `Transaction`, `QrToken`, `MachineStatus`).
   * Complete REST API endpoint reference (`/api/verify-qr`, `/api/add-point`, etc.).
   * JWT authentication & password reset flow.

5. 🗺️ [**Project File Directory Map**](PROJECT_FILE_MAP.md)
   * Comprehensive inventory and file summaries across the entire codebase.

---

## 🚀 Quick Start Summary

### 1. Web & Backend
```bash
npm install
npx prisma generate
npm run dev
```

### 2. Mobile App (Flutter)
```bash
cd mobile_app
flutter pub get
flutter run
# Or build release APK:
flutter build apk --release
```

### 3. Hardware Firmware
* Open sketches in `hardware/` with Arduino IDE.
* Install board packages: `Arduino AVR Boards` and `esp32 by Espressif`.
* Install required libraries: `ArduinoJson`, `LiquidCrystal_I2C`, `ESP32QRCodeReader`.
* Upload firmware to respective boards:
  * `hardware/ArduinoMega/mega3.ino` $\rightarrow$ Arduino Mega 2560
  * `hardware/Esp32_Devkit/Esp32_Devkit.ino` $\rightarrow$ DOIT ESP32 DevKit V1
  * `hardware/Esp32_QR/Esp32_QR.ino` $\rightarrow$ AI-Thinker ESP32-CAM
  * `hardware/Esp32_Bottles/Esp32_Bottle.ino` $\rightarrow$ AI-Thinker ESP32-CAM
  * `hardware/Esp32_Cup/Esp32_Cup.ino` $\rightarrow$ AI-Thinker ESP32-CAM
