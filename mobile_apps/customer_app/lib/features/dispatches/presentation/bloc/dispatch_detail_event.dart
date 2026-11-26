part of 'dispatch_detail_bloc.dart';

sealed class DispatchDetailEvent extends Equatable {
  const DispatchDetailEvent();

  @override
  List<Object?> get props => [];
}

final class DispatchDetailStarted extends DispatchDetailEvent {
  const DispatchDetailStarted();
}

final class DispatchDetailRefreshed extends DispatchDetailEvent {
  const DispatchDetailRefreshed();
}

final class DispatchDetailCancelRequested extends DispatchDetailEvent {
  const DispatchDetailCancelRequested();
}
