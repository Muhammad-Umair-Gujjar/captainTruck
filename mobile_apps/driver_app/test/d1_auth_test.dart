import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:driver_app/core/auth/token_storage.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:driver_app/core/network/api_exception.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late MemoryTokenStorage storage;
  late _JsonAdapter adapter;
  late AuthRepository repo;

  setUp(() {
    storage = MemoryTokenStorage();
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    repo = AuthRepository(
      client: ApiClient(dio: dio, tokenStorage: storage),
      tokenStorage: storage,
    );
  });

  Map<String, dynamic> session({
    String role = 'DRIVER',
    String email = 'driver@test.com',
  }) {
    return {
      'success': true,
      'data': {
        'accessToken': 'access-token-xxxxxxxxxxxx',
        'refreshToken': 'refresh-token-xxxxxxxxxxxx',
        'user': {
          'id': 'd1',
          'email': email,
          'fullName': 'Driver One',
          'role': role,
          'status': 'ACTIVE',
          'phone': '+92000',
        },
      },
    };
  }

  test('login accepts DRIVER and stores tokens', () async {
    adapter.onPost['/auth/login'] = session();
    final s = await repo.login(email: 'driver@test.com', password: 'secret12');
    expect(s.user.isDriver, isTrue);
    expect(await storage.readAccessToken(), 'access-token-xxxxxxxxxxxx');
    expect(adapter.lastPostBody?['email'], 'driver@test.com');
  });

  test('login rejects CUSTOMER role', () async {
    adapter.onPost['/auth/login'] = session(role: 'CUSTOMER');
    expect(
      () => repo.login(email: 'c@test.com', password: 'secret12'),
      throwsA(
        isA<ApiException>().having((e) => e.code, 'code', 'ROLE_FORBIDDEN'),
      ),
    );
    expect(await storage.readAccessToken(), isNull);
  });

  test('login rejects ADMIN role', () async {
    adapter.onPost['/auth/login'] = session(role: 'ADMIN');
    expect(
      () => repo.login(email: 'a@test.com', password: 'secret12'),
      throwsA(isA<ApiException>()),
    );
  });

  test('refresh restores driver session', () async {
    await storage.saveTokens(
      accessToken: 'old',
      refreshToken: 'refresh-token-xxxxxxxxxxxx',
    );
    adapter.onPost['/auth/refresh'] = session();
    final s = await repo.restoreSession();
    expect(s?.user.role, 'DRIVER');
    expect(await storage.readAccessToken(), 'access-token-xxxxxxxxxxxx');
  });

  test('logout clears tokens', () async {
    await storage.saveTokens(
      accessToken: 'a',
      refreshToken: 'refresh-token-xxxxxxxxxxxx',
    );
    adapter.onPost['/auth/logout'] = {'success': true, 'data': null};
    await repo.logout();
    expect(await storage.readAccessToken(), isNull);
    expect(await storage.readRefreshToken(), isNull);
  });

  test('AuthBloc login then logout', () async {
    adapter.onPost['/auth/login'] = session();
    adapter.onPost['/auth/logout'] = {'success': true, 'data': null};

    final bloc = AuthBloc(repo);
    bloc.add(
      const AuthLoginSubmitted(email: 'driver@test.com', password: 'secret12'),
    );
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<AuthState>().having(
          (s) => s.status,
          'status',
          AuthStatus.authenticated,
        ),
      ),
    );

    bloc.add(const AuthLogoutRequested());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<AuthState>().having(
          (s) => s.status,
          'status',
          AuthStatus.unauthenticated,
        ),
      ),
    );
    expect(await storage.readAccessToken(), isNull);
    await bloc.close();
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onPost = {};
  Map<String, dynamic>? lastPostBody;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    Map<String, dynamic>? bodyFromOptions() {
      final data = options.data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return null;
    }

    if (options.method == 'POST' && onPost.containsKey(options.path)) {
      lastPostBody = bodyFromOptions();
      return ResponseBody.fromString(
        jsonEncode(onPost[options.path]),
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
