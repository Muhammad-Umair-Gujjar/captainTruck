import 'dart:async';

import 'package:flutter/foundation.dart';

import 'device_push_token_source.dart';
import 'firebase_push_token_source.dart';
import 'notification_models.dart';
import 'notifications_repository.dart';

enum PushSyncStatus { idle, syncing, registered, unavailable, failed }

/// Registers / unregisters the device FCM token with Nest while JWT is valid.
class PushSyncService {
  PushSyncService({
    required this._repository,
    required this._tokenSource,
  });

  final NotificationsRepository _repository;
  final DevicePushTokenSource _tokenSource;

  String? _registeredToken;
  StreamSubscription<String>? _refreshSub;
  StreamSubscription<PushMessageLite>? _fgSub;
  PushSyncStatus status = PushSyncStatus.idle;
  String? lastError;
  bool? serverConfigured;
  final _statusController = StreamController<PushSyncStatus>.broadcast();
  final _messageController = StreamController<PushMessageLite>.broadcast();

  Stream<PushSyncStatus> get statusStream => _statusController.stream;
  Stream<PushMessageLite> get foregroundMessages => _messageController.stream;
  String? get registeredToken => _registeredToken;

  void _setStatus(PushSyncStatus next) {
    status = next;
    if (!_statusController.isClosed) _statusController.add(next);
  }

  Future<void> start() async {
    _setStatus(PushSyncStatus.syncing);
    lastError = null;
    try {
      try {
        serverConfigured = (await _repository.status()).configured;
      } catch (_) {
        serverConfigured = null;
      }

      final permitted = await _tokenSource.requestPermission();
      if (!permitted) {
        lastError = 'Notification permission denied';
        _setStatus(PushSyncStatus.unavailable);
        return;
      }

      final source = _tokenSource;
      if (source is FirebasePushTokenSource) {
        await source.startListening();
      }

      _refreshSub ??= _tokenSource.onTokenRefresh.listen((next) async {
        try {
          final prev = _registeredToken;
          if (prev != null && prev != next) {
            try {
              await _repository.unregisterToken(prev);
            } catch (_) {}
          }
          await _repository.registerToken(next);
          _registeredToken = next;
          _setStatus(PushSyncStatus.registered);
        } catch (e) {
          lastError = e.toString();
          _setStatus(PushSyncStatus.failed);
        }
      });
      _fgSub ??= _tokenSource.onForegroundMessage.listen((m) {
        if (!_messageController.isClosed) _messageController.add(m);
      });

      final token = await _tokenSource.getToken();
      if (token == null) {
        lastError = 'No FCM token (configure Firebase project files)';
        _setStatus(PushSyncStatus.unavailable);
        return;
      }

      await _repository.registerToken(token);
      _registeredToken = token;
      _setStatus(PushSyncStatus.registered);
    } catch (e, st) {
      debugPrint('PushSync start failed: $e\n$st');
      lastError = e.toString();
      _setStatus(PushSyncStatus.failed);
    }
  }

  /// Call while JWT is still valid (before logout clears storage).
  Future<void> stop() async {
    final token = _registeredToken ?? await _tokenSource.getToken();
    if (token != null) {
      try {
        await _repository.unregisterToken(token);
      } catch (e) {
        debugPrint('PushSync unregister failed: $e');
      }
    }
    _registeredToken = null;
    await _refreshSub?.cancel();
    _refreshSub = null;
    await _fgSub?.cancel();
    _fgSub = null;
    _setStatus(PushSyncStatus.idle);
  }

  Future<void> dispose() async {
    await _refreshSub?.cancel();
    await _fgSub?.cancel();
    await _statusController.close();
    await _messageController.close();
    await _tokenSource.dispose();
  }
}
