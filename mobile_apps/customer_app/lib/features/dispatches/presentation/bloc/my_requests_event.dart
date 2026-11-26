part of 'my_requests_bloc.dart';

sealed class MyRequestsEvent extends Equatable {
  const MyRequestsEvent();

  @override
  List<Object?> get props => [];
}

final class MyRequestsStarted extends MyRequestsEvent {
  const MyRequestsStarted();
}

final class MyRequestsRefreshed extends MyRequestsEvent {
  const MyRequestsRefreshed();
}

final class MyRequestsFilterChanged extends MyRequestsEvent {
  const MyRequestsFilterChanged(this.status);
  final String? status;

  @override
  List<Object?> get props => [status];
}

final class MyRequestsLoadMore extends MyRequestsEvent {
  const MyRequestsLoadMore();
}
