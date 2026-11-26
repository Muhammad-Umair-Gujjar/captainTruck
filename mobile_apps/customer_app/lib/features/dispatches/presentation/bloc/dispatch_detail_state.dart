part of 'dispatch_detail_bloc.dart';

enum DispatchDetailStatus { initial, loading, ready, failure }

final class DispatchDetailState extends Equatable {
  const DispatchDetailState({
    this.status = DispatchDetailStatus.initial,
    this.dispatch,
    this.busy = false,
    this.message,
  });

  final DispatchDetailStatus status;
  final DispatchRequest? dispatch;
  final bool busy;
  final String? message;

  DispatchDetailState copyWith({
    DispatchDetailStatus? status,
    DispatchRequest? dispatch,
    bool? busy,
    String? message,
    bool clearMessage = false,
  }) {
    return DispatchDetailState(
      status: status ?? this.status,
      dispatch: dispatch ?? this.dispatch,
      busy: busy ?? this.busy,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props => [status, dispatch, busy, message];
}
