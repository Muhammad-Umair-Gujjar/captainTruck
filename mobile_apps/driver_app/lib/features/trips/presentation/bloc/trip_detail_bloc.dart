import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/location/device_location_source.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/realtime/realtime_client.dart';
import '../../data/trip_models.dart';
import '../../data/trips_repository.dart';

part 'trip_detail_event.dart';
part 'trip_detail_state.dart';

/// Nest GPS throttle floor (seconds).
const kLocationThrottleSeconds = 3;

class TripDetailBloc extends Bloc<TripDetailEvent, TripDetailState> {
  TripDetailBloc({
    required this.repository,
    required this.tripId,
    required this.realtime,
    required this.locationSource,
  }) : super(const TripDetailState()) {
    on<TripDetailStarted>(_onLoad);
    on<TripDetailRefreshed>(_onLoad);
    on<TripDetailAdvanceRequested>(_onAdvance);
    on<TripDetailGpsStartRequested>(_onGpsStart);
    on<TripDetailGpsStopRequested>(_onGpsStop);
    on<TripDetailGpsPositionReceived>(_onGpsPosition);
  }

  final TripsRepository repository;
  final String tripId;
  final RealtimeClient realtime;
  final DeviceLocationSource locationSource;

  StreamSubscription<DevicePosition>? _posSub;
  DateTime? _lastSentAt;

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
          lastPublished: trip.liveLocation,
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

  Future<void> _onAdvance(
    TripDetailAdvanceRequested event,
    Emitter<TripDetailState> emit,
  ) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final trip = await repository.updateStatus(
        tripId: tripId,
        status: event.nextStatus,
      );
      emit(
        state.copyWith(
          status: TripDetailStatus.ready,
          trip: trip,
          busy: false,
          message: 'Status → ${formatTripStatus(trip.status)}',
        ),
      );
      if (!trip.allowsGps && state.gpsSharing) {
        await _stopGpsInternal(emit, message: 'GPS stopped (trip sealed)');
      }
    } catch (e) {
      emit(
        state.copyWith(
          busy: false,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onGpsStart(
    TripDetailGpsStartRequested event,
    Emitter<TripDetailState> emit,
  ) async {
    final trip = state.trip;
    if (trip == null || !trip.allowsGps) {
      emit(
        state.copyWith(
          message: 'GPS only while trip is active',
        ),
      );
      return;
    }

    emit(state.copyWith(gpsBusy: true, clearMessage: true));
    try {
      final ok = await locationSource.ensurePermission();
      if (!ok) {
        emit(
          state.copyWith(
            gpsBusy: false,
            message: 'Location permission denied',
          ),
        );
        return;
      }

      await realtime.joinTrip(tripId);
      await _posSub?.cancel();
      _posSub = locationSource.watchPositions().listen((pos) {
        add(TripDetailGpsPositionReceived(pos));
      });

      emit(
        state.copyWith(
          gpsSharing: true,
          gpsBusy: false,
          socketConnected: realtime.isConnected,
          message: 'GPS sharing on',
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          gpsBusy: false,
          gpsSharing: false,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onGpsStop(
    TripDetailGpsStopRequested event,
    Emitter<TripDetailState> emit,
  ) async {
    await _stopGpsInternal(emit, message: 'GPS sharing off');
  }

  Future<void> _stopGpsInternal(
    Emitter<TripDetailState> emit, {
    String? message,
  }) async {
    await _posSub?.cancel();
    _posSub = null;
    try {
      await realtime.leaveTrip(tripId);
    } catch (_) {}
    emit(
      state.copyWith(
        gpsSharing: false,
        gpsBusy: false,
        message: message,
      ),
    );
  }

  Future<void> _onGpsPosition(
    TripDetailGpsPositionReceived event,
    Emitter<TripDetailState> emit,
  ) async {
    if (!state.gpsSharing) return;

    final now = DateTime.now();
    final last = _lastSentAt;
    if (last != null &&
        now.difference(last) <
            const Duration(seconds: kLocationThrottleSeconds)) {
      return;
    }
    _lastSentAt = now;

    final pos = event.position;
    try {
      LiveLocation? published;
      try {
        published = await realtime.updateLocation(
          tripId: tripId,
          lat: pos.lat,
          lng: pos.lng,
          heading: pos.heading,
          speedMps: pos.speedMps,
        );
      } catch (_) {
        published = await repository.updateLocation(
          tripId: tripId,
          lat: pos.lat,
          lng: pos.lng,
          heading: pos.heading,
          speedMps: pos.speedMps,
        );
      }

      final trip = state.trip;
      emit(
        state.copyWith(
          lastPublished: published,
          socketConnected: realtime.isConnected,
          trip: trip?.copyWith(
            lastLat: published?.lat ?? pos.lat,
            lastLng: published?.lng ?? pos.lng,
            lastLocationAt: published?.updatedAt ?? pos.timestamp,
            liveLocation: published,
          ),
          publishCount: state.publishCount + 1,
        ),
      );
    } catch (e) {
      emit(state.copyWith(message: _msg(e)));
    }
  }

  @override
  Future<void> close() async {
    await _posSub?.cancel();
    try {
      await realtime.leaveTrip(tripId);
    } catch (_) {}
    return super.close();
  }

  String _msg(Object e) {
    if (e is ApiException) return e.toString();
    return e.toString();
  }
}
