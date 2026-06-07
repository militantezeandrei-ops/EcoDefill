import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/network/api_client.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/core/widgets/qr_display_card.dart';
import 'package:ecodefill_mobile/features/auth/providers/auth_provider.dart';

/// Determines which flow the QR scan belongs to.
enum QrScanMode { receivePoints, redeemWater }

/// Single, canonical full-screen QR presentation used by BOTH:
///   - Receive Points  (emerald accent, polling /api/qr-status)
///   - Redeem Water    (blue accent, polling /api/qr-status)
///
/// The QR card is always centred at exactly the same position on screen
/// regardless of which flow launches it.
class QrScanScreen extends ConsumerStatefulWidget {
  const QrScanScreen({
    super.key,
    required this.token,
    required this.mode,
    this.waterAmount = '',
    this.selectedPoints = 0,
  });

  /// The raw token string encoded in the QR.
  final String token;

  /// Which flow this scan is part of.
  final QrScanMode mode;

  /// Only relevant for [QrScanMode.redeemWater].
  final String waterAmount;
  final int selectedPoints;

  @override
  ConsumerState<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends ConsumerState<QrScanScreen>
    with TickerProviderStateMixin {
  Timer? _pollTimer;
  bool _scanned = false;

  // Redeem-specific dispensing animation controllers
  late AnimationController _waterLevelController;
  late AnimationController _checkmarkController;

  // Success dialog animation (receive points)
  late AnimationController _successController;
  late Animation<double> _scaleAnimation;

  Color get _accent => widget.mode == QrScanMode.receivePoints
      ? AppTheme.primaryEmerald
      : AppTheme.accentBlue;

  @override
  void initState() {
    super.initState();

    _waterLevelController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );
    _checkmarkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _successController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _successController,
      curve: Curves.elasticOut,
    );

    _startPolling(widget.token);
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _waterLevelController.dispose();
    _checkmarkController.dispose();
    _successController.dispose();
    super.dispose();
  }

  void _startPolling(String token) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (_scanned) {
        timer.cancel();
        return;
      }
      try {
        final response =
            await ApiClient.instance.get('/api/qr-status?token=$token');
        final data = response.data as Map<String, dynamic>;

        if (data['used'] == true) {
          timer.cancel();
          _pollTimer = null;
          _scanned = true;

          if (!mounted) return;
          ref.read(authProvider.notifier).refreshBalance();

          if (widget.mode == QrScanMode.receivePoints) {
            _showReceiveSuccess();
          } else {
            _showDispensingAnimation();
          }
        }
      } catch (e) {
        debugPrint('QR polling error: $e');
      }
    });
  }

  // ── Receive Points success overlay ─────────────────────────────────────────

  void _showReceiveSuccess() {
    _successController.forward();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => ScaleTransition(
        scale: _scaleAnimation,
        child: AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          contentPadding: const EdgeInsets.all(24),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.primaryEmerald.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_rounded,
                    color: AppTheme.primaryEmerald, size: 50),
              ),
              const SizedBox(height: 24),
              const Text(
                'Points Received!',
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.textDark),
              ),
              const SizedBox(height: 10),
              const Text(
                'Your recycled materials were processed and points have been added to your balance.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 14, color: AppTheme.textMuted, height: 1.4),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();  // dismiss dialog
                    Navigator.of(context).pop(); // back to dashboard
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryEmerald,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('Back to Dashboard'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Redeem Water dispensing animation ──────────────────────────────────────

  void _showDispensingAnimation() {
    _waterLevelController.reset();
    _checkmarkController.reset();
    _waterLevelController.forward().then((_) => _checkmarkController.forward());

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(32)),
        contentPadding: const EdgeInsets.all(28),
        content: AnimatedBuilder(
          animation:
              Listenable.merge([_waterLevelController, _checkmarkController]),
          builder: (context, _) {
            final waterProgress = _waterLevelController.value;
            final checkmarkProgress = _checkmarkController.value;
            final isDone = waterProgress >= 1.0;

            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  alignment: Alignment.bottomCenter,
                  children: [
                    Container(
                      width: 90,
                      height: 120,
                      decoration: BoxDecoration(
                        border: Border.all(
                            color: AppTheme.accentBlue.withOpacity(0.3),
                            width: 3),
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(20),
                          bottomRight: Radius.circular(20),
                        ),
                      ),
                    ),
                    Container(
                      width: 84,
                      height: 114 * waterProgress,
                      margin: const EdgeInsets.only(bottom: 3),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppTheme.accentBlue.withOpacity(0.7),
                            Colors.cyanAccent.withOpacity(0.4),
                          ],
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                        ),
                        borderRadius: BorderRadius.only(
                          bottomLeft: const Radius.circular(16),
                          bottomRight: const Radius.circular(16),
                          topLeft: Radius.circular(8 * (1 - waterProgress)),
                          topRight: Radius.circular(8 * (1 - waterProgress)),
                        ),
                      ),
                    ),
                    if (isDone)
                      Positioned(
                        top: 40,
                        child: Transform.scale(
                          scale: checkmarkProgress,
                          child: const Icon(Icons.check_circle_rounded,
                              color: Colors.white, size: 40),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 28),
                Text(
                  isDone ? 'Dispense Complete!' : 'Dispensing...',
                  style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.textDark),
                ),
                const SizedBox(height: 8),
                Text(
                  isDone
                      ? 'Your ${widget.waterAmount} of water has been successfully dispensed. EcoDefill points deducted.'
                      : 'Please hold your container under the spout.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 13, color: AppTheme.textMuted, height: 1.4),
                ),
                const SizedBox(height: 24),
                if (isDone)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(ctx).pop();      // dismiss dialog
                        Navigator.of(context).pop();  // back to redeem screen
                        Navigator.of(context).pop();  // back to dashboard
                      },
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accentBlue),
                      child: const Text('Done'),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          // Background dim overlay
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.65),
            ),
          ),
          // Backdrop blur filter
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4), // backdrop-blur-sm
              child: const SizedBox.shrink(),
            ),
          ),
          // Centered modal
          Center(
            child: SingleChildScrollView(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                padding: const EdgeInsets.all(28), // p-7 = 28px
                constraints: const BoxConstraints(maxWidth: 384), // max-w-sm = 384px
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24), // rounded-3xl
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // ── Close Button ──
                    Align(
                      alignment: Alignment.topRight,
                      child: InkWell(
                        onTap: () {
                          _pollTimer?.cancel();
                          Navigator.of(context).pop();
                        },
                        borderRadius: BorderRadius.circular(100),
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: const BoxDecoration(
                            color: Color(0xFFF1F5F9), // slate-100
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.close,
                            color: Color(0xFF64748B), // slate-500
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // ── QR Display Card ──
                    QrDisplayCard(
                      token: widget.token,
                      accentColor: _accent,
                    ),
                    const SizedBox(height: 20),

                    // ── Title ──
                    Text(
                      widget.mode == QrScanMode.receivePoints
                          ? "Scan at Station"
                          : "Scan QR to Dispense",
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A), // slate-900
                      ),
                    ),
                    const SizedBox(height: 4),

                    // ── Subtitle ──
                    Text(
                      widget.mode == QrScanMode.receivePoints
                          ? "Position this QR code in front of the scanner"
                          : "Show this code to the machine camera",
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B), // slate-500
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // ── Bottom Active Pill ──
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: widget.mode == QrScanMode.receivePoints
                            ? const Color(0xFFECFDF5) // emerald-50
                            : const Color(0xFFEFF6FF), // blue-50
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(
                        "QR Code Active",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: widget.mode == QrScanMode.receivePoints
                              ? const Color(0xFF10B981) // emerald-500
                              : const Color(0xFF3B82F6), // blue-500
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
