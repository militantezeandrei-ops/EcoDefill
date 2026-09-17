# EcoDefill — Comprehensive Project File Directory Map

This document provides an exhaustive summary of every directory, module, configuration file, and source file in the **EcoDefill** project.

---

## 1. Top-Level Directory Tree

```
d:/EcoDefillApp/
│
├── docs/                              # Project technical documentation & architecture manuals
├── hardware/                          # Microcontroller C++ firmware for Mega & ESP32 boards
├── mobile_app/                        # Flutter mobile application codebase (Android & iOS)
├── prisma/                            # Prisma ORM schema & database migration history
├── public/                            # Static web assets, branding images, audio alerts
├── src/                               # Next.js web application & serverless backend API
│   ├── app/                           # App Router pages, layouts, and API routes
│   ├── components/                    # Reusable React UI components
│   ├── hooks/                         # React hooks (useAuth, useCachedFetch, etc.)
│   ├── lib/                           # Helper utilities, database clients, JWT utilities
│   └── styles/                        # Global CSS stylesheets
│
├── package.json                       # Next.js & Node.js dependency definitions
├── tsconfig.json                      # TypeScript compiler configuration
├── tailwind.config.ts                 # Tailwind CSS styling tokens
└── README.md                          # Repository root overview and fast-start guide
```

---

## 2. Hardware Subsystem (`hardware/`)

| File / Directory | Target Board / MCU | Purpose / Summary |
| :--- | :--- | :--- |
| [`hardware/README.md`](file:///d:/EcoDefillApp/hardware/README.md) | Documentation | Hardware wiring guide, circuit diagrams, and troubleshooting |
| [`hardware/ArduinoMega/mega3.ino`](file:///d:/EcoDefillApp/hardware/ArduinoMega/mega3.ino) | Arduino Mega 2560 | Main machine controller: handles 6 servos, 5 IR sensors, ultrasonic sensor, 20x4 LCD, buttons, and relay pump |
| [`hardware/Esp32_Devkit/Esp32_Devkit.ino`](file:///d:/EcoDefillApp/hardware/Esp32_Devkit/Esp32_Devkit.ino) | DOIT ESP32 DevKit V1 | WiFi hub, local REST server for cameras, UART Serial2 bridge to Mega, HTTPS client to Next.js API |
| [`hardware/Esp32_QR/Esp32_QR.ino`](file:///d:/EcoDefillApp/hardware/Esp32_QR/Esp32_QR.ino) | AI-Thinker ESP32-CAM | Dedicated QR code scanner: FreeRTOS Core 1 decoder, calibrated camera tuning (`V-Flip=ON`), queue drain |
| [`hardware/Esp32_Bottles/Esp32_Bottle.ino`](file:///d:/EcoDefillApp/hardware/Esp32_Bottles/Esp32_Bottle.ino) | AI-Thinker ESP32-CAM | Image capture and bottle validation camera |
| [`hardware/Esp32_Cup/Esp32_Cup.ino`](file:///d:/EcoDefillApp/hardware/Esp32_Cup/Esp32_Cup.ino) | AI-Thinker ESP32-CAM | Machine learning cup classification using Edge Impulse FOMO model inference |

---

## 3. Flutter Mobile Application (`mobile_app/`)

| File / Directory | Module / Layer | Purpose / Summary |
| :--- | :--- | :--- |
| [`mobile_app/pubspec.yaml`](file:///d:/EcoDefillApp/mobile_app/pubspec.yaml) | Package Spec | Dependencies: Riverpod, GoRouter, Dio, SecureStorage, GoogleFonts, QR Flutter |
| [`mobile_app/lib/main.dart`](file:///d:/EcoDefillApp/mobile_app/lib/main.dart) | Application Entry | Initializes Flutter bindings, sets up `ProviderScope`, runs root app |
| `mobile_app/lib/core/network/` | Network Layer | `api_client.dart` (Dio singleton with interceptors) & error handlers |
| `mobile_app/lib/core/storage/` | Storage Layer | `secure_storage.dart` (encrypted tokens) & `local_cache.dart` (offline balance caching) |
| `mobile_app/lib/core/theme/` | Design System | `app_theme.dart` (Material 3 ThemeData, Emerald & Blue palettes, Outfit typography) |
| `mobile_app/lib/core/router/` | Navigation | `app_router.dart` (GoRouter with authentication guards) |
| `mobile_app/lib/core/widgets/` | Shared UI | `dynamic_island_notification.dart`, `qr_display_card.dart`, custom buttons |
| `mobile_app/lib/features/auth/` | Authentication | Login, student registration, password reset code requests & confirmation |
| `mobile_app/lib/features/dashboard/` | Dashboard | Student balance hero card, daily metrics, recent transactions, onboarding guide |
| `mobile_app/lib/features/qr/` | QR Engine | `receive_points_screen.dart` & `qr_scan_screen.dart` (with 1.0s fast polling engine) |
| `mobile_app/lib/features/redeem/` | Water Redemption | Point-to-water volume selector (100ml–500ml) & redemption QR generator |
| `mobile_app/lib/features/history/` | Transaction Ledger | Filterable transaction history (Earn, Redeem, All) with pull-to-refresh |
| `mobile_app/lib/features/ranking/` | Leaderboard | Top student recyclers podium and course ranking breakdown |
| `mobile_app/lib/features/rewards/` | Rewards Catalog | Rewards guide and tier progression display |
| `mobile_app/lib/features/profile/` | Student Profile | Profile information, academic details, logout, and account deletion |
| `mobile_app/lib/features/shell/` | App Shell | Persistent bottom navigation bar layout |

---

## 4. Web & Cloud Backend (`src/` & `prisma/`)

| File / Directory | Layer | Purpose / Summary |
| :--- | :--- | :--- |
| [`prisma/schema.prisma`](file:///d:/EcoDefillApp/prisma/schema.prisma) | Database Schema | PostgreSQL models for `User`, `Transaction`, `QrToken`, `MachineSession`, `RecyclingLog` |
| `src/app/api/verify-qr/` | API Route | Verifies scanned QR tokens with ESP32 DevKit, adjusts balances, logs transactions |
| `src/app/api/qr-generate/` | API Route | Issues cryptographically unique short-lived QR tokens |
| `src/app/api/qr-status/` | API Route | Polled by client apps to detect physical machine scan status |
| `src/app/api/user-balance/` | API Route | Returns real-time user points balance and daily recycling stats |
| `src/app/api/add-point/` | API Route | Records anonymous (walk-in) machine recycling events |
| `src/app/api/machine-status/`| API Route | Records physical machine telemetry, water levels, and online status |
| `src/app/api/machine-walkin/`| API Route | Records walk-in counts of bottles, cups, and paper |
| `src/app/(auth)/` | Web Auth Pages | Next.js authentication pages (Login, Register, Password Reset) |
| `src/app/(dashboard)/` | Student Portal | Web dashboard for balance viewing, water redemption, and history |
| `src/app/(admin)/` | Admin Portal | Comprehensive administrative management portal for users, machines, and audit logs |
| `src/components/ui/` | UI Components | Buttons, modals, cards, toast notifications, metric charts |
| `src/lib/` | Utilities | `db.ts` (Prisma client instance), `jwt.ts` (token encoder/decoder), `toast.ts` |

---

## 5. Documentation Suite (`docs/`)

| Document | Purpose / Contents |
| :--- | :--- |
| [`docs/README.md`](file:///d:/EcoDefillApp/docs/README.md) | Master documentation table of contents & quick-navigation index |
| [`docs/SOFTWARE_AND_DEPENDENCIES.md`](file:///d:/EcoDefillApp/docs/SOFTWARE_AND_DEPENDENCIES.md) | Exhaustive list of all software, SDKs, tools, compilers, and packages |
| [`docs/HARDWARE_ARCHITECTURE_AND_FIRMWARE.md`](file:///d:/EcoDefillApp/docs/HARDWARE_ARCHITECTURE_AND_FIRMWARE.md) | Circuit schematics, pinout assignments, static IPs, UART protocol, firmware breakdown |
| [`docs/MOBILE_APP_ARCHITECTURE.md`](file:///d:/EcoDefillApp/docs/MOBILE_APP_ARCHITECTURE.md) | Flutter app architecture, Riverpod state, Dio network layer, QR polling engine |
| [`docs/WEB_AND_API_BACKEND.md`](file:///d:/EcoDefillApp/docs/WEB_AND_API_BACKEND.md) | Next.js 14 App Router, PostgreSQL Prisma models, API routes specification |
| [`docs/PROJECT_FILE_MAP.md`](file:///d:/EcoDefillApp/docs/PROJECT_FILE_MAP.md) | Detailed directory and file inventory (this document) |
