import 'package:equatable/equatable.dart';

class RouteOption extends Equatable {
  const RouteOption({
    required this.id,
    required this.polyline,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.aiCostCents,
    required this.isRecommended,
    required this.isSelected,
  });

  final String id;
  final String polyline;
  final int distanceMeters;
  final int durationSeconds;
  final int aiCostCents;
  final bool isRecommended;
  final bool isSelected;

  factory RouteOption.fromJson(Map<String, dynamic> json) {
    return RouteOption(
      id: json['id'].toString(),
      polyline: json['polyline']?.toString() ?? '',
      distanceMeters: (json['distanceMeters'] as num?)?.toInt() ?? 0,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt() ?? 0,
      aiCostCents: (json['aiCostCents'] as num?)?.toInt() ?? 0,
      isRecommended: json['isRecommended'] == true,
      isSelected: json['isSelected'] == true,
    );
  }

  RouteOption copyWith({int? aiCostCents, bool? isSelected}) {
    return RouteOption(
      id: id,
      polyline: polyline,
      distanceMeters: distanceMeters,
      durationSeconds: durationSeconds,
      aiCostCents: aiCostCents ?? this.aiCostCents,
      isRecommended: isRecommended,
      isSelected: isSelected ?? this.isSelected,
    );
  }

  @override
  List<Object?> get props => [
        id,
        polyline,
        distanceMeters,
        durationSeconds,
        aiCostCents,
        isRecommended,
        isSelected,
      ];
}

class BillBreakdown extends Equatable {
  const BillBreakdown({
    required this.lockedBaseRateCents,
    required this.aiTripCostCents,
    required this.perTruckCents,
    required this.truckCount,
    required this.totalBillCents,
    this.flaggedOutlier = false,
    this.currency = 'PKR',
  });

  final int lockedBaseRateCents;
  final int aiTripCostCents;
  final int perTruckCents;
  final int truckCount;
  final int totalBillCents;
  final bool flaggedOutlier;
  final String currency;

  factory BillBreakdown.fromJson(Map<String, dynamic> json) {
    return BillBreakdown(
      lockedBaseRateCents:
          (json['lockedBaseRateCents'] as num?)?.toInt() ?? 0,
      aiTripCostCents: (json['aiTripCostCents'] as num?)?.toInt() ?? 0,
      perTruckCents: (json['perTruckCents'] as num?)?.toInt() ?? 0,
      truckCount: (json['truckCount'] as num?)?.toInt() ?? 1,
      totalBillCents: (json['totalBillCents'] as num?)?.toInt() ?? 0,
      flaggedOutlier: json['flaggedOutlier'] == true,
      currency: json['currency']?.toString() ?? 'PKR',
    );
  }

  @override
  List<Object?> get props => [
        lockedBaseRateCents,
        aiTripCostCents,
        perTruckCents,
        truckCount,
        totalBillCents,
        flaggedOutlier,
        currency,
      ];
}

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
    this.rejectionReason,
    this.createdAt,
    this.truckTypeName,
    this.routeOptions = const [],
    this.billBreakdown,
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
  final String? rejectionReason;
  final DateTime? createdAt;
  final String? truckTypeName;
  final List<RouteOption> routeOptions;
  final BillBreakdown? billBreakdown;

  bool get canCancel {
    const allowed = {
      'DRAFT',
      'AWAITING_ROUTE_SELECTION',
      'PENDING_ADMIN',
    };
    return allowed.contains(status);
  }

  bool get needsRouteSelection => status == 'AWAITING_ROUTE_SELECTION';

  bool get isPendingAdmin => status == 'PENDING_ADMIN';

  factory DispatchRequest.fromJson(Map<String, dynamic> json) {
    final routesRaw = json['routeOptions'];
    final billRaw = json['billBreakdown'];
    final truckTypeRaw = json['truckType'];
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
      rejectionReason: json['rejectionReason']?.toString(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
      truckTypeName: truckTypeRaw is Map
          ? truckTypeRaw['name']?.toString()
          : null,
      routeOptions: routesRaw is List
          ? routesRaw
              .whereType<Map>()
              .map((e) => RouteOption.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      billBreakdown: billRaw is Map
          ? BillBreakdown.fromJson(Map<String, dynamic>.from(billRaw))
          : null,
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
        rejectionReason,
        createdAt,
        truckTypeName,
        routeOptions,
        billBreakdown,
      ];
}

class DispatchListPage extends Equatable {
  const DispatchListPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final List<DispatchRequest> items;
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  factory DispatchListPage.fromJson(Map<String, dynamic> json) {
    final itemsRaw = json['items'];
    final meta = json['meta'] is Map
        ? Map<String, dynamic>.from(json['meta'] as Map)
        : const <String, dynamic>{};
    return DispatchListPage(
      items: itemsRaw is List
          ? itemsRaw
              .whereType<Map>()
              .map(
                (e) => DispatchRequest.fromJson(Map<String, dynamic>.from(e)),
              )
              .toList()
          : const [],
      page: (meta['page'] as num?)?.toInt() ?? 1,
      limit: (meta['limit'] as num?)?.toInt() ?? 20,
      total: (meta['total'] as num?)?.toInt() ?? 0,
      totalPages: (meta['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  @override
  List<Object?> get props => [items, page, limit, total, totalPages];
}

String formatDispatchStatus(String status) {
  return status.replaceAll('_', ' ').toLowerCase();
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
