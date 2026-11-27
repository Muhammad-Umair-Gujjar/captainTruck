import 'package:equatable/equatable.dart';

class StripeStatus extends Equatable {
  const StripeStatus({
    required this.configured,
    this.publishableKey,
    this.mode = 'test',
  });

  final bool configured;
  final String? publishableKey;
  final String mode;

  factory StripeStatus.fromJson(Map<String, dynamic> json) {
    return StripeStatus(
      configured: json['configured'] == true,
      publishableKey: json['publishableKey']?.toString(),
      mode: json['mode']?.toString() ?? 'test',
    );
  }

  @override
  List<Object?> get props => [configured, publishableKey, mode];
}

class StripeClientPayload extends Equatable {
  const StripeClientPayload({
    required this.paymentIntentId,
    required this.clientSecret,
    this.publishableKey,
    this.status,
  });

  final String paymentIntentId;
  final String clientSecret;
  final String? publishableKey;
  final String? status;

  factory StripeClientPayload.fromJson(Map<String, dynamic> json) {
    return StripeClientPayload(
      paymentIntentId: json['paymentIntentId'].toString(),
      clientSecret: json['clientSecret'].toString(),
      publishableKey: json['publishableKey']?.toString(),
      status: json['status']?.toString(),
    );
  }

  @override
  List<Object?> get props =>
      [paymentIntentId, clientSecret, publishableKey, status];
}

class PaymentRecord extends Equatable {
  const PaymentRecord({
    required this.id,
    required this.provider,
    required this.status,
    required this.amountCents,
    required this.currency,
    required this.idempotencyKey,
    this.requestId,
    this.tripId,
    this.stripePaymentIntentId,
    this.stripe,
  });

  final String id;
  final String provider;
  final String status;
  final int amountCents;
  final String currency;
  final String idempotencyKey;
  final String? requestId;
  final String? tripId;
  final String? stripePaymentIntentId;
  final StripeClientPayload? stripe;

  bool get isSettled =>
      status == 'PAID' || status == 'CASH_COLLECTED';

  bool get isCashPending => status == 'CASH_PENDING';

  bool get needsStripeAction =>
      provider == 'STRIPE' &&
      (status == 'REQUIRES_ACTION' || status == 'PENDING');

  factory PaymentRecord.fromJson(Map<String, dynamic> json) {
    final stripeRaw = json['stripe'];
    return PaymentRecord(
      id: json['id'].toString(),
      provider: json['provider']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      amountCents: (json['amountCents'] as num?)?.toInt() ?? 0,
      currency: json['currency']?.toString() ?? 'PKR',
      idempotencyKey: json['idempotencyKey']?.toString() ?? '',
      requestId: json['requestId']?.toString(),
      tripId: json['tripId']?.toString(),
      stripePaymentIntentId: json['stripePaymentIntentId']?.toString(),
      stripe: stripeRaw is Map
          ? StripeClientPayload.fromJson(Map<String, dynamic>.from(stripeRaw))
          : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        provider,
        status,
        amountCents,
        currency,
        idempotencyKey,
        requestId,
        tripId,
        stripePaymentIntentId,
        stripe,
      ];
}

String formatPaymentStatus(String status) =>
    status.replaceAll('_', ' ').toLowerCase();
