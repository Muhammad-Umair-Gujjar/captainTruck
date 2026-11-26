import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../../auth/presentation/bloc/auth_bloc.dart';
import '../../bootstrap/presentation/bootstrap_page.dart';
import '../../dispatches/data/dispatches_repository.dart';
import '../../dispatches/presentation/bloc/create_dispatch_bloc.dart';
import '../../dispatches/presentation/create_dispatch_page.dart';
import '../../health/presentation/bloc/health_bloc.dart';
import '../../places/data/places_repository.dart';
import '../../profile/data/profile_repository.dart';
import '../../profile/presentation/bloc/profile_bloc.dart';
import '../../profile/presentation/profile_page.dart';
import '../../truck_types/presentation/bloc/truck_types_bloc.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthBloc>().state.user;

    return Scaffold(
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
            child: RefreshIndicator(
              onRefresh: () async {
                context
                    .read<TruckTypesBloc>()
                    .add(const TruckTypesRefreshed());
                await context.read<TruckTypesBloc>().stream.firstWhere(
                      (s) => s.status != TruckTypesStatus.loading,
                    );
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hi, ${user?.fullName ?? 'Customer'}',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            Text(
                              user?.email ?? '',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: AppTheme.inkMuted),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () => context
                            .read<AuthBloc>()
                            .add(const AuthLogoutRequested()),
                        child: const Text('Sign out'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  GlassPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Profile',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 8),
                        Text('Phone: ${user?.phone?.isNotEmpty == true ? user!.phone : '—'}'),
                        Text('Status: ${user?.status ?? '—'}'),
                        const SizedBox(height: 12),
                        FilledButton.tonal(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => BlocProvider(
                                  create: (ctx) => ProfileBloc(
                                    context.read<ProfileRepository>(),
                                  )..add(const ProfileStarted()),
                                  child: const ProfilePage(),
                                ),
                              ),
                            );
                          },
                          child: const Text('Edit profile'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      final types =
                          context.read<TruckTypesBloc>().state.items;
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => BlocProvider(
                            create: (ctx) => CreateDispatchBloc(
                              dispatchesRepository:
                                  context.read<DispatchesRepository>(),
                              placesRepository:
                                  context.read<PlacesRepository>(),
                              truckTypes: types,
                            ),
                            child: const CreateDispatchPage(),
                          ),
                        ),
                      );
                    },
                    child: const Text('Book a truck'),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Truck types',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Active fleet rates (PKR cents from API)',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: AppTheme.inkMuted),
                  ),
                  const SizedBox(height: 12),
                  BlocBuilder<TruckTypesBloc, TruckTypesState>(
                    builder: (context, state) {
                      if (state.status == TruckTypesStatus.loading ||
                          state.status == TruckTypesStatus.initial) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      if (state.status == TruckTypesStatus.failure) {
                        return GlassPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(state.message ?? 'Failed to load truck types'),
                              const SizedBox(height: 8),
                              FilledButton(
                                onPressed: () => context
                                    .read<TruckTypesBloc>()
                                    .add(const TruckTypesRefreshed()),
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        );
                      }
                      if (state.items.isEmpty) {
                        return const GlassPanel(
                          child: Text('No active truck types yet.'),
                        );
                      }
                      return Column(
                        children: [
                          for (final t in state.items) ...[
                            GlassPanel(
                              borderRadius: 22,
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          t.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          [
                                            t.code,
                                            if (t.capacity != null &&
                                                t.capacity!.isNotEmpty)
                                              t.capacity!,
                                          ].join(' · '),
                                          style: const TextStyle(
                                            color: AppTheme.inkMuted,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    formatPkrCents(t.currentRateCents),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: AppTheme.accent,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 10),
                          ],
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  FilledButton.tonal(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => BlocProvider.value(
                            value: context.read<HealthBloc>(),
                            child: const BootstrapPage(),
                          ),
                        ),
                      );
                    },
                    child: const Text('API health check'),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'My requests list starts in C5.',
                    style: TextStyle(color: AppTheme.inkMuted),
                    textAlign: TextAlign.center,
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
