import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/trip_models.dart';
import '../../data/trips_repository.dart';

part 'trip_detail_event.dart';
part 'trip_detail_state.dart';

class TripDetailBloc extends Bloc<TripDetailEvent, TripDetailState> {
  TripDetailBloc({
    required this.repository,
    required this.tripId,
  }) : super(const TripDetailState()) {
    on<TripDetailStarted>(_onLoad);
    on<TripDetailRefreshed>(_onLoad);
  }

  final TripsRepository repository;
  final String tripId;

  Future<void> _onLoad(
    TripDetailEvent event,
    Emitter<TripDetailState> emit,
  ) async {
    emit(
      state.copyWith(
        status: TripDetailStatus.loading,
        clearMessage: true,
      ),
    );
    try {
      final trip = await repository.getById(tripId);
      emit(
        state.copyWith(
          status: TripDetailStatus.ready,
          trip: trip,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: TripDetailStatus.failure,
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
