import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  SecureStorage._privateConstructor();
  static final SecureStorage instance = SecureStorage._privateConstructor();

  final _storage = const FlutterSecureStorage();

  static const _keyToken = 'jwt_token';
  static const _keyUserId = 'user_id';
  static const _keyUserEmail = 'user_email';
  static const _keyUserRole = 'user_role';

  Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  Future<void> saveUserData({
    required String userId,
    required String email,
    required String role,
  }) async {
    await _storage.write(key: _keyUserId, value: userId);
    await _storage.write(key: _keyUserEmail, value: email);
    await _storage.write(key: _keyUserRole, value: role);
  }

  Future<Map<String, String?>> getUserData() async {
    return {
      'id': await _storage.read(key: _keyUserId),
      'email': await _storage.read(key: _keyUserEmail),
      'role': await _storage.read(key: _keyUserRole),
    };
  }

  Future<void> clearAuth() async {
    await _storage.delete(key: _keyToken);
    await _storage.delete(key: _keyUserId);
    await _storage.delete(key: _keyUserEmail);
    await _storage.delete(key: _keyUserRole);
  }
}
