part of 'live_track_bloc.dart';

enum LiveTrackStatus { initial, loading, live, failure }

final class LiveTrackState extends Equatable {
  const LiveTrackState({
    this.status = LiveTrackStatus.initial,
    this.trip,
    this.location,
    this.socketConnected = false,
    this.message,
    this.lastStatusPayload,
  });

  final LiveTrackStatus status;
  final TripDetail? trip;
  final LiveLocation? location;
  final bool socketConnected;
  final String? message;
  final Map<String, dynamic>? lastStatusPayload;

  LiveTrackState copyWith({
    LiveTrackStatus? status,
    TripDetail? trip,
    LiveLocation? location,
    bool? socketConnected,
    String? message,
    Map<String, dynamic>? lastStatusPayload,
    bool clearMessage = false,
  }) {
    return LiveTrackState(
      status: status ?? this.status,
      trip: trip ?? this.trip,
      location: location ?? this.location,
      socketConnected: socketConnected ?? this.socketConnected,
      message: clearMessage ? null : (message ?? this.message),
      lastStatusPayload: lastStatusPayload ?? this.lastStatusPayload,
    );
  }

  @override
  List<Object?> get props => [
        status,
        trip,
        location,
        socketConnected,
        message,
        lastStatusPayload,
      ];
}
