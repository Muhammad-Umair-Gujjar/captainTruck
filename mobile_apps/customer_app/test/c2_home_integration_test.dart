import 'dart:convert';

import 'package:customer_app/app.dart';
import 'package:customer_app/core/auth/token_storage.dart';
import 'package:customer_app/core/network/api_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('authenticated home loads profile + truck types', (tester) async {
    final storage = MemoryTokenStorage();
    await storage.saveTokens(
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    );

    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    dio.httpClientAdapter = _SessionAdapter();

    await tester.pumpWidget(
      CaptainTruckCustomerApp(
        apiClient: ApiClient(dio: dio, tokenStorage: storage),
        tokenStorage: storage,
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();

    expect(find.textContaining('Hi, Test Customer'), findsOneWidget);
    expect(find.text('Edit profile'), findsOneWidget);
    expect(find.text('Small Truck'), findsOneWidget);
    expect(find.textContaining('PKR'), findsWidgets);

    await tester.tap(find.text('Edit profile'));
    await tester.pumpAndSettle();

    expect(find.text('My profile'), findsOneWidget);
    expect(find.text('Save profile'), findsOneWidget);
  });
}

class _SessionAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final path = options.path;

    if (options.method == 'POST' && path.contains('/auth/refresh')) {
      return _ok({
        'success': true,
        'data': {
          'accessToken': 'access-token',
          'refreshToken': 'refresh-token',
          'user': {
            'id': 'u1',
            'email': 'test@example.com',
            'fullName': 'Test Customer',
            'role': 'CUSTOMER',
            'status': 'ACTIVE',
            'phone': '+923001234567',
          },
        },
      });
    }

    if (options.method == 'GET' && path.contains('/truck-types')) {
      return _ok({
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
      });
    }

    if (options.method == 'GET' && path.contains('/users/me')) {
      return _ok({
        'success': true,
        'data': {
          'id': 'u1',
          'email': 'test@example.com',
          'fullName': 'Test Customer',
          'role': 'CUSTOMER',
          'status': 'ACTIVE',
          'phone': '+923001234567',
        },
      });
    }

    throw DioException(
      requestOptions: options,
      type: DioExceptionType.badResponse,
      message: 'unmapped ${options.method} $path',
    );
  }

  ResponseBody _ok(Map<String, dynamic> body) {
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
