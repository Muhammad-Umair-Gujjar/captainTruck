part of 'select_routes_bloc.dart';

enum SelectRoutesStatus { initial, generating, ready, submitting, success, failure }

final class SelectRoutesState extends Equatable {
  const SelectRoutesState({
    this.status = SelectRoutesStatus.initial,
    this.dispatch,
    this.estimates = const {},
    this.selectedRouteId,
    this.message,
  });

  final SelectRoutesStatus status;
  final DispatchRequest? dispatch;
  final Map<String, int> estimates;
  final String? selectedRouteId;
  final String? message;

  RouteOption? get selectedRoute {
    final id = selectedRouteId;
    if (id == null || dispatch == null) return null;
    for (final r in dispatch!.routeOptions) {
      if (r.id == id) return r;
    }
    return null;
  }

  int? get selectedAiCostCents {
    final id = selectedRouteId;
    if (id == null) return null;
    return estimates[id];
  }

  SelectRoutesState copyWith({
    SelectRoutesStatus? status,
    DispatchRequest? dispatch,
    Map<String, int>? estimates,
    String? selectedRouteId,
    String? message,
    bool clearMessage = false,
  }) {
    return SelectRoutesState(
      status: status ?? this.status,
      dispatch: dispatch ?? this.dispatch,
      estimates: estimates ?? this.estimates,
      selectedRouteId: selectedRouteId ?? this.selectedRouteId,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props =>
      [status, dispatch, estimates, selectedRouteId, message];
}
