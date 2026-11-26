part of 'create_dispatch_bloc.dart';

enum CreateDispatchStatus { editing, submitting, success, failure }

enum DispatchPinMode { pickup, dropoff }

final class CreateDispatchState extends Equatable {
  const CreateDispatchState({
    this.status = CreateDispatchStatus.editing,
    this.truckTypes = const [],
    this.truckTypeId,
    this.truckCount = 1,
    this.pinMode = DispatchPinMode.pickup,
    this.pickup,
    this.dropoff,
    this.pickupAddress = '',
    this.dropoffAddress = '',
    this.notes = '',
    this.suggestions = const [],
    this.searchTarget,
    this.searching = false,
    this.created,
    this.message,
  });

  final CreateDispatchStatus status;
  final List<TruckType> truckTypes;
  final String? truckTypeId;
  final int truckCount;
  final DispatchPinMode pinMode;
  final LatLng? pickup;
  final LatLng? dropoff;
  final String pickupAddress;
  final String dropoffAddress;
  final String notes;
  final List<PlaceSuggestion> suggestions;
  final DispatchPinMode? searchTarget;
  final bool searching;
  final DispatchRequest? created;
  final String? message;

  String? get validationError {
    if (truckTypeId == null || truckTypeId!.isEmpty) {
      return 'Select a truck type';
    }
    if (pickup == null || dropoff == null) {
      return 'Tap the map to set pickup and dropoff pins';
    }
    if (pickupAddress.trim().length < 3 || dropoffAddress.trim().length < 3) {
      return 'Pickup and dropoff addresses need at least 3 characters';
    }
    if (pickupAddress.trim().toLowerCase() ==
        dropoffAddress.trim().toLowerCase()) {
      return 'Pickup and dropoff must be different';
    }
    if (pickup!.latitude == dropoff!.latitude &&
        pickup!.longitude == dropoff!.longitude) {
      return 'Pickup and dropoff pins must differ';
    }
    return null;
  }

  bool get canSubmit =>
      validationError == null && status != CreateDispatchStatus.submitting;

  CreateDispatchState copyWith({
    CreateDispatchStatus? status,
    List<TruckType>? truckTypes,
    String? truckTypeId,
    int? truckCount,
    DispatchPinMode? pinMode,
    LatLng? pickup,
    LatLng? dropoff,
    String? pickupAddress,
    String? dropoffAddress,
    String? notes,
    List<PlaceSuggestion>? suggestions,
    DispatchPinMode? searchTarget,
    bool? searching,
    DispatchRequest? created,
    String? message,
    bool clearMessage = false,
    bool clearSuggestions = false,
  }) {
    return CreateDispatchState(
      status: status ?? this.status,
      truckTypes: truckTypes ?? this.truckTypes,
      truckTypeId: truckTypeId ?? this.truckTypeId,
      truckCount: truckCount ?? this.truckCount,
      pinMode: pinMode ?? this.pinMode,
      pickup: pickup ?? this.pickup,
      dropoff: dropoff ?? this.dropoff,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      dropoffAddress: dropoffAddress ?? this.dropoffAddress,
      notes: notes ?? this.notes,
      suggestions: clearSuggestions ? const [] : (suggestions ?? this.suggestions),
      searchTarget: searchTarget ?? this.searchTarget,
      searching: searching ?? this.searching,
      created: created ?? this.created,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props => [
        status,
        truckTypes,
        truckTypeId,
        truckCount,
        pinMode,
        pickup,
        dropoff,
        pickupAddress,
        dropoffAddress,
        notes,
        suggestions,
        searchTarget,
        searching,
        created,
        message,
      ];
}
