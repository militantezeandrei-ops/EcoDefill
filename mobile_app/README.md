# EcoDefill mobile app

Flutter client for authentication, points, QR, history, ranking, and water redemption.

Read [AGENTS.md](../AGENTS.md) for routing and [the mobile guide](../docs/MOBILE_APP_ARCHITECTURE.md) for architecture. Dependencies: pubspec.yaml/pubspec.lock.

From this directory:

```powershell
flutter pub get
flutter run
flutter analyze
flutter test
```

Packaging: flutter build apk --release. Output: build/app/outputs/flutter-apk/app-release.apk. Diagnose tooling with flutter doctor.

Backend URL: lib/core/network/api_client.dart. Inspect before using another environment.
