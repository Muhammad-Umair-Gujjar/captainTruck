import 'package:equatable/equatable.dart';

class TripCustomer extends Equatable {
  const TripCustomer({
    required this.id,
    required this.fullName,
    this.phone,
    this.email,
  });

  final String id;
  final String fullName;
  final String? phone;
  final String? email;

  factory TripCustomer.fromJson(Map<String, dynamic> json) {
    return TripCustomer(
      id: json['id'].toString(),
      fullName: json['fullName']?.toString() ?? 'Customer',
      phone: json['phone']?.toString(),
      email: json['email']?.toString(),
    );
  }

  @override
  List<Object?> get props => [id, fullName, phone, email];
}

class TripTruckType extends Equatable {
  const TripTruckType({
    required this.id,
    required this.name,
    this.code,
  });

  final String id;
  final String name;
  final String? code;

  factory TripTruckType.fromJson(Map<String, dynamic> json) {
    return TripTruckType(
      id: json['id'].toString(),
      name: json['name']?.toString() ?? 'Truck',
      code: json['code']?.toString(),
    );
  }

  @override
  List<Object?> get props => [id, name, code];
}

class TripRequestSummary extends Equatable {
  const TripRequestSummary({
    required this.id,
    required this.pickupAddress,
    required this.dropoffAddress,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.notes,
    this.paymentMethod,
    this.customer,
    this.truckType,
    this.selectedRouteAiCostCents,
  });

  final String id;
  final String pickupAddress;
  final String dropoffAddress;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? notes;
  final String? paymentMethod;
  final TripCustomer? customer;
  final TripTruckType? truckType;
  final int? selectedRouteAiCostCents;

  factory TripRequestSummary.fromJson(Map<String, dynamic> json) {
    final customerRaw = json['customer'];
    final truckRaw = json['truckType'];
    final routes = json['routeOptions'];
    int? aiCost;
    if (routes is List && routes.isNotEmpty) {
      final first = routes.first;
      if (first is Map) {
        aiCost = (first['aiCostCents'] as num?)?.toInt();
      }
    }
    return TripRequestSummary(
      id: json['id'].toString(),
      pickupAddress: json['pickupAddress']?.toString() ?? '—',
      dropoffAddress: json['dropoffAddress']?.toString() ?? '—',
      pickupLat: (json['pickupLat'] as num?)?.toDouble(),
      pickupLng: (json['pickupLng'] as num?)?.toDouble(),
      dropoffLat: (json['dropoffLat'] as num?)?.toDouble(),
      dropoffLng: (json['dropoffLng'] as num?)?.toDouble(),
      notes: json['notes']?.toString(),
      paymentMethod: json['paymentMethod']?.toString(),
      customer: customerRaw is Map
          ? TripCustomer.fromJson(Map<String, dynamic>.from(customerRaw))
          : null,
      truckType: truckRaw is Map
          ? TripTruckType.fromJson(Map<String, dynamic>.from(truckRaw))
          : null,
      selectedRouteAiCostCents: aiCost,
    );
  }

  @override
  List<Object?> get props => [
        id,
        pickupAddress,
        dropoffAddress,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        notes,
        paymentMethod,
        customer,
        truckType,
        selectedRouteAiCostCents,
      ];
}

class LiveLocation extends Equatable {
  const LiveLocation({
    required this.tripId,
    required this.lat,
    required this.lng,
    required this.updatedAt,
    this.heading,
    this.speedMps,
    this.stale = false,
    this.sealed = false,
  });

  final String tripId;
  final double lat;
  final double lng;
  final DateTime updatedAt;
  final double? heading;
  final double? speedMps;
  final bool stale;
  final bool sealed;

  factory LiveLocation.fromJson(Map<String, dynamic> json) {
    return LiveLocation(
      tripId: json['tripId'].toString(),
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      heading: (json['heading'] as num?)?.toDouble(),
      speedMps: (json['speedMps'] as num?)?.toDouble(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      stale: json['stale'] == true,
      sealed: json['sealed'] == true,
    );
  }

  @override
  List<Object?> get props =>
      [tripId, lat, lng, heading, speedMps, updatedAt, stale, sealed];
}

class TripAssignment extends Equatable {
  const TripAssignment({
    required this.id,
    required this.requestId,
    required this.driverId,
    required this.status,
    this.finalBillCents,
    this.lastLat,
    this.lastLng,
    this.lastLocationAt,
    this.startedAt,
    this.completedAt,
    this.createdAt,
    this.request,
    this.liveLocation,
  });

  final String id;
  final String requestId;
  final String driverId;
  final String status;
  final int? finalBillCents;
  final double? lastLat;
  final double? lastLng;
  final DateTime? lastLocationAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? createdAt;
  final TripRequestSummary? request;
  final LiveLocation? liveLocation;

  bool get isActive {
    const active = {
      'ASSIGNED',
      'EN_ROUTE_PICKUP',
      'ARRIVED_PICKUP',
      'IN_TRANSIT',
      'DELIVERED',
    };
    return active.contains(status);
  }

  bool get allowsGps => isActive;

  factory TripAssignment.fromJson(Map<String, dynamic> json) {
    final requestRaw = json['request'];
    final liveRaw = json['liveLocation'];
    return TripAssignment(
      id: json['id'].toString(),
      requestId: json['requestId'].toString(),
      driverId: json['driverId'].toString(),
      status: json['status'].toString(),
      finalBillCents: (json['finalBillCents'] as num?)?.toInt(),
      lastLat: (json['lastLat'] as num?)?.toDouble(),
      lastLng: (json['lastLng'] as num?)?.toDouble(),
      lastLocationAt: _parseDate(json['lastLocationAt']),
      startedAt: _parseDate(json['startedAt']),
      completedAt: _parseDate(json['completedAt']),
      createdAt: _parseDate(json['createdAt']),
      request: requestRaw is Map
          ? TripRequestSummary.fromJson(Map<String, dynamic>.from(requestRaw))
          : null,
      liveLocation: liveRaw is Map
          ? LiveLocation.fromJson(Map<String, dynamic>.from(liveRaw))
          : null,
    );
  }

  TripAssignment copyWith({
    String? status,
    double? lastLat,
    double? lastLng,
    DateTime? lastLocationAt,
    LiveLocation? liveLocation,
    int? finalBillCents,
  }) {
    return TripAssignment(
      id: id,
      requestId: requestId,
      driverId: driverId,
      status: status ?? this.status,
      finalBillCents: finalBillCents ?? this.finalBillCents,
      lastLat: lastLat ?? this.lastLat,
      lastLng: lastLng ?? this.lastLng,
      lastLocationAt: lastLocationAt ?? this.lastLocationAt,
      startedAt: startedAt,
      completedAt: completedAt,
      createdAt: createdAt,
      request: request,
      liveLocation: liveLocation ?? this.liveLocation,
    );
  }

  static DateTime? _parseDate(Object? raw) {
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }

  @override
  List<Object?> get props => [
        id,
        requestId,
        driverId,
        status,
        finalBillCents,
        lastLat,
        lastLng,
        lastLocationAt,
        startedAt,
        completedAt,
        createdAt,
        request,
        liveLocation,
      ];
}

class TripListPage extends Equatable {
  const TripListPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final List<TripAssignment> items;
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  factory TripListPage.fromJson(Map<String, dynamic> json) {
    final itemsRaw = json['items'];
    final meta = json['meta'];
    final metaMap = meta is Map ? Map<String, dynamic>.from(meta) : const {};
    return TripListPage(
      items: itemsRaw is List
          ? itemsRaw
              .whereType<Map>()
              .map(
                (e) => TripAssignment.fromJson(Map<String, dynamic>.from(e)),
              )
              .toList()
          : const [],
      page: (metaMap['page'] as num?)?.toInt() ?? 1,
      limit: (metaMap['limit'] as num?)?.toInt() ?? 20,
      total: (metaMap['total'] as num?)?.toInt() ?? 0,
      totalPages: (metaMap['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  @override
  List<Object?> get props => [items, page, limit, total, totalPages];
}

String formatTripStatus(String status) =>
    status.replaceAll('_', ' ').toLowerCase();

/// Forward-only next status for drivers (no cancel — admin only).
String? nextDriverStatus(String current) {
  const map = <String, String>{
    'ASSIGNED': 'EN_ROUTE_PICKUP',
    'EN_ROUTE_PICKUP': 'ARRIVED_PICKUP',
    'ARRIVED_PICKUP': 'IN_TRANSIT',
    'IN_TRANSIT': 'DELIVERED',
    'DELIVERED': 'COMPLETED',
  };
  return map[current];
}

String driverAdvanceLabel(String nextStatus) {
  return switch (nextStatus) {
    'EN_ROUTE_PICKUP' => 'Start en route to pickup',
    'ARRIVED_PICKUP' => 'Arrived at pickup',
    'IN_TRANSIT' => 'Start transit to dropoff',
    'DELIVERED' => 'Mark delivered',
    'COMPLETED' => 'Complete trip',
    _ => 'Advance to ${formatTripStatus(nextStatus)}',
  };
}
