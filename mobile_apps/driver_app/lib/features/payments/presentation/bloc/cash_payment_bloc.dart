import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/payment_models.dart';
import '../../data/payments_repository.dart';

part 'cash_payment_event.dart';
part 'cash_payment_state.dart';

class CashPaymentBloc extends Bloc<CashPaymentEvent, CashPaymentState> {
  CashPaymentBloc({
    required this.repository,
    required this.requestId,
  }) : super(const CashPaymentState()) {
    on<CashPaymentStarted>(_onLoad);
    on<CashPaymentCollectRequested>(_onCollect);
  }

  final PaymentsRepository repository;
  final String requestId;

  Future<void> _onLoad(
    CashPaymentStarted event,
    Emitter<CashPaymentState> emit,
  ) async {
    emit(state.copyWith(status: CashPaymentStatus.loading, clearMessage: true));
    try {
      final payments = await repository.listByRequest(requestId);
      emit(
        state.copyWith(
          status: CashPaymentStatus.ready,
          payments: payments,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: CashPaymentStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onCollect(
    CashPaymentCollectRequested event,
    Emitter<CashPaymentState> emit,
  ) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final updated = await repository.collectCash(event.paymentId);
      final next = state.payments
          .map((p) => p.id == updated.id ? updated : p)
          .toList();
      if (!next.any((p) => p.id == updated.id)) {
        next.insert(0, updated);
      }
      emit(
        state.copyWith(
          status: CashPaymentStatus.ready,
          payments: next,
          busy: false,
          message: 'Cash collected · ${formatPaymentStatus(updated.status)}',
        ),
      );
    } catch (e) {
      emit(state.copyWith(busy: false, message: _msg(e)));
    }
  }

  String _msg(Object e) {
    if (e is ApiException) return e.toString();
    return e.toString();
  }
}
