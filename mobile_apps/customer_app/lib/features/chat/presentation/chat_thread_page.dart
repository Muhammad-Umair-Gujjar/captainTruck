import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
import '../data/chat_models.dart';
import 'bloc/chat_thread_bloc.dart';

class ChatThreadPage extends StatefulWidget {
  const ChatThreadPage({super.key});

  @override
  State<ChatThreadPage> createState() => _ChatThreadPageState();
}

class _ChatThreadPageState extends State<ChatThreadPage> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    _input.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    // List is reversed: maxScrollExtent is older messages.
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 80) {
      context.read<ChatThreadBloc>().add(const ChatThreadLoadMore());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat with driver')),
      body: BlocConsumer<ChatThreadBloc, ChatThreadState>(
        listener: (context, state) {
          if (state.message != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message!)),
            );
          }
        },
        builder: (context, state) {
          if (state.status == ChatThreadStatus.loading ||
              state.status == ChatThreadStatus.initial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.status == ChatThreadStatus.failure &&
              state.thread == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message ?? 'Failed to open chat'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => context
                        .read<ChatThreadBloc>()
                        .add(const ChatThreadStarted()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final myId = context.read<ChatThreadBloc>().myUserId;
          final chronological = state.messages.reversed.toList();

          return Column(
            children: [
              if (state.readOnly)
                Material(
                  color: AppTheme.accentSoft,
                  child: const Padding(
                    padding: EdgeInsets.all(10),
                    child: Text(
                      'Chat is read-only (trip completed/cancelled).',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ),
              Expanded(
                child: chronological.isEmpty
                    ? const Center(
                        child: Text(
                          'Say hello to your driver',
                          style: TextStyle(color: AppTheme.inkMuted),
                        ),
                      )
                    : ListView.builder(
                        controller: _scroll,
                        reverse: true,
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                        itemCount:
                            chronological.length + (state.loadingMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (state.loadingMore &&
                              index == chronological.length) {
                            return const Padding(
                              padding: EdgeInsets.all(12),
                              child: Center(
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                              ),
                            );
                          }
                          // reverse:true → index 0 is newest (end of chronological)
                          final msg = chronological[
                              chronological.length - 1 - index];
                          final mine = msg.senderId == myId;
                          return _Bubble(message: msg, mine: mine);
                        },
                      ),
              ),
              if (!state.readOnly) ...[
                SizedBox(
                  height: 44,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    children: [
                      for (final p in kChatPresets)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ActionChip(
                            label: Text(p),
                            onPressed: state.sending
                                ? null
                                : () => context
                                    .read<ChatThreadBloc>()
                                    .add(ChatThreadSendPreset(p)),
                          ),
                        ),
                    ],
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _input,
                            minLines: 1,
                            maxLines: 4,
                            textInputAction: TextInputAction.send,
                            decoration: const InputDecoration(
                              hintText: 'Message…',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            onSubmitted: (_) => _send(context),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          onPressed: state.sending ? null : () => _send(context),
                          icon: state.sending
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.send),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  void _send(BuildContext context) {
    final text = _input.text;
    if (text.trim().isEmpty) return;
    context.read<ChatThreadBloc>().add(ChatThreadSendText(text));
    _input.clear();
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.mine});

  final ChatMessage message;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final bg = mine ? AppTheme.accent : Colors.white.withValues(alpha: 0.85);
    final fg = mine ? Colors.white : AppTheme.ink;
    final label = message.body?.isNotEmpty == true
        ? message.body!
        : (message.type == 'IMAGE'
            ? '[Image]'
            : message.type == 'VOICE'
                ? '[Voice]'
                : '[Message]');

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment:
              mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!mine && message.senderName != null)
              Text(
                message.senderName!,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: fg.withValues(alpha: 0.8),
                ),
              ),
            Text(label, style: TextStyle(color: fg)),
            const SizedBox(height: 2),
            Text(
              _time(message.createdAt),
              style: TextStyle(
                fontSize: 10,
                color: fg.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _time(DateTime t) {
    final local = t.toLocal();
    final h = local.hour.toString().padLeft(2, '0');
    final m = local.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
