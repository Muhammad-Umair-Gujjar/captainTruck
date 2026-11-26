import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/config/app_config.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../../health/presentation/bloc/health_bloc.dart';

class BootstrapPage extends StatelessWidget {
  const BootstrapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          const _Backdrop(),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Captain Truck',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppTheme.ink,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Customer · Phase C0',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppTheme.inkMuted,
                          letterSpacing: 0.6,
                        ),
                  ),
                  const SizedBox(height: 28),
                  GlassPanel(
                    child: BlocBuilder<HealthBloc, HealthState>(
                      builder: (context, state) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'API health',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              AppConfig.apiRoot,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    fontFamily: 'monospace',
                                    color: AppTheme.inkMuted,
                                  ),
                            ),
                            const SizedBox(height: 16),
                            _HealthBody(state: state),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: state.status == HealthStatus.loading
                                  ? null
                                  : () => context
                                      .read<HealthBloc>()
                                      .add(const HealthRequested()),
                              child: Text(
                                state.status == HealthStatus.loading
                                    ? 'Checking…'
                                    : 'Ping API',
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  const Spacer(),
                  GlassPanel(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    child: Text(
                      'Liquid glass + BLoC baseline ready. Next: C1 auth.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.ink,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HealthBody extends StatelessWidget {
  const _HealthBody({required this.state});

  final HealthState state;

  @override
  Widget build(BuildContext context) {
    switch (state.status) {
      case HealthStatus.initial:
        return const Text('Tap Ping API to verify Nest connectivity.');
      case HealthStatus.loading:
        return const LinearProgressIndicator(minHeight: 3);
      case HealthStatus.failure:
        return Text(
          state.message ?? 'Failed',
          style: const TextStyle(color: AppTheme.danger),
        );
      case HealthStatus.success:
        final d = state.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status: ${d.status}',
                style: const TextStyle(color: AppTheme.ok)),
            Text('Phase: ${d.phase ?? '—'}'),
            Text('Database: ${d.database ?? '—'}'),
            Text('Uptime: ${d.uptimeSeconds ?? '—'}s'),
          ],
        );
    }
  }
}

class _Backdrop extends StatelessWidget {
  const _Backdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
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
      child: Stack(
        children: [
          Positioned(
            top: -40,
            right: -20,
            child: _Blob(color: AppTheme.accent.withValues(alpha: 0.35), size: 180),
          ),
          Positioned(
            bottom: 80,
            left: -30,
            child: _Blob(
              color: const Color(0xFF6366F1).withValues(alpha: 0.28),
              size: 220,
            ),
          ),
          Positioned(
            bottom: -30,
            right: 40,
            child: _Blob(
              color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
              size: 160,
            ),
          ),
        ],
      ),
    );
  }
}

class _Blob extends StatelessWidget {
  const _Blob({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
      ),
    );
  }
}
