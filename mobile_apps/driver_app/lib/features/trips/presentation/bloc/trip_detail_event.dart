part of 'trip_detail_bloc.dart';

sealed class TripDetailEvent extends Equatable {
  const TripDetailEvent();

  @override
  List<Object?> get props => [];
}

final class TripDetailStarted extends TripDetailEvent {
  const TripDetailStarted();
}

final class TripDetailRefreshed extends TripDetailEvent {
  const TripDetailRefreshed();
}

final class TripDetailAdvanceRequested extends TripDetailEvent {
  const TripDetailAdvanceRequested(this.nextStatus);

  final String nextStatus;

  @override
  List<Object?> get props => [nextStatus];
}

final class TripDetailGpsStartRequested extends TripDetailEvent {
  const TripDetailGpsStartRequested();
}

final class TripDetailGpsStopRequested extends TripDetailEvent {
  const TripDetailGpsStopRequested();
}

final class TripDetailGpsPositionReceived extends TripDetailEvent {
  const TripDetailGpsPositionReceived(this.position);

  final DevicePosition position;

  @override
  List<Object?> get props => [position];
}
