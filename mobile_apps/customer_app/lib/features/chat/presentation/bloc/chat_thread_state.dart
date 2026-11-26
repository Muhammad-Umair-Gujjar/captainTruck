part of 'chat_thread_bloc.dart';

enum ChatThreadStatus { initial, loading, ready, failure }

final class ChatThreadState extends Equatable {
  const ChatThreadState({
    this.status = ChatThreadStatus.initial,
    this.thread,
    this.messages = const [],
    this.nextCursor,
    this.hasMore = false,
    this.readOnly = false,
    this.sending = false,
    this.loadingMore = false,
    this.message,
  });

  final ChatThreadStatus status;
  final ChatThread? thread;
  final List<ChatMessage> messages;
  final String? nextCursor;
  final bool hasMore;
  final bool readOnly;
  final bool sending;
  final bool loadingMore;
  final String? message;

  ChatThreadState copyWith({
    ChatThreadStatus? status,
    ChatThread? thread,
    List<ChatMessage>? messages,
    String? nextCursor,
    bool? hasMore,
    bool? readOnly,
    bool? sending,
    bool? loadingMore,
    String? message,
    bool clearMessage = false,
  }) {
    return ChatThreadState(
      status: status ?? this.status,
      thread: thread ?? this.thread,
      messages: messages ?? this.messages,
      nextCursor: nextCursor ?? this.nextCursor,
      hasMore: hasMore ?? this.hasMore,
      readOnly: readOnly ?? this.readOnly,
      sending: sending ?? this.sending,
      loadingMore: loadingMore ?? this.loadingMore,
      message: clearMessage ? null : (message ?? this.message),
    );
  }

  @override
  List<Object?> get props => [
        status,
        thread,
        messages,
        nextCursor,
        hasMore,
        readOnly,
        sending,
        loadingMore,
        message,
      ];
}
