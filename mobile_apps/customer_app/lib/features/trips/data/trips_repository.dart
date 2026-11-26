import '../../../core/network/api_client.dart';
import 'trip_models.dart';

class TripsRepository {
  TripsRepository(this._client);

  final ApiClient _client;

  Future<TripDetail> getById(String tripId) async {
    final envelope = await _client.getEnvelope<TripDetail>(
      '/trips/$tripId',
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('trip payload invalid');
        }
        return TripDetail.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }

  Future<LiveLocation?> getLocation(String tripId) async {
    final envelope = await _client.getEnvelope<LiveLocation?>(
      '/trips/$tripId/location',
      parseData: (raw) {
        if (raw == null) return null;
        if (raw is! Map) {
          throw const FormatException('location payload invalid');
        }
        return LiveLocation.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data;
  }
}
