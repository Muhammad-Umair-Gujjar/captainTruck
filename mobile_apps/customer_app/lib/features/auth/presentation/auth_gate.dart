import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../home/presentation/home_page.dart';
import '../../notifications/data/push_sync_service.dart';
import 'bloc/auth_bloc.dart';
import 'login_page.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  StreamSubscription? _fgSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final push = context.read<PushSyncService>();
      _fgSub = push.foregroundMessages.listen((msg) {
        if (!mounted) return;
        final text = [
          if (msg.title != null && msg.title!.isNotEmpty) msg.title,
          if (msg.body != null && msg.body!.isNotEmpty) msg.body,
        ].whereType<String>().join(' — ');
        if (text.isEmpty) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(text)),
        );
      });
    });
  }

  @override
  void dispose() {
    _fgSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        switch (state.status) {
          case AuthStatus.unknown:
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          case AuthStatus.authenticated:
            return const HomePage();
          case AuthStatus.unauthenticated:
          case AuthStatus.failure:
            return const LoginPage();
        }
      },
    );
  }
}
