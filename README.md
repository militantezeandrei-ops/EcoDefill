# EcoDefill

EcoDefill is a recycling and water-dispensing system. Users deposit recyclables at a kiosk, earn points, and redeem points for water through QR codes.

## Architecture

- Web/API: Next.js App Router, React, TypeScript, Tailwind CSS.
- Database: PostgreSQL through Prisma.
- Mobile: Flutter, Riverpod, Dio, secure storage, Hive cache.
- Hardware: cameras connect to ESP32 DevKit over Wi-Fi; DevKit connects to Arduino Mega over UART and backend over HTTPS.

## Agent and contributor onboarding

Start with [AGENTS.md](AGENTS.md) and [CONVENTIONS.md](CONVENTIONS.md). Use the [feature map](docs/PROJECT_FILE_MAP.md) to find relevant implementation. Technical guides are task-specific references, not a required full-project reading list.

## Development

Web/backend, from the root:

```powershell
npm ci
npx prisma generate
npm run dev
```

Configure environment values using .env.example and an existing prepared development database. These commands do not create or migrate the schema. Read CONVENTIONS.md before schema operations.

Mobile, from mobile_app/:

```powershell
flutter pub get
flutter run
```

Firmware: open the sketch listed in [hardware/README.md](hardware/README.md). Bottle firmware is hardware/Esp32_Bottles/Esp32_Bottle/Esp32_Bottle.ino.

## References

Web checks: npm run lint; npm run build when relevant. Mobile checks: flutter analyze and relevant flutter tests from mobile_app/. Firmware checks require the selected board/libraries; physical behavior requires hardware.

- [Documentation index](docs/README.md)
- [Dependencies](docs/SOFTWARE_AND_DEPENDENCIES.md)
- [Web/API](docs/WEB_AND_API_BACKEND.md)
- [Mobile](docs/MOBILE_APP_ARCHITECTURE.md)
- [Hardware](hardware/README.md)
- [Reusable features](docs/REUSE.md)
