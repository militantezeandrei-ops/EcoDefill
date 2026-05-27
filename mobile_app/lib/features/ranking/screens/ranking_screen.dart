import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/features/ranking/providers/ranking_provider.dart';

class RankingScreen extends ConsumerWidget {
  const RankingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rankingState = ref.watch(rankingProvider);

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
              onRefresh: () => ref.read(rankingProvider.notifier).loadRankings(forceRefresh: true),
              child: CustomScrollView(
                slivers: [
                  // App Bar / Title
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'ECODEFILL LEADERBOARD',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.primaryEmerald,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                  Text(
                                    'Course Standings',
                                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                          fontSize: 24,
                                          fontWeight: FontWeight.w900,
                                        ),
                                  ),
                                ],
                              ),
                              if (rankingState.isLoading)
                                const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppTheme.primaryEmerald,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            rankingState.isFromCache
                                ? 'Offline Mode - showing cached ranking data'
                                : 'Live standings based on overall recycling points.',
                            style: TextStyle(
                              fontSize: 12,
                              color: rankingState.isFromCache ? Colors.amber.shade800 : AppTheme.textMuted,
                              fontWeight: rankingState.isFromCache ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Error message
                  if (rankingState.error != null)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.red.shade100),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.info_outline_rounded, color: Colors.red.shade600, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  rankingState.error!,
                                  style: TextStyle(
                                    color: Colors.red.shade700,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Empty rankings check
                  if (rankingState.rankings.isEmpty && !rankingState.isLoading)
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.bar_chart_rounded, size: 64, color: AppTheme.textMuted),
                            SizedBox(height: 12),
                            Text(
                              'No rankings data available',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textDark,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Check back later or swipe down to refresh.',
                              style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                            ),
                          ],
                        ),
                      ),
                    )

                  // Podium Top 3 Area
                  else ...[
                    if (rankingState.rankings.isNotEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                          child: RankingPodium(
                            topThree: rankingState.rankings.take(3).toList(),
                          ),
                        ),
                      ),

                    // List of courses (Rank 4+) or all list items if we prefer.
                    // We'll show Rank 4 and above in the list, but if they want the whole list, we can show it here
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            // index starts from 3 because index 0, 1, 2 are in the podium
                            final actualIndex = index + 3;
                            if (actualIndex >= rankingState.rankings.length) return null;

                            final item = rankingState.rankings[actualIndex];
                            return _buildRankingListItem(item, actualIndex + 1);
                          },
                          childCount: rankingState.rankings.length > 3
                              ? rankingState.rankings.length - 3
                              : 0,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankingListItem(dynamic item, int rank) {
    final courseName = (item['course'] ?? item['name'] ?? item['code'] ?? 'Course').toString();
    final points = double.tryParse((item['points'] ?? item['totalPoints'] ?? item['total_points'] ?? 0).toString()) ?? 0.0;
    final students = item['studentsCount'] ?? item['studentCount'] ?? item['students'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
      ),
      child: Row(
        children: [
          // Rank Circle
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(
              rank.toString(),
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 14,
                color: AppTheme.textDark,
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Course info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  courseName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: AppTheme.textDark,
                  ),
                ),
                if (students > 0)
                  Text(
                    '$students students recycling',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                  ),
              ],
            ),
          ),

          // Points
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.primaryEmerald.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '${points.toStringAsFixed(0)} pts',
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: AppTheme.primaryEmerald,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class RankingPodium extends StatelessWidget {
  final List<dynamic> topThree;
  const RankingPodium({super.key, required this.topThree});

  @override
  Widget build(BuildContext context) {
    if (topThree.isEmpty) return const SizedBox.shrink();

    final gold = topThree[0];
    final silver = topThree.length > 1 ? topThree[1] : null;
    final bronze = topThree.length > 2 ? topThree[2] : null;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Silver (2nd)
          if (silver != null)
            Expanded(
              child: _buildPodiumItem(
                context,
                silver,
                2,
                110,
                const Color(0xFF94A3B8),
                const Color(0xFFF1F5F9),
              ),
            )
          else
            const Expanded(child: SizedBox.shrink()),
          const SizedBox(width: 8),

          // Gold (1st)
          Expanded(
            child: _buildPodiumItem(
              context,
              gold,
              1,
              135,
              const Color(0xFFF59E0B),
              const Color(0xFFFEF3C7),
            ),
          ),
          const SizedBox(width: 8),

          // Bronze (3rd)
          if (bronze != null)
            Expanded(
              child: _buildPodiumItem(
                context,
                bronze,
                3,
                95,
                const Color(0xFFB45309),
                const Color(0xFFFFEDD5),
              ),
            )
          else
            const Expanded(child: SizedBox.shrink()),
        ],
      ),
    );
  }

  Widget _buildPodiumItem(
    BuildContext context,
    dynamic item,
    int rank,
    double height,
    Color trophyColor,
    Color bgColor,
  ) {
    final courseName = (item['course'] ?? item['name'] ?? item['code'] ?? 'Course').toString();
    final points = double.tryParse((item['points'] ?? item['totalPoints'] ?? item['total_points'] ?? 0).toString()) ?? 0.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.emoji_events_rounded,
          color: trophyColor,
          size: rank == 1 ? 44 : 32,
        ),
        const SizedBox(height: 6),
        Container(
          height: height,
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [bgColor, Colors.white],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: trophyColor.withOpacity(0.3), width: 1.5),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: rank == 1 ? 14 : 11,
                  backgroundColor: trophyColor,
                  child: Text(
                    rank.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  courseName,
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: rank == 1 ? 14 : 12,
                    color: AppTheme.textDark,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${points.toStringAsFixed(0)} pts',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: rank == 1 ? 11 : 9,
                    color: AppTheme.primaryEmerald,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
