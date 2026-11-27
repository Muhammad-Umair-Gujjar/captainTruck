import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/realtime/realtime_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import '../../auth/presentation/bloc/auth_bloc.dart';
import '../data/chat_models.dart';
import '../data/chat_repository.dart';
import 'bloc/chat_thread_bloc.dart';
import 'chat_thread_page.dart';

class MyChatsPage extends StatefulWidget {
  const MyChatsPage({super.key});

  @override
  State<MyChatsPage> createState() => _MyChatsPageState();
}

class _MyChatsPageState extends State<MyChatsPage> {
  late Future<List<ChatThread>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<ChatRepository>().listMine();
  }

  Future<void> _reload() async {
    setState(() {
      _future = context.read<ChatRepository>().listMine();
    });
    await _future;
  }

  String _titleFor(ChatThread t, String? myId) {
    if (t.type == 'DRIVER_ADMIN') return 'Ops / admin';
    final other = t.participants
        .where((p) => p.id != myId)
        .map((p) => p.fullName)
        .join(', ');
    return other.isEmpty ? 'Customer chat' : other;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chats')),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFF0FDFA),
                  Color(0xFFE0E7FF),
                  Color(0xFFFEF3C7),
                ],
              ),
            ),
          ),
          SafeArea(
            child: RefreshIndicator(
              onRefresh: _reload,
              child: FutureBuilder<List<ChatThread>>(
                future: _future,
                builder: (context, snap) {
                  if (snap.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snap.hasError) {
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        const SizedBox(height: 80),
                        Center(child: Text('${snap.error}')),
                        const SizedBox(height: 12),
                        Center(
                          child: FilledButton(
                            onPressed: _reload,
                            child: const Text('Retry'),
                          ),
                        ),
                      ],
                    );
                  }
                  final items = snap.data ?? const [];
                  if (items.isEmpty) {
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 120),
                        Center(
                          child: Text(
                            'No chats yet. Open chat from an assignment.',
                            style: TextStyle(color: AppTheme.inkMuted),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    );
                  }
                  final me = context.read<AuthBloc>().state.user?.id;
                  return ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final t = items[index];
                      return Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(22),
                          onTap: () async {
                            if (me == null) return;
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => BlocProvider(
                                  create: (ctx) => ChatThreadBloc(
                                    repository:
                                        context.read<ChatRepository>(),
                                    realtime:
                                        context.read<RealtimeClient>(),
                                    myUserId: me,
                                    threadId: t.id,
                                  )..add(const ChatThreadStarted()),
                                  child: ChatThreadPage(
                                    title: _titleFor(t, me),
                                  ),
                                ),
                              ),
                            );
                            await _reload();
                          },
                          child: GlassPanel(
                            borderRadius: 22,
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _titleFor(t, me),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  t.lastMessage?.body ??
                                      (t.readOnly
                                          ? 'Read-only thread'
                                          : 'No messages yet'),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppTheme.inkMuted,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
