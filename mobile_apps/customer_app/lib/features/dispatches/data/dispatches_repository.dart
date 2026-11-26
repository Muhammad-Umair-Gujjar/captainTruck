import '../../../core/network/api_client.dart';
import 'dispatch_models.dart';

class DispatchesRepository {
  DispatchesRepository(this._client);

  final ApiClient _client;

  Future<DispatchRequest> create(CreateDispatchInput input) async {
    final envelope = await _client.postEnvelope<DispatchRequest>(
      '/dispatches',
      data: input.toJson(),
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('dispatch payload invalid');
        }
        return DispatchRequest.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }
}
