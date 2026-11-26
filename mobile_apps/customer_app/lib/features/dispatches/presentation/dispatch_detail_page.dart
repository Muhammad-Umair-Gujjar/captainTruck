import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/dispatch_models.dart';
import '../data/dispatches_repository.dart';
import 'bloc/dispatch_detail_bloc.dart';
import 'bloc/select_routes_bloc.dart';
import 'select_routes_page.dart';

class DispatchDetailPage extends StatelessWidget {
  const DispatchDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Request detail')),
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
            child: BlocConsumer<DispatchDetailBloc, DispatchDetailState>(
              listener: (context, state) {
                if (state.message != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message!)),
                  );
                }
              },
              builder: (context, state) {
                if (state.status == DispatchDetailStatus.loading ||
                    state.status == DispatchDetailStatus.initial) {
                  return const Center(child: CircularProgressIndicator());
                }
                final d = state.dispatch;
                if (d == null) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(state.message ?? 'Not found'),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => context
                              .read<DispatchDetailBloc>()
                              .add(const DispatchDetailStarted()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final bill = d.billBreakdown;
                return RefreshIndicator(
                  onRefresh: () async {
                    context
                        .read<DispatchDetailBloc>()
                        .add(const DispatchDetailRefreshed());
                    await context.read<DispatchDetailBloc>().stream.firstWhere(
                          (s) => s.status != DispatchDetailStatus.loading,
                        );
                  },
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      GlassPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    d.truckTypeName ??
                                        'Truck ×${d.truckCount}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w700),
                                  ),
                                ),
                                Text(
                                  formatDispatchStatus(d.status),
                                  style: const TextStyle(
                                    color: AppTheme.accent,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text('Pickup: ${d.pickupAddress}'),
                            Text('Dropoff: ${d.dropoffAddress}'),
                            Text('Count: ${d.truckCount}'),
                            Text('Pay: ${d.paymentMethod}'),
                            if (d.lockedBaseRateCents != null)
                              Text(
                                'Locked base: ${formatPkrCents(d.lockedBaseRateCents)}',
                              ),
                            if (bill != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Bill total: ${formatPkrCents(bill.totalBillCents)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                'AI trip: ${formatPkrCents(bill.aiTripCostCents)}',
                                style: const TextStyle(color: AppTheme.inkMuted),
                              ),
                            ],
                            if (d.rejectionReason != null &&
                                d.rejectionReason!.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Text(
                                'Rejection: ${d.rejectionReason}',
                                style: const TextStyle(color: AppTheme.danger),
                              ),
                            ],
                            if (d.isPendingAdmin) ...[
                              const SizedBox(height: 12),
                              const Text(
                                'Admin will review and assign a driver. Pull to refresh.',
                                style: TextStyle(color: AppTheme.inkMuted),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (d.needsRouteSelection)
                        FilledButton(
                          onPressed: () async {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => BlocProvider(
                                  create: (ctx) => SelectRoutesBloc(
                                    repository: context
                                        .read<DispatchesRepository>(),
                                    dispatchId: d.id,
                                  )..add(const SelectRoutesStarted()),
                                  child: const SelectRoutesPage(),
                                ),
                              ),
                            );
                            if (context.mounted) {
                              context
                                  .read<DispatchDetailBloc>()
                                  .add(const DispatchDetailRefreshed());
                            }
                          },
                          child: const Text('Continue route selection'),
                        ),
                      if (d.canCancel) ...[
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: state.busy
                              ? null
                              : () async {
                                  final ok = await showDialog<bool>(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title: const Text('Cancel request?'),
                                      content: const Text(
                                        'This cannot be undone.',
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.pop(ctx, false),
                                          child: const Text('Keep'),
                                        ),
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.pop(ctx, true),
                                          child: const Text('Cancel request'),
                                        ),
                                      ],
                                    ),
                                  );
                                  if (ok == true && context.mounted) {
                                    context.read<DispatchDetailBloc>().add(
                                          const DispatchDetailCancelRequested(),
                                        );
                                  }
                                },
                          child: state.busy
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Cancel request'),
                        ),
                      ],
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
