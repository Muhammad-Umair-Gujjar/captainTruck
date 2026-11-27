import 'package:equatable/equatable.dart';

class ChatParticipant extends Equatable {
  const ChatParticipant({
    required this.id,
    required this.fullName,
    this.role,
  });

  final String id;
  final String fullName;
  final String? role;

  factory ChatParticipant.fromJson(Map<String, dynamic> json) {
    return ChatParticipant(
      id: json['id'].toString(),
      fullName: json['fullName']?.toString() ?? 'User',
      role: json['role']?.toString(),
    );
  }

  @override
  List<Object?> get props => [id, fullName, role];
}

class ChatMessage extends Equatable {
  const ChatMessage({
    required this.id,
    required this.threadId,
    required this.senderId,
    required this.type,
    required this.createdAt,
    this.body,
    this.mediaUrl,
    this.reported = false,
    this.senderName,
  });

  final String id;
  final String threadId;
  final String senderId;
  final String type;
  final String? body;
  final String? mediaUrl;
  final bool reported;
  final DateTime createdAt;
  final String? senderName;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'];
    return ChatMessage(
      id: json['id'].toString(),
      threadId: json['threadId'].toString(),
      senderId: json['senderId'].toString(),
      type: json['type']?.toString() ?? 'TEXT',
      body: json['body']?.toString(),
      mediaUrl: json['mediaUrl']?.toString(),
      reported: json['reported'] == true,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      senderName: sender is Map ? sender['fullName']?.toString() : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        threadId,
        senderId,
        type,
        body,
        mediaUrl,
        reported,
        createdAt,
        senderName,
      ];
}

class ChatThread extends Equatable {
  const ChatThread({
    required this.id,
    required this.type,
    required this.readOnly,
    this.tripId,
    this.tripStatus,
    this.participants = const [],
    this.lastMessage,
  });

  final String id;
  final String type;
  final bool readOnly;
  final String? tripId;
  final String? tripStatus;
  final List<ChatParticipant> participants;
  final ChatMessage? lastMessage;

  factory ChatThread.fromJson(Map<String, dynamic> json) {
    final trip = json['trip'];
    final last = json['lastMessage'];
    final parts = json['participants'];
    return ChatThread(
      id: json['id'].toString(),
      type: json['type']?.toString() ?? 'DRIVER_CUSTOMER',
      readOnly: json['readOnly'] == true,
      tripId: json['tripId']?.toString() ??
          (trip is Map ? trip['id']?.toString() : null),
      tripStatus: trip is Map ? trip['status']?.toString() : null,
      participants: parts is List
          ? parts
              .whereType<Map>()
              .map((e) => ChatParticipant.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      lastMessage: last is Map
          ? ChatMessage.fromJson({
              ...Map<String, dynamic>.from(last),
              'threadId': json['id'],
            })
          : null,
    );
  }

  @override
  List<Object?> get props =>
      [id, type, readOnly, tripId, tripStatus, participants, lastMessage];
}

class ChatMessagesPage extends Equatable {
  const ChatMessagesPage({
    required this.items,
    required this.hasMore,
    this.nextCursor,
    this.readOnly = false,
  });

  final List<ChatMessage> items;
  final bool hasMore;
  final String? nextCursor;
  final bool readOnly;

  factory ChatMessagesPage.fromJson(Map<String, dynamic> json) {
    final itemsRaw = json['items'];
    final meta = json['meta'] is Map
        ? Map<String, dynamic>.from(json['meta'] as Map)
        : const <String, dynamic>{};
    return ChatMessagesPage(
      items: itemsRaw is List
          ? itemsRaw
              .whereType<Map>()
              .map((e) => ChatMessage.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      hasMore: meta['hasMore'] == true,
      nextCursor: meta['nextCursor']?.toString(),
      readOnly: meta['readOnly'] == true,
    );
  }

  @override
  List<Object?> get props => [items, hasMore, nextCursor, readOnly];
}
