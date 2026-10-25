# Software and dependencies

Use manifests as the version source of truth:

| Subsystem | Constraints | Resolved versions |
| --- | --- | --- |
| Web/API | package.json | package-lock.json |
| Flutter | mobile_app/pubspec.yaml | mobile_app/pubspec.lock |
| Firmware | Sketch includes/board configuration | Installed cores/libraries |

Web declares Next.js 14, React 18, Prisma 5, TypeScript, Tailwind 3 ranges. Flutter uses Riverpod, Dio, secure storage, Hive, connectivity_plus, QR rendering, Google Fonts. Do not install packages merely because a generic skill mentions them.

## Web

Use compatible Node.js/npm, configure .env.example values, then npm ci and npm run dev. Installation runs prisma generate; npm run build also generates the client before compiling. Neither applies migrations. Read CONVENTIONS.md before schema changes; use a prepared development database.

## Mobile

Use a Flutter SDK satisfying pubspec.yaml and platform tools reported by flutter doctor. Run flutter pub get from mobile_app/. Check Gradle/platform files and diagnostics for SDK/JDK requirements instead of workstation-specific paths.

## Firmware

Use Mega AVR for mega3.ino, the appropriate ESP32 DevKit target for the bridge, and AI Thinker ESP32-CAM configuration for cameras. Confirm installed core compatibility.

Includes require Servo, LiquidCrystal_I2C, ArduinoJson, ESP32QRCodeReader, ESP32 networking/camera libraries, and bottles_inferencing/cupcup_inferencing exports. Keep ei-* directories for firmware integration/builds.

See [hardware setup](../hardware/README.md) for wiring, sketches, networking; AGENTS.md for verification.
