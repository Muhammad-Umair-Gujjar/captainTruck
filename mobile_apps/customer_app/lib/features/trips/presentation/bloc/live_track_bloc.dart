import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/realtime/realtime_client.dart';
import '../../data/trip_models.dart';
import '../../data/trips_repository.dart';

part 'live_track_event.dart';
part 'live_track_state.dart';

class LiveTrackBloc extends Bloc<LiveTrackEvent, LiveTrackState> {
  LiveTrackBloc({
    required this.repository,
    required this.realtime,
    required this.tripId,
  }) : super(const LiveTrackState()) {
    on<LiveTrackStarted>(_onStarted);
    on<LiveTrackLocationReceived>(_onLocation);
    on<LiveTrackStatusReceived>(_onStatus);
    on<LiveTrackStopped>(_onStopped);
  }

  final TripsRepository repository;
  final RealtimeClient realtime;
  final String tripId;

  StreamSubscription<LiveLocation>? _locSub;
  StreamSubscription<Map<String, dynamic>>? _statusSub;

  Future<void> _onStarted(
    LiveTrackStarted event,
    Emitter<LiveTrackState> emit,
  ) async {
    emit(state.copyWith(status: LiveTrackStatus.loading, clearMessage: true));
    try {
      final trip = await repository.getById(tripId);
      LiveLocation? location = trip.liveLocation;
      location ??= await repository.getLocation(tripId);

      await _locSub?.cancel();
      await _statusSub?.cancel();
      _locSub = realtime.locationUpdates.listen((loc) {
        if (loc.tripId == tripId) {
          add(LiveTrackLocationReceived(loc));
        }
      });
      _statusSub = realtime.tripStatusUpdates.listen((payload) {
        final id = payload['tripId']?.toString();
        if (id == null || id == tripId) {
          add(LiveTrackStatusReceived(payload));
        }
      });

      final joined = await realtime.joinTrip(tripId);
      location = joined ?? location;

      emit(
        state.copyWith(
          status: LiveTrackStatus.live,
          trip: trip,
          location: location,
          socketConnected: realtime.isConnected,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: LiveTrackStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  void _onLocation(
    LiveTrackLocationReceived event,
    Emitter<LiveTrackState> emit,
  ) {
    emit(
      state.copyWith(
        location: event.location,
        status: LiveTrackStatus.live,
        socketConnected: true,
      ),
    );
  }

  void _onStatus(
    LiveTrackStatusReceived event,
    Emitter<LiveTrackState> emit,
  ) {
    final nextStatus = event.payload['status']?.toString();
    final trip = state.trip;
    if (trip == null || nextStatus == null) {
      emit(state.copyWith(lastStatusPayload: event.payload));
      return;
    }
    emit(
      state.copyWith(
        trip: TripDetail(
          id: trip.id,
          requestId: trip.requestId,
          driverId: trip.driverId,
          status: nextStatus,
          finalBillCents: trip.finalBillCents,
          lastLat: trip.lastLat,
          lastLng: trip.lastLng,
          lastLocationAt: trip.lastLocationAt,
          driver: trip.driver,
          liveLocation: state.location,
        ),
        lastStatusPayload: event.payload,
      ),
    );
  }

  Future<void> _onStopped(
    LiveTrackStopped event,
    Emitter<LiveTrackState> emit,
  ) async {
    await _locSub?.cancel();
    await _statusSub?.cancel();
    _locSub = null;
    _statusSub = null;
    try {
      await realtime.leaveTrip(tripId);
    } catch (_) {}
    emit(state.copyWith(socketConnected: false));
  }

  @override
  Future<void> close() async {
    await _locSub?.cancel();
    await _statusSub?.cancel();
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
