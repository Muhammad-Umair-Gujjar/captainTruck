import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/payment_models.dart';
import '../../data/payments_repository.dart';
import '../../data/stripe_sheet.dart';

part 'payment_event.dart';
part 'payment_state.dart';

class PaymentBloc extends Bloc<PaymentEvent, PaymentState> {
  PaymentBloc({
    required this.repository,
    required this.requestId,
    required this.expectedAmountCents,
    StripeSheetLauncher? stripeSheet,
  })  : stripeSheet = stripeSheet ?? FlutterStripeSheetLauncher(),
        super(const PaymentState()) {
    on<PaymentStarted>(_onStarted);
    on<PaymentCashRequested>(_onCash);
    on<PaymentStripeRequested>(_onStripe);
    on<PaymentRefreshRequested>(_onRefresh);
  }

  final PaymentsRepository repository;
  final String requestId;
  final int expectedAmountCents;
  final StripeSheetLauncher stripeSheet;

  Future<void> _onStarted(
    PaymentStarted event,
    Emitter<PaymentState> emit,
  ) async {
    emit(state.copyWith(status: PaymentUiStatus.loading, clearMessage: true));
    try {
      final stripe = await repository.stripeStatus();
      final items = await repository.listByRequest(requestId);
      emit(
        state.copyWith(
          status: PaymentUiStatus.ready,
          stripeStatus: stripe,
          payments: items,
          active: _pickActive(items),
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: PaymentUiStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onCash(
    PaymentCashRequested event,
    Emitter<PaymentState> emit,
  ) async {
    if (state.active?.isSettled == true) {
      emit(state.copyWith(message: 'Already settled'));
      return;
    }
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final key = repository.newIdempotencyKey(requestId);
      final payment = await repository.create(
        requestId: requestId,
        provider: 'CASH',
        idempotencyKey: key,
        clientAmountCents: expectedAmountCents,
      );
      emit(
        state.copyWith(
          busy: false,
          active: payment,
          payments: _merge(state.payments, payment),
          message: 'Cash on pickup registered — driver will confirm collection',
        ),
      );
    } catch (e) {
      emit(state.copyWith(busy: false, message: _msg(e)));
    }
  }

  Future<void> _onStripe(
    PaymentStripeRequested event,
    Emitter<PaymentState> emit,
  ) async {
    if (state.active?.isSettled == true) {
      emit(state.copyWith(message: 'Already settled'));
      return;
    }
    final stripe = state.stripeStatus;
    if (stripe == null || !stripe.configured) {
      emit(
        state.copyWith(
          message: 'Stripe Test Mode is not configured on the server',
        ),
      );
      return;
    }

    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final key = repository.newIdempotencyKey(requestId);
      var payment = await repository.create(
        requestId: requestId,
        provider: 'STRIPE',
        idempotencyKey: key,
        clientAmountCents: expectedAmountCents,
      );

      final secret = payment.stripe?.clientSecret;
      final pk = payment.stripe?.publishableKey ?? stripe.publishableKey;
      if (secret == null || pk == null || pk.isEmpty) {
        throw StateError('Stripe client secret / publishable key missing');
      }

      await stripeSheet.present(
        publishableKey: pk,
        clientSecret: secret,
      );

      // Webhook may lag — refresh a few times.
      for (var i = 0; i < 5; i++) {
        payment = await repository.getById(payment.id);
        if (payment.isSettled ||
            payment.status == 'FAILED' ||
            payment.status == 'CANCELLED') {
          break;
        }
        await Future<void>.delayed(const Duration(milliseconds: 400));
      }

      emit(
        state.copyWith(
          busy: false,
          active: payment,
          payments: _merge(state.payments, payment),
          message: payment.isSettled
              ? 'Stripe payment succeeded'
              : 'Stripe sheet closed — status: ${formatPaymentStatus(payment.status)}',
        ),
      );
    } catch (e) {
      emit(state.copyWith(busy: false, message: _msg(e)));
    }
  }

  Future<void> _onRefresh(
    PaymentRefreshRequested event,
    Emitter<PaymentState> emit,
  ) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final items = await repository.listByRequest(requestId);
      emit(
        state.copyWith(
          busy: false,
          payments: items,
          active: _pickActive(items),
        ),
      );
    } catch (e) {
      emit(state.copyWith(busy: false, message: _msg(e)));
    }
  }

  PaymentRecord? _pickActive(List<PaymentRecord> items) {
    for (final p in items) {
      if (p.isSettled) return p;
    }
    return items.isEmpty ? null : items.first;
  }

  List<PaymentRecord> _merge(List<PaymentRecord> current, PaymentRecord next) {
    final rest = current.where((p) => p.id != next.id).toList();
    return [next, ...rest];
  }

  String _msg(Object e) {
    if (e is ApiException) return e.toString();
    return e.toString();
  }
}
