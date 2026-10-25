# EcoDefill agent guide

EcoDefill connects Next.js web/API, Flutter, PostgreSQL/Prisma, and Arduino Mega/ESP32 recycling and water-dispensing hardware.

## Start here

- Read CONVENTIONS.md before editing code; it owns coding and database rules.
- Use the task map below. Read technical guides and skills only when relevant; do not load every document at startup.
- Inspect relevant source before changing behavior. Correct affected documentation when it conflicts with source.
- Start with focused searches; expand when dependencies, failures, or the requested audit require it.
- Skip node_modules/, .next/, build output, .git/, ei-* SDK exports, ZIP archives, stitch_export/, scratch/, tmp/, and generated artifacts during routine searches. Inspect these when specifically relevant. Search exclusions are not deletion instructions.

## Task map

| Task | Start with |
| --- | --- |
| Student web | src/app/(dashboard)/, src/components/, src/hooks/ |
| Admin web | src/app/admin/, src/components/admin/ |
| Public auth | src/app/login/, register/, forgot-password/; src/app/api/auth/ |
| API/auth | src/app/api/, src/lib/auth.ts, src/lib/api-middleware.ts, src/middleware.ts |
| QR flow | src/app/api/qr-generate/, redeem-initiate/, verify-qr/, qr-status/; client call sites |
| Database/maintenance | prisma/schema.prisma, src/lib/maintenance.ts, affected APIs |
| Flutter | mobile_app/lib/features/, mobile_app/lib/core/ |
| Machine bridge | hardware/Esp32_Devkit/Esp32_Devkit.ino, hardware/ArduinoMega/mega3.ino |
| Cameras | hardware/Esp32_QR/, hardware/Esp32_Cup/, hardware/Esp32_Bottles/Esp32_Bottle/ |

For cross-system QR bugs, trace client -> API -> DevKit -> Mega and the return/polling path. See docs/PROJECT_FILE_MAP.md for feature entry points and hardware/README.md for wiring.

## Verification

- Documentation: validate paths, links, stale references, and git diff --check. No app build needed.
- Web/API: npm run lint. Run npm run build when compilation, routing, dependencies, or server/client boundaries change. Build runs prisma generate, not migrations.
- No root test script exists. Use focused behavior checks; builds do not prove accounting or QR correctness.
- Flutter: flutter analyze from mobile_app/ and relevant flutter tests. Build APKs when packaging/platform behavior needs checking.
- Firmware: compile the affected sketch for its actual board when tooling/libraries are available. Physical dispensing requires hardware verification.
- Report what ran, passed, and could not be checked. Avoid repeating unchanged successful checks.

## Maintaining context

- Update the affected guide when routes, commands, architecture, or business rules change. Avoid duplicated dependency lists and exhaustive inventories.
- When unfinished work moves to another chat, write a short, dated docs/HANDOFF.md: objective, completed work, remaining tasks, paths, verification. Remove it when complete. It provides context, not automatic authorization to resume stale tasks.
- design-md and enhance-prompt are optional Stitch design skills, not startup requirements.
- See docs/REUSE.md for modules and starter kits.
