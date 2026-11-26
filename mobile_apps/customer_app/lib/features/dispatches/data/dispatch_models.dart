import 'package:equatable/equatable.dart';

class DispatchRequest extends Equatable {
  const DispatchRequest({
    required this.id,
    required this.truckTypeId,
    required this.status,
    required this.truckCount,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.paymentMethod,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.lockedBaseRateCents,
    this.notes,
  });

  final String id;
  final String truckTypeId;
  final String status;
  final int truckCount;
  final String pickupAddress;
  final String dropoffAddress;
  final String paymentMethod;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final int? lockedBaseRateCents;
  final String? notes;

  factory DispatchRequest.fromJson(Map<String, dynamic> json) {
    return DispatchRequest(
      id: json['id'].toString(),
      truckTypeId: json['truckTypeId'].toString(),
      status: json['status'].toString(),
      truckCount: (json['truckCount'] as num?)?.toInt() ?? 1,
      pickupAddress: json['pickupAddress']?.toString() ?? '',
      dropoffAddress: json['dropoffAddress']?.toString() ?? '',
      paymentMethod: json['paymentMethod']?.toString() ?? 'CASH',
      pickupLat: (json['pickupLat'] as num?)?.toDouble(),
      pickupLng: (json['pickupLng'] as num?)?.toDouble(),
      dropoffLat: (json['dropoffLat'] as num?)?.toDouble(),
      dropoffLng: (json['dropoffLng'] as num?)?.toDouble(),
      lockedBaseRateCents: (json['lockedBaseRateCents'] as num?)?.toInt(),
      notes: json['notes']?.toString(),
    );
  }

  @override
  List<Object?> get props => [
        id,
        truckTypeId,
        status,
        truckCount,
        pickupAddress,
        dropoffAddress,
        paymentMethod,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        lockedBaseRateCents,
        notes,
      ];
}

class CreateDispatchInput extends Equatable {
  const CreateDispatchInput({
    required this.truckTypeId,
    required this.truckCount,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropoffLat,
    required this.dropoffLng,
    this.notes,
    this.paymentMethod = 'CASH',
    this.asDraft = false,
  });

  final String truckTypeId;
  final int truckCount;
  final String pickupAddress;
  final String dropoffAddress;
  final double pickupLat;
  final double pickupLng;
  final double dropoffLat;
  final double dropoffLng;
  final String? notes;
  final String paymentMethod;
  final bool asDraft;

  Map<String, dynamic> toJson() => {
        'truckTypeId': truckTypeId,
        'truckCount': truckCount,
        'pickupAddress': pickupAddress.trim(),
        'dropoffAddress': dropoffAddress.trim(),
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'dropoffLat': dropoffLat,
        'dropoffLng': dropoffLng,
        'paymentMethod': paymentMethod,
        'asDraft': asDraft,
        if (notes != null && notes!.trim().isNotEmpty) 'notes': notes!.trim(),
      };

  @override
  List<Object?> get props => [
        truckTypeId,
        truckCount,
        pickupAddress,
        dropoffAddress,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        notes,
        paymentMethod,
        asDraft,
      ];
}
