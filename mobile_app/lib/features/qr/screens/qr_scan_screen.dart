import 'dart:async';
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

  String get _title => widget.mode == QrScanMode.receivePoints
      ? 'Scan at Station'
      : 'Scan to Dispense';

  String get _subtitle => widget.mode == QrScanMode.receivePoints
      ? 'Position this QR code in front of the scanner on the EcoDefill station to initiate the recycling session.'
      : 'Align this QR code with the scanner on the EcoDefill dispenser machine to receive ${widget.waterAmount} water.';

  String get _statusText => widget.mode == QrScanMode.receivePoints
      ? 'Waiting for scanner...'
      : 'Awaiting connection...';

  String get _appBarTitle => widget.mode == QrScanMode.receivePoints
      ? 'Receive Points'
      : 'Redeem Water';

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

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: AppTheme.textDark),
          onPressed: () {
            _pollTimer?.cancel();
            Navigator.of(context).pop();
          },
        ),
        title: Text(
          _appBarTitle,
          style: const TextStyle(
              color: AppTheme.textDark,
              fontWeight: FontWeight.w900,
              fontSize: 20),
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Decorative accent blob
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _accent.withOpacity(0.06),
              ),
            ),
          ),

          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Title ──────────────────────────────────────────────
                  Text(
                    _title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.textDark),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _subtitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.textMuted,
                        height: 1.4),
                  ),
                  const SizedBox(height: 40),

                  // ── QR card – always centred, always 240×240 ───────────
                  Center(
                    child: QrDisplayCard(
                      token: widget.token,
                      accentColor: _accent,
                    ),
                  ),

                  const SizedBox(height: 40),

                  // ── Status indicator ───────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: _accent,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        _statusText,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: _accent.withOpacity(0.85),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
