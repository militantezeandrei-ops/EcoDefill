# EcoDefill Mobile App (Flutter)

The **EcoDefill Mobile Application** is built with Flutter and Dart for Android and iOS. It serves as the student portal for tracking recycling points, viewing leaderboards, generating QR codes to receive points from physical recycling machines, and redeeming points for water refills.

---

## 🌟 Key Features

* **Real-time Points Dashboard**: Live balance cards, daily earned/redeemed metrics, and recent activity ledger.
* **Seamless QR Code Interaction**: High-contrast animated QR code generator with **1-second polling** for immediate feedback when scanned by physical machines.
* **Water Redemption**: Convert earned points into water refills (1 point = 100ml water, up to 500ml per dispense).
* **Campus Gamification**: Live podium rankings and course/year level leaderboards.
* **Secure Student Auth**: JWT token authentication stored securely using `flutter_secure_storage`.
* **Offline Resilience**: Offline caching of balances and dashboard statistics.

---

## 🛠️ Architecture & Tech Stack

* **Framework**: Flutter 3.47+ / Dart 3.13+
* **State Management**: [Riverpod](https://riverpod.dev) (`flutter_riverpod: ^2.6.1`)
* **Routing**: [GoRouter](https://pub.dev/packages/go_router) (`^13.2.5`)
* **HTTP Client**: [Dio](https://pub.dev/packages/dio) (`^5.9.2`)
* **Storage**: `flutter_secure_storage` (encrypted tokens) & `shared_preferences` (local cache)
* **Styling**: Material 3 Design with custom Emerald (`#10B981`) and Blue (`#3B82F6`) themes

For full architectural details, see [**`docs/MOBILE_APP_ARCHITECTURE.md`**](../docs/MOBILE_APP_ARCHITECTURE.md).

---

## 🚀 Getting Started & Build Commands

### Prerequisites
* Flutter SDK (3.27+ or 3.47+)
* **OpenJDK 17 LTS** configured in Flutter:
  ```powershell
  flutter config --jdk-dir="C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
  ```
* Android SDK Platform Tools (API 34/36)

### Running on a Connected Phone / Emulator
```powershell
flutter pub get
flutter run
```

### Building a Release APK for Android
```powershell
flutter build apk --release
```
The installable APK will be generated at:
📁 `build/app/outputs/flutter-apk/app-release.apk`
