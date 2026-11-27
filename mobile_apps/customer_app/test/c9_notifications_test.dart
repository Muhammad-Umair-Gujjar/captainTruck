import 'dart:convert';

import 'package:bloc_test/bloc_test.dart';
import 'package:customer_app/core/network/api_client.dart';
import 'package:customer_app/features/auth/data/auth_models.dart';
import 'package:customer_app/features/auth/data/auth_repository.dart';
import 'package:customer_app/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:customer_app/features/notifications/data/device_push_token_source.dart';
import 'package:customer_app/features/notifications/data/notification_models.dart';
import 'package:customer_app/features/notifications/data/notifications_repository.dart';
import 'package:customer_app/features/notifications/data/push_sync_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepo extends Mock implements AuthRepository {}

void main() {
  const fakeToken = 'fake-fcm-token-xxxxxxxxxxxxxxxxxxxx';

  test('NotificationsRepository register + unregister + status', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;

    adapter.onGet['/notifications/status'] = {
      'success': true,
      'data': {'configured': true},
    };
    adapter.onPost['/notifications/tokens'] = {
      'success': true,
      'data': {'registered': true, 'tokenCount': 1},
    };
    adapter.onDelete['/notifications/tokens'] = {
      'success': true,
      'data': {'registered': false, 'tokenCount': 0},
    };
    adapter.onGet['/notifications/tokens'] = {
      'success': true,
      'data': {
        'tokens': [fakeToken],
        'tokenCount': 1,
      },
    };

    final repo = NotificationsRepository(ApiClient(dio: dio));
    final status = await repo.status();
    expect(status.configured, isTrue);

    final registered = await repo.registerToken(fakeToken);
    expect(registered.registered, isTrue);
    expect(adapter.lastPostBody?['token'], fakeToken);

    final listed = await repo.listTokens();
    expect(listed, [fakeToken]);

    final unregistered = await repo.unregisterToken(fakeToken);
    expect(unregistered.registered, isFalse);
    expect(adapter.lastDeleteBody?['token'], fakeToken);
  });

  test('PushSyncService start registers and stop unregisters', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/notifications/status'] = {
      'success': true,
      'data': {'configured': false},
    };
    adapter.onPost['/notifications/tokens'] = {
      'success': true,
      'data': {'registered': true, 'tokenCount': 1},
    };
    adapter.onDelete['/notifications/tokens'] = {
      'success': true,
      'data': {'registered': false, 'tokenCount': 0},
    };

    final tokens = FakeDevicePushTokenSource(token: fakeToken);
    final sync = PushSyncService(
      repository: NotificationsRepository(ApiClient(dio: dio)),
      tokenSource: tokens,
    );

    await sync.start();
    expect(sync.status, PushSyncStatus.registered);
    expect(sync.registeredToken, fakeToken);
    expect(sync.serverConfigured, isFalse);
    expect(adapter.postCount['/notifications/tokens'], 1);

    await sync.stop();
    expect(sync.status, PushSyncStatus.idle);
    expect(sync.registeredToken, isNull);
    expect(adapter.deleteCount['/notifications/tokens'], 1);

    await sync.dispose();
  });

  test('PushSyncService refreshes token with Nest', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/notifications/status'] = {
      'success': true,
      'data': {'configured': true},
    };
    adapter.onPost['/notifications/tokens'] = {
      'success': true,
      'data': {'registered': true, 'tokenCount': 1},
    };
    adapter.onDelete['/notifications/tokens'] = {
      'success': true,
      'data': {'registered': false, 'tokenCount': 0},
    };

    final tokens = FakeDevicePushTokenSource(token: fakeToken);
    final sync = PushSyncService(
      repository: NotificationsRepository(ApiClient(dio: dio)),
      tokenSource: tokens,
    );

    await sync.start();
    const next = 'fake-fcm-token-yyyyyyyyyyyyyyyyyyyy';
    tokens.emitRefresh(next);
    await Future<void>.delayed(const Duration(milliseconds: 50));
    expect(sync.registeredToken, next);
    expect(adapter.deleteCount['/notifications/tokens'], greaterThanOrEqualTo(1));
    expect(adapter.postCount['/notifications/tokens'], greaterThanOrEqualTo(2));

    await sync.dispose();
  });

  group('AuthBloc push hooks', () {
    late _MockAuthRepo repo;
    late FakeDevicePushTokenSource tokens;
    late _JsonAdapter adapter;
    late PushSyncService push;

    setUp(() {
      repo = _MockAuthRepo();
      tokens = FakeDevicePushTokenSource(token: fakeToken);
      final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
      adapter = _JsonAdapter();
      dio.httpClientAdapter = adapter;
      adapter.onGet['/notifications/status'] = {
        'success': true,
        'data': {'configured': true},
      };
      adapter.onPost['/notifications/tokens'] = {
        'success': true,
        'data': {'registered': true, 'tokenCount': 1},
      };
      adapter.onDelete['/notifications/tokens'] = {
        'success': true,
        'data': {'registered': false, 'tokenCount': 0},
      };
      push = PushSyncService(
        repository: NotificationsRepository(ApiClient(dio: dio)),
        tokenSource: tokens,
      );
    });

    blocTest<AuthBloc, AuthState>(
      'login starts push sync',
      build: () {
        when(
          () => repo.login(email: any(named: 'email'), password: any(named: 'password')),
        ).thenAnswer(
          (_) async => AuthSession(
            accessToken: 'a',
            refreshToken: 'r',
            user: const AuthUser(
              id: 'u1',
              email: 'c@test.com',
              fullName: 'Cust',
              role: 'CUSTOMER',
              status: 'ACTIVE',
            ),
          ),
        );
        return AuthBloc(repo, pushSync: push);
      },
      act: (bloc) => bloc.add(
        const AuthLoginSubmitted(email: 'c@test.com', password: 'secret12'),
      ),
      wait: const Duration(milliseconds: 100),
      expect: () => [
        isA<AuthState>().having((s) => s.busy, 'busy', true),
        isA<AuthState>().having(
          (s) => s.status,
          'status',
          AuthStatus.authenticated,
        ),
      ],
      verify: (_) {
        expect(push.status, PushSyncStatus.registered);
        expect(adapter.postCount['/notifications/tokens'], 1);
      },
    );

    test('logout unregisters push before clearing session', () async {
      when(() => repo.logout()).thenAnswer((_) async {});
      await push.start();
      expect(push.status, PushSyncStatus.registered);

      final bloc = AuthBloc(repo, pushSync: push);
      bloc.emit(
        const AuthState(
          status: AuthStatus.authenticated,
          user: AuthUser(
            id: 'u1',
            email: 'c@test.com',
            fullName: 'Cust',
            role: 'CUSTOMER',
            status: 'ACTIVE',
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
      expect(push.status, PushSyncStatus.idle);
      expect(adapter.deleteCount['/notifications/tokens'], 1);
      verify(() => repo.logout()).called(1);
      await bloc.close();
    });
  });

  test('PushMessageLite carries title body data', () {
    const msg = PushMessageLite(
      title: 'Trip',
      body: 'Driver assigned',
      data: {'type': 'ASSIGNED'},
    );
    expect(msg.title, 'Trip');
    expect(msg.data['type'], 'ASSIGNED');
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};
  final Map<String, Map<String, dynamic>> onPost = {};
  final Map<String, Map<String, dynamic>> onDelete = {};
  final Map<String, int> postCount = {};
  final Map<String, int> deleteCount = {};
  Map<String, dynamic>? lastPostBody;
  Map<String, dynamic>? lastDeleteBody;

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
      if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
      return null;
    }

    if (options.method == 'GET' && onGet.containsKey(options.path)) {
      return _ok(onGet[options.path]!);
    }
    if (options.method == 'POST' && onPost.containsKey(options.path)) {
      lastPostBody = bodyFromOptions();
      postCount[options.path] = (postCount[options.path] ?? 0) + 1;
      return _ok(onPost[options.path]!, status: 201);
    }
    if (options.method == 'DELETE' && onDelete.containsKey(options.path)) {
      lastDeleteBody = bodyFromOptions();
      deleteCount[options.path] = (deleteCount[options.path] ?? 0) + 1;
      return _ok(onDelete[options.path]!);
    }
    throw DioException(
      requestOptions: options,
      message: 'unmapped ${options.method} ${options.path}',
    );
  }

  ResponseBody _ok(Map<String, dynamic> body, {int status = 200}) {
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
