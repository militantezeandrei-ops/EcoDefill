# Flutter mobile architecture

Implementation: mobile_app/lib/. Use pubspec.yaml/pubspec.lock for dependencies, not guessed installed SDK versions.

## Entry points

- main.dart initializes Hive and ProviderScope. Auth state selects login or ShellLayout.
- features/shell/ owns the tab shell. Inspect navigation before adding another router; a go_router dependency does not mean app_router.dart exists.
- features/auth/providers/auth_provider.dart owns auth state.
- core/network/api_client.dart configures Dio, backend URL, bearer tokens, timeouts, unauthorized-session notifications.
- core/storage/secure_storage.dart stores auth data; local_cache.dart uses Hive.
- core/theme/app_theme.dart and core/widgets/ supply shared appearance/widgets.

Features: auth, dashboard, qr, redeem, history, ranking, rewards, profile, shell. Start in relevant screens/providers.

## QR integration

ReceivePointsScreen requests /api/qr-generate. RedeemWaterScreen requests /api/redeem-initiate. QrScanScreen displays tokens and polls /api/qr-status. Inspect timer lifecycle, success handling, and provider refresh for stale balances/history.

Backend code owns expiry/transactions. See [Web/API guide](WEB_AND_API_BACKEND.md), relevant handlers, and DevKit for cross-system changes.

## Development

From mobile_app/: flutter pub get, flutter run, flutter analyze, and relevant flutter tests. Inspect coverage before assuming tests exercise business flows. Diagnose toolchain with flutter doctor.

For packaging: flutter build apk --release writes build/app/outputs/flutter-apk/app-release.apk.
