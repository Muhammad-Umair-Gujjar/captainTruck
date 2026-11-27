import '../../../core/network/api_client.dart';
import 'trip_models.dart';

class TripsRepository {
  TripsRepository(this._client);

  final ApiClient _client;

  Future<TripListPage> listMine({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final envelope = await _client.getEnvelope<TripListPage>(
      '/trips/mine',
      query: {
        'page': page,
        'limit': limit,
        if (status != null && status.isNotEmpty) 'status': status,
      },
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('trips list invalid');
        }
        return TripListPage.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }

  Future<TripAssignment> getById(String tripId) async {
    final envelope = await _client.getEnvelope<TripAssignment>(
      '/trips/$tripId',
      parseData: _parseTrip,
    );
    return envelope.data!;
  }

  Future<TripAssignment> updateStatus({
    required String tripId,
    required String status,
  }) async {
    final envelope = await _client.postEnvelope<TripAssignment>(
      '/trips/$tripId/status',
      data: {'status': status},
      parseData: _parseTrip,
    );
    return envelope.data!;
  }

  TripAssignment _parseTrip(Object? raw) {
    if (raw is! Map) {
      throw const FormatException('trip payload invalid');
    }
    return TripAssignment.fromJson(Map<String, dynamic>.from(raw));
  }
}
