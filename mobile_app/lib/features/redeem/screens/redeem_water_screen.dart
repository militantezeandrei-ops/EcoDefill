import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/network/api_client.dart';
import 'package:ecodefill_mobile/features/auth/providers/auth_provider.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/features/qr/screens/qr_scan_screen.dart';

class RedeemWaterScreen extends ConsumerStatefulWidget {
  const RedeemWaterScreen({super.key});

  @override
  ConsumerState<RedeemWaterScreen> createState() => _RedeemWaterScreenState();
}

class _RedeemWaterScreenState extends ConsumerState<RedeemWaterScreen> {
  int _selectedPoints = 1;
  bool _isLoading = false;
  String? _errorMessage;

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

      setState(() => _isLoading = false);

      if (!mounted) return;

      // ── Navigate to the shared QR screen (full-screen, same as Receive) ──
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => QrScanScreen(
            token: token,
            mode: QrScanMode.redeemWater,
            waterAmount: _formatWater(_selectedPoints),
            selectedPoints: _selectedPoints,
          ),
        ),
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
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
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: AppTheme.textDark),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Redeem Water',
          style: TextStyle(
              color: AppTheme.textDark,
              fontWeight: FontWeight.w900,
              fontSize: 20),
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Decorative background blob
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
                  // ── Current Balance card ─────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          AppTheme.accentBlue,
                          Color(0xFF2563EB),
                          Color(0xFF1D4ED8)
                        ],
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
                                  height: 0.9),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'pts',
                              style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white70),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color: Colors.white.withOpacity(0.15)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.water_drop_rounded,
                                  size: 14, color: Colors.cyanAccent),
                              const SizedBox(width: 6),
                              Text(
                                'Equivalent to ${_formatWater(balance)} of pure water',
                                style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // ── Redemption quantity selector ─────────────────────────
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
                              color: AppTheme.textDark),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Select points to convert (Max 5 pts / 500ml per session)',
                          style: TextStyle(
                              fontSize: 12, color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Decrement
                            InkWell(
                              onTap: isBalanceZero || _selectedPoints <= 1
                                  ? null
                                  : () => setState(() {
                                        _selectedPoints--;
                                        _errorMessage = null;
                                      }),
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
                            // Value
                            Column(
                              children: [
                                Text(
                                  '$_selectedPoints',
                                  style: const TextStyle(
                                      fontSize: 48,
                                      fontWeight: FontWeight.w900,
                                      color: AppTheme.textDark),
                                ),
                                Text(
                                  '≈ ${_formatWater(_selectedPoints)} water',
                                  style: const TextStyle(
                                      fontSize: 14,
                                      color: AppTheme.accentBlue,
                                      fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            // Increment
                            InkWell(
                              onTap:
                                  isBalanceZero || _selectedPoints >= maxAllowedPoints
                                      ? null
                                      : () => setState(() {
                                            _selectedPoints++;
                                            _errorMessage = null;
                                          }),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: isBalanceZero ||
                                          _selectedPoints >= maxAllowedPoints
                                      ? Colors.grey.shade100
                                      : AppTheme.primaryEmerald
                                          .withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Icon(
                                  Icons.add_rounded,
                                  color: isBalanceZero ||
                                          _selectedPoints >= maxAllowedPoints
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

                  // ── Error banner ─────────────────────────────────────────
                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.red.shade100),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline_rounded,
                              color: Colors.red.shade600),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: TextStyle(
                                  color: Colors.red.shade700,
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // ── Generate QR button ───────────────────────────────────
                  ElevatedButton(
                    onPressed:
                        isBalanceZero || _isLoading ? null : _initiateRedeem,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentBlue,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2.5),
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
