import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/features/auth/providers/auth_provider.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/features/shell/providers/shell_provider.dart';
import 'package:ecodefill_mobile/features/history/providers/history_provider.dart';
import 'package:ecodefill_mobile/features/qr/screens/receive_points_screen.dart';
import 'package:ecodefill_mobile/features/redeem/screens/redeem_water_screen.dart';
import 'package:ecodefill_mobile/core/network/connectivity_provider.dart';
import 'package:ecodefill_mobile/features/dashboard/widgets/guide_slides_dialog.dart';
import 'package:ecodefill_mobile/core/widgets/dynamic_island_notification.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final historyState = ref.watch(historyProvider);
    final isOffline = ref.watch(connectivityProvider) == ConnectivityStatus.isDisconnected;
    
    // Onboarding check
    if (authState.isAuthenticated && !authState.hasSeenGuide) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!ref.read(authProvider).hasSeenGuide) {
          ref.read(authProvider.notifier).markGuideAsSeen();
          GuideSlidesDialog.show(context, onFinish: () {});
        }
      });
    }

    final balance = authState.balance;
    final fullName = authState.fullName ?? 'Student';
    final litersSaved = balance * 0.1;
    final transactions = historyState.transactions;

    return Scaffold(
      body: Stack(
        children: [
          // Top Background Gradient Mesh
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 240,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryEmerald.withOpacity(0.12),
                    Colors.transparent,
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'EcoDefill',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryEmerald,
                              letterSpacing: 1.2,
                            ),
                          ),
                          Text(
                            'Dashboard',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () {
                          ref.read(authProvider.notifier).logout();
                        },
                        icon: const Icon(Icons.logout_rounded, color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Balance Hero Card ──
                  Container(
                    padding: const EdgeInsets.all(20.0),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          AppTheme.primaryEmerald,
                          Color(0xFF059669),
                          Color(0xFF0F766E),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryEmerald.withOpacity(0.3),
                          blurRadius: 24,
                          offset: const Offset(0, 10),
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "${fullName.toUpperCase()}'S BALANCE",
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.8,
                            color: Colors.white.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              balance.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), ''),
                              style: const TextStyle(
                                fontSize: 48,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                height: 0.9,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Padding(
                              padding: EdgeInsets.only(bottom: 4.0),
                              child: Text(
                                'pts',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white70,
                                  letterSpacing: 1.0,
                                ),
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
                                '≈ ${litersSaved.toStringAsFixed(1)} L water saved',
                                style: const TextStyle(
                                  fontSize: 10,
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
                  const SizedBox(height: 24),

                  // ── Usage Summary ──
                  const Text(
                    'Usage Summary',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.textDark,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      // Earn Card
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.cardWhite,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.recycling_rounded, size: 18, color: AppTheme.primaryEmerald),
                                      const SizedBox(width: 4),
                                      const Text(
                                        'EARNED',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w900,
                                          color: AppTheme.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text.rich(
                                    TextSpan(
                                      children: [
                                        TextSpan(
                                          text: authState.dailyEarned.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), ''),
                                          style: const TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w900,
                                            color: AppTheme.primaryEmerald,
                                          ),
                                        ),
                                        const TextSpan(
                                          text: '/10',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: (authState.dailyEarned / 10.0).clamp(0.0, 1.0),
                                  backgroundColor: Colors.grey.shade100,
                                  valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryEmerald),
                                  minHeight: 6,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Redeem Card
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.cardWhite,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.water_drop_rounded, size: 18, color: AppTheme.accentBlue),
                                      const SizedBox(width: 4),
                                      const Text(
                                        'REDEEMED',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w900,
                                          color: AppTheme.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text.rich(
                                    TextSpan(
                                      children: [
                                        TextSpan(
                                          text: authState.dailyRedeemed.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), ''),
                                          style: const TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w900,
                                            color: AppTheme.accentBlue,
                                          ),
                                        ),
                                        const TextSpan(
                                          text: ' pts',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Water dispensed today',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: AppTheme.textMuted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── Quick Actions ──
                  const Text(
                    'Quick Actions',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.textDark,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      // Receive Points Button
                      Expanded(
                        child: InkWell(
                          onTap: isOffline
                              ? () {
                                  DynamicIslandNotification.show(
                                    context,
                                    title: 'Offline Mode',
                                    subtitle: 'Generating QR codes is disabled while offline.',
                                    icon: Icons.wifi_off_rounded,
                                    type: NotificationType.warning,
                                  );
                                }
                              : () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => const ReceivePointsScreen(),
                                    ),
                                  );
                                },
                          borderRadius: BorderRadius.circular(22),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            decoration: BoxDecoration(
                              color: isOffline ? Colors.grey.shade400 : AppTheme.primaryEmerald,
                              borderRadius: BorderRadius.circular(22),
                              boxShadow: isOffline
                                  ? null
                                  : [
                                      BoxShadow(
                                        color: AppTheme.primaryEmerald.withOpacity(0.2),
                                        blurRadius: 16,
                                        offset: const Offset(0, 6),
                                      )
                                    ],
                            ),
                            child: Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    isOffline ? Icons.wifi_off_rounded : Icons.qr_code_scanner_rounded,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                const Text(
                                  'Receive Points',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  isOffline ? 'Offline - disabled' : 'Show my QR',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Redeem Water Button
                      Expanded(
                        child: InkWell(
                          onTap: isOffline
                              ? () {
                                  DynamicIslandNotification.show(
                                    context,
                                    title: 'Offline Mode',
                                    subtitle: 'Redeeming water is disabled while offline.',
                                    icon: Icons.wifi_off_rounded,
                                    type: NotificationType.warning,
                                  );
                                }
                              : () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => const RedeemWaterScreen(),
                                    ),
                                  );
                                },
                          borderRadius: BorderRadius.circular(22),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            decoration: BoxDecoration(
                              color: isOffline ? Colors.grey.shade400 : AppTheme.accentBlue,
                              borderRadius: BorderRadius.circular(22),
                              boxShadow: isOffline
                                  ? null
                                  : [
                                      BoxShadow(
                                        color: AppTheme.accentBlue.withOpacity(0.2),
                                        blurRadius: 16,
                                        offset: const Offset(0, 6),
                                      )
                                    ],
                            ),
                            child: Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    isOffline ? Icons.wifi_off_rounded : Icons.local_drink_rounded,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                const Text(
                                  'Redeem Water',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                                Text(
                                  isOffline ? 'Offline - disabled' : 'Use your points',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── Recent Activity ──
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Recent Activity',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.textDark,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          ref.read(shellNavigationProvider.notifier).state = 2; // Go to History
                        },
                        child: const Text(
                          'View all',
                          style: TextStyle(
                            color: AppTheme.primaryEmerald,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (transactions.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Column(
                          children: [
                            Icon(
                              Icons.inbox_outlined,
                              size: 44,
                              color: Colors.grey.shade300,
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'No transactions yet',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade400,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Start recycling to earn points!',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade400,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    Column(
                      children: transactions.take(3).map((tx) {
                        final isEarn = tx['type'] == 'EARN';
                        final double amount = double.parse((tx['amount'] ?? 0.0).toString());
                        final String amountText = isEarn
                            ? '+${amount.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '')}'
                            : '-${amount.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '')}';

                        IconData txIcon = Icons.water_drop_rounded;
                        String titleText = 'Dispensed Water';

                        if (isEarn) {
                          final matType = tx['materialType']?.toString().toUpperCase();
                          final count = tx['count'] ?? 1;
                          if (matType == 'BOTTLE') {
                            txIcon = Icons.local_drink_rounded;
                            titleText = 'Recycled $count Bottle${count > 1 ? "s" : ""}';
                          } else if (matType == 'CUP') {
                            txIcon = Icons.coffee_rounded;
                            titleText = 'Recycled $count Cup${count > 1 ? "s" : ""}';
                          } else if (matType == 'CANS') {
                            txIcon = Icons.view_headline_rounded;
                            titleText = 'Recycled $count Can${count > 1 ? "s" : ""}';
                          } else {
                            txIcon = Icons.recycling_rounded;
                            titleText = 'Recycled $count Item${count > 1 ? "s" : ""}';
                          }
                        } else {
                          final double volumeMl = amount * 100;
                          titleText = 'Dispensed ${volumeMl.toStringAsFixed(0)}ml Water';
                        }

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10.0),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                            decoration: BoxDecoration(
                              color: AppTheme.cardWhite,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: isEarn
                                        ? AppTheme.primaryEmerald.withOpacity(0.1)
                                        : AppTheme.accentBlue.withOpacity(0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    txIcon,
                                    color: isEarn ? AppTheme.primaryEmerald : AppTheme.accentBlue,
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    titleText,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.textDark,
                                    ),
                                  ),
                                ),
                                Text(
                                  amountText,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900,
                                    color: isEarn ? AppTheme.primaryEmerald : AppTheme.accentBlue,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
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
