part of 'cash_payment_bloc.dart';

sealed class CashPaymentEvent extends Equatable {
  const CashPaymentEvent();

  @override
  List<Object?> get props => [];
}

final class CashPaymentStarted extends CashPaymentEvent {
  const CashPaymentStarted();
}

final class CashPaymentCollectRequested extends CashPaymentEvent {
  const CashPaymentCollectRequested(this.paymentId);
  final String paymentId;

  @override
  List<Object?> get props => [paymentId];
}
