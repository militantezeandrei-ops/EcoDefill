import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/network/api_client.dart';
import 'package:ecodefill_mobile/core/storage/local_cache.dart';
import 'package:ecodefill_mobile/core/network/connectivity_provider.dart';

class RankingState {
  final List<dynamic> rankings;
  final bool isLoading;
  final String? error;
  final bool isFromCache;

  RankingState({
    required this.rankings,
    this.isLoading = false,
    this.error,
    this.isFromCache = false,
  });

  RankingState copyWith({
    List<dynamic>? rankings,
    bool? isLoading,
    String? error,
    bool? isFromCache,
  }) {
    return RankingState(
      rankings: rankings ?? this.rankings,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isFromCache: isFromCache ?? this.isFromCache,
    );
  }
}

class RankingNotifier extends StateNotifier<RankingState> {
  final Ref _ref;

  RankingNotifier(this._ref) : super(RankingState(rankings: [])) {
    loadRankings();
  }

  // Load from cache first, then fetch from API if online
  Future<void> loadRankings({bool forceRefresh = false}) async {
    // 1. Read from cache instantly
    final cached = LocalCache.instance.getCachedRankings();
    if (cached.isNotEmpty && state.rankings.isEmpty) {
      state = RankingState(
        rankings: _sortRankings(cached),
        isFromCache: true,
      );
    }

    final isOffline = _ref.read(connectivityProvider) == ConnectivityStatus.isDisconnected;
    if (isOffline) {
      if (forceRefresh) {
        state = state.copyWith(
          isLoading: false,
          error: 'Cannot refresh. Device is currently offline.',
        );
      }
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await ApiClient.instance.get('/api/course-ranking');
      final rawData = response.data;
      
      List<dynamic> rankingList = [];
      if (rawData is List) {
        rankingList = rawData;
      } else if (rawData is Map && rawData['rankings'] is List) {
        rankingList = rawData['rankings'];
      } else if (rawData is Map && rawData['data'] is List) {
        rankingList = rawData['data'];
      }

      final sortedList = _sortRankings(rankingList);

      // Cache the result
      await LocalCache.instance.cacheRankings(sortedList);

      state = RankingState(
        rankings: sortedList,
        isLoading: false,
        isFromCache: false,
      );
    } catch (e) {
      // If error occurs, keep showing cached rankings but output the error
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
    }
  }

  List<dynamic> _sortRankings(List<dynamic> list) {
    final mutableList = List<dynamic>.from(list);
    mutableList.sort((a, b) {
      final pointsA = double.tryParse((a['points'] ?? a['totalPoints'] ?? a['total_points'] ?? 0).toString()) ?? 0.0;
      final pointsB = double.tryParse((b['points'] ?? b['totalPoints'] ?? b['total_points'] ?? 0).toString()) ?? 0.0;
      return pointsB.compareTo(pointsA);
    });
    return mutableList;
  }
}

final rankingProvider = StateNotifierProvider<RankingNotifier, RankingState>((ref) {
  return RankingNotifier(ref);
});
