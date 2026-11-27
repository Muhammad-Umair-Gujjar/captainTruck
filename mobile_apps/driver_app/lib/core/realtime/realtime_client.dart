import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../features/chat/data/chat_models.dart';
import '../../features/trips/data/trip_models.dart';
import '../auth/token_storage.dart';
import '../config/app_config.dart';

/// Thin Socket.IO wrapper for the Nest `/realtime` namespace.
abstract class RealtimeClient {
  Future<void> connect();
  Future<void> disconnect();
  Future<LiveLocation?> joinTrip(String tripId);
  Future<void> leaveTrip(String tripId);
  Future<void> joinChat(String threadId);
  Future<void> leaveChat(String threadId);
  Future<LiveLocation?> updateLocation({
    required String tripId,
    required double lat,
    required double lng,
    double? heading,
    double? speedMps,
  });
  Stream<LiveLocation> get locationUpdates;
  Stream<Map<String, dynamic>> get tripStatusUpdates;
  Stream<ChatMessage> get chatMessages;
  bool get isConnected;
}

class SocketRealtimeClient implements RealtimeClient {
  SocketRealtimeClient({
    required this.tokenStorage,
    String? url,
    io.Socket? socket,
  })  : _url = url ?? AppConfig.realtimeUrl,
        _injected = socket;

  final TokenStorage tokenStorage;
  final String _url;
  final io.Socket? _injected;
  io.Socket? _socket;

  final _locationCtrl = StreamController<LiveLocation>.broadcast();
  final _statusCtrl = StreamController<Map<String, dynamic>>.broadcast();
  final _chatCtrl = StreamController<ChatMessage>.broadcast();

  @override
  Stream<LiveLocation> get locationUpdates => _locationCtrl.stream;

  @override
  Stream<Map<String, dynamic>> get tripStatusUpdates => _statusCtrl.stream;

  @override
  Stream<ChatMessage> get chatMessages => _chatCtrl.stream;

  @override
  bool get isConnected => _socket?.connected == true;

  @override
  Future<void> connect() async {
    if (_socket?.connected == true) return;

    final token = await tokenStorage.readAccessToken();
    if (token == null || token.isEmpty) {
      throw StateError('No access token for realtime');
    }

    final socket = _injected ??
        io.io(
          _url,
          io.OptionBuilder()
              .setTransports(['websocket'])
              .disableAutoConnect()
              .setAuth({'token': token})
              .enableForceNew()
              .build(),
        );

    _socket = socket;
    socket.off('location:updated');
    socket.off('trip:status');
    socket.off('chat:message');
    socket.on('location:updated', (data) {
      if (data is Map) {
        try {
          _locationCtrl.add(
            LiveLocation.fromJson(Map<String, dynamic>.from(data)),
          );
        } catch (_) {}
      }
    });
    socket.on('trip:status', (data) {
      if (data is Map) {
        _statusCtrl.add(Map<String, dynamic>.from(data));
      }
    });
    socket.on('chat:message', (data) {
      if (data is Map) {
        try {
          _chatCtrl.add(ChatMessage.fromJson(Map<String, dynamic>.from(data)));
        } catch (_) {}
      }
    });

    if (!socket.connected) {
      final ready = Completer<void>();
      socket.once('connect', (_) {
        if (!ready.isCompleted) ready.complete();
      });
      socket.once('connect_error', (err) {
        if (!ready.isCompleted) {
          ready.completeError(StateError('Realtime connect failed: $err'));
        }
      });
      socket.connect();
      await ready.future.timeout(const Duration(seconds: 10));
    }
  }

  @override
  Future<void> disconnect() async {
    final socket = _socket;
    if (socket == null) return;
    socket.off('location:updated');
    socket.off('trip:status');
    socket.off('chat:message');
    socket.disconnect();
    if (_injected == null) {
      _socket = null;
    }
  }

  @override
  Future<LiveLocation?> joinTrip(String tripId) async {
    await connect();
    final socket = _socket!;
    final raw = await socket
        .emitWithAckAsync('trip:join', {'tripId': tripId})
        .timeout(const Duration(seconds: 10));
    final ack = raw is Map
        ? Map<String, dynamic>.from(raw)
        : <String, dynamic>{'ok': false, 'message': 'Bad ack'};
    if (ack['ok'] != true) {
      throw StateError(
        (ack['message'] ?? 'Cannot join trip room').toString(),
      );
    }
    final loc = ack['location'];
    if (loc is Map) {
      return LiveLocation.fromJson(Map<String, dynamic>.from(loc));
    }
    return null;
  }

  @override
  Future<void> leaveTrip(String tripId) async {
    final socket = _socket;
    if (socket == null || !socket.connected) return;
    try {
      await socket
          .emitWithAckAsync('trip:leave', {'tripId': tripId})
          .timeout(const Duration(seconds: 5));
    } catch (_) {}
  }

  @override
  Future<void> joinChat(String threadId) async {
    await connect();
    final socket = _socket!;
    final raw = await socket
        .emitWithAckAsync('chat:join', {'threadId': threadId})
        .timeout(const Duration(seconds: 10));
    final ack = raw is Map
        ? Map<String, dynamic>.from(raw)
        : <String, dynamic>{'ok': false, 'message': 'Bad ack'};
    if (ack['ok'] != true) {
      throw StateError(
        (ack['message'] ?? 'Cannot join chat room').toString(),
      );
    }
  }

  @override
  Future<void> leaveChat(String threadId) async {
    final socket = _socket;
    if (socket == null || !socket.connected) return;
    try {
      await socket
          .emitWithAckAsync('chat:leave', {'threadId': threadId})
          .timeout(const Duration(seconds: 5));
    } catch (_) {}
  }

  @override
  Future<LiveLocation?> updateLocation({
    required String tripId,
    required double lat,
    required double lng,
    double? heading,
    double? speedMps,
  }) async {
    await connect();
    final socket = _socket!;
    final payload = <String, dynamic>{
      'tripId': tripId,
      'lat': lat,
      'lng': lng,
      'heading': ?heading,
      'speedMps': ?speedMps,
    };
    final raw = await socket
        .emitWithAckAsync('location:update', payload)
        .timeout(const Duration(seconds: 10));
    final ack = raw is Map
        ? Map<String, dynamic>.from(raw)
        : <String, dynamic>{'ok': false, 'message': 'Bad ack'};
    if (ack['ok'] != true) {
      throw StateError(
        (ack['message'] ?? 'Location update failed').toString(),
      );
    }
    final loc = ack['location'];
    if (loc is Map) {
      return LiveLocation.fromJson(Map<String, dynamic>.from(loc));
    }
    return null;
  }

  void dispose() {
    unawaited(disconnect());
    _locationCtrl.close();
    _statusCtrl.close();
    _chatCtrl.close();
  }
}

/// In-memory fake for widget/bloc tests.
class FakeRealtimeClient implements RealtimeClient {
  FakeRealtimeClient({this.joinLocation});

  LiveLocation? joinLocation;
  final _locationCtrl = StreamController<LiveLocation>.broadcast();
  final _statusCtrl = StreamController<Map<String, dynamic>>.broadcast();
  final _chatCtrl = StreamController<ChatMessage>.broadcast();
  var connected = false;
  String? joinedTripId;
  String? joinedThreadId;
  var joinCount = 0;
  var chatJoinCount = 0;
  var locationUpdateCount = 0;
  Map<String, dynamic>? lastLocationPayload;

  void pushLocation(LiveLocation location) => _locationCtrl.add(location);

  void pushChatMessage(ChatMessage message) => _chatCtrl.add(message);

  @override
  bool get isConnected => connected;

  @override
  Stream<LiveLocation> get locationUpdates => _locationCtrl.stream;

  @override
  Stream<Map<String, dynamic>> get tripStatusUpdates => _statusCtrl.stream;

  @override
  Stream<ChatMessage> get chatMessages => _chatCtrl.stream;

  @override
  Future<void> connect() async {
    connected = true;
  }

  @override
  Future<void> disconnect() async {
    connected = false;
    joinedTripId = null;
    joinedThreadId = null;
  }

  @override
  Future<LiveLocation?> joinTrip(String tripId) async {
    await connect();
    joinedTripId = tripId;
    joinCount++;
    return joinLocation;
  }

  @override
  Future<void> leaveTrip(String tripId) async {
    if (joinedTripId == tripId) joinedTripId = null;
  }

  @override
  Future<void> joinChat(String threadId) async {
    await connect();
    joinedThreadId = threadId;
    chatJoinCount++;
  }

  @override
  Future<void> leaveChat(String threadId) async {
    if (joinedThreadId == threadId) joinedThreadId = null;
  }

  @override
  Future<LiveLocation?> updateLocation({
    required String tripId,
    required double lat,
    required double lng,
    double? heading,
    double? speedMps,
  }) async {
    await connect();
    locationUpdateCount++;
    lastLocationPayload = {
      'tripId': tripId,
      'lat': lat,
      'lng': lng,
      'heading': heading,
      'speedMps': speedMps,
    };
    final loc = LiveLocation(
      tripId: tripId,
      lat: lat,
      lng: lng,
      heading: heading,
      speedMps: speedMps,
      updatedAt: DateTime.now().toUtc(),
    );
    _locationCtrl.add(loc);
    return loc;
  }

  void dispose() {
    _locationCtrl.close();
    _statusCtrl.close();
    _chatCtrl.close();
  }
}
