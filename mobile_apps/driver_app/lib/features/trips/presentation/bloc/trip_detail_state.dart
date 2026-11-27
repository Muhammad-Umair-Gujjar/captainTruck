part of 'trip_detail_bloc.dart';

enum TripDetailStatus { initial, loading, ready, failure }

final class TripDetailState extends Equatable {
  const TripDetailState({
    this.status = TripDetailStatus.initial,
    this.trip,
    this.message,
    this.busy = false,
  });

  final TripDetailStatus status;
  final TripAssignment? trip;
  final String? message;
  final bool busy;

  TripDetailState copyWith({
    TripDetailStatus? status,
    TripAssignment? trip,
    String? message,
    bool? busy,
    bool clearMessage = false,
  }) {
    return TripDetailState(
      status: status ?? this.status,
      trip: trip ?? this.trip,
      message: clearMessage ? null : (message ?? this.message),
      busy: busy ?? this.busy,
    );
  }

  @override
  List<Object?> get props => [status, trip, message, busy];
}
