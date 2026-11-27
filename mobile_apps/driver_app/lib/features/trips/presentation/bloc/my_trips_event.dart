part of 'my_trips_bloc.dart';

sealed class MyTripsEvent extends Equatable {
  const MyTripsEvent();

  @override
  List<Object?> get props => [];
}

final class MyTripsStarted extends MyTripsEvent {
  const MyTripsStarted();
}

final class MyTripsRefreshed extends MyTripsEvent {
  const MyTripsRefreshed();
}

final class MyTripsFilterChanged extends MyTripsEvent {
  const MyTripsFilterChanged(this.status);

  final String? status;

  @override
  List<Object?> get props => [status];
}

final class MyTripsLoadMore extends MyTripsEvent {
  const MyTripsLoadMore();
}
