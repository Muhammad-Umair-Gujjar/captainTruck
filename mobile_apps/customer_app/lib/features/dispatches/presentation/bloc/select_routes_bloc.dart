import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../../pricing/data/trip_cost_estimator.dart';
import '../../data/dispatch_models.dart';
import '../../data/dispatches_repository.dart';

part 'select_routes_event.dart';
part 'select_routes_state.dart';

class SelectRoutesBloc extends Bloc<SelectRoutesEvent, SelectRoutesState> {
  SelectRoutesBloc({
    required this.repository,
    required this.dispatchId,
    TripCostEstimator? estimator,
  })  : estimator = estimator ?? const DistanceTripCostEstimator(),
        super(const SelectRoutesState()) {
    on<SelectRoutesStarted>(_onStarted);
    on<SelectRoutesOptionChosen>(_onChosen);
    on<SelectRoutesConfirmed>(_onConfirmed);
  }

  final DispatchesRepository repository;
  final String dispatchId;
  final TripCostEstimator estimator;

  Future<void> _onStarted(
    SelectRoutesStarted event,
    Emitter<SelectRoutesState> emit,
  ) async {
    emit(
      state.copyWith(
        status: SelectRoutesStatus.generating,
        clearMessage: true,
      ),
    );
    try {
      final dispatch = await repository.generateRoutes(dispatchId);
      final estimates = <String, int>{
        for (final r in dispatch.routeOptions)
          r.id: estimator.estimateCents(
            distanceMeters: r.distanceMeters,
            durationSeconds: r.durationSeconds,
          ),
      };
      RouteOption? preferred;
      for (final r in dispatch.routeOptions) {
        if (r.isRecommended) {
          preferred = r;
          break;
        }
      }
      preferred ??=
          dispatch.routeOptions.isEmpty ? null : dispatch.routeOptions.first;
      emit(
        state.copyWith(
          status: SelectRoutesStatus.ready,
          dispatch: dispatch,
          estimates: estimates,
          selectedRouteId: preferred?.id,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: SelectRoutesStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  void _onChosen(
    SelectRoutesOptionChosen event,
    Emitter<SelectRoutesState> emit,
  ) {
    emit(
      state.copyWith(
        selectedRouteId: event.routeOptionId,
        clearMessage: true,
      ),
    );
  }

  Future<void> _onConfirmed(
    SelectRoutesConfirmed event,
    Emitter<SelectRoutesState> emit,
  ) async {
    final routeId = state.selectedRouteId;
    final aiCost = routeId == null ? null : state.estimates[routeId];
    if (routeId == null || aiCost == null) {
      emit(state.copyWith(message: 'Select a route first'));
      return;
    }

    emit(
      state.copyWith(
        status: SelectRoutesStatus.submitting,
        clearMessage: true,
      ),
    );
    try {
      final result = await repository.selectRoute(
        dispatchId: dispatchId,
        routeOptionId: routeId,
        aiCostCents: aiCost,
      );
      emit(
        state.copyWith(
          status: SelectRoutesStatus.success,
          dispatch: result,
          message: 'Submitted for admin review',
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: SelectRoutesStatus.failure,
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
