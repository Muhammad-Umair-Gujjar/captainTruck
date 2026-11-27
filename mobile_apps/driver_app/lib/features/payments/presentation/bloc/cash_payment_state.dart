part of 'cash_payment_bloc.dart';

enum CashPaymentStatus { initial, loading, ready, failure }

final class CashPaymentState extends Equatable {
  const CashPaymentState({
    this.status = CashPaymentStatus.initial,
    this.payments = const [],
    this.busy = false,
    this.message,
  });

  final CashPaymentStatus status;
  final List<PaymentRecord> payments;
  final bool busy;
  final String? message;

  PaymentRecord? get pendingCash {
    for (final p in payments) {
      if (p.isCashPending) return p;
    }
    return null;
  }

  CashPaymentState copyWith({
    CashPaymentStatus? status,
    List<PaymentRecord>? payments,
    bool? busy,
    String? message,
    bool clearMessage = false,
  }) {
    return CashPaymentState(
      status: status ?? this.status,
      payments: payments ?? this.payments,
      busy: busy ?? this.busy,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props => [status, payments, busy, message];
}
