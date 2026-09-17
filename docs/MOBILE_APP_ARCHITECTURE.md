# EcoDefill — Flutter Mobile App Architecture Guide

This document provides a complete technical guide to the **EcoDefill Mobile Application** located in `mobile_app/`.

---

## 1. Tech Stack & Key Architectural Choices

* **Framework**: Flutter 3.47+ with Dart 3.13+.
* **State Management**: **Flutter Riverpod** (`StateNotifierProvider` & `FutureProvider`).
* **Routing**: **GoRouter** (Declarative routing with auth-state redirect guards).
* **HTTP & API Client**: **Dio** with interceptors for JWT token injection and centralized error handling.
* **Storage & Persistence**:
  * `flutter_secure_storage`: Encrypted storage for access tokens and user credentials.
  * `shared_preferences`: Fast local caching for offline user balances and dashboard profile data.
* **Design System**: Material 3 with customized Emerald (`#10B981`) & Royal Blue (`#3B82F6`) palette using Google Fonts (Outfit).

---

## 2. Directory & Component Structure

```
mobile_app/lib/
│
├── main.dart                          # App entry point, ProviderScope initialization
│
├── core/                              # Core shared architecture
│   ├── network/
│   │   ├── api_client.dart            # Singleton Dio client, baseURL, interceptors
│   │   └── error_handler.dart         # Formats API error messages
│   ├── router/
│   │   └── app_router.dart            # GoRouter configuration & navigation guards
│   ├── storage/
│   │   ├── secure_storage.dart        # Encrypted JWT token storage
│   │   └── local_cache.dart           # Offline caching of user balances
│   ├── theme/
│   │   └── app_theme.dart             # Color tokens, Typography, Material3 ThemeData
│   └── widgets/
│       ├── dynamic_island_notification.dart # Animated top pill notification
│       ├── custom_button.dart         # Reusable themed button
│       └── qr_display_card.dart       # High-contrast animated QR display widget
│
└── features/                          # Feature-driven modular architecture
    ├── auth/                          # Authentication & Registration
    │   ├── providers/auth_provider.dart  # Login, register, logout, balance state
    │   └── screens/
    │       ├── login_screen.dart      # Email/Student ID login
    │       ├── register_screen.dart   # Student signup with course & section
    │       ├── request_code_screen.dart # Password reset code requester
    │       └── reset_password_screen.dart # Set new password screen
    │
    ├── dashboard/                     # Main Student Hub
    │   ├── screens/dashboard_screen.dart # Live balance, quick actions, transactions
    │   └── widgets/
    │       ├── balance_card.dart      # Gradient balance display card
    │       └── guide_slides_dialog.dart # First-time user interactive onboarding guide
    │
    ├── qr/                            # QR Code Generation & Polling
    │   ├── screens/
    │   │   ├── receive_points_screen.dart # Generate QR to receive machine points
    │   │   └── qr_scan_screen.dart    # Fullscreen QR with 1s status polling
    │
    ├── redeem/                        # Water Dispense Redemption
    │   └── screens/redeem_water_screen.dart # Select points (1-5 pts = 100-500ml)
    │
    ├── history/                       # Activity & Transaction Ledger
    │   ├── providers/history_provider.dart # Transaction history state notifier
    │   └── screens/history_screen.dart    # Filterable ledger (Earn / Redeem / All)
    │
    ├── ranking/                       # Leaderboard & Gamification
    │   ├── providers/ranking_provider.dart # Leaderboard data provider
    │   └── screens/ranking_screen.dart    # Top recyclers podium & course rankings
    │
    ├── rewards/                       # Rewards Catalog
    │   └── screens/rewards_guide_screen.dart # Reward tiers & redemption guide
    │
    ├── profile/                       # User Profile & Settings
    │   └── screens/profile_screen.dart # Student details, stats, logout, delete account
    │
    └── shell/                         # Persistent Bottom Navigation Shell
        ├── providers/shell_provider.dart # Active tab index provider
        └── screens/shell_layout.dart  # Bottom navigation bar container
```

---

## 3. QR Token Lifecycle & Real-Time Polling Engine

The mobile app enables two primary QR transactions with physical machines:

### Flow A: Receive Points from Physical Machine
1. User taps **"Receive Points"** on the mobile app.
2. App requests a new transfer token from `/api/qr-generate` with mode `RECEIVE`.
3. `QrScanScreen` displays the high-contrast QR code (`ECO-XXXXXXXX`).
4. **Active Polling**: A timer checks `/api/qr-status?token=...` every **1.0 second**.
5. When the user holds their phone to the physical **ESP32-CAM QR Scanner**:
   - QR CAM decodes token $\rightarrow$ DevKit $\rightarrow$ Backend verifies $\rightarrow$ Database updates user balance.
6. On the next 1-second poll, the app receives status `SCANNED` or `USED`.
7. The app immediately triggers:
   * `fetchUserBalance()` (updates state balance and daily stats)
   * `historyProvider.fetchTransactions()` (refreshes ledger)
8. Shows the animated success checkmark and celebrates with points added!

### Flow B: Redeem Points for Water Refill
1. User opens **"Redeem Water"** and chooses points (1 pt = 100ml, up to 5 pts = 500ml).
2. App generates a `REDEEM` token with the selected water amount.
3. User presents the QR to the machine.
4. The machine verifies the token, activates the 12V pump relay, and dispenses the water.
5. The mobile app's polling engine detects completion and deducts points seamlessly from the UI balance.

---

## 4. Setup, Build & Run Instructions

### Prerequisites
* Flutter SDK (`3.27+` or `3.47+`)
* OpenJDK 17 LTS configured in Flutter:
  ```powershell
  flutter config --jdk-dir="C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
  ```
* Android SDK Platform Tools (API 34/36)

### Running on a Connected Android Device (e.g. Tecno / Samsung / Xiaomi)
```powershell
cd mobile_app
flutter pub get
flutter run
```

### Generating a Standalone Release APK
```powershell
cd mobile_app
flutter build apk --release
```
Output binary generated at:
📁 `mobile_app/build/app/outputs/flutter-apk/app-release.apk`
