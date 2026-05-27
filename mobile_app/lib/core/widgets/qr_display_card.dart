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

  /// Accent colour applied to the card border and outer glow.
  final Color accentColor;

  /// Fixed QR content area size – used in both the card SizedBox and QrImageView.
  static const double qrSize = 240.0;

  /// Card padding – must stay identical in both usages.
  static const double cardPadding = 24.0;

  /// Card corner radius – must stay identical in both usages.
  static const double cardRadius = 32.0;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(cardPadding),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(cardRadius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: accentColor.withOpacity(0.06),
            blurRadius: 40,
            offset: const Offset(0, 16),
          ),
        ],
        border: Border.all(
          color: accentColor.withOpacity(0.12),
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
          gapless: false,
          eyeStyle: const QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: AppTheme.textDark,
          ),
          dataModuleStyle: const QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: AppTheme.textDark,
          ),
        ),
      ),
    );
  }
}
