import 'package:uuid/uuid.dart';

import '../../../core/network/api_client.dart';
import 'payment_models.dart';

class PaymentsRepository {
  PaymentsRepository(this._client, {Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  final ApiClient _client;
  final Uuid _uuid;

  String newIdempotencyKey(String requestId) =>
      'cust-$requestId-${_uuid.v4()}';

  Future<StripeStatus> stripeStatus() async {
    final envelope = await _client.getEnvelope<StripeStatus>(
      '/payments/stripe/status',
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('stripe status invalid');
        }
        return StripeStatus.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }

  Future<PaymentRecord> create({
    required String requestId,
    required String provider,
    required String idempotencyKey,
    int? clientAmountCents,
  }) async {
    final envelope = await _client.postEnvelope<PaymentRecord>(
      '/payments',
      data: {
        'requestId': requestId,
        'provider': provider,
        'idempotencyKey': idempotencyKey,
        'clientAmountCents': ?clientAmountCents,
      },
      parseData: _parsePayment,
    );
    return envelope.data!;
  }

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

  Future<PaymentRecord> getById(String id) async {
    final envelope = await _client.getEnvelope<PaymentRecord>(
      '/payments/$id',
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
