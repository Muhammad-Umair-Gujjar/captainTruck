import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:driver_app/features/health/data/health_repository.dart';
import 'package:driver_app/features/health/presentation/bloc/health_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('HealthRepository parses /health envelope', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/health'] = {
      'success': true,
      'data': {
        'status': 'ok',
        'phase': 16,
        'database': 'up',
        'uptimeSeconds': 12,
      },
    };

    final repo = HealthRepository(ApiClient(dio: dio));
    final health = await repo.fetchHealth();
    expect(health.status, 'ok');
    expect(health.database, 'up');
    expect(health.uptimeSeconds, 12);
  });

  test('HealthBloc success path', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/health'] = {
      'success': true,
      'data': {'status': 'ok', 'database': 'up'},
    };
    final bloc = HealthBloc(HealthRepository(ApiClient(dio: dio)));
    bloc.add(const HealthRequested());
    await expectLater(
      bloc.stream,
      emitsInOrder([
        isA<HealthState>().having(
          (s) => s.status,
          'status',
          HealthStatus.loading,
        ),
        isA<HealthState>()
            .having((s) => s.status, 'status', HealthStatus.success)
            .having((s) => s.data?.status, 'health', 'ok'),
      ]),
    );
    await bloc.close();
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.method == 'GET' && onGet.containsKey(options.path)) {
      return ResponseBody.fromString(
        jsonEncode(onGet[options.path]),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    }
    throw DioException(
      requestOptions: options,
      message: 'unmapped ${options.method} ${options.path}',
    );
  }
}
