import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/features/history/providers/history_provider.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyState = ref.watch(historyProvider);
    final groupedTxs = _groupTransactions(historyState.transactions);

    // Flatten the grouped items into a single list of widgets
    final List<Widget> listWidgets = [];
    
    groupedTxs.forEach((groupTitle, txs) {
      // Add Group Header
      listWidgets.add(
        Padding(
          padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 16.0, bottom: 8.0),
          child: Text(
            groupTitle.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              color: AppTheme.textMuted,
              letterSpacing: 1.2,
            ),
          ),
        ),
      );

      // Add each Transaction Item in group
      for (var tx in txs) {
        listWidgets.add(
          _buildTransactionTile(context, tx),
        );
      }
    });

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
            child: RefreshIndicator(
              color: AppTheme.primaryEmerald,
              onRefresh: () => ref.read(historyProvider.notifier).fetchTransactions(),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // App Bar / Title
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Activity History',
                                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                      fontSize: 28,
                                      fontWeight: FontWeight.w900,
                                    ),
                              ),
                              Text(
                                'Track your recycling and water dispenses',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: AppTheme.textMuted,
                                    ),
                              ),
                            ],
                          ),
                          if (historyState.isLoading)
                            const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppTheme.primaryEmerald,
                              ),
                            )
                        ],
                      ),
                    ),
                  ),

                  // Stats Top Card
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                      child: Container(
                        padding: const EdgeInsets.all(20.0),
                        decoration: BoxDecoration(
                          color: AppTheme.cardWhite,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.02),
                              blurRadius: 16,
                              offset: const Offset(0, 8),
                            )
                          ],
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStatColumn(
                              context: context,
                              value: historyState.totalEarned.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), ''),
                              label: 'Total Earned',
                              icon: Icons.add_circle_outline_rounded,
                              color: AppTheme.primaryEmerald,
                            ),
                            Container(
                              height: 50,
                              width: 1,
                              color: const Color(0xFFE2E8F0),
                            ),
                            _buildStatColumn(
                              context: context,
                              value: historyState.totalRecycledItems.toString(),
                              label: 'Items Recycled',
                              icon: Icons.recycling_rounded,
                              color: AppTheme.accentBlue,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Connection error notice if applicable
                  if (historyState.error != null)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.wifi_off_rounded, color: Colors.amber.shade800, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  historyState.error!,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.amber.shade900,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Transaction List
                  if (groupedTxs.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.history_rounded,
                              size: 64,
                              color: Colors.grey.shade300,
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'No Activity Yet',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Recycle or redeem water to see history logs.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade400,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) => listWidgets[index],
                        childCount: listWidgets.length,
                      ),
                    ),

                  // Bottom margin
                  const SliverToBoxAdapter(
                    child: SizedBox(height: 30),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionTile(BuildContext context, dynamic tx) {
    final isEarn = tx['type'] == 'EARN';
    final double amount = double.parse((tx['amount'] ?? 0.0).toString());
    final String amountText = isEarn
        ? '+${amount.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '')}'
        : '-${amount.toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '')}';

    // Determine icon based on transaction
    IconData txIcon = Icons.water_drop_rounded;
    String titleText = 'Dispensed Water';
    String subtitleText = 'Water dispenser';

    if (isEarn) {
      final matType = tx['materialType']?.toString().toUpperCase();
      final count = tx['count'] ?? 1;
      final s = count > 1 ? 's' : '';
      if (matType == 'BOTTLE') {
        txIcon = Icons.local_drink_rounded;
        titleText = 'Recycled $count Plastic Bottle$s';
        subtitleText = 'EcoDefill Machine';
      } else if (matType == 'CUP') {
        txIcon = Icons.coffee_rounded;
        titleText = 'Recycled $count Cup$s';
        subtitleText = 'EcoDefill Machine';
      } else if (matType == 'CANS') {
        txIcon = Icons.view_headline_rounded;
        titleText = 'Recycled $count Aluminum Can$s';
        subtitleText = 'EcoDefill Machine';
      } else {
        txIcon = Icons.recycling_rounded;
        titleText = 'Recycled $count item$s';
        subtitleText = 'EcoDefill Machine';
      }
    } else {
      // Redeemed water volume
      final double volumeMl = amount * 100;
      titleText = 'Dispensed ${volumeMl.toStringAsFixed(0)}ml Water';
      subtitleText = 'Redeemed water from station';
    }

    final timeText = _formatTime(tx['createdAt']);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 6.0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        decoration: BoxDecoration(
          color: AppTheme.cardWhite,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            // Left Icon Circle
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isEarn
                    ? AppTheme.primaryEmerald.withOpacity(0.1)
                    : AppTheme.accentBlue.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                txIcon,
                color: isEarn ? AppTheme.primaryEmerald : AppTheme.accentBlue,
                size: 20,
              ),
            ),
            const SizedBox(width: 16),

            // Middle Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    titleText,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        subtitleText,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppTheme.textMuted,
                        ),
                      ),
                      if (timeText.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          width: 3,
                          height: 3,
                          decoration: const BoxDecoration(
                            color: AppTheme.textMuted,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          timeText,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppTheme.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            // Right Amount Text
            Text(
              amountText,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: isEarn ? AppTheme.primaryEmerald : AppTheme.accentBlue,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn({
    required BuildContext context,
    required String value,
    required String label,
    required IconData icon,
    required Color color,
  }) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: Theme.of(context).textTheme.displayLarge?.copyWith(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: AppTheme.textDark,
              ),
        ),
      ],
    );
  }

  Map<String, List<dynamic>> _groupTransactions(List<dynamic> txs) {
    final Map<String, List<dynamic>> groups = {
      'Today': [],
      'Yesterday': [],
      'Older Activity': [],
    };

    final now = DateTime.now();
    final todayStr = _toDateString(now);
    final yesterdayStr = _toDateString(now.subtract(const Duration(days: 1)));

    for (var tx in txs) {
      if (tx['createdAt'] == null) continue;
      final createdAt = DateTime.tryParse(tx['createdAt']);
      if (createdAt == null) continue;

      final dateStr = _toDateString(createdAt);
      if (dateStr == todayStr) {
        groups['Today']!.add(tx);
      } else if (dateStr == yesterdayStr) {
        groups['Yesterday']!.add(tx);
      } else {
        groups['Older Activity']!.add(tx);
      }
    }

    // Remove empty groups
    groups.removeWhere((key, value) => value.isEmpty);
    return groups;
  }

  String _toDateString(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '';
    final date = DateTime.tryParse(dateStr);
    if (date == null) return '';
    final hour = date.hour;
    final minute = date.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final formattedHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$formattedHour:$minute $period';
  }
}
