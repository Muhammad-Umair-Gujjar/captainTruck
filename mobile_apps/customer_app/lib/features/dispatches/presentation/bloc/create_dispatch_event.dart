part of 'create_dispatch_bloc.dart';

sealed class CreateDispatchEvent extends Equatable {
  const CreateDispatchEvent();

  @override
  List<Object?> get props => [];
}

final class CreateDispatchTruckTypeChanged extends CreateDispatchEvent {
  const CreateDispatchTruckTypeChanged(this.truckTypeId);
  final String truckTypeId;

  @override
  List<Object?> get props => [truckTypeId];
}

final class CreateDispatchTruckCountChanged extends CreateDispatchEvent {
  const CreateDispatchTruckCountChanged(this.count);
  final int count;

  @override
  List<Object?> get props => [count];
}

final class CreateDispatchPinModeChanged extends CreateDispatchEvent {
  const CreateDispatchPinModeChanged(this.mode);
  final DispatchPinMode mode;

  @override
  List<Object?> get props => [mode];
}

final class CreateDispatchMapTapped extends CreateDispatchEvent {
  const CreateDispatchMapTapped(this.point);
  final LatLng point;

  @override
  List<Object?> get props => [point];
}

final class CreateDispatchPickupAddressChanged extends CreateDispatchEvent {
  const CreateDispatchPickupAddressChanged(this.value);
  final String value;

  @override
  List<Object?> get props => [value];
}

final class CreateDispatchDropoffAddressChanged extends CreateDispatchEvent {
  const CreateDispatchDropoffAddressChanged(this.value);
  final String value;

  @override
  List<Object?> get props => [value];
}

final class CreateDispatchNotesChanged extends CreateDispatchEvent {
  const CreateDispatchNotesChanged(this.value);
  final String value;

  @override
  List<Object?> get props => [value];
}

final class CreateDispatchSearchRequested extends CreateDispatchEvent {
  const CreateDispatchSearchRequested({
    required this.query,
    required this.target,
  });

  final String query;
  final DispatchPinMode target;

  @override
  List<Object?> get props => [query, target];
}

final class CreateDispatchSuggestionSelected extends CreateDispatchEvent {
  const CreateDispatchSuggestionSelected({
    required this.suggestion,
    required this.target,
  });

  final PlaceSuggestion suggestion;
  final DispatchPinMode target;

  @override
  List<Object?> get props => [suggestion, target];
}

final class CreateDispatchSubmitted extends CreateDispatchEvent {
  const CreateDispatchSubmitted();
}
