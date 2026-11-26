part of 'truck_types_bloc.dart';

enum TruckTypesStatus { initial, loading, ready, failure }

final class TruckTypesState extends Equatable {
  const TruckTypesState({
    this.status = TruckTypesStatus.initial,
    this.items = const [],
    this.message,
  });

  final TruckTypesStatus status;
  final List<TruckType> items;
  final String? message;

  TruckTypesState copyWith({
    TruckTypesStatus? status,
    List<TruckType>? items,
    String? message,
    bool clearMessage = false,
  }) {
    return TruckTypesState(
      status: status ?? this.status,
      items: items ?? this.items,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props => [status, items, message];
}
