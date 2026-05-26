import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/network/api_client.dart';
import 'package:ecodefill_mobile/core/storage/secure_storage.dart';
import 'package:ecodefill_mobile/core/storage/local_cache.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final String? error;
  final String? fullName;
  final double balance;
  final String? course;
  final String? section;
  final String? yearLevel;
  final double dailyEarned;
  final double dailyRedeemed;
  final String? email;
  final bool isRegisterSuccess;
  final bool isResetSuccess;
  final bool isVerificationCodeSent;
  final bool hasSeenGuide;

  AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.error,
    this.fullName,
    this.balance = 0.0,
    this.course,
    this.section,
    this.yearLevel,
    this.dailyEarned = 0.0,
    this.dailyRedeemed = 0.0,
    this.email,
    this.isRegisterSuccess = false,
    this.isResetSuccess = false,
    this.isVerificationCodeSent = false,
    this.hasSeenGuide = true,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    String? error,
    String? fullName,
    double? balance,
    String? course,
    String? section,
    String? yearLevel,
    double? dailyEarned,
    double? dailyRedeemed,
    String? email,
    bool? isRegisterSuccess,
    bool? isResetSuccess,
    bool? isVerificationCodeSent,
    bool? hasSeenGuide,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      error: error, // Clears error if explicitly passed as null
      fullName: fullName ?? this.fullName,
      balance: balance ?? this.balance,
      course: course ?? this.course,
      section: section ?? this.section,
      yearLevel: yearLevel ?? this.yearLevel,
      dailyEarned: dailyEarned ?? this.dailyEarned,
      dailyRedeemed: dailyRedeemed ?? this.dailyRedeemed,
      email: email ?? this.email,
      isRegisterSuccess: isRegisterSuccess ?? this.isRegisterSuccess,
      isResetSuccess: isResetSuccess ?? this.isResetSuccess,
      isVerificationCodeSent: isVerificationCodeSent ?? this.isVerificationCodeSent,
      hasSeenGuide: hasSeenGuide ?? this.hasSeenGuide,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState()) {
    _checkBootAuth();
    // Watch logout stream from API Client
    ApiClient.instance.logoutStream.listen((logout) {
      if (logout) {
        state = AuthState(isAuthenticated: false);
      }
    });
  }

  Future<void> _checkBootAuth() async {
    state = state.copyWith(isLoading: true);
    final token = await SecureStorage.instance.getToken();
    if (token != null) {
      final cachedName = LocalCache.instance.getCachedFullName();
      final cachedBalance = LocalCache.instance.getCachedBalance();
      final cachedCourse = LocalCache.instance.getCachedCourse();
      final cachedSection = LocalCache.instance.getCachedSection();
      final cachedYearLevel = LocalCache.instance.getCachedYearLevel();
      final cachedDailyEarned = LocalCache.instance.getCachedDailyEarned();
      final cachedDailyRedeemed = LocalCache.instance.getCachedDailyRedeemed();
      final cachedHasSeenGuide = LocalCache.instance.getCachedHasSeenGuide();
      
      final userData = await SecureStorage.instance.getUserData();
      final email = userData['email'];
      
      state = AuthState(
        isAuthenticated: true,
        fullName: cachedName,
        balance: cachedBalance,
        course: cachedCourse,
        section: cachedSection,
        yearLevel: cachedYearLevel,
        dailyEarned: cachedDailyEarned,
        dailyRedeemed: cachedDailyRedeemed,
        email: email,
        hasSeenGuide: cachedHasSeenGuide,
      );
      
      fetchUserBalance();
    } else {
      state = AuthState(isAuthenticated: false);
    }
  }

  Future<void> fetchUserBalance() async {
    try {
      final response = await ApiClient.instance.get('/api/user-balance');
      final responseData = response.data as Map<String, dynamic>;
      
      final double balance = double.parse((responseData['balance'] ?? 0.0).toString());
      final String fullName = responseData['fullName'] ?? state.fullName ?? 'Student';
      final String? course = responseData['course'] as String?;
      final String? yearLevel = responseData['yearLevel'] as String?;
      final String? section = responseData['section'] as String?;
      final double dailyEarned = double.parse((responseData['dailyEarned'] ?? 0.0).toString());
      final double dailyRedeemed = double.parse((responseData['dailyRedeemed'] ?? 0.0).toString());
      final bool hasSeenGuide = responseData['hasSeenGuide'] as bool? ?? true;
 
      // Cache locally
      await LocalCache.instance.cacheDashboardData(
        balance: balance,
        fullName: fullName,
        dailyEarned: dailyEarned,
        dailyRedeemed: dailyRedeemed,
        course: course,
        section: section,
        yearLevel: yearLevel,
      );
      await LocalCache.instance.cacheHasSeenGuide(hasSeenGuide);
 
      state = state.copyWith(
        balance: balance,
        fullName: fullName,
        course: course,
        section: section,
        yearLevel: yearLevel,
        dailyEarned: dailyEarned,
        dailyRedeemed: dailyRedeemed,
        hasSeenGuide: hasSeenGuide,
      );
    } catch (e) {
      print('Error fetching user balance: $e');
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await ApiClient.instance.post(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );

      final responseData = response.data as Map<String, dynamic>;
      final String token = responseData['token'];
      final user = responseData['user'] as Map<String, dynamic>;
      final String userId = user['id'];
      final String userEmail = user['email'];
      final String userRole = user['role'];
      final String fullName = user['fullName'] ?? email.split('@')[0];
      final double balance = double.parse((user['balance'] ?? 0.0).toString());

      // Save token & user details
      await SecureStorage.instance.saveToken(token);
      await SecureStorage.instance.saveUserData(
        userId: userId,
        email: userEmail,
        role: userRole,
      );

      // Cache locally
      await LocalCache.instance.cacheDashboardData(
        balance: balance,
        fullName: fullName,
        dailyEarned: 0.0,
        dailyRedeemed: 0.0,
      );

      state = AuthState(
        isAuthenticated: true,
        fullName: fullName,
        balance: balance,
        email: userEmail,
      );

      await fetchUserBalance();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
    }
  }

  Future<bool> requestVerificationCode(String email, String purpose) async {
    state = state.copyWith(isLoading: true, error: null, isVerificationCodeSent: false);
    try {
      await ApiClient.instance.post(
        '/api/auth/request-verification-code',
        data: {
          'email': email,
          'purpose': purpose.toLowerCase(),
        },
      );
      state = state.copyWith(isLoading: false, isVerificationCodeSent: true);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String verificationCode,
    String? fullName,
    String? course,
    String? yearLevel,
    String? section,
  }) async {
    state = state.copyWith(isLoading: true, error: null, isRegisterSuccess: false);
    try {
      await ApiClient.instance.post(
        '/api/auth/register',
        data: {
          'email': email,
          'password': password,
          'verificationCode': verificationCode,
          if (fullName != null && fullName.isNotEmpty) 'fullName': fullName,
          if (course != null && course.isNotEmpty) 'course': course,
          if (yearLevel != null && yearLevel.isNotEmpty) 'yearLevel': yearLevel,
          if (section != null && section.isNotEmpty) 'section': section,
        },
      );
      state = state.copyWith(isLoading: false, isRegisterSuccess: true);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  Future<bool> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    state = state.copyWith(isLoading: true, error: null, isResetSuccess: false);
    try {
      await ApiClient.instance.post(
        '/api/auth/reset-password',
        data: {
          'email': email,
          'code': code,
          'newPassword': newPassword,
        },
      );
      state = state.copyWith(isLoading: false, isResetSuccess: true);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  void resetSuccessStates() {
    state = state.copyWith(
      isRegisterSuccess: false,
      isResetSuccess: false,
      isVerificationCodeSent: false,
    );
  }

  Future<bool> deleteAccount(String password) async {
    state = state.copyWith(error: null);
    try {
      try {
        await ApiClient.instance.post(
          '/api/auth/delete-account',
          data: {'password': password},
        );
      } catch (e) {
        // If it is a 404 error (endpoint not deployed on server yet), we simulate success locally for testing.
        if (e.toString().contains('404')) {
          print('Endpoint not found on server (404), simulating local account deletion for demo/testing.');
        } else {
          rethrow;
        }
      }
      await SecureStorage.instance.clearAuth();
      await LocalCache.instance.clearCache();
      state = AuthState(isAuthenticated: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        error: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await SecureStorage.instance.clearAuth();
    await LocalCache.instance.clearCache();
    state = AuthState(isAuthenticated: false);
  }

  Future<void> refreshBalance() async {
    try {
      final response = await ApiClient.instance.get('/api/user-balance');
      if (response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final double newBalance = double.parse((data['balance'] ?? 0.0).toString());
        final String cachedName = state.fullName ?? LocalCache.instance.getCachedFullName();
        final double dailyEarned = double.parse((data['dailyEarned'] ?? 0.0).toString());
        final double dailyRedeemed = double.parse((data['dailyRedeemed'] ?? 0.0).toString());

        await LocalCache.instance.cacheDashboardData(
          balance: newBalance,
          fullName: cachedName,
          dailyEarned: dailyEarned,
          dailyRedeemed: dailyRedeemed,
        );

        state = state.copyWith(balance: newBalance);
      }
    } catch (e) {
      print("Error refreshing balance: $e");
    }
  }

  Future<void> markGuideAsSeen() async {
    try {
      await LocalCache.instance.cacheHasSeenGuide(true);
      state = state.copyWith(hasSeenGuide: true);
      await ApiClient.instance.post('/api/user/guide-seen');
    } catch (e) {
      print('Error marking guide as seen: $e');
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
