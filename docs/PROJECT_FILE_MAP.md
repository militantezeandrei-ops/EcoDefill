# EcoDefill feature map

Paths are relative to the repository root. This is a feature index, not an exhaustive inventory.

| Feature | Entry points |
| --- | --- |
| Student web | src/app/(dashboard)/; src/components/layout/ |
| Admin web | src/app/admin/(dashboard)/; src/components/admin/ |
| Public auth | src/app/login/, src/app/register/, src/app/forgot-password/; src/app/api/auth/ |
| Auth helpers | src/lib/auth.ts; src/lib/auth-storage.ts; src/lib/api-middleware.ts; src/hooks/useAuth.tsx |
| Receive points | src/app/api/qr-generate/route.ts; src/app/(dashboard)/qr/page.tsx; mobile_app/lib/features/qr/screens/receive_points_screen.dart |
| Redeem water | src/app/api/redeem-initiate/route.ts; src/app/(dashboard)/redeem/page.tsx; mobile_app/lib/features/redeem/screens/redeem_water_screen.dart |
| QR verification | src/app/api/verify-qr/route.ts; hardware/Esp32_Devkit/Esp32_Devkit.ino; hardware/Esp32_QR/Esp32_QR.ino |
| Polling | src/app/api/qr-status/route.ts; mobile_app/lib/features/qr/screens/qr_scan_screen.dart |
| Balance/history | src/app/api/user-balance/; src/app/api/user-transactions/; mobile_app/lib/features/history/ |
| Ranking | src/app/api/course-ranking/; src/lib/course-ranking.ts; mobile_app/lib/features/ranking/ |
| Machine points | src/app/api/add-point/; src/app/api/machine-walkin/; hardware/ArduinoMega/mega3.ino |
| Telemetry | src/app/api/machine-status/; src/hooks/useMachineStatus.ts |
| Maintenance/reports | src/lib/maintenance.ts; src/lib/admin-reports.ts; src/app/api/admin/ |
| Database | prisma/schema.prisma; prisma/migrations/; src/lib/prisma.ts |
| Flutter startup | mobile_app/lib/main.dart; mobile_app/lib/features/shell/screens/shell_layout.dart |
| Flutter networking/cache | mobile_app/lib/core/network/api_client.dart; mobile_app/lib/core/storage/ |
| Bottle camera | hardware/Esp32_Bottles/Esp32_Bottle/Esp32_Bottle.ino |
| Cup camera | hardware/Esp32_Cup/Esp32_Cup.ino |

Bundled ei-* directories contain inference-library exports. Keep them for firmware; skip routine web/mobile scans.
