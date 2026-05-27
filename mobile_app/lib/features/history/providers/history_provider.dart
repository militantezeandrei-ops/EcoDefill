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
      // Use beautiful default fallback mock data if cache is empty
      final mockData = _getMockTransactions();
      final stats = _calculateStats(mockData);
      state = HistoryState(
        transactions: mockData,
        totalEarned: stats['totalEarned']!,
        totalRedeemed: stats['totalRedeemed']!,
        totalRecycledItems: stats['totalRecycledItems']!.toInt(),
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
      // Offline fallback: keep cached but show warning error message if cache was empty
      final cachedTxs = LocalCache.instance.getCachedTransactions();
      final finalTxs = cachedTxs.isNotEmpty ? cachedTxs : _getMockTransactions();
      final stats = _calculateStats(finalTxs);

      state = state.copyWith(
        isLoading: false,
        transactions: finalTxs,
        totalEarned: stats['totalEarned']!,
        totalRedeemed: stats['totalRedeemed']!,
        totalRecycledItems: stats['totalRecycledItems']!.toInt(),
        error: cachedTxs.isEmpty ? 'Failed to connect. Using demo data.' : null,
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

  List<dynamic> _getMockTransactions() {
    final now = DateTime.now();
    return [
      {
        'id': 'mock-1',
        'type': 'EARN',
        'amount': 2.0,
        'materialType': 'BOTTLE',
        'count': 2,
        'status': 'SUCCESS',
        'createdAt': now.toIso8601String(),
      },
      {
        'id': 'mock-2',
        'type': 'REDEEM',
        'amount': 3.0,
        'materialType': null,
        'count': null,
        'status': 'SUCCESS',
        'createdAt': now.subtract(const Duration(hours: 3)).toIso8601String(),
      },
      {
        'id': 'mock-3',
        'type': 'EARN',
        'amount': 0.5,
        'materialType': 'CUP',
        'count': 1,
        'status': 'SUCCESS',
        'createdAt': now.subtract(const Duration(days: 1)).toIso8601String(),
      },
      {
        'id': 'mock-4',
        'type': 'EARN',
        'amount': 4.5,
        'materialType': 'CANS',
        'count': 3,
        'status': 'SUCCESS',
        'createdAt': now.subtract(const Duration(days: 1, hours: 2)).toIso8601String(),
      },
      {
        'id': 'mock-5',
        'type': 'REDEEM',
        'amount': 5.0,
        'materialType': null,
        'count': null,
        'status': 'SUCCESS',
        'createdAt': now.subtract(const Duration(days: 4)).toIso8601String(),
      },
      {
        'id': 'mock-6',
        'type': 'EARN',
        'amount': 4.0,
        'materialType': 'BOTTLE',
        'count': 4,
        'status': 'SUCCESS',
        'createdAt': now.subtract(const Duration(days: 5)).toIso8601String(),
      },
    ];
  }
}

final historyProvider = StateNotifierProvider<HistoryNotifier, HistoryState>((ref) {
  return HistoryNotifier();
});
