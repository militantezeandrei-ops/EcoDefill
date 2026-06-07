import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// Canonical QR display card styled to EXACTLY match the Capacitor app.
///
/// Guarantees that the QR code is always:
///  - Centered inside a white card with 16 px padding and 16 px border-radius (rounded-2xl)
///  - Styled with a light gray border (slate-200, 0xFFE2E8F0) and no outer glow/shadow
///  - Rendered with solid black modules (#000000) and gapless rendering enabled for maximum scanning speed
///  - Uses medium error correction level (level M)
class QrDisplayCard extends StatelessWidget {
  const QrDisplayCard({
    super.key,
    required this.token,
    this.accentColor = Colors.black, // Default to black for solid theme matching
    this.size,
  });

  /// The raw string value encoded into the QR code.
  final String token;

  /// Accent colour - kept for signature compatibility but we use slate-200 border to match Capacitor
  final Color accentColor;

  /// Optional custom size for the QR content. If not specified, defaults to [defaultQrSize].
  final double? size;

  /// Default QR content area size – changed to 220.0 for a slightly smaller display.
  static const double defaultQrSize = 220.0;

  /// Card padding – exactly 16.0 to match Tailwind p-4 (1rem).
  static const double cardPadding = 16.0;

  /// Card corner radius – exactly 16.0 to match Tailwind rounded-2xl (1rem).
  static const double cardRadius = 16.0;

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;
    // Calculate the maximum possible size that fits within screen padding (24 on each side) and card padding (16 on each side)
    final double availableWidth = screenWidth - 48 - 32;
    final double effectiveQrSize = (size ?? defaultQrSize)
        .clamp(100.0, availableWidth > 100.0 ? availableWidth : 220.0);

    return Container(
      padding: const EdgeInsets.all(cardPadding),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(cardRadius),
        border: Border.all(
          color: const Color(0xFFE2E8F0), // slate-200
          width: 1,
        ),
      ),
      child: SizedBox(
        width: effectiveQrSize,
        height: effectiveQrSize,
        child: QrImageView(
          data: token,
          version: QrVersions.auto,
          size: effectiveQrSize,
          gapless: true,
          errorCorrectionLevel: QrErrorCorrectLevel.M,
          eyeStyle: const QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: Colors.black,
          ),
          dataModuleStyle: const QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: Colors.black,
          ),
        ),
      ),
    );
  }
}
