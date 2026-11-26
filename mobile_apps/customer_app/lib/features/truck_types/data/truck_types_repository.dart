import '../../../core/network/api_client.dart';
import 'truck_type_models.dart';

class TruckTypesRepository {
  TruckTypesRepository(this._client);

  final ApiClient _client;

  Future<List<TruckType>> listActive() async {
    final envelope = await _client.getEnvelope<List<TruckType>>(
      '/truck-types',
      parseData: (raw) {
        if (raw is! List) {
          throw const FormatException('truck-types payload must be a list');
        }
        return raw
            .whereType<Map>()
            .map((e) => TruckType.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
    return envelope.data ?? const [];
  }
}
