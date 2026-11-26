import 'dart:convert';

import 'package:customer_app/core/network/api_client.dart';
import 'package:customer_app/features/profile/data/profile_repository.dart';
import 'package:customer_app/features/truck_types/data/truck_types_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Dio dio;
  late _MapAdapter adapter;
  late ApiClient client;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    adapter = _MapAdapter();
    dio.httpClientAdapter = adapter;
    client = ApiClient(dio: dio);
  });

  test('ProfileRepository fetchMe + updateMe', () async {
    adapter.onGet['/users/me'] = {
      'success': true,
      'data': {
        'id': 'u1',
        'email': 'c@example.com',
        'fullName': 'Customer One',
        'role': 'CUSTOMER',
        'status': 'ACTIVE',
        'phone': '+923001112223',
      },
    };
    adapter.onPatch['/users/me'] = {
      'success': true,
      'data': {
        'id': 'u1',
        'email': 'new@example.com',
        'fullName': 'Customer Two',
        'role': 'CUSTOMER',
        'status': 'ACTIVE',
        'phone': '+923009998887',
      },
    };

    final repo = ProfileRepository(client);
    final me = await repo.fetchMe();
    expect(me.fullName, 'Customer One');

    final updated = await repo.updateMe(
      fullName: 'Customer Two',
      email: 'new@example.com',
      phone: '+923009998887',
    );
    expect(updated.email, 'new@example.com');
    expect(adapter.lastPatchBody?['fullName'], 'Customer Two');
  });

  test('TruckTypesRepository listActive parses rates', () async {
    adapter.onGet['/truck-types'] = {
      'success': true,
      'data': [
        {
          'id': 't1',
          'code': 'SMALL',
          'name': 'Small Truck',
          'capacity': '1 ton',
          'isActive': true,
          'currentRateCents': 150000,
          'currentRateEffectiveFrom': '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    final repo = TruckTypesRepository(client);
    final items = await repo.listActive();
    expect(items, hasLength(1));
    expect(items.first.code, 'SMALL');
    expect(items.first.currentRateCents, 150000);
  });
}

class _MapAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};
  final Map<String, Map<String, dynamic>> onPatch = {};
  Map<String, dynamic>? lastPatchBody;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final path = options.path;
    if (options.method == 'GET' && onGet.containsKey(path)) {
      return _json(onGet[path]!);
    }
    if (options.method == 'PATCH' && onPatch.containsKey(path)) {
      if (requestStream != null) {
        final chunks = await requestStream.toList();
        final bytes = chunks.expand((e) => e).toList();
        if (bytes.isNotEmpty) {
          lastPatchBody =
              jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
        }
      }
      return _json(onPatch[path]!);
    }
    throw DioException(
      requestOptions: options,
      type: DioExceptionType.badResponse,
      message: 'unmapped ${options.method} $path',
    );
  }

  ResponseBody _json(Map<String, dynamic> body) {
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
