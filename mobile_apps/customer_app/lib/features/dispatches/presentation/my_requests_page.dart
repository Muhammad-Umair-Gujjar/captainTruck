import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/dispatch_models.dart';
import '../data/dispatches_repository.dart';
import 'bloc/dispatch_detail_bloc.dart';
import 'bloc/my_requests_bloc.dart';
import 'dispatch_detail_page.dart';

const _filters = <(String label, String? value)>[
  ('All', null),
  ('Pending admin', 'PENDING_ADMIN'),
  ('Awaiting route', 'AWAITING_ROUTE_SELECTION'),
  ('Approved', 'APPROVED_ASSIGNED'),
  ('In progress', 'IN_PROGRESS'),
  ('Rejected', 'REJECTED'),
  ('Cancelled', 'CANCELLED'),
];

class MyRequestsPage extends StatelessWidget {
  const MyRequestsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My requests')),
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
            child: BlocBuilder<MyRequestsBloc, MyRequestsState>(
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
                                    .read<MyRequestsBloc>()
                                    .add(MyRequestsFilterChanged(value)),
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

  Widget _body(BuildContext context, MyRequestsState state) {
    if (state.status == MyRequestsStatus.loading ||
        state.status == MyRequestsStatus.initial) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.status == MyRequestsStatus.failure && state.items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(state.message ?? 'Failed to load requests'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context
                  .read<MyRequestsBloc>()
                  .add(const MyRequestsStarted()),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<MyRequestsBloc>().add(const MyRequestsRefreshed());
        await context.read<MyRequestsBloc>().stream.firstWhere(
              (s) => s.status != MyRequestsStatus.loading,
            );
      },
      child: state.items.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                Center(child: Text('No requests yet. Book a truck to start.')),
              ],
            )
          : NotificationListener<ScrollNotification>(
              onNotification: (n) {
                if (n.metrics.pixels >= n.metrics.maxScrollExtent - 120 &&
                    state.hasMore &&
                    !state.loadingMore) {
                  context
                      .read<MyRequestsBloc>()
                      .add(const MyRequestsLoadMore());
                }
                return false;
              },
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                itemCount: state.items.length + (state.loadingMore ? 1 : 0),
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  if (index >= state.items.length) {
                    return const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  final item = state.items[index];
                  return _RequestTile(
                    item: item,
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => BlocProvider(
                            create: (ctx) => DispatchDetailBloc(
                              repository:
                                  context.read<DispatchesRepository>(),
                              dispatchId: item.id,
                            )..add(const DispatchDetailStarted()),
                            child: const DispatchDetailPage(),
                          ),
                        ),
                      );
                      if (context.mounted) {
                        context
                            .read<MyRequestsBloc>()
                            .add(const MyRequestsRefreshed());
                      }
                    },
                  );
                },
              ),
            ),
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({required this.item, required this.onTap});

  final DispatchRequest item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: GlassPanel(
          borderRadius: 22,
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.truckTypeName ?? 'Truck ×${item.truckCount}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  _StatusBadge(status: item.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${item.pickupAddress} → ${item.dropoffAddress}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppTheme.inkMuted, fontSize: 13),
              ),
              if (item.isPendingAdmin) ...[
                const SizedBox(height: 6),
                const Text(
                  'Waiting for admin assignment',
                  style: TextStyle(
                    color: AppTheme.accent,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppTheme.accentSoft,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        formatDispatchStatus(status),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppTheme.accent,
        ),
      ),
    );
  }
}
