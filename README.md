# EcoDefill

EcoDefill is an IoT-integrated recycling and automated water dispensing system. Users deposit recyclable materials (plastic bottles, cups, and paper) at physical kiosks, earn reward points, and redeem their points for filtered water through a mobile or web QR code workflow.

---

## 🏗️ System Overview

The EcoDefill ecosystem consists of three major subsystems:

```
[ Mobile App (Flutter) / Web App (Next.js) ]
                    |
                    | HTTPS (TLS)
                    v
    [ Cloud Backend (Next.js & Prisma) ]
    [ PostgreSQL Database (Neon/Supabase) ]
                    ^
                    | HTTPS (TLS)
                    v
         [ ESP32 DevKit V1 Hub ]
         (WiFi / REST Server / UART)
          /         |          \
      WiFi        WiFi        WiFi
      /             |            \
[Bottle CAM]    [Cup CAM]     [QR CAM]
                    |
              UART Serial2
                    |
        [ Arduino Mega 2560 ]
        (Main Machine Controller)
         |      |       |      |
      Servos   IRs   Relays   LCD
```

---

## 📚 Comprehensive Documentation Suite

All system documentation has been organized into the **[`docs/`](docs/)** directory:

| Document | Description |
| :--- | :--- |
| 🛠️ [**Software, Tools & Dependencies**](docs/SOFTWARE_AND_DEPENDENCIES.md) | Complete list of required runtimes (Node.js, Flutter, OpenJDK 17, Arduino IDE), packages, and dependencies. |
| 🔌 [**Hardware Architecture & Firmware Guide**](docs/HARDWARE_ARCHITECTURE_AND_FIRMWARE.md) | Circuit schematics, pinout assignments, static IPs, UART protocol, and firmware details. |
| 📱 [**Flutter Mobile App Architecture**](docs/MOBILE_APP_ARCHITECTURE.md) | Mobile app architecture, Riverpod state, Dio network layer, and QR transaction polling engine. |
| 🌐 [**Web & Cloud API Backend Guide**](docs/WEB_AND_API_BACKEND.md) | Next.js App Router, Prisma ORM schema, REST API endpoints, and authentication. |
| 🗺️ [**Project File Directory Map**](docs/PROJECT_FILE_MAP.md) | Complete file-by-file summary of the entire repository. |

---

## ⚡ Quick Start

### 1. Web Backend & Database
```bash
npm install
npx prisma generate
npm run dev
```

### 2. Flutter Mobile Application
```bash
cd mobile_app
flutter pub get
flutter run
# To build release APK:
flutter build apk --release
```

### 3. Microcontroller Firmware
Open and upload sketches located in [`hardware/`](hardware/) using the Arduino IDE:
* **Arduino Mega 2560**: [`hardware/ArduinoMega/mega3.ino`](hardware/ArduinoMega/mega3.ino)
* **ESP32 DevKit V1**: [`hardware/Esp32_Devkit/Esp32_Devkit.ino`](hardware/Esp32_Devkit/Esp32_Devkit.ino)
* **ESP32-CAM (QR Scanner)**: [`hardware/Esp32_QR/Esp32_QR.ino`](hardware/Esp32_QR/Esp32_QR.ino)
* **ESP32-CAM (Bottle Detector)**: [`hardware/Esp32_Bottles/Esp32_Bottle.ino`](hardware/Esp32_Bottles/Esp32_Bottle.ino)
* **ESP32-CAM (Cup Detector)**: [`hardware/Esp32_Cup/Esp32_Cup.ino`](hardware/Esp32_Cup/Esp32_Cup.ino)
