import 'package:equatable/equatable.dart';

class PaymentRecord extends Equatable {
  const PaymentRecord({
    required this.id,
    required this.provider,
    required this.status,
    required this.amountCents,
    required this.currency,
    this.requestId,
    this.tripId,
  });

  final String id;
  final String provider;
  final String status;
  final int amountCents;
  final String currency;
  final String? requestId;
  final String? tripId;

  bool get isSettled => status == 'PAID' || status == 'CASH_COLLECTED';

  bool get isCashPending =>
      provider == 'CASH' && status == 'CASH_PENDING';

  factory PaymentRecord.fromJson(Map<String, dynamic> json) {
    return PaymentRecord(
      id: json['id'].toString(),
      provider: json['provider']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      amountCents: (json['amountCents'] as num?)?.toInt() ?? 0,
      currency: json['currency']?.toString() ?? 'PKR',
      requestId: json['requestId']?.toString(),
      tripId: json['tripId']?.toString(),
    );
  }

  @override
  List<Object?> get props =>
      [id, provider, status, amountCents, currency, requestId, tripId];
}

String formatPaymentStatus(String status) =>
    status.replaceAll('_', ' ').toLowerCase();
