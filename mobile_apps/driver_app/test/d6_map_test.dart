import 'package:driver_app/features/trips/data/trip_models.dart';
import 'package:driver_app/features/trips/presentation/bloc/trip_detail_bloc.dart';
import 'package:driver_app/features/trips/presentation/on_trip_map_page.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  const trip = TripAssignment(
    id: 't1',
    requestId: 'r1',
    driverId: 'd1',
    status: 'EN_ROUTE_PICKUP',
    lastLat: 31.55,
    lastLng: 74.36,
    request: TripRequestSummary(
      id: 'r1',
      pickupAddress: 'Warehouse',
      dropoffAddress: 'Site',
      pickupLat: 31.52,
      pickupLng: 74.35,
      dropoffLat: 31.58,
      dropoffLng: 74.40,
    ),
  );

  test('pickup/dropoff/self points from trip + state', () {
    expect(pickupPointFromTrip(trip), const LatLng(31.52, 74.35));
    expect(dropoffPointFromTrip(trip), const LatLng(31.58, 74.40));

    final withPublished = TripDetailState(
      status: TripDetailStatus.ready,
      trip: trip,
      lastPublished: LiveLocation(
        tripId: 't1',
        lat: 31.53,
        lng: 74.37,
        updatedAt: DateTime.utc(2026, 1, 1),
      ),
    );
    expect(selfPointFromState(withPublished), const LatLng(31.53, 74.37));

    final fallback = const TripDetailState(
      status: TripDetailStatus.ready,
      trip: trip,
    );
    expect(selfPointFromState(fallback), const LatLng(31.55, 74.36));
  });

  test('tripMapPoints collects non-null markers', () {
    final points = tripMapPoints(
      pickup: const LatLng(1, 1),
      dropoff: const LatLng(2, 2),
      self: const LatLng(3, 3),
    );
    expect(points, hasLength(3));
    expect(
      tripMapPoints(pickup: null, dropoff: const LatLng(2, 2), self: null),
      [const LatLng(2, 2)],
    );
  });
}
