import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/features/shell/providers/shell_provider.dart';
import 'package:ecodefill_mobile/features/dashboard/screens/dashboard_screen.dart';
import 'package:ecodefill_mobile/features/rewards/screens/rewards_guide_screen.dart';
import 'package:ecodefill_mobile/features/history/screens/history_screen.dart';
import 'package:ecodefill_mobile/features/ranking/screens/ranking_screen.dart';
import 'package:ecodefill_mobile/features/profile/screens/profile_screen.dart';

class ShellLayout extends ConsumerWidget {
  const ShellLayout({super.key});

  static const List<Widget> _screens = [
    DashboardScreen(),
    RewardsGuideScreen(),
    HistoryScreen(),
    RankingScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(shellNavigationProvider);

    return Scaffold(
      extendBody: true, // Allows background content to flow under the floating bottom navigation bar
      body: IndexedStack(
        index: currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        color: Colors.transparent,
        padding: const EdgeInsets.only(bottom: 16.0),
        child: SafeArea(
          top: false,
          child: Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white, // White-colored dynamic island
              borderRadius: BorderRadius.circular(32),
              border: Border.all(
                color: const Color(0xFFE2E8F0),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 24,
                  spreadRadius: 2,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(ref, 0, Icons.home_rounded, Icons.home_rounded, 'Home', currentIndex),
                _buildNavItem(ref, 1, Icons.stars_rounded, Icons.stars_rounded, 'Rewards', currentIndex),
                _buildNavItem(ref, 2, Icons.history_rounded, Icons.history_rounded, 'History', currentIndex),
                _buildNavItem(ref, 3, Icons.leaderboard_rounded, Icons.leaderboard_rounded, 'Ranking', currentIndex),
                _buildNavItem(ref, 4, Icons.person_rounded, Icons.person_rounded, 'Profile', currentIndex),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(WidgetRef ref, int index, IconData unselectedIcon, IconData selectedIcon, String label, int currentIndex) {
    final isSelected = currentIndex == index;
    return GestureDetector(
      onTap: () {
        ref.read(shellNavigationProvider.notifier).state = index;
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryEmerald.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? selectedIcon : unselectedIcon,
              color: isSelected ? AppTheme.primaryEmerald : const Color(0xFF94A3B8), // slate-400 for contrast on white background
              size: 22,
            ),
            if (isSelected) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: AppTheme.primaryEmerald,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
