import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/truck_type_models.dart';
import '../../data/truck_types_repository.dart';

part 'truck_types_event.dart';
part 'truck_types_state.dart';

class TruckTypesBloc extends Bloc<TruckTypesEvent, TruckTypesState> {
  TruckTypesBloc(this._repository) : super(const TruckTypesState()) {
    on<TruckTypesStarted>(_onStarted);
    on<TruckTypesRefreshed>(_onStarted);
  }

  final TruckTypesRepository _repository;

  Future<void> _onStarted(
    TruckTypesEvent event,
    Emitter<TruckTypesState> emit,
  ) async {
    emit(state.copyWith(status: TruckTypesStatus.loading, clearMessage: true));
    try {
      final items = await _repository.listActive();
      emit(
        state.copyWith(
          status: TruckTypesStatus.ready,
          items: items,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: TruckTypesStatus.failure,
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
