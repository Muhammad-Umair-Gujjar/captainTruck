part of 'my_trips_bloc.dart';

enum MyTripsStatus { initial, loading, ready, failure }

final class MyTripsState extends Equatable {
  const MyTripsState({
    this.status = MyTripsStatus.initial,
    this.items = const [],
    this.statusFilter,
    this.page = 1,
    this.totalPages = 1,
    this.total = 0,
    this.loadingMore = false,
    this.message,
  });

  final MyTripsStatus status;
  final List<TripAssignment> items;
  final String? statusFilter;
  final int page;
  final int totalPages;
  final int total;
  final bool loadingMore;
  final String? message;

  MyTripsState copyWith({
    MyTripsStatus? status,
    List<TripAssignment>? items,
    String? statusFilter,
    int? page,
    int? totalPages,
    int? total,
    bool? loadingMore,
    String? message,
    bool clearMessage = false,
    bool clearFilter = false,
  }) {
    return MyTripsState(
      status: status ?? this.status,
      items: items ?? this.items,
      statusFilter:
          clearFilter ? null : (statusFilter ?? this.statusFilter),
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      total: total ?? this.total,
      loadingMore: loadingMore ?? this.loadingMore,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props => [
        status,
        items,
        statusFilter,
        page,
        totalPages,
        total,
        loadingMore,
        message,
      ];
}
