part of 'truck_types_bloc.dart';

sealed class TruckTypesEvent extends Equatable {
  const TruckTypesEvent();

  @override
  List<Object?> get props => [];
}

final class TruckTypesStarted extends TruckTypesEvent {
  const TruckTypesStarted();
}

final class TruckTypesRefreshed extends TruckTypesEvent {
  const TruckTypesRefreshed();
}
