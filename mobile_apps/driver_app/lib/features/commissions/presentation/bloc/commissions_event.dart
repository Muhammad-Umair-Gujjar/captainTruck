part of 'commissions_bloc.dart';

sealed class CommissionsEvent extends Equatable {
  const CommissionsEvent();

  @override
  List<Object?> get props => [];
}

final class CommissionsStarted extends CommissionsEvent {
  const CommissionsStarted();
}

final class CommissionsFilterChanged extends CommissionsEvent {
  const CommissionsFilterChanged({required this.unconfirmedOnly});
  final bool unconfirmedOnly;

  @override
  List<Object?> get props => [unconfirmedOnly];
}
