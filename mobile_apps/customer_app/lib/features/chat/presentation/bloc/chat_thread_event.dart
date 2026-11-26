part of 'chat_thread_bloc.dart';

sealed class ChatThreadEvent extends Equatable {
  const ChatThreadEvent();

  @override
  List<Object?> get props => [];
}

final class ChatThreadStarted extends ChatThreadEvent {
  const ChatThreadStarted();
}

final class ChatThreadLoadMore extends ChatThreadEvent {
  const ChatThreadLoadMore();
}

final class ChatThreadSendText extends ChatThreadEvent {
  const ChatThreadSendText(this.body);
  final String body;

  @override
  List<Object?> get props => [body];
}

final class ChatThreadSendPreset extends ChatThreadEvent {
  const ChatThreadSendPreset(this.body);
  final String body;

  @override
  List<Object?> get props => [body];
}

final class ChatThreadMessageReceived extends ChatThreadEvent {
  const ChatThreadMessageReceived(this.message);
  final ChatMessage message;

  @override
  List<Object?> get props => [message];
}
