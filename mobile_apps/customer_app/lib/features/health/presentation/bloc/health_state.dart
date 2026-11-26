part of 'health_bloc.dart';

enum HealthStatus { initial, loading, success, failure }

final class HealthState extends Equatable {
  const HealthState({
    this.status = HealthStatus.initial,
    this.data,
    this.message,
  });

  final HealthStatus status;
  final HealthData? data;
  final String? message;

  HealthState copyWith({
    HealthStatus? status,
    HealthData? data,
    String? message,
  }) {
    return HealthState(
      status: status ?? this.status,
      data: data ?? this.data,
      message: message,
    );
  }

  @override
  List<Object?> get props => [status, data, message];
}
