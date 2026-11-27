import '../../../core/network/api_client.dart';
import 'commission_models.dart';

class CommissionsRepository {
  CommissionsRepository(this._client);

  final ApiClient _client;

  Future<CommissionListPage> listMine({
    int page = 1,
    int limit = 20,
    bool? unconfirmedOnly,
  }) async {
    final envelope = await _client.getEnvelope<CommissionListPage>(
      '/commissions/mine',
      query: {
        'page': page,
        'limit': limit,
        'unconfirmedOnly': ?unconfirmedOnly,
      },
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('commissions payload invalid');
        }
        return CommissionListPage.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }
}
