import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/trip_models.dart';
import 'bloc/trip_detail_bloc.dart';

class TripDetailPage extends StatelessWidget {
  const TripDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Assignment')),
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
            child: BlocConsumer<TripDetailBloc, TripDetailState>(
              listenWhen: (prev, next) =>
                  next.message != null &&
                  next.message != prev.message &&
                  !next.busy,
              listener: (context, state) {
                final looksSuccess =
                    state.message!.startsWith('Status');
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(state.message!),
                    backgroundColor:
                        looksSuccess ? AppTheme.ok : AppTheme.danger,
                  ),
                );
              },
              builder: (context, state) {
                if (state.status == TripDetailStatus.loading ||
                    state.status == TripDetailStatus.initial) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (state.status == TripDetailStatus.failure &&
                    state.trip == null) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(state.message ?? 'Failed to load trip'),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => context
                              .read<TripDetailBloc>()
                              .add(const TripDetailStarted()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final trip = state.trip!;
                final request = trip.request;
                final next = nextDriverStatus(trip.status);
                return RefreshIndicator(
                  onRefresh: () async {
                    context
                        .read<TripDetailBloc>()
                        .add(const TripDetailRefreshed());
                    await context.read<TripDetailBloc>().stream.firstWhere(
                          (s) => s.status != TripDetailStatus.loading,
                        );
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      GlassPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              formatTripStatus(trip.status),
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.accent,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text('Trip ID: ${trip.id}'),
                            Text('Request: ${trip.requestId}'),
                            if (trip.finalBillCents != null)
                              Text(
                                'Bill: ${formatPkrCents(trip.finalBillCents)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            if (next != null) ...[
                              const SizedBox(height: 16),
                              FilledButton(
                                onPressed: state.busy
                                    ? null
                                    : () => context.read<TripDetailBloc>().add(
                                          TripDetailAdvanceRequested(next),
                                        ),
                                child: state.busy
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : Text(driverAdvanceLabel(next)),
                              ),
                              if (next == 'COMPLETED') ...[
                                const SizedBox(height: 8),
                                Text(
                                  'Complete requires settled payment on the request.',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(color: AppTheme.inkMuted),
                                ),
                              ],
                            ] else ...[
                              const SizedBox(height: 12),
                              Text(
                                trip.status == 'COMPLETED'
                                    ? 'Trip finished.'
                                    : 'No further driver actions for this status.',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppTheme.inkMuted),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      GlassPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Route',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                            Text('Pickup: ${request?.pickupAddress ?? '—'}'),
                            const SizedBox(height: 4),
                            Text('Dropoff: ${request?.dropoffAddress ?? '—'}'),
                            if (request?.truckType != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Truck: ${request!.truckType!.name}'
                                '${request.truckType!.code != null ? ' (${request.truckType!.code})' : ''}',
                              ),
                            ],
                            if (request?.selectedRouteAiCostCents != null)
                              Text(
                                'AI trip cost: ${formatPkrCents(request!.selectedRouteAiCostCents)}',
                              ),
                            if (request?.paymentMethod != null)
                              Text('Payment: ${request!.paymentMethod}'),
                            if (request?.notes?.isNotEmpty == true) ...[
                              const SizedBox(height: 8),
                              Text('Notes: ${request!.notes}'),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      GlassPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Customer',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                            Text(request?.customer?.fullName ?? '—'),
                            Text(
                              'Phone: ${request?.customer?.phone?.isNotEmpty == true ? request!.customer!.phone : '—'}',
                            ),
                            Text(
                              'Email: ${request?.customer?.email ?? '—'}',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Live GPS publish starts in D5.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: AppTheme.inkMuted),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
