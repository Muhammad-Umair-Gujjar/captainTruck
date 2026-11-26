import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/network/api_client.dart';
import 'core/theme/app_theme.dart';
import 'features/bootstrap/presentation/bootstrap_page.dart';
import 'features/health/data/health_repository.dart';
import 'features/health/presentation/bloc/health_bloc.dart';

class CaptainTruckCustomerApp extends StatelessWidget {
  const CaptainTruckCustomerApp({super.key, this.apiClient});

  final ApiClient? apiClient;

  @override
  Widget build(BuildContext context) {
    final client = apiClient ?? ApiClient();
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<ApiClient>.value(value: client),
        RepositoryProvider(
          create: (context) => HealthRepository(context.read<ApiClient>()),
        ),
      ],
      child: BlocProvider(
        create: (context) => HealthBloc(context.read<HealthRepository>()),
        child: MaterialApp(
          title: 'Captain Truck',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          home: const BootstrapPage(),
        ),
      ),
    );
  }
}
