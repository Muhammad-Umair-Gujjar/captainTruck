part of 'payment_bloc.dart';

enum PaymentUiStatus { initial, loading, ready, failure }

final class PaymentState extends Equatable {
  const PaymentState({
    this.status = PaymentUiStatus.initial,
    this.stripeStatus,
    this.payments = const [],
    this.active,
    this.busy = false,
    this.message,
  });

  final PaymentUiStatus status;
  final StripeStatus? stripeStatus;
  final List<PaymentRecord> payments;
  final PaymentRecord? active;
  final bool busy;
  final String? message;

  PaymentState copyWith({
    PaymentUiStatus? status,
    StripeStatus? stripeStatus,
    List<PaymentRecord>? payments,
    PaymentRecord? active,
    bool? busy,
    String? message,
    bool clearMessage = false,
  }) {
    return PaymentState(
      status: status ?? this.status,
      stripeStatus: stripeStatus ?? this.stripeStatus,
      payments: payments ?? this.payments,
      active: active ?? this.active,
      busy: busy ?? this.busy,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props =>
      [status, stripeStatus, payments, active, busy, message];
}
