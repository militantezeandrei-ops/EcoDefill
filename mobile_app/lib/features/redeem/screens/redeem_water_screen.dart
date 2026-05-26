import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:ecodefill_mobile/core/network/api_client.dart';
import 'package:ecodefill_mobile/features/auth/providers/auth_provider.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';

class RedeemWaterScreen extends ConsumerStatefulWidget {
  const RedeemWaterScreen({super.key});

  @override
  ConsumerState<RedeemWaterScreen> createState() => _RedeemWaterScreenState();
}

class _RedeemWaterScreenState extends ConsumerState<RedeemWaterScreen> with TickerProviderStateMixin {
  int _selectedPoints = 1;
  bool _isLoading = false;
  String? _qrToken;
  String? _errorMessage;
  Timer? _pollTimer;

  // Animation controllers for success dispensing
  late AnimationController _waterLevelController;
  late AnimationController _checkmarkController;

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
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _waterLevelController.dispose();
    _checkmarkController.dispose();
    super.dispose();
  }

  String _formatWater(int points) {
    final ml = points * 100;
    if (ml >= 1000) {
      final liters = ml / 1000.0;
      return '${liters.toStringAsFixed(liters == liters.toInt() ? 0 : 1)}L';
    }
    return '${ml}ml';
  }

  Future<void> _initiateRedeem() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient.instance.post(
        '/api/redeem-initiate',
        data: {'amount': _selectedPoints},
      );
      final data = response.data as Map<String, dynamic>;
      final token = data['token'] as String;

      setState(() {
        _qrToken = token;
        _isLoading = false;
      });

      _startPolling(token);
      _showQRModal();
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  void _startPolling(String token) {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      try {
        final response = await ApiClient.instance.get('/api/qr-status?token=$token');
        final data = response.data as Map<String, dynamic>;

        if (data['used'] == true) {
          _pollTimer?.cancel();
          _pollTimer = null;

          // Close QR popup
          if (mounted) {
            Navigator.of(context).pop(); // Dismiss the QR dialog
            _showDispensingAnimation();
            ref.read(authProvider.notifier).refreshBalance();
          }
        }
      } catch (e) {
        debugPrint('Polling redeem status error: $e');
      }
    });
  }

  void _showQRModal() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return PopScope(
          canPop: false,
          onPopInvoked: (didPop) {
            if (didPop) return;
            // Stop polling if user explicitly closes dialog
            _pollTimer?.cancel();
            _pollTimer = null;
            setState(() {
              _qrToken = null;
            });
            Navigator.of(dialogContext).pop();
          },
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
            contentPadding: const EdgeInsets.all(24),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Scan to Dispense',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.textDark,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.grey),
                      onPressed: () {
                        _pollTimer?.cancel();
                        _pollTimer = null;
                        setState(() {
                          _qrToken = null;
                        });
                        Navigator.of(dialogContext).pop();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Align this code with the scanner on the EcoDefill dispenser machine to receive ${_formatWater(_selectedPoints)} water.',
                  style: const TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4),
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: QrImageView(
                    data: _qrToken ?? '',
                    version: QrVersions.auto,
                    size: 200,
                    gapless: false,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.accentBlue.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_protected_setup_rounded, color: AppTheme.accentBlue, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        'Awaiting connection...',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.accentBlue.withOpacity(0.9),
                        ),
                      ),
                    ],
                  ),
                )
              ],
            ),
          ),
        );
      },
    );
  }

  void _showDispensingAnimation() {
    _waterLevelController.reset();
    _checkmarkController.reset();
    _waterLevelController.forward().then((_) {
      _checkmarkController.forward();
    });

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(32),
          ),
          contentPadding: const EdgeInsets.all(28),
          content: AnimatedBuilder(
            animation: Listenable.merge([_waterLevelController, _checkmarkController]),
            builder: (context, child) {
              final double waterProgress = _waterLevelController.value;
              final double checkmarkProgress = _checkmarkController.value;
              final isDone = waterProgress >= 1.0;

              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Animated water cup refill
                  Stack(
                    alignment: Alignment.bottomCenter,
                    children: [
                      // Cup outline
                      Container(
                        width: 90,
                        height: 120,
                        decoration: BoxDecoration(
                          border: Border.all(color: AppTheme.accentBlue.withOpacity(0.3), width: 3),
                          borderRadius: const BorderRadius.only(
                            bottomLeft: Radius.circular(20),
                            bottomRight: Radius.circular(20),
                          ),
                        ),
                      ),
                      // Water filling up
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
                      // Checkmark inside overlay once done
                      if (isDone)
                        Positioned(
                          top: 40,
                          child: Transform.scale(
                            scale: checkmarkProgress,
                            child: const Icon(
                              Icons.check_circle_rounded,
                              color: Colors.white,
                              size: 40,
                            ),
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
                      color: AppTheme.textDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isDone
                        ? 'Your ${_formatWater(_selectedPoints)} of water has been successfully dispensed. EcoDefill points deducted.'
                        : 'Please hold your container under the spout.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textMuted,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (isDone)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.of(dialogContext).pop(); // pop dialog
                          Navigator.of(context).pop(); // pop screen
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accentBlue,
                        ),
                        child: const Text('Done'),
                      ),
                    ),
                ],
              );
            },
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final balance = authState.balance.toInt();
    final maxAllowedPoints = balance < 5 ? balance : 5;
    final isBalanceZero = balance == 0;

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textDark),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Redeem Water',
          style: TextStyle(
            color: AppTheme.textDark,
            fontWeight: FontWeight.w900,
            fontSize: 20,
          ),
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Elegant decorative gradient mesh background
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.accentBlue.withOpacity(0.06),
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Current Balance card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.accentBlue, Color(0xFF2563EB), Color(0xFF1D4ED8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.accentBlue.withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'CURRENT POINTS BALANCE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.white70,
                            letterSpacing: 1.5,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '$balance',
                              style: const TextStyle(
                                fontSize: 44,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                height: 0.9,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'pts',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withOpacity(0.15)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.water_drop_rounded, size: 14, color: Colors.cyanAccent),
                              const SizedBox(width: 6),
                              Text(
                                'Equivalent to ${_formatWater(balance)} of pure water',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Points to Redeem selector
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: Colors.grey.shade200),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Redemption Quantity',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.textDark,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Select points to convert (Max 5 pts / 500ml per session)',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.textMuted,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Decrement button
                            InkWell(
                              onTap: isBalanceZero || _selectedPoints <= 1
                                  ? null
                                  : () {
                                      setState(() {
                                        _selectedPoints--;
                                        _errorMessage = null;
                                      });
                                    },
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: isBalanceZero || _selectedPoints <= 1
                                      ? Colors.grey.shade100
                                      : Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Icon(
                                  Icons.remove_rounded,
                                  color: isBalanceZero || _selectedPoints <= 1
                                      ? Colors.grey.shade400
                                      : Colors.red.shade600,
                                  size: 24,
                                ),
                              ),
                            ),
                            // Display value
                            Column(
                              children: [
                                Text(
                                  '$_selectedPoints',
                                  style: const TextStyle(
                                    fontSize: 48,
                                    fontWeight: FontWeight.w900,
                                    color: AppTheme.textDark,
                                  ),
                                ),
                                Text(
                                  '≈ ${_formatWater(_selectedPoints)} water',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: AppTheme.accentBlue,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            // Increment button
                            InkWell(
                              onTap: isBalanceZero || _selectedPoints >= maxAllowedPoints
                                  ? null
                                  : () {
                                      setState(() {
                                        _selectedPoints++;
                                        _errorMessage = null;
                                      });
                                    },
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: isBalanceZero || _selectedPoints >= maxAllowedPoints
                                      ? Colors.grey.shade100
                                      : AppTheme.primaryEmerald.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Icon(
                                  Icons.add_rounded,
                                  color: isBalanceZero || _selectedPoints >= maxAllowedPoints
                                      ? Colors.grey.shade400
                                      : AppTheme.primaryEmerald,
                                  size: 24,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Error notification banner if any
                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.red.shade100),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline_rounded, color: Colors.red.shade600),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: TextStyle(
                                color: Colors.red.shade700,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Action generate QR button
                  ElevatedButton(
                    onPressed: isBalanceZero || _isLoading ? null : _initiateRedeem,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentBlue,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2.5,
                            ),
                          )
                        : const Text('Generate QR Code'),
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
