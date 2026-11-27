import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/auth/token_storage.dart';
import 'core/network/api_client.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/presentation/auth_gate.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/health/data/health_repository.dart';
import 'features/health/presentation/bloc/health_bloc.dart';

class CaptainTruckDriverApp extends StatelessWidget {
  const CaptainTruckDriverApp({
    super.key,
    this.apiClient,
    this.tokenStorage,
  });

  final ApiClient? apiClient;
  final TokenStorage? tokenStorage;

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
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (context) => AuthBloc(context.read<AuthRepository>())
              ..add(const AuthStarted()),
          ),
          BlocProvider(
            create: (context) => HealthBloc(context.read<HealthRepository>()),
          ),
        ],
        child: MaterialApp(
          title: 'Captain Truck Driver',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          home: const AuthGate(),
        ),
      ),
    );
  }
}
