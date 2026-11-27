part of 'commissions_bloc.dart';

enum CommissionsStatus { initial, loading, ready, failure }

final class CommissionsState extends Equatable {
  const CommissionsState({
    this.status = CommissionsStatus.initial,
    this.items = const [],
    this.total = 0,
    this.unconfirmedOnly = false,
    this.message,
  });

  final CommissionsStatus status;
  final List<CommissionLedgerEntry> items;
  final int total;
  final bool unconfirmedOnly;
  final String? message;

  int get pendingTotalCents =>
      items.fold<int>(0, (sum, e) => sum + e.pendingCents);

  CommissionsState copyWith({
    CommissionsStatus? status,
    List<CommissionLedgerEntry>? items,
    int? total,
    bool? unconfirmedOnly,
    String? message,
    bool clearMessage = false,
  }) {
    return CommissionsState(
      status: status ?? this.status,
      items: items ?? this.items,
      total: total ?? this.total,
      unconfirmedOnly: unconfirmedOnly ?? this.unconfirmedOnly,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props =>
      [status, items, total, unconfirmedOnly, message];
}
