# EcoDefill

EcoDefill is an IoT-integrated recycling and water dispensing system. Users recycle accepted materials at a physical machine, earn points, and redeem those points for water through a mobile/web QR workflow.

This repository contains the Next.js application, backend API routes, Prisma database schema, and firmware for the ESP32/Arduino-based hardware.

## Current System Flow

EcoDefill v3 uses the Arduino Mega as the local machine controller, an ESP32 DevKit as the WiFi/API bridge, and three ESP32-CAM boards for bottle detection, cup detection, and QR scanning.

```text
Mobile App / Web Dashboard
        |
        | HTTPS
        v
Next.js Backend + PostgreSQL Database
        ^
        | HTTPS
        |
ESP32 DevKit V1
        ^
        | UART Serial2
        v
Arduino Mega 2560
        |
        | Wired GPIO / PWM / I2C / Relay Control
        v
Sensors, LCD, Buttons, Servos, Pump, Solenoids

Bottle CAM / Cup CAM / QR CAM
        <----- WiFi / HTTP ----->
             ESP32 DevKit V1
```

For thesis diagrams, use solid lines for physical wired connections such as UART, GPIO, PWM, I2C, power, and relays. Use dashed lines for wireless communication such as WiFi/HTTP or HTTPS.

## Hardware Roles

| Component | Role |
|:--|:--|
| Arduino Mega 2560 | Main machine state controller for sensors, buttons, LCD, servos, relays, pump, and solenoids |
| ESP32 DevKit V1 | WiFi hub, local HTTP server, backend API client, and UART bridge to the Mega |
| ESP32-CAM Bottle | Captures and classifies bottle deposits |
| ESP32-CAM Cup | Captures and classifies cup deposits using Edge Impulse FOMO detection |
| ESP32-CAM QR Scanner | Scans QR codes shown from the mobile phone or web app |
| Mobile/Web App | User dashboard for viewing balance, generating QR codes, and redeeming points |
| Next.js Backend | Verifies QR tokens, records transactions, manages users, and stores machine logs |
| PostgreSQL Database | Stores users, QR tokens, transactions, recycling logs, and machine sessions |

## Item Detection Flow

1. The Arduino Mega detects an inserted item using the slot and chamber sensors.
2. The Mega sends either `CMD:IDENTIFY_BOTTLE` or `CMD:IDENTIFY_CUP` to the ESP32 DevKit through UART.
3. The DevKit sends an HTTP request over WiFi to the correct ESP32-CAM:
   - Bottle CAM: `GET /identify`
   - Cup CAM: `GET /identify`
4. The ESP32-CAM captures an image and runs local object detection.
5. The ESP32-CAM posts the result back to the DevKit using `POST /detect`.
6. The DevKit forwards the result to the Mega as a UART message such as `CAM:CUP:VALID` or `CAM:CUP:INVALID`.
7. The Mega accepts or rejects the item, moves the sorting mechanism, and updates the local point count.

## QR and User Points Flow

1. The user opens the EcoDefill mobile/web app and displays a QR code.
2. The Mega starts QR scan mode by sending `CMD:SCAN_QR` to the DevKit.
3. The DevKit triggers the QR ESP32-CAM over WiFi.
4. The QR CAM scans the phone screen and posts the token to the DevKit.
5. The DevKit verifies the token with the Next.js backend over HTTPS.
6. The backend validates the token, updates the user balance or redemption session, and records the transaction.
7. The DevKit sends the result back to the Mega, such as `QR:RECEIVE`, `QR:REDEEM`, or `QR:FAIL`.
8. The Mega either transfers earned points to the user account or activates the water dispensing hardware.

## Network Layout

All ESP32 boards must connect to the same 2.4 GHz WiFi network or phone hotspot.

| Device | Static IP |
|:--|:--|
| ESP32 DevKit | `192.168.100.100` |
| Bottle CAM | `192.168.100.110` |
| Cup CAM | `192.168.100.111` |
| QR CAM | `192.168.100.120` |
| Gateway | `192.168.100.1` |

The ESP32-CAM boards communicate wirelessly with the DevKit using local HTTP endpoints. They are not wired to the Arduino Mega.

## Main Features

- User dashboard for point balance, QR generation, transaction history, and reward redemption
- Admin dashboard for users, transactions, reports, machine health, and recycling logs
- QR-based point transfer and water redemption
- ESP32 DevKit bridge between local machine firmware and the web backend
- ESP32-CAM based detection for bottles, cups, and QR tokens
- Prisma-backed transaction records for earned and redeemed points

## Technology Stack

| Layer | Technology |
|:--|:--|
| Frontend | Next.js 14 App Router, React, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL with Prisma ORM |
| Authentication | JWT-based authentication |
| Mobile Wrapper | Capacitor |
| Hardware Firmware | Arduino framework for ESP32 and Arduino Mega |
| Hardware Communication | UART, WiFi, HTTP, HTTPS |
| Vision Model | Edge Impulse object detection on ESP32-CAM |

## Project Structure

| Path | Purpose |
|:--|:--|
| `src/app` | Application pages and API routes |
| `src/components` | Reusable UI and dashboard components |
| `src/lib` | Shared utilities such as auth, Prisma, and API helpers |
| `prisma` | Database schema, migrations, and seed script |
| `hardware` | Arduino Mega, ESP32 DevKit, and ESP32-CAM firmware |
| `public` | Static assets and PWA files |
| `docs` | Project documentation |

See `hardware/README.md` for pin maps, board flashing notes, UART wiring, static IPs, and hardware troubleshooting.

## Getting Started

### Prerequisites

- Node.js 18 or later
- PostgreSQL database
- npm

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ecodefill"
DIRECT_URL="postgresql://user:password@localhost:5432/ecodefill"

JWT_SECRET="your_super_secret_jwt_key"
MACHINE_SECRET="your_shared_iot_secret_key"

NEXT_PUBLIC_API_URL="https://eco-defill.vercel.app"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="another_secret_key"
```

### Set up the database

```bash
npx prisma generate
npx prisma db push
```

Optional seed:

```bash
npm run seed
```

### Start the development server

```bash
npm run dev
```

The web app will run at `http://localhost:3000`.

For Capacitor live reload, set `CAP_SERVER_URL` to your LAN development URL before syncing or copying the native project.

## Important API Routes

| Route | Purpose |
|:--|:--|
| `POST /api/qr-generate` | Generates a user QR token |
| `POST /api/verify-qr` | Verifies a scanned QR token from the machine |
| `POST /api/machine-walkin` | Records walk-in recycling activity |
| `GET /api/machine-status` | Checks approved dispense sessions |
| `GET /api/user-balance` | Returns user balance and recent activity |
| `GET /api/user-transactions` | Returns user transaction history |

## Firmware

The main firmware files are:

| File | Target |
|:--|:--|
| `hardware/arduino_mega_controller/arduino_mega_controller.ino` | Arduino Mega 2560 |
| `hardware/esp32_main_controller/esp32_main_controller.ino` | ESP32 DevKit V1 |
| `hardware/esp32_cam_bottle/esp32_cam_bottle.ino` | ESP32-CAM Bottle Detector |
| `hardware/esp32_cam_cup/esp32_cam_cup.ino` | ESP32-CAM Cup Detector |
| `hardware/esp32_cam_scanner/esp32_cam_scanner.ino` | ESP32-CAM QR Scanner |

Before flashing firmware, confirm that all ESP32 sketches use the same WiFi SSID/password and that each static IP matches the values expected by the DevKit.

## License

This project is for educational and capstone development use.
