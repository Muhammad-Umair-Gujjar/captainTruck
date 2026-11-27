part of 'trip_detail_bloc.dart';

enum TripDetailStatus { initial, loading, ready, failure }

final class TripDetailState extends Equatable {
  const TripDetailState({
    this.status = TripDetailStatus.initial,
    this.trip,
    this.message,
    this.busy = false,
    this.gpsSharing = false,
    this.gpsBusy = false,
    this.socketConnected = false,
    this.lastPublished,
    this.publishCount = 0,
  });

  final TripDetailStatus status;
  final TripAssignment? trip;
  final String? message;
  final bool busy;
  final bool gpsSharing;
  final bool gpsBusy;
  final bool socketConnected;
  final LiveLocation? lastPublished;
  final int publishCount;

  TripDetailState copyWith({
    TripDetailStatus? status,
    TripAssignment? trip,
    String? message,
    bool? busy,
    bool? gpsSharing,
    bool? gpsBusy,
    bool? socketConnected,
    LiveLocation? lastPublished,
    int? publishCount,
    bool clearMessage = false,
  }) {
    return TripDetailState(
      status: status ?? this.status,
      trip: trip ?? this.trip,
      message: clearMessage ? null : (message ?? this.message),
      busy: busy ?? this.busy,
      gpsSharing: gpsSharing ?? this.gpsSharing,
      gpsBusy: gpsBusy ?? this.gpsBusy,
      socketConnected: socketConnected ?? this.socketConnected,
      lastPublished: lastPublished ?? this.lastPublished,
      publishCount: publishCount ?? this.publishCount,
    );
  }

  @override
  List<Object?> get props => [
        status,
        trip,
        message,
        busy,
        gpsSharing,
        gpsBusy,
        socketConnected,
        lastPublished,
        publishCount,
      ];
}
