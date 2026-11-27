import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/realtime/realtime_client.dart';
import '../../data/chat_models.dart';
import '../../data/chat_repository.dart';

part 'chat_thread_event.dart';
part 'chat_thread_state.dart';

const kChatPresets = <String>[
  'On my way',
  'Arrived at pickup',
  'Running late',
  'Thanks',
];

class ChatThreadBloc extends Bloc<ChatThreadEvent, ChatThreadState> {
  ChatThreadBloc({
    required this.repository,
    required this.realtime,
    required this.myUserId,
    this.tripId,
    this.threadId,
    this.threadType = 'DRIVER_CUSTOMER',
  }) : super(const ChatThreadState()) {
    on<ChatThreadStarted>(_onStarted);
    on<ChatThreadLoadMore>(_onMore);
    on<ChatThreadSendText>(_onSend);
    on<ChatThreadSendPreset>(_onPreset);
    on<ChatThreadMessageReceived>(_onReceived);
  }

  final ChatRepository repository;
  final RealtimeClient realtime;
  final String myUserId;
  final String? tripId;
  final String? threadId;
  final String threadType;

  StreamSubscription<ChatMessage>? _chatSub;

  Future<void> _onStarted(
    ChatThreadStarted event,
    Emitter<ChatThreadState> emit,
  ) async {
    emit(state.copyWith(status: ChatThreadStatus.loading, clearMessage: true));
    try {
      final ChatThread thread;
      // Prefer existing thread id (inbox) so DRIVER_ADMIN opens correctly.
      if (threadId != null) {
        thread = await repository.getThread(threadId!);
      } else if (tripId != null) {
        thread = await repository.openThread(
          tripId: tripId!,
          type: threadType,
        );
      } else {
        throw StateError('tripId or threadId required');
      }

      final page = await repository.listMessages(thread.id);
      await _chatSub?.cancel();
      _chatSub = realtime.chatMessages.listen((msg) {
        if (msg.threadId == thread.id) {
          add(ChatThreadMessageReceived(msg));
        }
      });
      await realtime.joinChat(thread.id);

      emit(
        state.copyWith(
          status: ChatThreadStatus.ready,
          thread: thread,
          messages: page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          readOnly: page.readOnly || thread.readOnly,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: ChatThreadStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onMore(
    ChatThreadLoadMore event,
    Emitter<ChatThreadState> emit,
  ) async {
    final thread = state.thread;
    if (thread == null || !state.hasMore || state.loadingMore) return;
    emit(state.copyWith(loadingMore: true, clearMessage: true));
    try {
      final page = await repository.listMessages(
        thread.id,
        cursor: state.nextCursor,
      );
      emit(
        state.copyWith(
          loadingMore: false,
          messages: [...state.messages, ...page.items],
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          readOnly: page.readOnly || state.readOnly,
        ),
      );
    } catch (e) {
      emit(state.copyWith(loadingMore: false, message: _msg(e)));
    }
  }

  Future<void> _onSend(
    ChatThreadSendText event,
    Emitter<ChatThreadState> emit,
  ) async {
    final thread = state.thread;
    final text = event.body.trim();
    if (thread == null || text.isEmpty || state.readOnly) return;
    emit(state.copyWith(sending: true, clearMessage: true));
    try {
      final msg = await repository.sendText(thread.id, text);
      emit(
        state.copyWith(
          sending: false,
          messages: _upsert(state.messages, msg),
        ),
      );
    } catch (e) {
      emit(state.copyWith(sending: false, message: _msg(e)));
    }
  }

  Future<void> _onPreset(
    ChatThreadSendPreset event,
    Emitter<ChatThreadState> emit,
  ) async {
    final thread = state.thread;
    if (thread == null || state.readOnly) return;
    emit(state.copyWith(sending: true, clearMessage: true));
    try {
      final msg = await repository.sendPreset(thread.id, event.body);
      emit(
        state.copyWith(
          sending: false,
          messages: _upsert(state.messages, msg),
        ),
      );
    } catch (e) {
      emit(state.copyWith(sending: false, message: _msg(e)));
    }
  }

  void _onReceived(
    ChatThreadMessageReceived event,
    Emitter<ChatThreadState> emit,
  ) {
    emit(
      state.copyWith(messages: _upsert(state.messages, event.message)),
    );
  }

  List<ChatMessage> _upsert(List<ChatMessage> current, ChatMessage msg) {
    if (current.any((m) => m.id == msg.id)) return current;
    return [msg, ...current];
  }

  @override
  Future<void> close() async {
    await _chatSub?.cancel();
    final id = state.thread?.id;
    if (id != null) {
      try {
        await realtime.leaveChat(id);
      } catch (_) {}
    }
    return super.close();
  }

  String _msg(Object e) {
    if (e is ApiException) return e.toString();
    return e.toString();
  }
}
