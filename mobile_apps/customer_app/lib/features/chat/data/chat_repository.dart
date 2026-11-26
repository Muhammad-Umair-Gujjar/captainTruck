import '../../../core/network/api_client.dart';
import 'chat_models.dart';

class ChatRepository {
  ChatRepository(this._client);

  final ApiClient _client;

  Future<List<ChatThread>> listMine() async {
    final envelope = await _client.getEnvelope<List<ChatThread>>(
      '/chat/threads/mine',
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('threads payload invalid');
        }
        final items = raw['items'];
        if (items is! List) return const <ChatThread>[];
        return items
            .whereType<Map>()
            .map((e) => ChatThread.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
    return envelope.data ?? const [];
  }

  Future<ChatThread> openDriverCustomerThread(String tripId) async {
    final envelope = await _client.postEnvelope<ChatThread>(
      '/chat/trips/$tripId/threads',
      data: {'type': 'DRIVER_CUSTOMER'},
      parseData: _parseThread,
    );
    return envelope.data!;
  }

  Future<ChatThread> getThread(String threadId) async {
    final envelope = await _client.getEnvelope<ChatThread>(
      '/chat/threads/$threadId',
      parseData: _parseThread,
    );
    return envelope.data!;
  }

  ChatThread _parseThread(Object? raw) {
    if (raw is! Map) {
      throw const FormatException('thread payload invalid');
    }
    return ChatThread.fromJson(Map<String, dynamic>.from(raw));
  }

  Future<ChatMessagesPage> listMessages(
    String threadId, {
    String? cursor,
    int limit = 30,
  }) async {
    final envelope = await _client.getEnvelope<ChatMessagesPage>(
      '/chat/threads/$threadId/messages',
      query: {
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      },
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('messages payload invalid');
        }
        return ChatMessagesPage.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }

  Future<ChatMessage> sendText(String threadId, String body) async {
    final envelope = await _client.postEnvelope<ChatMessage>(
      '/chat/threads/$threadId/messages',
      data: {'type': 'TEXT', 'body': body.trim()},
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('message payload invalid');
        }
        return ChatMessage.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }

  Future<ChatMessage> sendPreset(String threadId, String body) async {
    final envelope = await _client.postEnvelope<ChatMessage>(
      '/chat/threads/$threadId/messages',
      data: {'type': 'PRESET', 'body': body.trim()},
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('message payload invalid');
        }
        return ChatMessage.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }
}
