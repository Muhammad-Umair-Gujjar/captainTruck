import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/network/api_exception.dart';
import '../../../places/data/place_models.dart';
import '../../../places/data/places_repository.dart';
import '../../../truck_types/data/truck_type_models.dart';
import '../../data/dispatch_models.dart';
import '../../data/dispatches_repository.dart';

part 'create_dispatch_event.dart';
part 'create_dispatch_state.dart';

class CreateDispatchBloc
    extends Bloc<CreateDispatchEvent, CreateDispatchState> {
  CreateDispatchBloc({
    required DispatchesRepository dispatchesRepository,
    required PlacesRepository placesRepository,
    List<TruckType> truckTypes = const [],
  })  : _dispatches = dispatchesRepository,
        _places = placesRepository,
        super(
          CreateDispatchState(
            truckTypes: truckTypes,
            truckTypeId: truckTypes.isNotEmpty ? truckTypes.first.id : null,
          ),
        ) {
    on<CreateDispatchTruckTypeChanged>(_onTruckType);
    on<CreateDispatchTruckCountChanged>(_onTruckCount);
    on<CreateDispatchPinModeChanged>(_onPinMode);
    on<CreateDispatchMapTapped>(_onMapTap);
    on<CreateDispatchPickupAddressChanged>(_onPickupAddress);
    on<CreateDispatchDropoffAddressChanged>(_onDropoffAddress);
    on<CreateDispatchNotesChanged>(_onNotes);
    on<CreateDispatchSearchRequested>(_onSearch);
    on<CreateDispatchSuggestionSelected>(_onSuggestion);
    on<CreateDispatchSubmitted>(_onSubmit);
  }

  final DispatchesRepository _dispatches;
  final PlacesRepository _places;

  void _onTruckType(
    CreateDispatchTruckTypeChanged event,
    Emitter<CreateDispatchState> emit,
  ) {
    emit(state.copyWith(truckTypeId: event.truckTypeId, clearMessage: true));
  }

  void _onTruckCount(
    CreateDispatchTruckCountChanged event,
    Emitter<CreateDispatchState> emit,
  ) {
    final n = event.count.clamp(1, 20);
    emit(state.copyWith(truckCount: n, clearMessage: true));
  }

  void _onPinMode(
    CreateDispatchPinModeChanged event,
    Emitter<CreateDispatchState> emit,
  ) {
    emit(state.copyWith(pinMode: event.mode, clearMessage: true));
  }

  void _onMapTap(
    CreateDispatchMapTapped event,
    Emitter<CreateDispatchState> emit,
  ) {
    final label =
        '${event.point.latitude.toStringAsFixed(5)}, ${event.point.longitude.toStringAsFixed(5)}';
    if (state.pinMode == DispatchPinMode.pickup) {
      emit(
        state.copyWith(
          pickup: event.point,
          pickupAddress: state.pickupAddress.trim().length >= 3
              ? state.pickupAddress
              : label,
          pinMode: DispatchPinMode.dropoff,
          clearMessage: true,
          clearSuggestions: true,
        ),
      );
    } else {
      emit(
        state.copyWith(
          dropoff: event.point,
          dropoffAddress: state.dropoffAddress.trim().length >= 3
              ? state.dropoffAddress
              : label,
          clearMessage: true,
          clearSuggestions: true,
        ),
      );
    }
  }

  void _onPickupAddress(
    CreateDispatchPickupAddressChanged event,
    Emitter<CreateDispatchState> emit,
  ) {
    emit(state.copyWith(pickupAddress: event.value, clearMessage: true));
  }

  void _onDropoffAddress(
    CreateDispatchDropoffAddressChanged event,
    Emitter<CreateDispatchState> emit,
  ) {
    emit(state.copyWith(dropoffAddress: event.value, clearMessage: true));
  }

  void _onNotes(
    CreateDispatchNotesChanged event,
    Emitter<CreateDispatchState> emit,
  ) {
    emit(state.copyWith(notes: event.value, clearMessage: true));
  }

  Future<void> _onSearch(
    CreateDispatchSearchRequested event,
    Emitter<CreateDispatchState> emit,
  ) async {
    emit(
      state.copyWith(
        searching: true,
        searchTarget: event.target,
        clearMessage: true,
      ),
    );
    try {
      final items = await _places.autocomplete(event.query);
      emit(
        state.copyWith(
          searching: false,
          suggestions: items,
          searchTarget: event.target,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          searching: false,
          clearSuggestions: true,
          message: _msg(e),
        ),
      );
    }
  }

  void _onSuggestion(
    CreateDispatchSuggestionSelected event,
    Emitter<CreateDispatchState> emit,
  ) {
    final point = LatLng(event.suggestion.lat, event.suggestion.lng);
    if (event.target == DispatchPinMode.pickup) {
      emit(
        state.copyWith(
          pickup: point,
          pickupAddress: event.suggestion.displayName,
          pinMode: DispatchPinMode.dropoff,
          clearSuggestions: true,
          clearMessage: true,
        ),
      );
    } else {
      emit(
        state.copyWith(
          dropoff: point,
          dropoffAddress: event.suggestion.displayName,
          clearSuggestions: true,
          clearMessage: true,
        ),
      );
    }
  }

  Future<void> _onSubmit(
    CreateDispatchSubmitted event,
    Emitter<CreateDispatchState> emit,
  ) async {
    final error = state.validationError;
    if (error != null) {
      emit(state.copyWith(message: error));
      return;
    }

    emit(
      state.copyWith(
        status: CreateDispatchStatus.submitting,
        clearMessage: true,
      ),
    );
    try {
      final created = await _dispatches.create(
        CreateDispatchInput(
          truckTypeId: state.truckTypeId!,
          truckCount: state.truckCount,
          pickupAddress: state.pickupAddress,
          dropoffAddress: state.dropoffAddress,
          pickupLat: state.pickup!.latitude,
          pickupLng: state.pickup!.longitude,
          dropoffLat: state.dropoff!.latitude,
          dropoffLng: state.dropoff!.longitude,
          notes: state.notes,
        ),
      );
      emit(
        state.copyWith(
          status: CreateDispatchStatus.success,
          created: created,
          message: 'Request created · ${created.status}',
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: CreateDispatchStatus.failure,
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
