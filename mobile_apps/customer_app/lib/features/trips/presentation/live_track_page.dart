import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../../dispatches/presentation/widgets/dispatch_map.dart';
import '../data/trip_models.dart';
import 'bloc/live_track_bloc.dart';

class LiveTrackPage extends StatefulWidget {
  const LiveTrackPage({super.key});

  @override
  State<LiveTrackPage> createState() => _LiveTrackPageState();
}

class _LiveTrackPageState extends State<LiveTrackPage> {
  final _mapController = MapController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Live tracking')),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFFFF7ED),
                  Color(0xFFE0E7FF),
                  Color(0xFFCCFBF1),
                ],
              ),
            ),
          ),
          SafeArea(
            child: BlocConsumer<LiveTrackBloc, LiveTrackState>(
              listenWhen: (prev, next) =>
                  prev.location?.lat != next.location?.lat ||
                  prev.location?.lng != next.location?.lng,
              listener: (context, state) {
                final loc = state.location;
                if (loc == null) return;
                try {
                  _mapController.move(LatLng(loc.lat, loc.lng), 14);
                } catch (_) {}
              },
              builder: (context, state) {
                if (state.status == LiveTrackStatus.loading ||
                    state.status == LiveTrackStatus.initial) {
                  return const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 12),
                        Text('Connecting to live GPS…'),
                      ],
                    ),
                  );
                }

                if (state.status == LiveTrackStatus.failure &&
                    state.trip == null) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(state.message ?? 'Failed to start tracking'),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => context
                              .read<LiveTrackBloc>()
                              .add(const LiveTrackStarted()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final trip = state.trip;
                final loc = state.location;
                final center = loc != null
                    ? LatLng(loc.lat, loc.lng)
                    : (trip?.lastLat != null && trip?.lastLng != null
                        ? LatLng(trip!.lastLat!, trip.lastLng!)
                        : kDefaultMapCenter);

                return Column(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(0),
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
                              userAgentPackageName:
                                  'com.captaintruck.customer',
                            ),
                            if (loc != null ||
                                (trip?.lastLat != null &&
                                    trip?.lastLng != null))
                              MarkerLayer(
                                markers: [
                                  Marker(
                                    point: loc != null
                                        ? LatLng(loc.lat, loc.lng)
                                        : LatLng(
                                            trip!.lastLat!,
                                            trip.lastLng!,
                                          ),
                                    width: 48,
                                    height: 48,
                                    child: Icon(
                                      Icons.local_shipping,
                                      color: loc?.stale == true
                                          ? AppTheme.inkMuted
                                          : AppTheme.accent,
                                      size: 40,
                                    ),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: GlassPanel(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  state.socketConnected
                                      ? Icons.wifi
                                      : Icons.wifi_off,
                                  size: 18,
                                  color: state.socketConnected
                                      ? AppTheme.ok
                                      : AppTheme.inkMuted,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  state.socketConnected
                                      ? 'Live socket'
                                      : 'Socket offline',
                                  style: TextStyle(
                                    color: state.socketConnected
                                        ? AppTheme.ok
                                        : AppTheme.inkMuted,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const Spacer(),
                                if (loc?.stale == true)
                                  const Text(
                                    'Stale',
                                    style: TextStyle(color: AppTheme.danger),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Trip: ${formatTripStatus(trip?.status ?? '—')}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (trip?.driver != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                'Driver: ${trip!.driver!.fullName}'
                                '${trip.driver!.vehiclePlate != null ? ' · ${trip.driver!.vehiclePlate}' : ''}',
                              ),
                            ],
                            if (loc != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                '${loc.lat.toStringAsFixed(5)}, ${loc.lng.toStringAsFixed(5)}',
                                style: const TextStyle(
                                  color: AppTheme.inkMuted,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                'Updated ${_rel(loc.updatedAt)}',
                                style: const TextStyle(
                                  color: AppTheme.inkMuted,
                                  fontSize: 12,
                                ),
                              ),
                            ] else
                              const Text(
                                'Waiting for first GPS fix…',
                                style: TextStyle(color: AppTheme.inkMuted),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _rel(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inSeconds < 5) return 'just now';
    if (d.inSeconds < 60) return '${d.inSeconds}s ago';
    if (d.inMinutes < 60) return '${d.inMinutes}m ago';
    return '${d.inHours}h ago';
  }
}
