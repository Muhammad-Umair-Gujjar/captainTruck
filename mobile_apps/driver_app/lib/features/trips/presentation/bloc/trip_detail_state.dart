part of 'trip_detail_bloc.dart';

enum TripDetailStatus { initial, loading, ready, failure }

final class TripDetailState extends Equatable {
  const TripDetailState({
    this.status = TripDetailStatus.initial,
    this.trip,
    this.message,
  });

  final TripDetailStatus status;
  final TripAssignment? trip;
  final String? message;

  TripDetailState copyWith({
    TripDetailStatus? status,
    TripAssignment? trip,
    String? message,
    bool clearMessage = false,
  }) {
    return TripDetailState(
      status: status ?? this.status,
      trip: trip ?? this.trip,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props => [status, trip, message];
}
