import 'package:hive_flutter/hive_flutter.dart';

class LocalCache {
  LocalCache._privateConstructor();
  static final LocalCache instance = LocalCache._privateConstructor();

  static const String _boxName = 'ecodefill_cache';
  
  static const String _keyBalance = 'user_balance';
  static const String _keyFullName = 'user_fullname';
  static const String _keyDailyEarned = 'user_daily_earned';
  static const String _keyDailyRedeemed = 'user_daily_redeemed';
  static const String _keyTransactions = 'user_transactions';
  static const String _keyRanking = 'course_rankings';
  static const String _keyCourse = 'user_course';
  static const String _keySection = 'user_section';
  static const String _keyYearLevel = 'user_yearlevel';
  static const String _keyHasSeenGuide = 'user_has_seen_guide';

  Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(_boxName);
  }

  Box get _box => Hive.box(_boxName);

  Future<void> cacheDashboardData({
    required double balance,
    required String fullName,
    required double dailyEarned,
    required double dailyRedeemed,
    String? course,
    String? section,
    String? yearLevel,
  }) async {
    await _box.put(_keyBalance, balance);
    await _box.put(_keyFullName, fullName);
    await _box.put(_keyDailyEarned, dailyEarned);
    await _box.put(_keyDailyRedeemed, dailyRedeemed);
    if (course != null) await _box.put(_keyCourse, course);
    if (section != null) await _box.put(_keySection, section);
    if (yearLevel != null) await _box.put(_keyYearLevel, yearLevel);
  }

  double getCachedBalance() {
    return _box.get(_keyBalance, defaultValue: 0.0) as double;
  }

  String getCachedFullName() {
    return _box.get(_keyFullName, defaultValue: 'Student') as String;
  }

  double getCachedDailyEarned() {
    return _box.get(_keyDailyEarned, defaultValue: 0.0) as double;
  }

  double getCachedDailyRedeemed() {
    return _box.get(_keyDailyRedeemed, defaultValue: 0.0) as double;
  }

  String? getCachedCourse() {
    return _box.get(_keyCourse) as String?;
  }

  String? getCachedSection() {
    return _box.get(_keySection) as String?;
  }

  String? getCachedYearLevel() {
    return _box.get(_keyYearLevel) as String?;
  }

  Future<void> cacheTransactions(List<dynamic> txs) async {
    await _box.put(_keyTransactions, txs);
  }

  List<dynamic> getCachedTransactions() {
    return _box.get(_keyTransactions, defaultValue: []) as List<dynamic>;
  }

  Future<void> cacheRankings(List<dynamic> rankings) async {
    await _box.put(_keyRanking, rankings);
  }

  List<dynamic> getCachedRankings() {
    return _box.get(_keyRanking, defaultValue: []) as List<dynamic>;
  }

  Future<void> cacheHasSeenGuide(bool hasSeen) async {
    await _box.put(_keyHasSeenGuide, hasSeen);
  }

  bool getCachedHasSeenGuide() {
    return _box.get(_keyHasSeenGuide, defaultValue: false) as bool;
  }

  Future<void> clearCache() async {
    await _box.clear();
  }
}
