import 'package:equatable/equatable.dart';

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

class TripDriver extends Equatable {
  const TripDriver({
    required this.id,
    required this.fullName,
    this.phone,
    this.vehiclePlate,
  });

  final String id;
  final String fullName;
  final String? phone;
  final String? vehiclePlate;

  factory TripDriver.fromJson(Map<String, dynamic> json) {
    final profile = json['driverProfile'];
    return TripDriver(
      id: json['id'].toString(),
      fullName: json['fullName']?.toString() ?? 'Driver',
      phone: json['phone']?.toString(),
      vehiclePlate: profile is Map ? profile['vehiclePlate']?.toString() : null,
    );
  }

  @override
  List<Object?> get props => [id, fullName, phone, vehiclePlate];
}

class TripSummary extends Equatable {
  const TripSummary({
    required this.id,
    required this.status,
    this.requestId,
    this.driverId,
    this.lastLat,
    this.lastLng,
  });

  final String id;
  final String status;
  final String? requestId;
  final String? driverId;
  final double? lastLat;
  final double? lastLng;

  bool get isTrackable {
    const sealed = {'CANCELLED', 'COMPLETED'};
    return !sealed.contains(status);
  }

  factory TripSummary.fromJson(Map<String, dynamic> json) {
    return TripSummary(
      id: json['id'].toString(),
      status: json['status'].toString(),
      requestId: json['requestId']?.toString(),
      driverId: json['driverId']?.toString(),
      lastLat: (json['lastLat'] as num?)?.toDouble(),
      lastLng: (json['lastLng'] as num?)?.toDouble(),
    );
  }

  @override
  List<Object?> get props =>
      [id, status, requestId, driverId, lastLat, lastLng];
}

class TripDetail extends Equatable {
  const TripDetail({
    required this.id,
    required this.requestId,
    required this.driverId,
    required this.status,
    this.finalBillCents,
    this.lastLat,
    this.lastLng,
    this.lastLocationAt,
    this.driver,
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
  final TripDriver? driver;
  final LiveLocation? liveLocation;

  bool get isTrackable {
    const sealed = {'CANCELLED', 'COMPLETED'};
    return !sealed.contains(status);
  }

  factory TripDetail.fromJson(Map<String, dynamic> json) {
    final driverRaw = json['driver'];
    final liveRaw = json['liveLocation'];
    return TripDetail(
      id: json['id'].toString(),
      requestId: json['requestId'].toString(),
      driverId: json['driverId'].toString(),
      status: json['status'].toString(),
      finalBillCents: (json['finalBillCents'] as num?)?.toInt(),
      lastLat: (json['lastLat'] as num?)?.toDouble(),
      lastLng: (json['lastLng'] as num?)?.toDouble(),
      lastLocationAt: json['lastLocationAt'] != null
          ? DateTime.tryParse(json['lastLocationAt'].toString())
          : null,
      driver: driverRaw is Map
          ? TripDriver.fromJson(Map<String, dynamic>.from(driverRaw))
          : null,
      liveLocation: liveRaw is Map
          ? LiveLocation.fromJson(Map<String, dynamic>.from(liveRaw))
          : null,
    );
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
        driver,
        liveLocation,
      ];
}

String formatTripStatus(String status) =>
    status.replaceAll('_', ' ').toLowerCase();
