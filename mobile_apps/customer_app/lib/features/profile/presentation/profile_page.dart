import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../../auth/presentation/bloc/auth_bloc.dart';
import 'bloc/profile_bloc.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  var _seeded = false;

  @override
  void dispose() {
    _fullName.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  void _seedFrom(ProfileState state) {
    if (_seeded || state.user == null) return;
    _fullName.text = state.user!.fullName;
    _email.text = state.user!.email;
    _phone.text = state.user!.phone ?? '';
    _seeded = true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My profile')),
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
            child: BlocConsumer<ProfileBloc, ProfileState>(
              listener: (context, state) {
                if (state.status == ProfileStatus.saved && state.user != null) {
                  context
                      .read<AuthBloc>()
                      .add(AuthUserSynced(state.user!));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message ?? 'Saved')),
                  );
                } else if (state.status == ProfileStatus.failure &&
                    state.message != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message!)),
                  );
                }
              },
              builder: (context, state) {
                _seedFrom(state);
                if (state.status == ProfileStatus.loading ||
                    state.status == ProfileStatus.initial) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (state.status == ProfileStatus.failure &&
                    state.user == null) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(state.message ?? 'Failed to load profile'),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => context
                              .read<ProfileBloc>()
                              .add(const ProfileStarted()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                return ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    GlassPanel(
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Update details',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Synced with GET/PATCH /users/me',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: AppTheme.inkMuted),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _fullName,
                              decoration: const InputDecoration(
                                labelText: 'Full name',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) {
                                if (v == null || v.trim().length < 2) {
                                  return 'Enter your name';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _email,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) {
                                if (v == null || !v.contains('@')) {
                                  return 'Enter a valid email';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _phone,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                labelText: 'Phone (optional)',
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: state.busy
                                  ? null
                                  : () {
                                      if (!_formKey.currentState!.validate()) {
                                        return;
                                      }
                                      context.read<ProfileBloc>().add(
                                            ProfileSaveSubmitted(
                                              fullName: _fullName.text,
                                              email: _email.text,
                                              phone: _phone.text,
                                            ),
                                          );
                                    },
                              child: state.busy
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Text('Save profile'),
                            ),
                          ],
                        ),
                      ),
                    ),
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
