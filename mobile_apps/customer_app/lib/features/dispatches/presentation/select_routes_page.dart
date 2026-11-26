import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/maps/polyline_codec.dart';
import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/dispatch_models.dart';
import 'bloc/select_routes_bloc.dart';
import 'widgets/dispatch_map.dart';

class SelectRoutesPage extends StatelessWidget {
  const SelectRoutesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose route')),
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
            child: BlocConsumer<SelectRoutesBloc, SelectRoutesState>(
              listener: (context, state) {
                if (state.status == SelectRoutesStatus.success) {
                  final bill = state.dispatch?.billBreakdown;
                  final total = bill == null
                      ? ''
                      : ' · ${formatPkrCents(bill.totalBillCents)}';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Pending admin$total',
                      ),
                    ),
                  );
                  Navigator.of(context).popUntil((r) => r.isFirst);
                } else if (state.status == SelectRoutesStatus.failure &&
                    state.message != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message!)),
                  );
                }
              },
              builder: (context, state) {
                if (state.status == SelectRoutesStatus.generating ||
                    state.status == SelectRoutesStatus.initial) {
                  return const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 12),
                        Text('Generating OSM routes…'),
                      ],
                    ),
                  );
                }

                if (state.status == SelectRoutesStatus.failure &&
                    (state.dispatch?.routeOptions.isEmpty ?? true)) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(state.message ?? 'Failed to generate routes'),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => context
                              .read<SelectRoutesBloc>()
                              .add(const SelectRoutesStarted()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final routes = state.dispatch?.routeOptions ?? const [];
                final selected = state.selectedRoute;
                final points = selected == null
                    ? const <LatLng>[]
                    : decodePolyline(selected.polyline);

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: SizedBox(
                        height: 240,
                        child: FlutterMap(
                          options: MapOptions(
                            initialCenter: points.isNotEmpty
                                ? points[points.length ~/ 2]
                                : kDefaultMapCenter,
                            initialZoom: 11,
                          ),
                          children: [
                            TileLayer(
                              urlTemplate:
                                  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              userAgentPackageName:
                                  'com.captaintruck.customer',
                            ),
                            if (points.isNotEmpty)
                              PolylineLayer(
                                polylines: [
                                  Polyline(
                                    points: points,
                                    strokeWidth: 4,
                                    color: AppTheme.accent,
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Pick one of ${routes.length} options · AI cost is on-device',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: AppTheme.inkMuted),
                    ),
                    const SizedBox(height: 8),
                    for (final route in routes) ...[
                      _RouteCard(
                        route: route,
                        aiCostCents: state.estimates[route.id] ?? 0,
                        selected: route.id == state.selectedRouteId,
                        onTap: () => context.read<SelectRoutesBloc>().add(
                              SelectRoutesOptionChosen(route.id),
                            ),
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (selected != null) ...[
                      GlassPanel(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Estimate',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'AI trip cost: ${formatPkrCents(state.selectedAiCostCents)}',
                            ),
                            Text(
                              'Locked base: ${formatPkrCents(state.dispatch?.lockedBaseRateCents)}',
                            ),
                            Text(
                              'Trucks: ${state.dispatch?.truckCount ?? 1}',
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Server bill = (base + AI) × trucks after confirm',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: AppTheme.inkMuted),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    FilledButton(
                      onPressed: state.status ==
                                  SelectRoutesStatus.submitting ||
                              state.selectedRouteId == null
                          ? null
                          : () => context
                              .read<SelectRoutesBloc>()
                              .add(const SelectRoutesConfirmed()),
                      child: state.status == SelectRoutesStatus.submitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Confirm route → pending admin'),
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
}

class _RouteCard extends StatelessWidget {
  const _RouteCard({
    required this.route,
    required this.aiCostCents,
    required this.selected,
    required this.onTap,
  });

  final RouteOption route;
  final int aiCostCents;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final km = route.distanceMeters / 1000;
    final mins = (route.durationSeconds / 60).round();
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: GlassPanel(
          borderRadius: 22,
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(
                selected
                    ? Icons.radio_button_checked
                    : Icons.radio_button_off,
                color: selected ? AppTheme.accent : AppTheme.inkMuted,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          '${km.toStringAsFixed(1)} km · $mins min',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (route.isRecommended) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.accentSoft,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Fastest',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppTheme.accent,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'AI ${formatPkrCents(aiCostCents)}',
                      style: const TextStyle(color: AppTheme.inkMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
