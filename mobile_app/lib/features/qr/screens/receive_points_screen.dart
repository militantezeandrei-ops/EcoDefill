import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:ecodefill_mobile/core/network/api_client.dart';
import 'package:ecodefill_mobile/features/auth/providers/auth_provider.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';

class ReceivePointsScreen extends ConsumerStatefulWidget {
  const ReceivePointsScreen({super.key});

  @override
  ConsumerState<ReceivePointsScreen> createState() => _ReceivePointsScreenState();
}

class _ReceivePointsScreenState extends ConsumerState<ReceivePointsScreen> with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  String? _token;
  String? _errorMessage;
  Timer? _pollTimer;
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.elasticOut,
    );
    _generateQRToken();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _generateQRToken() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient.instance.post('/api/qr-generate');
      final data = response.data as Map<String, dynamic>;
      final token = data['token'] as String;

      if (mounted) {
        setState(() {
          _token = token;
          _isLoading = false;
        });
        _startPolling(token);
      }
    } catch (e) {
      if (mounted) {
        String errorMsg = e.toString().replaceAll('Exception: ', '');
        if (errorMsg.contains('Daily earning limit')) {
          errorMsg = 'You have reached your daily earning limit of 10 points. Come back tomorrow!';
        } else if (errorMsg.contains('Rate limit exceeded')) {
          errorMsg = 'Please wait a moment before trying to generate the QR code again.';
        }
        setState(() {
          _errorMessage = errorMsg;
          _isLoading = false;
        });
      }
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
          
          if (mounted) {
            // Trigger balance refresh in background
            ref.read(authProvider.notifier).refreshBalance();
            _showSuccessOverlay();
          }
        }
      } catch (e) {
        debugPrint('Polling status error: $e');
      }
    });
  }

  void _showSuccessOverlay() {
    _animationController.forward();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return ScaleTransition(
          scale: _scaleAnimation,
          child: AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(28),
            ),
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
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: AppTheme.primaryEmerald,
                    size: 50,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Points Received!',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.textDark,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Your recycled materials were processed and points have been added to your balance.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textMuted,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop(); // Dismiss Dialog
                      Navigator.of(context).pop(); // Back to Dashboard
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryEmerald,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Back to Dashboard'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
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
          'Receive Points',
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
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Scan at Station',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.textDark,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Position this QR code in front of the scanner on the EcoDefill station to initiate the recycling session.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textMuted,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 40),
                  
                  // Center Card container for QR code
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(32),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 24,
                            offset: const Offset(0, 8),
                          ),
                          BoxShadow(
                            color: AppTheme.primaryEmerald.withOpacity(0.03),
                            blurRadius: 40,
                            offset: const Offset(0, 16),
                          ),
                        ],
                        border: Border.all(
                          color: AppTheme.primaryEmerald.withOpacity(0.1),
                          width: 1,
                        ),
                      ),
                      child: SizedBox(
                        width: 240,
                        height: 240,
                        child: _isLoading
                            ? const Center(
                                child: CircularProgressIndicator(
                                  color: AppTheme.primaryEmerald,
                                  strokeWidth: 3,
                                ),
                              )
                            : _errorMessage != null
                                ? Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(
                                        Icons.error_outline_rounded,
                                        color: Colors.redAccent,
                                        size: 48,
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        _errorMessage!,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.redAccent,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      TextButton.icon(
                                        onPressed: _generateQRToken,
                                        icon: const Icon(Icons.refresh_rounded, size: 16),
                                        label: const Text('Try Again'),
                                        style: TextButton.styleFrom(
                                          foregroundColor: AppTheme.primaryEmerald,
                                          textStyle: const TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  )
                                : _token != null
                                    ? QrImageView(
                                        data: _token!,
                                        version: QrVersions.auto,
                                        size: 240,
                                        gapless: false,
                                        eyeStyle: const QrEyeStyle(
                                          eyeShape: QrEyeShape.square,
                                          color: AppTheme.textDark,
                                        ),
                                        dataModuleStyle: const QrDataModuleStyle(
                                          dataModuleShape: QrDataModuleShape.square,
                                          color: AppTheme.textDark,
                                        ),
                                      )
                                    : const SizedBox.shrink(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                  
                  // Status feedback indicators below the QR
                  if (!_isLoading && _errorMessage == null && _token != null)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.primaryEmerald,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Waiting for scanner...',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryEmerald.withOpacity(0.85),
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
