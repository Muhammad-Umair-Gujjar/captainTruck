import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/auth/token_storage.dart';
import 'core/network/api_client.dart';
import 'core/realtime/realtime_client.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/presentation/auth_gate.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/health/data/health_repository.dart';
import 'features/health/presentation/bloc/health_bloc.dart';
import 'features/chat/data/chat_repository.dart';
import 'features/dispatches/data/dispatches_repository.dart';
import 'features/payments/data/payments_repository.dart';
import 'features/places/data/places_repository.dart';
import 'features/profile/data/profile_repository.dart';
import 'features/trips/data/trips_repository.dart';
import 'features/truck_types/data/truck_types_repository.dart';
import 'features/truck_types/presentation/bloc/truck_types_bloc.dart';

class CaptainTruckCustomerApp extends StatelessWidget {
  const CaptainTruckCustomerApp({
    super.key,
    this.apiClient,
    this.tokenStorage,
    this.realtimeClient,
  });

  final ApiClient? apiClient;
  final TokenStorage? tokenStorage;
  final RealtimeClient? realtimeClient;

  @override
  Widget build(BuildContext context) {
    final storage = tokenStorage ?? SecureTokenStorage();
    final client = apiClient ?? ApiClient(tokenStorage: storage);
    final authRepository = AuthRepository(
      client: client,
      tokenStorage: storage,
    );
    client.setRefreshHandler(authRepository.tryRefresh);

    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<TokenStorage>.value(value: storage),
        RepositoryProvider<ApiClient>.value(value: client),
        RepositoryProvider<AuthRepository>.value(value: authRepository),
        RepositoryProvider(
          create: (context) => HealthRepository(context.read<ApiClient>()),
        ),
        RepositoryProvider(
          create: (context) => ProfileRepository(context.read<ApiClient>()),
        ),
        RepositoryProvider(
          create: (context) =>
              TruckTypesRepository(context.read<ApiClient>()),
        ),
        RepositoryProvider(
          create: (context) => PlacesRepository(context.read<ApiClient>()),
        ),
        RepositoryProvider(
          create: (context) =>
              DispatchesRepository(context.read<ApiClient>()),
        ),
        RepositoryProvider(
          create: (context) => TripsRepository(context.read<ApiClient>()),
        ),
        RepositoryProvider(
          create: (context) => ChatRepository(context.read<ApiClient>()),
        ),
        RepositoryProvider(
          create: (context) =>
              PaymentsRepository(context.read<ApiClient>()),
        ),
        RepositoryProvider<RealtimeClient>.value(
          value: realtimeClient ??
              SocketRealtimeClient(tokenStorage: storage),
        ),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (context) =>
                AuthBloc(context.read<AuthRepository>())
                  ..add(const AuthStarted()),
          ),
          BlocProvider(
            create: (context) => HealthBloc(context.read<HealthRepository>()),
          ),
          BlocProvider(
            create: (context) =>
                TruckTypesBloc(context.read<TruckTypesRepository>())
                  ..add(const TruckTypesStarted()),
          ),
        ],
        child: MaterialApp(
          title: 'Captain Truck',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          home: const AuthGate(),
        ),
      ),
    );
  }
}
