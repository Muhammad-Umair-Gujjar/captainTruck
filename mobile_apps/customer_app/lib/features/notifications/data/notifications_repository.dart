import '../../../core/network/api_client.dart';
import 'notification_models.dart';

class NotificationsRepository {
  NotificationsRepository(this._client);

  final ApiClient _client;

  Future<NotificationsStatus> status() async {
    final envelope = await _client.getEnvelope<NotificationsStatus>(
      '/notifications/status',
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('notifications status invalid');
        }
        return NotificationsStatus.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }

  Future<TokenRegistrationResult> registerToken(String token) async {
    final envelope = await _client.postEnvelope<TokenRegistrationResult>(
      '/notifications/tokens',
      data: {'token': token},
      parseData: _parseRegistration,
    );
    return envelope.data!;
  }

  Future<TokenRegistrationResult> unregisterToken(String token) async {
    final envelope = await _client.deleteEnvelope<TokenRegistrationResult>(
      '/notifications/tokens',
      data: {'token': token},
      parseData: _parseRegistration,
    );
    return envelope.data!;
  }

  Future<List<String>> listTokens() async {
    final envelope = await _client.getEnvelope<List<String>>(
      '/notifications/tokens',
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('notifications tokens invalid');
        }
        final items = raw['tokens'] ?? raw['items'] ?? raw;
        if (items is List) {
          return items.map((e) => e.toString()).toList();
        }
        return const <String>[];
      },
    );
    return envelope.data ?? const [];
  }

  TokenRegistrationResult _parseRegistration(Object? raw) {
    if (raw is! Map) {
      throw const FormatException('token registration payload invalid');
    }
    return TokenRegistrationResult.fromJson(Map<String, dynamic>.from(raw));
  }
}
