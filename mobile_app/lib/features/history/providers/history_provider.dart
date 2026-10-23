import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/network/api_client.dart';
import 'package:ecodefill_mobile/core/storage/local_cache.dart';

class HistoryState {
  final bool isLoading;
  final String? error;
  final List<dynamic> transactions;
  final double totalEarned;
  final double totalRedeemed;
  final int totalRecycledItems;

  HistoryState({
    this.isLoading = false,
    this.error,
    this.transactions = const [],
    this.totalEarned = 0.0,
    this.totalRedeemed = 0.0,
    this.totalRecycledItems = 0,
  });

  HistoryState copyWith({
    bool? isLoading,
    String? error,
    List<dynamic>? transactions,
    double? totalEarned,
    double? totalRedeemed,
    int? totalRecycledItems,
  }) {
    return HistoryState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      transactions: transactions ?? this.transactions,
      totalEarned: totalEarned ?? this.totalEarned,
      totalRedeemed: totalRedeemed ?? this.totalRedeemed,
      totalRecycledItems: totalRecycledItems ?? this.totalRecycledItems,
    );
  }
}

class HistoryNotifier extends StateNotifier<HistoryState> {
  HistoryNotifier() : super(HistoryState()) {
    _loadFromCache();
    fetchTransactions();
  }

  void _loadFromCache() {
    final cachedTxs = LocalCache.instance.getCachedTransactions();
    if (cachedTxs.isNotEmpty) {
      final stats = _calculateStats(cachedTxs);
      state = HistoryState(
        transactions: cachedTxs,
        totalEarned: stats['totalEarned']!,
        totalRedeemed: stats['totalRedeemed']!,
        totalRecycledItems: stats['totalRecycledItems']!.toInt(),
      );
    } else {
      state = HistoryState(
        transactions: const [],
        totalEarned: 0.0,
        totalRedeemed: 0.0,
        totalRecycledItems: 0,
      );
    }
  }

  Future<void> fetchTransactions() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await ApiClient.instance.get('/api/user-transactions');
      final data = response.data as Map<String, dynamic>;
      final List<dynamic> txs = data['transactions'] ?? [];
      
      // Cache results locally
      await LocalCache.instance.cacheTransactions(txs);

      final Map<String, dynamic> stats = data['stats'] ?? {};
      final double earned = double.parse((stats['totalEarned'] ?? 0.0).toString());
      final double redeemed = double.parse((stats['totalRedeemed'] ?? 0.0).toString());
      final int recycled = int.parse((stats['totalRecycledItems'] ?? 0).toString());

      state = HistoryState(
        isLoading: false,
        transactions: txs,
        totalEarned: earned,
        totalRedeemed: redeemed,
        totalRecycledItems: recycled,
      );
    } catch (e) {
      // Offline fallback: keep cached transactions if present
      final cachedTxs = LocalCache.instance.getCachedTransactions();
      final stats = _calculateStats(cachedTxs);

      state = state.copyWith(
        isLoading: false,
        transactions: cachedTxs,
        totalEarned: stats['totalEarned']!,
        totalRedeemed: stats['totalRedeemed']!,
        totalRecycledItems: stats['totalRecycledItems']!.toInt(),
        error: cachedTxs.isEmpty ? 'Unable to load activity history.' : null,
      );
    }
  }

  Map<String, double> _calculateStats(List<dynamic> txs) {
    double earned = 0.0;
    double redeemed = 0.0;
    double recycled = 0.0;

    for (var tx in txs) {
      final type = tx['type'];
      final double amount = double.parse((tx['amount'] ?? 0.0).toString());
      if (type == 'EARN') {
        earned += amount;
        final count = tx['count'] ?? 1;
        recycled += count;
      } else if (type == 'REDEEM') {
        redeemed += amount;
      }
    }

    return {
      'totalEarned': earned,
      'totalRedeemed': redeemed,
      'totalRecycledItems': recycled,
    };
  }
}

final historyProvider = StateNotifierProvider<HistoryNotifier, HistoryState>((ref) {
  return HistoryNotifier();
});
