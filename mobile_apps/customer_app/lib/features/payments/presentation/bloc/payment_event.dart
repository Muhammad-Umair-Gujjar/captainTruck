part of 'payment_bloc.dart';

sealed class PaymentEvent extends Equatable {
  const PaymentEvent();

  @override
  List<Object?> get props => [];
}

final class PaymentStarted extends PaymentEvent {
  const PaymentStarted();
}

final class PaymentCashRequested extends PaymentEvent {
  const PaymentCashRequested();
}

final class PaymentStripeRequested extends PaymentEvent {
  const PaymentStripeRequested();
}

final class PaymentRefreshRequested extends PaymentEvent {
  const PaymentRefreshRequested();
}
