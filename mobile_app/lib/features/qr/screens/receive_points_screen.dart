import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/network/api_client.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/features/qr/screens/qr_scan_screen.dart';

/// Entry screen for the "Receive Points" flow.
///
/// Calls the API to generate a QR token, then immediately navigates to the
/// shared [QrScanScreen] in [QrScanMode.receivePoints] mode.
class ReceivePointsScreen extends ConsumerStatefulWidget {
  const ReceivePointsScreen({super.key});

  @override
  ConsumerState<ReceivePointsScreen> createState() =>
      _ReceivePointsScreenState();
}

class _ReceivePointsScreenState extends ConsumerState<ReceivePointsScreen> {
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _generateAndNavigate();
  }

  Future<void> _generateAndNavigate() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient.instance.post('/api/qr-generate');
      final data = response.data as Map<String, dynamic>;
      final token = data['token'] as String;

      if (!mounted) return;

      // Navigate to the shared QR screen – replace this route so Back
      // on the QR screen goes straight to Dashboard.
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => QrScanScreen(
            token: token,
            mode: QrScanMode.receivePoints,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      String errorMsg = e.toString().replaceAll('Exception: ', '');
      if (errorMsg.contains('Daily earning limit')) {
        errorMsg =
            'You have reached your daily earning limit of 10 points. Come back tomorrow!';
      } else if (errorMsg.contains('Rate limit exceeded')) {
        errorMsg =
            'Please wait a moment before trying to generate the QR code again.';
      }
      setState(() {
        _errorMessage = errorMsg;
        _isLoading = false;
      });
    }
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
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Receive Points',
          style: TextStyle(
              color: AppTheme.textDark,
              fontWeight: FontWeight.w900,
              fontSize: 20),
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryEmerald.withOpacity(0.06),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: _isLoading
                  // ── Loading state: spinner while API call runs ──────────
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CircularProgressIndicator(
                          color: AppTheme.primaryEmerald,
                          strokeWidth: 3,
                        ),
                        const SizedBox(height: 20),
                        Text(
                          'Generating QR code...',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.textMuted.withOpacity(0.8),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    )
                  // ── Error state ─────────────────────────────────────────
                  : Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.error_outline_rounded,
                              color: Colors.redAccent, size: 56),
                          const SizedBox(height: 16),
                          Text(
                            _errorMessage ?? 'Something went wrong.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.redAccent,
                              fontWeight: FontWeight.bold,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _generateAndNavigate,
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Try Again'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryEmerald,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16)),
                              padding: const EdgeInsets.symmetric(
                                  vertical: 14, horizontal: 24),
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
