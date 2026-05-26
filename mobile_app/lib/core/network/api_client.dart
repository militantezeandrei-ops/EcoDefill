import 'dart:async';
import 'package:dio/dio.dart';
import 'package:ecodefill_mobile/core/storage/secure_storage.dart';

class ApiClient {
  ApiClient._privateConstructor() {
    _dio = Dio(
      BaseOptions(
        baseUrl: 'https://eco-defill.vercel.app',
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorage.instance.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            // Unauthorized - Clear secure storage
            await SecureStorage.instance.clearAuth();
            _logoutController.add(true);
          }
          return handler.next(error);
        },
      ),
    );
  }

  static final ApiClient instance = ApiClient._privateConstructor();
  late final Dio _dio;

  // Stream to listen to logout triggers (e.g. invalid JWT redirect to login screen)
  final _logoutController = StreamController<bool>.broadcast();
  Stream<bool> get logoutStream => _logoutController.stream;

  Dio get dio => _dio;

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get<T>(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }

  Future<Response<T>> post<T>(String path, {dynamic data}) async {
    try {
      return await _dio.post<T>(path, data: data);
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }

  Exception _parseError(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return Exception('Server connection timed out. Please try again.');
    }
    if (error.type == DioExceptionType.connectionError) {
      return Exception('No internet connection. Please check your network.');
    }

    String message = 'API Request Failed (${error.response?.statusCode})';
    final data = error.response?.data;
    if (data is Map) {
      message = data['message'] ?? data['error'] ?? message;
    } else if (data is String && data.isNotEmpty) {
      if (data.length < 100) {
        message = data;
      }
    }

    return Exception(message);
  }
}
