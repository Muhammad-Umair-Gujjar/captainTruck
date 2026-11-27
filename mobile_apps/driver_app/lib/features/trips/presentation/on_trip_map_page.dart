import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/trip_models.dart';
import 'bloc/trip_detail_bloc.dart';

/// Default map center: Lahore, PK.
const LatLng kDefaultMapCenter = LatLng(31.5204, 74.3587);

LatLng? pickupPointFromTrip(TripAssignment trip) {
  final lat = trip.request?.pickupLat;
  final lng = trip.request?.pickupLng;
  if (lat == null || lng == null) return null;
  return LatLng(lat, lng);
}

LatLng? dropoffPointFromTrip(TripAssignment trip) {
  final lat = trip.request?.dropoffLat;
  final lng = trip.request?.dropoffLng;
  if (lat == null || lng == null) return null;
  return LatLng(lat, lng);
}

LatLng? selfPointFromState(TripDetailState state) {
  final published = state.lastPublished;
  if (published != null) return LatLng(published.lat, published.lng);
  final trip = state.trip;
  if (trip?.lastLat != null && trip?.lastLng != null) {
    return LatLng(trip!.lastLat!, trip.lastLng!);
  }
  return null;
}

List<LatLng> tripMapPoints({
  LatLng? pickup,
  LatLng? dropoff,
  LatLng? self,
}) {
  return [
    ?pickup,
    ?dropoff,
    ?self,
  ];
}

class OnTripMapPage extends StatefulWidget {
  const OnTripMapPage({super.key});

  @override
  State<OnTripMapPage> createState() => _OnTripMapPageState();
}

class _OnTripMapPageState extends State<OnTripMapPage> {
  final _mapController = MapController();
  var _didFit = false;

  void _fitIfNeeded(List<LatLng> points) {
    if (_didFit || points.isEmpty) return;
    _didFit = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        if (points.length == 1) {
          _mapController.move(points.first, 14);
        } else {
          final bounds = LatLngBounds.fromPoints(points);
          _mapController.fitCamera(
            CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(48)),
          );
        }
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('On-trip map')),
      body: BlocConsumer<TripDetailBloc, TripDetailState>(
        listenWhen: (prev, next) =>
            prev.lastPublished?.lat != next.lastPublished?.lat ||
            prev.lastPublished?.lng != next.lastPublished?.lng,
        listener: (context, state) {
          final self = selfPointFromState(state);
          if (self == null) return;
          try {
            _mapController.move(self, _mapController.camera.zoom);
          } catch (_) {}
        },
        builder: (context, state) {
          final trip = state.trip;
          if (trip == null) {
            return const Center(child: Text('No trip loaded'));
          }

          final pickup = pickupPointFromTrip(trip);
          final dropoff = dropoffPointFromTrip(trip);
          final self = selfPointFromState(state);
          final points = tripMapPoints(
            pickup: pickup,
            dropoff: dropoff,
            self: self,
          );
          _fitIfNeeded(points);

          final center = self ?? pickup ?? dropoff ?? kDefaultMapCenter;

          return Column(
            children: [
              Expanded(
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: center,
                    initialZoom: 13,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.example.driver_app',
                    ),
                    MarkerLayer(
                      markers: [
                        if (pickup != null)
                          Marker(
                            point: pickup,
                            width: 44,
                            height: 44,
                            child: const Icon(
                              Icons.trip_origin,
                              color: AppTheme.ok,
                              size: 36,
                            ),
                          ),
                        if (dropoff != null)
                          Marker(
                            point: dropoff,
                            width: 44,
                            height: 44,
                            child: const Icon(
                              Icons.flag,
                              color: AppTheme.danger,
                              size: 36,
                            ),
                          ),
                        if (self != null)
                          Marker(
                            point: self,
                            width: 48,
                            height: 48,
                            child: Icon(
                              Icons.local_shipping,
                              color: state.gpsSharing
                                  ? AppTheme.accent
                                  : AppTheme.inkMuted,
                              size: 40,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: GlassPanel(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        formatTripStatus(trip.status),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppTheme.accent,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Pickup: ${trip.request?.pickupAddress ?? '—'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Dropoff: ${trip.request?.dropoffAddress ?? '—'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            state.gpsSharing ? Icons.gps_fixed : Icons.gps_off,
                            size: 18,
                            color: state.gpsSharing
                                ? AppTheme.ok
                                : AppTheme.inkMuted,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            state.gpsSharing
                                ? 'GPS sharing · ${state.publishCount} sent'
                                : 'GPS not sharing',
                            style: TextStyle(
                              color: state.gpsSharing
                                  ? AppTheme.ok
                                  : AppTheme.inkMuted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      if (pickup == null && dropoff == null) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Pickup/drop coordinates missing — showing addresses only.',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: AppTheme.inkMuted),
                        ),
                      ],
                      if (!state.gpsSharing && trip.allowsGps) ...[
                        const SizedBox(height: 12),
                        FilledButton.tonal(
                          onPressed: () => context
                              .read<TripDetailBloc>()
                              .add(const TripDetailGpsStartRequested()),
                          child: const Text('Start GPS sharing'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
