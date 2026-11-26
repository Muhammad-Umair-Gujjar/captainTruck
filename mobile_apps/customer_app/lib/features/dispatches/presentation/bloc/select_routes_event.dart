part of 'select_routes_bloc.dart';

sealed class SelectRoutesEvent extends Equatable {
  const SelectRoutesEvent();

  @override
  List<Object?> get props => [];
}

final class SelectRoutesStarted extends SelectRoutesEvent {
  const SelectRoutesStarted();
}

final class SelectRoutesOptionChosen extends SelectRoutesEvent {
  const SelectRoutesOptionChosen(this.routeOptionId);
  final String routeOptionId;

  @override
  List<Object?> get props => [routeOptionId];
}

final class SelectRoutesConfirmed extends SelectRoutesEvent {
  const SelectRoutesConfirmed();
}
