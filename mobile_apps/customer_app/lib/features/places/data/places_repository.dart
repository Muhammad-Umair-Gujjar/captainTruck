import '../../../core/network/api_client.dart';
import 'place_models.dart';

class PlacesRepository {
  PlacesRepository(this._client);

  final ApiClient _client;

  Future<List<PlaceSuggestion>> autocomplete(String query, {int limit = 5}) async {
    final q = query.trim();
    if (q.length < 2) return const [];
    final envelope = await _client.getEnvelope<List<PlaceSuggestion>>(
      '/osm/autocomplete',
      query: {'q': q, 'limit': limit},
      parseData: (raw) {
        if (raw is! List) {
          throw const FormatException('autocomplete payload must be a list');
        }
        return raw
            .whereType<Map>()
            .map((e) => PlaceSuggestion.fromJson(Map<String, dynamic>.from(e)))
            .where((p) => p.displayName.isNotEmpty)
            .toList();
      },
    );
    return envelope.data ?? const [];
  }
}
