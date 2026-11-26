import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/dispatch_models.dart';
import '../../data/dispatches_repository.dart';

part 'dispatch_detail_event.dart';
part 'dispatch_detail_state.dart';

class DispatchDetailBloc
    extends Bloc<DispatchDetailEvent, DispatchDetailState> {
  DispatchDetailBloc({
    required this.repository,
    required this.dispatchId,
  }) : super(const DispatchDetailState()) {
    on<DispatchDetailStarted>(_onLoad);
    on<DispatchDetailRefreshed>(_onLoad);
    on<DispatchDetailCancelRequested>(_onCancel);
  }

  final DispatchesRepository repository;
  final String dispatchId;

  Future<void> _onLoad(
    DispatchDetailEvent event,
    Emitter<DispatchDetailState> emit,
  ) async {
    emit(
      state.copyWith(
        status: DispatchDetailStatus.loading,
        clearMessage: true,
      ),
    );
    try {
      final dispatch = await repository.getById(dispatchId);
      emit(
        state.copyWith(
          status: DispatchDetailStatus.ready,
          dispatch: dispatch,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: DispatchDetailStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onCancel(
    DispatchDetailCancelRequested event,
    Emitter<DispatchDetailState> emit,
  ) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final dispatch = await repository.cancel(dispatchId);
      emit(
        state.copyWith(
          status: DispatchDetailStatus.ready,
          dispatch: dispatch,
          busy: false,
          message: 'Request cancelled',
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          busy: false,
          message: _msg(e),
        ),
      );
    }
  }

  String _msg(Object e) {
    if (e is ApiException) return e.toString();
    return e.toString();
  }
}
