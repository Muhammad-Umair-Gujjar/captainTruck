import '../../../core/network/api_client.dart';
import 'health_models.dart';

class HealthRepository {
  HealthRepository(this._client);

  final ApiClient _client;

  Future<HealthData> fetchHealth() async {
    final envelope = await _client.getEnvelope<HealthData>(
      '/health',
      parseData: (raw) {
        if (raw is! Map) {
          throw FormatException('health data must be an object');
        }
        return HealthData.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    if (!envelope.success || envelope.data == null) {
      throw Exception(envelope.error?.toString() ?? 'Health check failed');
    }
    return envelope.data!;
  }
}
