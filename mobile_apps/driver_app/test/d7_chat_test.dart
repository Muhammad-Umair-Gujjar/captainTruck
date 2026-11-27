import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:driver_app/core/realtime/realtime_client.dart';
import 'package:driver_app/features/chat/data/chat_models.dart';
import 'package:driver_app/features/chat/data/chat_repository.dart';
import 'package:driver_app/features/chat/presentation/bloc/chat_thread_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ChatRepository open customer + admin + list + send', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;

    adapter.onPost['/chat/trips/t1/threads'] = {
      'success': true,
      'data': {
        'id': 'th1',
        'tripId': 't1',
        'type': 'DRIVER_CUSTOMER',
        'readOnly': false,
        'participants': [
          {'id': 'c1', 'fullName': 'Customer', 'role': 'CUSTOMER'},
          {'id': 'd1', 'fullName': 'Driver', 'role': 'DRIVER'},
        ],
        'trip': {'id': 't1', 'status': 'IN_TRANSIT', 'requestId': 'r1'},
      },
    };
    adapter.onGet['/chat/threads/th1/messages'] = {
      'success': true,
      'data': {
        'items': [
          {
            'id': 'm1',
            'threadId': 'th1',
            'senderId': 'c1',
            'type': 'TEXT',
            'body': 'Hello',
            'createdAt': '2026-11-27T00:00:00.000Z',
            'sender': {'id': 'c1', 'fullName': 'Customer', 'role': 'CUSTOMER'},
          },
        ],
        'meta': {
          'limit': 30,
          'nextCursor': null,
          'hasMore': false,
          'readOnly': false,
        },
      },
    };
    adapter.onPost['/chat/threads/th1/messages'] = {
      'success': true,
      'data': {
        'id': 'm2',
        'threadId': 'th1',
        'senderId': 'd1',
        'type': 'TEXT',
        'body': 'On my way',
        'createdAt': '2026-11-27T00:01:00.000Z',
        'sender': {'id': 'd1', 'fullName': 'Driver', 'role': 'DRIVER'},
      },
    };

    final repo = ChatRepository(ApiClient(dio: dio));
    final thread = await repo.openDriverCustomerThread('t1');
    expect(thread.id, 'th1');
    expect(adapter.lastPostBody?['type'], 'DRIVER_CUSTOMER');

    adapter.onPost['/chat/trips/t1/threads'] = {
      'success': true,
      'data': {
        'id': 'th-admin',
        'tripId': 't1',
        'type': 'DRIVER_ADMIN',
        'readOnly': false,
        'participants': [
          {'id': 'd1', 'fullName': 'Driver', 'role': 'DRIVER'},
        ],
      },
    };
    final admin = await repo.openDriverAdminThread('t1');
    expect(admin.id, 'th-admin');
    expect(adapter.lastPostBody?['type'], 'DRIVER_ADMIN');

    final page = await repo.listMessages('th1');
    expect(page.items, hasLength(1));
    expect(page.items.first.body, 'Hello');

    final sent = await repo.sendText('th1', 'On my way');
    expect(sent.body, 'On my way');
    expect(adapter.lastPostBody?['type'], 'TEXT');
  });

  test('ChatThreadBloc opens, receives socket, sends text', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onPost['/chat/trips/t1/threads'] = {
      'success': true,
      'data': {
        'id': 'th1',
        'tripId': 't1',
        'type': 'DRIVER_CUSTOMER',
        'readOnly': false,
      },
    };
    adapter.onGet['/chat/threads/th1/messages'] = {
      'success': true,
      'data': {
        'items': [
          {
            'id': 'm1',
            'threadId': 'th1',
            'senderId': 'c1',
            'type': 'TEXT',
            'body': 'Hi',
            'createdAt': '2026-11-27T00:00:00.000Z',
          },
        ],
        'meta': {'hasMore': false, 'readOnly': false},
      },
    };
    adapter.onPost['/chat/threads/th1/messages'] = {
      'success': true,
      'data': {
        'id': 'm2',
        'threadId': 'th1',
        'senderId': 'd1',
        'type': 'TEXT',
        'body': 'Ping',
        'createdAt': '2026-11-27T00:02:00.000Z',
      },
    };

    final realtime = FakeRealtimeClient();
    final bloc = ChatThreadBloc(
      repository: ChatRepository(ApiClient(dio: dio)),
      realtime: realtime,
      myUserId: 'd1',
      tripId: 't1',
      threadType: 'DRIVER_CUSTOMER',
    );

    bloc.add(const ChatThreadStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<ChatThreadState>()
            .having((s) => s.status, 's', ChatThreadStatus.ready)
            .having((s) => s.messages, 'msgs', hasLength(1)),
      ),
    );
    expect(realtime.chatJoinCount, greaterThanOrEqualTo(1));

    realtime.pushChatMessage(
      ChatMessage(
        id: 'm3',
        threadId: 'th1',
        senderId: 'c1',
        type: 'TEXT',
        body: 'Live',
        createdAt: DateTime.parse('2026-11-27T00:03:00.000Z'),
      ),
    );
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<ChatThreadState>().having(
          (s) => s.messages.any((m) => m.id == 'm3'),
          'socket',
          true,
        ),
      ),
    );

    bloc.add(const ChatThreadSendText('Ping'));
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<ChatThreadState>()
            .having((s) => s.sending, 'sending', false)
            .having(
              (s) => s.messages.any((m) => m.body == 'Ping'),
              'sent',
              true,
            ),
      ),
    );

    await bloc.close();
    realtime.dispose();
  });

  test('ChatThreadBloc prefers threadId for inbox opens', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/chat/threads/th-admin'] = {
      'success': true,
      'data': {
        'id': 'th-admin',
        'tripId': 't1',
        'type': 'DRIVER_ADMIN',
        'readOnly': false,
      },
    };
    adapter.onGet['/chat/threads/th-admin/messages'] = {
      'success': true,
      'data': {
        'items': <Map<String, dynamic>>[],
        'meta': {'hasMore': false, 'readOnly': false},
      },
    };

    final realtime = FakeRealtimeClient();
    final bloc = ChatThreadBloc(
      repository: ChatRepository(ApiClient(dio: dio)),
      realtime: realtime,
      myUserId: 'd1',
      threadId: 'th-admin',
      tripId: 't1',
      threadType: 'DRIVER_CUSTOMER',
    );

    bloc.add(const ChatThreadStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<ChatThreadState>()
            .having((s) => s.status, 's', ChatThreadStatus.ready)
            .having((s) => s.thread?.type, 'type', 'DRIVER_ADMIN'),
      ),
    );
    expect(adapter.postCount, 0);

    await bloc.close();
    realtime.dispose();
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};
  final Map<String, Map<String, dynamic>> onPost = {};
  Map<String, dynamic>? lastPostBody;
  var postCount = 0;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.method == 'GET' && onGet.containsKey(options.path)) {
      return _ok(onGet[options.path]!);
    }
    if (options.method == 'POST' && onPost.containsKey(options.path)) {
      postCount++;
      if (requestStream != null) {
        final chunks = await requestStream.toList();
        final bytes = chunks.expand((e) => e).toList();
        if (bytes.isNotEmpty) {
          lastPostBody =
              jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
        }
      }
      return _ok(onPost[options.path]!, status: 201);
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
