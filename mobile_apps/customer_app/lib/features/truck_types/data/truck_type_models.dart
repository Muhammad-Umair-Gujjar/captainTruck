import 'package:equatable/equatable.dart';

class TruckType extends Equatable {
  const TruckType({
    required this.id,
    required this.code,
    required this.name,
    required this.isActive,
    this.capacity,
    this.currentRateCents,
    this.currentRateEffectiveFrom,
  });

  final String id;
  final String code;
  final String name;
  final bool isActive;
  final String? capacity;
  final int? currentRateCents;
  final DateTime? currentRateEffectiveFrom;

  factory TruckType.fromJson(Map<String, dynamic> json) {
    return TruckType(
      id: json['id'].toString(),
      code: json['code'].toString(),
      name: json['name'].toString(),
      isActive: json['isActive'] == true,
      capacity: json['capacity']?.toString(),
      currentRateCents: json['currentRateCents'] is num
          ? (json['currentRateCents'] as num).toInt()
          : null,
      currentRateEffectiveFrom: json['currentRateEffectiveFrom'] != null
          ? DateTime.tryParse(json['currentRateEffectiveFrom'].toString())
          : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        code,
        name,
        isActive,
        capacity,
        currentRateCents,
        currentRateEffectiveFrom,
      ];
}
