import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/payment_models.dart';
import 'bloc/payment_bloc.dart';

class PaymentPage extends StatelessWidget {
  const PaymentPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => context
                .read<PaymentBloc>()
                .add(const PaymentRefreshRequested()),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
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
            child: BlocConsumer<PaymentBloc, PaymentState>(
              listener: (context, state) {
                if (state.message != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message!)),
                  );
                }
              },
              builder: (context, state) {
                if (state.status == PaymentUiStatus.loading ||
                    state.status == PaymentUiStatus.initial) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (state.status == PaymentUiStatus.failure &&
                    state.payments.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(state.message ?? 'Failed to load payments'),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => context
                              .read<PaymentBloc>()
                              .add(const PaymentStarted()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final amount =
                    context.read<PaymentBloc>().expectedAmountCents;
                final settled = state.active?.isSettled == true;
                final stripeOk = state.stripeStatus?.configured == true;

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    GlassPanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Amount due',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            formatPkrCents(amount),
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.accent,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Server bill is authoritative. Refunds are out of scope.',
                            style: TextStyle(color: AppTheme.inkMuted),
                          ),
                          if (state.active != null) ...[
                            const SizedBox(height: 12),
                            Text(
                              'Status: ${formatPaymentStatus(state.active!.status)}',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            Text(
                              'Provider: ${state.active!.provider}',
                              style: const TextStyle(color: AppTheme.inkMuted),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (!settled) ...[
                      FilledButton(
                        onPressed: state.busy
                            ? null
                            : () => context
                                .read<PaymentBloc>()
                                .add(const PaymentCashRequested()),
                        child: const Text('Pay cash on pickup'),
                      ),
                      const SizedBox(height: 8),
                      FilledButton.tonal(
                        onPressed: state.busy || !stripeOk
                            ? null
                            : () => context
                                .read<PaymentBloc>()
                                .add(const PaymentStripeRequested()),
                        child: Text(
                          stripeOk
                              ? 'Pay with Stripe (Test Mode)'
                              : 'Stripe Test Mode unavailable',
                        ),
                      ),
                      if (stripeOk) ...[
                        const SizedBox(height: 8),
                        const Text(
                          'Test card: 4242 4242 4242 4242 · any future expiry · any CVC',
                          style: TextStyle(
                            color: AppTheme.inkMuted,
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ] else
                      const GlassPanel(
                        child: Text(
                          'Payment settled. Thank you.',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppTheme.ok,
                          ),
                        ),
                      ),
                    if (state.busy) ...[
                      const SizedBox(height: 16),
                      const Center(child: CircularProgressIndicator()),
                    ],
                    if (state.payments.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Text(
                        'History',
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      for (final p in state.payments)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: GlassPanel(
                            borderRadius: 18,
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${p.provider} · ${formatPaymentStatus(p.status)}',
                                  ),
                                ),
                                Text(formatPkrCents(p.amountCents)),
                              ],
                            ),
                          ),
                        ),
                    ],
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
