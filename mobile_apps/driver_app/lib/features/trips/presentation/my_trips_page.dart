import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/trip_models.dart';
import '../data/trips_repository.dart';
import 'bloc/my_trips_bloc.dart';
import 'bloc/trip_detail_bloc.dart';
import 'trip_detail_page.dart';

const _filters = <(String label, String? value)>[
  ('All', null),
  ('Assigned', 'ASSIGNED'),
  ('En route', 'EN_ROUTE_PICKUP'),
  ('At pickup', 'ARRIVED_PICKUP'),
  ('In transit', 'IN_TRANSIT'),
  ('Delivered', 'DELIVERED'),
  ('Completed', 'COMPLETED'),
  ('Cancelled', 'CANCELLED'),
];

class MyTripsPage extends StatelessWidget {
  const MyTripsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My assignments')),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFF0FDFA),
                  Color(0xFFE0E7FF),
                  Color(0xFFFEF3C7),
                ],
              ),
            ),
          ),
          SafeArea(
            child: BlocBuilder<MyTripsBloc, MyTripsState>(
              builder: (context, state) {
                return Column(
                  children: [
                    SizedBox(
                      height: 48,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        children: [
                          for (final (label, value) in _filters)
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(label),
                                selected: state.statusFilter == value,
                                onSelected: (_) => context
                                    .read<MyTripsBloc>()
                                    .add(MyTripsFilterChanged(value)),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Expanded(child: _body(context, state)),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _body(BuildContext context, MyTripsState state) {
    if (state.status == MyTripsStatus.loading ||
        state.status == MyTripsStatus.initial) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.status == MyTripsStatus.failure && state.items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(state.message ?? 'Failed to load assignments'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () =>
                  context.read<MyTripsBloc>().add(const MyTripsStarted()),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state.items.isEmpty) {
      return Center(
        child: Text(
          'No assignments yet.\nAdmin assigns you after customer booking.',
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: AppTheme.inkMuted),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<MyTripsBloc>().add(const MyTripsRefreshed());
        await context.read<MyTripsBloc>().stream.firstWhere(
              (s) => s.status != MyTripsStatus.loading,
            );
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.items.length + (state.page < state.totalPages ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= state.items.length) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: state.loadingMore
                    ? const CircularProgressIndicator()
                    : TextButton(
                        onPressed: () => context
                            .read<MyTripsBloc>()
                            .add(const MyTripsLoadMore()),
                        child: const Text('Load more'),
                      ),
              ),
            );
          }
          final trip = state.items[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _TripCard(
              trip: trip,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => BlocProvider(
                      create: (ctx) => TripDetailBloc(
                        repository: context.read<TripsRepository>(),
                        tripId: trip.id,
                      )..add(const TripDetailStarted()),
                      child: const TripDetailPage(),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip, required this.onTap});

  final TripAssignment trip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final request = trip.request;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(28),
        child: GlassPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      formatTripStatus(trip.status),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.accent,
                      ),
                    ),
                  ),
                  if (trip.finalBillCents != null)
                    Text(
                      formatPkrCents(trip.finalBillCents),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                request?.pickupAddress ?? 'Pickup —',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                '→ ${request?.dropoffAddress ?? 'Dropoff —'}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppTheme.inkMuted),
              ),
              const SizedBox(height: 6),
              Text(
                [
                  request?.customer?.fullName,
                  request?.truckType?.name,
                ].whereType<String>().where((s) => s.isNotEmpty).join(' · '),
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppTheme.inkMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
