import 'package:equatable/equatable.dart';

class HealthData extends Equatable {
  const HealthData({
    required this.status,
    this.phase,
    this.database,
    this.uptimeSeconds,
  });

  final String status;
  final Object? phase;
  final String? database;
  final int? uptimeSeconds;

  factory HealthData.fromJson(Map<String, dynamic> json) {
    return HealthData(
      status: (json['status'] ?? 'unknown').toString(),
      phase: json['phase'],
      database: json['database']?.toString(),
      uptimeSeconds: json['uptimeSeconds'] is int
          ? json['uptimeSeconds'] as int
          : int.tryParse('${json['uptimeSeconds']}'),
    );
  }

  @override
  List<Object?> get props => [status, phase, database, uptimeSeconds];
}
