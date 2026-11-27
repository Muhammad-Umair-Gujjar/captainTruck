import 'package:equatable/equatable.dart';

class CommissionTripSummary extends Equatable {
  const CommissionTripSummary({
    required this.id,
    required this.status,
    this.finalBillCents,
    this.requestId,
    this.completedAt,
  });

  final String id;
  final String status;
  final int? finalBillCents;
  final String? requestId;
  final DateTime? completedAt;

  factory CommissionTripSummary.fromJson(Map<String, dynamic> json) {
    return CommissionTripSummary(
      id: json['id'].toString(),
      status: json['status']?.toString() ?? '',
      finalBillCents: (json['finalBillCents'] as num?)?.toInt(),
      requestId: json['requestId']?.toString(),
      completedAt: DateTime.tryParse(json['completedAt']?.toString() ?? ''),
    );
  }

  @override
  List<Object?> get props =>
      [id, status, finalBillCents, requestId, completedAt];
}

class CommissionLedgerEntry extends Equatable {
  const CommissionLedgerEntry({
    required this.id,
    required this.driverId,
    required this.tripId,
    required this.expectedCents,
    required this.collectedCents,
    required this.pendingCents,
    required this.commissionPercent,
    required this.confirmed,
    required this.createdAt,
    this.adminConfirmedAt,
    this.trip,
  });

  final String id;
  final String driverId;
  final String tripId;
  final int expectedCents;
  final int collectedCents;
  final int pendingCents;
  final int commissionPercent;
  final bool confirmed;
  final DateTime createdAt;
  final DateTime? adminConfirmedAt;
  final CommissionTripSummary? trip;

  factory CommissionLedgerEntry.fromJson(Map<String, dynamic> json) {
    final tripRaw = json['trip'];
    return CommissionLedgerEntry(
      id: json['id'].toString(),
      driverId: json['driverId'].toString(),
      tripId: json['tripId'].toString(),
      expectedCents: (json['expectedCents'] as num?)?.toInt() ?? 0,
      collectedCents: (json['collectedCents'] as num?)?.toInt() ?? 0,
      pendingCents: (json['pendingCents'] as num?)?.toInt() ?? 0,
      commissionPercent: (json['commissionPercent'] as num?)?.toInt() ?? 0,
      confirmed: json['confirmed'] == true || json['adminConfirmedAt'] != null,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      adminConfirmedAt:
          DateTime.tryParse(json['adminConfirmedAt']?.toString() ?? ''),
      trip: tripRaw is Map
          ? CommissionTripSummary.fromJson(Map<String, dynamic>.from(tripRaw))
          : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        driverId,
        tripId,
        expectedCents,
        collectedCents,
        pendingCents,
        commissionPercent,
        confirmed,
        createdAt,
        adminConfirmedAt,
        trip,
      ];
}

class CommissionListPage extends Equatable {
  const CommissionListPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final List<CommissionLedgerEntry> items;
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  factory CommissionListPage.fromJson(Map<String, dynamic> json) {
    final itemsRaw = json['items'];
    final meta = json['meta'];
    final metaMap = meta is Map ? Map<String, dynamic>.from(meta) : const {};
    return CommissionListPage(
      items: itemsRaw is List
          ? itemsRaw
              .whereType<Map>()
              .map(
                (e) =>
                    CommissionLedgerEntry.fromJson(Map<String, dynamic>.from(e)),
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
