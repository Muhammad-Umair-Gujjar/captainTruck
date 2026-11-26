import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'api_envelope.dart';

class ApiClient {
  ApiClient({Dio? dio})
      : _dio = dio ??
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
            );

  final Dio _dio;

  Dio get dio => _dio;

  Future<ApiEnvelope<T>> getEnvelope<T>(
    String path, {
    T Function(Object? raw)? parseData,
    Map<String, dynamic>? query,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      path,
      queryParameters: query,
    );
    final body = response.data;
    if (body == null) {
      throw DioException(
        requestOptions: response.requestOptions,
        message: 'Empty response body',
      );
    }
    return ApiEnvelope.fromJson(body, parseData);
  }
}
