import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/commission_models.dart';
import '../../data/commissions_repository.dart';

part 'commissions_event.dart';
part 'commissions_state.dart';

class CommissionsBloc extends Bloc<CommissionsEvent, CommissionsState> {
  CommissionsBloc({required this.repository})
      : super(const CommissionsState()) {
    on<CommissionsStarted>(_onLoad);
    on<CommissionsFilterChanged>(_onFilter);
  }

  final CommissionsRepository repository;

  Future<void> _onLoad(
    CommissionsEvent event,
    Emitter<CommissionsState> emit,
  ) async {
    emit(
      state.copyWith(status: CommissionsStatus.loading, clearMessage: true),
    );
    try {
      final page = await repository.listMine(
        unconfirmedOnly: state.unconfirmedOnly ? true : null,
      );
      emit(
        state.copyWith(
          status: CommissionsStatus.ready,
          items: page.items,
          total: page.total,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: CommissionsStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onFilter(
    CommissionsFilterChanged event,
    Emitter<CommissionsState> emit,
  ) async {
    emit(state.copyWith(unconfirmedOnly: event.unconfirmedOnly));
    await _onLoad(const CommissionsStarted(), emit);
  }

  String _msg(Object e) {
    if (e is ApiException) return e.toString();
    return e.toString();
  }
}
