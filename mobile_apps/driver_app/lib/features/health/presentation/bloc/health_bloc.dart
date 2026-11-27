import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/health_models.dart';
import '../../data/health_repository.dart';

part 'health_event.dart';
part 'health_state.dart';

class HealthBloc extends Bloc<HealthEvent, HealthState> {
  HealthBloc(this._repository) : super(const HealthState()) {
    on<HealthRequested>(_onRequested);
  }

  final HealthRepository _repository;

  Future<void> _onRequested(
    HealthRequested event,
    Emitter<HealthState> emit,
  ) async {
    emit(state.copyWith(status: HealthStatus.loading, message: null));
    try {
      final data = await _repository.fetchHealth();
      emit(state.copyWith(status: HealthStatus.success, data: data));
    } catch (e) {
      emit(
        state.copyWith(
          status: HealthStatus.failure,
          message: e.toString(),
        ),
      );
    }
  }
}
