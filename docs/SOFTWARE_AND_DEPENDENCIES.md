# EcoDefill — Software, Tools & Dependencies Guide

This document lists every software tool, runtime, SDK, library, and package required to develop, build, flash, and deploy the entire **EcoDefill** project from scratch.

---

## 1. Overall System Architecture & Tech Stack

The EcoDefill project consists of three interconnected subsystems:
1. **Cloud / Web Layer**: Next.js 14 (App Router) + PostgreSQL (Neon) + Prisma ORM + Tailwind CSS v4.
2. **Mobile Application**: Flutter 3.47+ (Dart 3) + Riverpod 2.6 + Dio + GoRouter (Android & iOS).
3. **Physical IoT Hardware**: Arduino Mega 2560 (Main Controller) + ESP32 DevKit V1 (WiFi/UART Bridge) + 3× AI Thinker ESP32-CAMs (Bottle Detection, Cup Detection via Edge Impulse, QR Code Scanner).

```
+-------------------------------------------------------------------------+
|                              ECODEFILL                                  |
+------------------------------------+------------------------------------+
|            FRONTEND / CLOUD        |              HARDWARE              |
|  - Next.js 14 (React 18)           |  - Arduino Mega 2560 (Machine Ctrl)|
|  - PostgreSQL + Prisma 5           |  - DOIT ESP32 DevKit V1 (WiFi Hub) |
|  - Flutter Mobile App (Dart 3)     |  - 3x AI-Thinker ESP32-CAMs        |
|  - Vercel Deployment               |  - Edge Impulse TinyML FOMO Model  |
+------------------------------------+------------------------------------+
```

---

## 2. Developer Workstation Softwares & Prerequisites

To develop, compile, and maintain all components on a Windows development machine, the following software must be installed:

| Software / Tool | Recommended Version | Purpose | Download / Installation Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` LTS | Next.js backend, API routes, Prisma CLI | `winget install OpenJS.NodeJS.LTS` or [nodejs.org](https://nodejs.org) |
| **Flutter SDK** | `v3.27.x` or `v3.47.x` | Compiling the mobile application | [flutter.dev](https://docs.flutter.dev/get-started/install) |
| **Java Development Kit (JDK)** | **OpenJDK 17 LTS** | Android Gradle compilation for Flutter | `winget install Microsoft.OpenJDK.17` |
| **Android Studio & SDK** | Android Studio Ladybug+ / SDK 34–36 | Android toolchain, emulator, ADB | [developer.android.com](https://developer.android.com/studio) |
| **Arduino IDE** | `v2.3.x` or higher | Writing and flashing firmware to Mega & ESP32 | [arduino.cc](https://www.arduino.cc/en/software) |
| **Git** | `v2.40+` | Version control | `winget install Git.Git` |
| **USB-UART Drivers** | CH340 / CP2102 / FTDI | Serial communication with Mega & ESP32-CAM | Pre-installed or chip vendor installer |

---

## 3. Web & Backend Dependencies (`package.json`)

Located at the repository root: `d:\EcoDefillApp\package.json`

### Core Framework & Runtimes:
* **Next.js** (`^14.2.5`): App Router framework providing SSR, client components, and serverless API routes.
* **React & React-DOM** (`^18`): UI component rendering.
* **TypeScript** (`^5`): Strict type safety across the backend and frontend.

### Database & ORM:
* **@prisma/client** (`^5.10.2`): Type-safe ORM query builder.
* **prisma** (`^5.10.2`): Schema migrations and Prisma CLI tools.
* **PostgreSQL Database**: Cloud-hosted PostgreSQL (Neon Serverless Postgres / Supabase).

### Authentication, Security & Utility:
* **bcryptjs** (`^2.4.3`): Password hashing for user and admin accounts.
* **jsonwebtoken** (`^9.0.2`): Secure JWT generation and verification.
* **nodemailer** (`^6.9.13`): Automated transactional emails (verification codes, password reset).
* **swr** (`^2.2.5`): Client-side data fetching, caching, and optimistic UI updates.
* **lucide-react** (`^0.359.0`): Icon library for UI elements.
* **recharts** (`^2.12.3`): Analytics and telemetry charts on the admin portal.
* **react-qr-code** (`^2.0.15`): SVG QR code generator for water redemption tokens.
* **html5-qrcode** (`^2.3.8`): Web camera QR code scanner.
* **canvas-confetti** (`^1.9.2`): Celebration animations upon successful deposit.

### Styling & CSS:
* **tailwindcss** (`^3.4.1` / `v4`): Utility-first CSS styling.
* **clsx** & **tailwind-merge**: Dynamic and conditional CSS class merging.

---

## 4. Mobile App Dependencies (`mobile_app/pubspec.yaml`)

Located at `d:\EcoDefillApp\mobile_app\pubspec.yaml`

### Core & State Management:
* **flutter_riverpod** (`^2.6.1`): Declarative, reactive state management across auth, balances, and history.
* **riverpod** (`^2.6.1`): Underlying Dart state container.
* **go_router** (`^13.2.5`): Declarative URL/path-based routing and navigation guards.

### Networking & Storage:
* **dio** (`^5.9.2`): Powerful HTTP client with interceptors, timeouts, and JSON transformations.
* **flutter_secure_storage** (`^9.2.4`): Encrypted key-value storage for JWT auth tokens on iOS/Android Keychain.
* **shared_preferences** (`^2.3.2`): Lightweight key-value persistence for caching user profile and UI states.
* **connectivity_plus** (`^5.0.2`): Network connectivity monitoring (WiFi / Mobile Data / Offline).

### UI, Fonts & Graphics:
* **google_fonts** (`^6.3.2`): Typography loader (Outfit font family).
* **qr_flutter** (`^4.1.0`): High-performance mobile QR code generator widget.
* **cupertino_icons** (`^1.0.8`): iOS-style companion icons.

---

## 5. Hardware Firmware Libraries & Board Packages

### A. Arduino IDE Board Cores:
1. **Arduino AVR Boards** (built-in): For **Arduino Mega 2560**.
2. **ESP32 by Espressif Systems** (`v2.0.14` or `v3.0.x`):
   * Board URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   * Target Boards:
     * `DOIT ESP32 DEVKIT V1` (for `Esp32_Devkit.ino`)
     * `AI Thinker ESP32-CAM` (for `Esp32_QR.ino`, `Esp32_Bottle.ino`, `Esp32_Cup.ino`)

### B. Required C++ Libraries (Install via Arduino Library Manager):
* **ArduinoJson** by *Benoit Blanchon* (`v6.21.x` or `v7.x`): Fast JSON serialization/deserialization for HTTP API payloads.
* **LiquidCrystal_I2C** by *Frank de Brabander* (`v1.1.2`): Drives the 20x4 character LCD over I2C.
* **Servo** (built-in AVR library): Controls 6x SG90/MG996R servo motors on the Mega.
* **ESP32QRCodeReader** by *alanswx*: Efficient QR code decoder for ESP32 camera frames.
* **esp_camera** (bundled with ESP32 core): OV2640 camera driver.
* **WiFiClientSecure** & **HTTPClient** (bundled with ESP32 core): Handles SSL/TLS HTTPS calls to the backend API.
* **Edge Impulse Inferencing Library** (custom ZIP export): Embedded FOMO machine learning model for plastic cup classification.
