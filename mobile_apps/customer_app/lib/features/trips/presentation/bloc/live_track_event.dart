part of 'live_track_bloc.dart';

sealed class LiveTrackEvent extends Equatable {
  const LiveTrackEvent();

  @override
  List<Object?> get props => [];
}

final class LiveTrackStarted extends LiveTrackEvent {
  const LiveTrackStarted();
}

final class LiveTrackLocationReceived extends LiveTrackEvent {
  const LiveTrackLocationReceived(this.location);
  final LiveLocation location;

  @override
  List<Object?> get props => [location];
}

final class LiveTrackStatusReceived extends LiveTrackEvent {
  const LiveTrackStatusReceived(this.payload);
  final Map<String, dynamic> payload;

  @override
  List<Object?> get props => [payload];
}

final class LiveTrackStopped extends LiveTrackEvent {
  const LiveTrackStopped();
}
