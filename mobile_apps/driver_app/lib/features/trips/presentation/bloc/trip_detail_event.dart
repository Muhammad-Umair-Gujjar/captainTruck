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
