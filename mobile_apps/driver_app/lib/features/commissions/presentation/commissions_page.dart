import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/commission_models.dart';
import 'bloc/commissions_bloc.dart';

class CommissionsPage extends StatelessWidget {
  const CommissionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My commissions')),
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
            child: BlocBuilder<CommissionsBloc, CommissionsState>(
              builder: (context, state) {
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                      child: Row(
                        children: [
                          FilterChip(
                            label: const Text('All'),
                            selected: !state.unconfirmedOnly,
                            onSelected: (_) => context
                                .read<CommissionsBloc>()
                                .add(
                                  const CommissionsFilterChanged(
                                    unconfirmedOnly: false,
                                  ),
                                ),
                          ),
                          const SizedBox(width: 8),
                          FilterChip(
                            label: const Text('Pending admin'),
                            selected: state.unconfirmedOnly,
                            onSelected: (_) => context
                                .read<CommissionsBloc>()
                                .add(
                                  const CommissionsFilterChanged(
                                    unconfirmedOnly: true,
                                  ),
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

  Widget _body(BuildContext context, CommissionsState state) {
    if (state.status == CommissionsStatus.loading ||
        state.status == CommissionsStatus.initial) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.status == CommissionsStatus.failure) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(state.message ?? 'Failed to load commissions'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context
                  .read<CommissionsBloc>()
                  .add(const CommissionsStarted()),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<CommissionsBloc>().add(const CommissionsStarted());
        await context.read<CommissionsBloc>().stream.firstWhere(
              (s) => s.status != CommissionsStatus.loading,
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
                Text(
                  'Platform commission ledger',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Text(
                  'You owe the platform a % of each completed trip bill. '
                  'Only admin can mark received.',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: AppTheme.inkMuted),
                ),
                if (state.items.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    'Shown pending: ${formatPkrCents(state.pendingTotalCents)} · ${state.total} entries',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (state.items.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: Center(
                child: Text(
                  'No commission entries yet. They appear after trip complete.',
                  style: TextStyle(color: AppTheme.inkMuted),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else
            for (final e in state.items) ...[
              _CommissionCard(entry: e),
              const SizedBox(height: 10),
            ],
        ],
      ),
    );
  }
}

class _CommissionCard extends StatelessWidget {
  const _CommissionCard({required this.entry});

  final CommissionLedgerEntry entry;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      borderRadius: 22,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Trip ${entry.tripId}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                entry.confirmed ? 'Confirmed' : 'Pending',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: entry.confirmed ? AppTheme.ok : AppTheme.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text('Expected: ${formatPkrCents(entry.expectedCents)}'),
          Text('Pending: ${formatPkrCents(entry.pendingCents)}'),
          Text('${entry.commissionPercent}% of bill'),
          if (entry.trip?.finalBillCents != null)
            Text(
              'Trip bill: ${formatPkrCents(entry.trip!.finalBillCents)}',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppTheme.inkMuted),
            ),
        ],
      ),
    );
  }
}
