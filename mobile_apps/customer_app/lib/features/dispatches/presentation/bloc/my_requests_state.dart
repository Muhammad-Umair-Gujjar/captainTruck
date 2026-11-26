part of 'my_requests_bloc.dart';

enum MyRequestsStatus { initial, loading, ready, failure }

final class MyRequestsState extends Equatable {
  const MyRequestsState({
    this.status = MyRequestsStatus.initial,
    this.items = const [],
    this.statusFilter,
    this.page = 1,
    this.totalPages = 1,
    this.total = 0,
    this.loadingMore = false,
    this.message,
  });

  final MyRequestsStatus status;
  final List<DispatchRequest> items;
  final String? statusFilter;
  final int page;
  final int totalPages;
  final int total;
  final bool loadingMore;
  final String? message;

  bool get hasMore => page < totalPages;

  MyRequestsState copyWith({
    MyRequestsStatus? status,
    List<DispatchRequest>? items,
    String? statusFilter,
    int? page,
    int? totalPages,
    int? total,
    bool? loadingMore,
    String? message,
    bool clearMessage = false,
    bool clearFilter = false,
  }) {
    return MyRequestsState(
      status: status ?? this.status,
      items: items ?? this.items,
      statusFilter: clearFilter ? null : (statusFilter ?? this.statusFilter),
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
