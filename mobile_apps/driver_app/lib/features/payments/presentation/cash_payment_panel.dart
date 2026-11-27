import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../data/payment_models.dart';
import '../data/payments_repository.dart';
import 'bloc/cash_payment_bloc.dart';

/// Loads payments for a dispatch and lets the driver confirm cash collection.
class CashPaymentPanel extends StatelessWidget {
  const CashPaymentPanel({super.key, required this.requestId});

  final String requestId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (ctx) => CashPaymentBloc(
        repository: context.read<PaymentsRepository>(),
        requestId: requestId,
      )..add(const CashPaymentStarted()),
      child: const _CashPaymentPanelBody(),
    );
  }
}

class _CashPaymentPanelBody extends StatelessWidget {
  const _CashPaymentPanelBody();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<CashPaymentBloc, CashPaymentState>(
      listenWhen: (prev, next) =>
          next.message != null && next.message != prev.message && !next.busy,
      listener: (context, state) {
        final ok = state.message!.startsWith('Cash collected');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(state.message!),
            backgroundColor: ok ? AppTheme.ok : AppTheme.danger,
          ),
        );
      },
      builder: (context, state) {
        return GlassPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Payment',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                'Confirm cash when the customer pays at pickup.',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppTheme.inkMuted),
              ),
              const SizedBox(height: 12),
              if (state.status == CashPaymentStatus.loading ||
                  state.status == CashPaymentStatus.initial)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                )
              else if (state.status == CashPaymentStatus.failure)
                Column(
                  children: [
                    Text(state.message ?? 'Failed to load payments'),
                    const SizedBox(height: 8),
                    FilledButton.tonal(
                      onPressed: () => context
                          .read<CashPaymentBloc>()
                          .add(const CashPaymentStarted()),
                      child: const Text('Retry'),
                    ),
                  ],
                )
              else if (state.payments.isEmpty)
                Text(
                  'No payment record yet for this dispatch.',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: AppTheme.inkMuted),
                )
              else ...[
                for (final p in state.payments) ...[
                  _PaymentRow(payment: p),
                  const SizedBox(height: 8),
                ],
                if (state.pendingCash != null)
                  FilledButton(
                    onPressed: state.busy
                        ? null
                        : () => context.read<CashPaymentBloc>().add(
                              CashPaymentCollectRequested(
                                state.pendingCash!.id,
                              ),
                            ),
                    child: state.busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            'Confirm cash collected · ${formatPkrCents(state.pendingCash!.amountCents)}',
                          ),
                  ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _PaymentRow extends StatelessWidget {
  const _PaymentRow({required this.payment});

  final PaymentRecord payment;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${payment.provider} · ${formatPaymentStatus(payment.status)}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              Text(
                formatPkrCents(payment.amountCents),
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppTheme.inkMuted),
              ),
            ],
          ),
        ),
        Icon(
          payment.isSettled
              ? Icons.check_circle
              : payment.isCashPending
                  ? Icons.payments_outlined
                  : Icons.hourglass_empty,
          color: payment.isSettled
              ? AppTheme.ok
              : payment.isCashPending
                  ? AppTheme.accent
                  : AppTheme.inkMuted,
        ),
      ],
    );
  }
}
