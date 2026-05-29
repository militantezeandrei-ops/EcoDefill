import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';

/// Canonical QR display card used by BOTH ReceivePointsScreen and RedeemWaterScreen.
///
/// Guarantees that the QR code is always:
///  - 240 × 240 logical pixels
///  - Centered inside a white card with 24 px padding and 32 px border-radius
///  - Styled with square eye + square data-module shapes in [AppTheme.textDark]
///
/// Pass [accentColor] to tint the card's border / glow to match the feature
/// (emerald for "Receive Points", blue for "Redeem Water").
class QrDisplayCard extends StatelessWidget {
  const QrDisplayCard({
    super.key,
    required this.token,
    this.accentColor = AppTheme.primaryEmerald,
  });

  /// The raw string value encoded into the QR code.
  final String token;

  /// Accent colour (kept for parameter compatibility).
  final Color accentColor;

  /// Fixed QR content area size – exactly matches the old capacitor size (220).
  static const double qrSize = 220.0;

  /// Card padding – exactly matches p-4 (16).
  static const double cardPadding = 16.0;

  /// Card corner radius – exactly matches rounded-2xl (16).
  static const double cardRadius = 16.0;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(cardPadding),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(cardRadius),
        border: Border.all(
          color: const Color(0xFFE2E8F0), // border-slate-200
          width: 1,
        ),
      ),
      child: SizedBox(
        width: qrSize,
        height: qrSize,
        child: QrImageView(
          data: token,
          version: QrVersions.auto,
          size: qrSize,
          gapless: true,
          padding: EdgeInsets.zero,
          errorCorrectionLevel: QrErrorCorrectLevel.M,
          eyeStyle: const QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: Colors.black, // Pure black for instant recognition
          ),
          dataModuleStyle: const QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: Colors.black, // Pure black for instant recognition
          ),
        ),
      ),
    );
  }
}
