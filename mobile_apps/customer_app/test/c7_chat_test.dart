import 'dart:convert';

import 'package:bloc_test/bloc_test.dart';
import 'package:customer_app/core/network/api_client.dart';
import 'package:customer_app/core/realtime/realtime_client.dart';
import 'package:customer_app/features/chat/data/chat_models.dart';
import 'package:customer_app/features/chat/data/chat_repository.dart';
import 'package:customer_app/features/chat/presentation/bloc/chat_thread_bloc.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockChat extends Mock implements ChatRepository {}

void main() {
  test('ChatRepository open + list + send', () async {
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
            'senderId': 'd1',
            'type': 'TEXT',
            'body': 'Hello',
            'createdAt': '2026-11-27T00:00:00.000Z',
            'sender': {'id': 'd1', 'fullName': 'Driver', 'role': 'DRIVER'},
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
        'senderId': 'c1',
        'type': 'TEXT',
        'body': 'Hi',
        'createdAt': '2026-11-27T00:01:00.000Z',
        'sender': {'id': 'c1', 'fullName': 'Customer', 'role': 'CUSTOMER'},
      },
    };

    final repo = ChatRepository(ApiClient(dio: dio));
    final thread = await repo.openDriverCustomerThread('t1');
    expect(thread.id, 'th1');
    expect(thread.readOnly, isFalse);

    final page = await repo.listMessages('th1');
    expect(page.items, hasLength(1));
    expect(page.items.first.body, 'Hello');

    final sent = await repo.sendText('th1', 'Hi');
    expect(sent.body, 'Hi');
    expect(adapter.lastPostBody?['type'], 'TEXT');
  });

  group('ChatThreadBloc', () {
    late _MockChat repo;
    late FakeRealtimeClient realtime;

    setUp(() {
      repo = _MockChat();
      realtime = FakeRealtimeClient();
    });

    tearDown(() => realtime.dispose());

    blocTest<ChatThreadBloc, ChatThreadState>(
      'opens thread, loads messages, applies socket + send',
      build: () {
        when(() => repo.openDriverCustomerThread('t1')).thenAnswer(
          (_) async => const ChatThread(
            id: 'th1',
            type: 'DRIVER_CUSTOMER',
            readOnly: false,
            tripId: 't1',
          ),
        );
        when(
          () => repo.listMessages(
            'th1',
            cursor: any(named: 'cursor'),
            limit: any(named: 'limit'),
          ),
        ).thenAnswer(
          (_) async => ChatMessagesPage(
            items: [
              ChatMessage(
                id: 'm1',
                threadId: 'th1',
                senderId: 'd1',
                type: 'TEXT',
                body: 'Hello',
                createdAt: DateTime.parse('2026-11-27T00:00:00.000Z'),
              ),
            ],
            hasMore: false,
          ),
        );
        when(() => repo.sendText('th1', 'Ping')).thenAnswer(
          (_) async => ChatMessage(
            id: 'm2',
            threadId: 'th1',
            senderId: 'c1',
            type: 'TEXT',
            body: 'Ping',
            createdAt: DateTime.parse('2026-11-27T00:02:00.000Z'),
          ),
        );
        return ChatThreadBloc(
          repository: repo,
          realtime: realtime,
          myUserId: 'c1',
          tripId: 't1',
        );
      },
      act: (bloc) async {
        bloc.add(const ChatThreadStarted());
        await bloc.stream.firstWhere((s) => s.status == ChatThreadStatus.ready);
        realtime.pushChatMessage(
          ChatMessage(
            id: 'm3',
            threadId: 'th1',
            senderId: 'd1',
            type: 'TEXT',
            body: 'Live',
            createdAt: DateTime.parse('2026-11-27T00:03:00.000Z'),
          ),
        );
        await Future<void>.delayed(const Duration(milliseconds: 20));
        bloc.add(const ChatThreadSendText('Ping'));
      },
      wait: const Duration(milliseconds: 80),
      expect: () => [
        isA<ChatThreadState>().having(
          (s) => s.status,
          'status',
          ChatThreadStatus.loading,
        ),
        isA<ChatThreadState>()
            .having((s) => s.status, 'status', ChatThreadStatus.ready)
            .having((s) => s.messages, 'msgs', hasLength(1)),
        isA<ChatThreadState>().having(
          (s) => s.messages.any((m) => m.id == 'm3'),
          'socket',
          true,
        ),
        isA<ChatThreadState>().having((s) => s.sending, 'sending', true),
        isA<ChatThreadState>()
            .having((s) => s.sending, 'sending', false)
            .having(
              (s) => s.messages.any((m) => m.body == 'Ping'),
              'sent',
              true,
            ),
      ],
      verify: (_) {
        expect(realtime.chatJoinCount, greaterThanOrEqualTo(1));
      },
    );
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};
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
    if (options.method == 'GET' && onGet.containsKey(options.path)) {
      return _ok(onGet[options.path]!);
    }
    if (options.method == 'POST' && onPost.containsKey(options.path)) {
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
