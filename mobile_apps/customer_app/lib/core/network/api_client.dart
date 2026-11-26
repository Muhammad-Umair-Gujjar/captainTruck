import 'dart:async';

import 'package:dio/dio.dart';

import '../auth/token_storage.dart';
import '../config/app_config.dart';
import 'api_envelope.dart';
import 'api_exception.dart';

typedef RefreshHandler = Future<bool> Function();

class ApiClient {
  ApiClient({
    Dio? dio,
    this.tokenStorage,
    RefreshHandler? onRefresh,
  }) : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: AppConfig.apiRoot,
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 20),
                headers: const {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
              ),
            ) {
    _onRefresh = onRefresh;
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await tokenStorage?.readAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          final alreadyRetried =
              error.requestOptions.extra['authRetried'] == true;
          if (status == 401 &&
              !alreadyRetried &&
              _onRefresh != null &&
              !_isAuthPath(error.requestOptions.path)) {
            final ok = await _refreshLock.synchronized(() async {
              return _onRefresh!.call();
            });
            if (ok) {
              final req = error.requestOptions;
              req.extra['authRetried'] = true;
              final token = await tokenStorage?.readAccessToken();
              if (token != null) {
                req.headers['Authorization'] = 'Bearer $token';
              }
              try {
                final response = await _dio.fetch(req);
                return handler.resolve(response);
              } catch (_) {
                // fall through
              }
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStorage? tokenStorage;
  RefreshHandler? _onRefresh;
  final _RefreshLock _refreshLock = _RefreshLock();

  Dio get dio => _dio;

  void setRefreshHandler(RefreshHandler handler) {
    _onRefresh = handler;
  }

  bool _isAuthPath(String path) {
    return path.contains('/auth/login') ||
        path.contains('/auth/register') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/logout');
  }

  Future<ApiEnvelope<T>> getEnvelope<T>(
    String path, {
    T Function(Object? raw)? parseData,
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: query,
      );
      return _parse(response, parseData);
    } on DioException catch (e) {
      throw _mapDio(e);
    }
  }

  Future<ApiEnvelope<T>> postEnvelope<T>(
    String path, {
    Object? data,
    T Function(Object? raw)? parseData,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(path, data: data);
      return _parse(response, parseData);
    } on DioException catch (e) {
      throw _mapDio(e);
    }
  }

  ApiEnvelope<T> _parse<T>(
    Response<Map<String, dynamic>> response,
    T Function(Object? raw)? parseData,
  ) {
    final body = response.data;
    if (body == null) {
      throw const ApiException(
        code: 'EMPTY_BODY',
        message: 'Empty response body',
      );
    }
    final envelope = ApiEnvelope.fromJson(body, parseData);
    if (!envelope.success) {
      throw ApiException(
        code: envelope.error?.code ?? 'REQUEST_FAILED',
        message: envelope.error?.message ?? 'Request failed',
        statusCode: response.statusCode,
      );
    }
    return envelope;
  }

  Exception _mapDio(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      final err = Map<String, dynamic>.from(data['error'] as Map);
      return ApiException(
        code: (err['code'] ?? 'HTTP_ERROR').toString(),
        message: (err['message'] ?? e.message ?? 'Request failed').toString(),
        statusCode: e.response?.statusCode,
      );
    }
    return ApiException(
      code: 'NETWORK',
      message: e.message ?? 'Network error',
      statusCode: e.response?.statusCode,
    );
  }
}

class _RefreshLock {
  Future<void>? _pending;

  Future<T> synchronized<T>(Future<T> Function() action) async {
    while (_pending != null) {
      try {
        await _pending;
      } catch (_) {}
    }
    final completer = Completer<void>();
    _pending = completer.future;
    try {
      return await action();
    } finally {
      completer.complete();
      _pending = null;
    }
  }
}
