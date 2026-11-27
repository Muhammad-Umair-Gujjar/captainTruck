import '../../../core/network/api_client.dart';
import 'payment_models.dart';

class PaymentsRepository {
  PaymentsRepository(this._client);

  final ApiClient _client;

  Future<List<PaymentRecord>> listByRequest(String requestId) async {
    final envelope = await _client.getEnvelope<List<PaymentRecord>>(
      '/payments/by-request/$requestId',
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('payments list invalid');
        }
        final items = raw['items'];
        if (items is! List) return const <PaymentRecord>[];
        return items
            .whereType<Map>()
            .map((e) => PaymentRecord.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
    return envelope.data ?? const [];
  }

  Future<PaymentRecord> collectCash(String paymentId) async {
    final envelope = await _client.postEnvelope<PaymentRecord>(
      '/payments/$paymentId/cash/collect',
      parseData: _parsePayment,
    );
    return envelope.data!;
  }

  PaymentRecord _parsePayment(Object? raw) {
    if (raw is! Map) {
      throw const FormatException('payment payload invalid');
    }
    return PaymentRecord.fromJson(Map<String, dynamic>.from(raw));
  }
}
