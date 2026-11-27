import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'device_push_token_source.dart';
import 'notification_models.dart';

/// FCM-backed token source. Construct only after Firebase.initializeApp succeeds.
///
/// Nest stores classic FCM registration tokens for Admin SDK
/// `messaging.send({ token })`, so we keep getToken/onTokenRefresh (not FID).
class FirebasePushTokenSource implements DevicePushTokenSource {
  FirebasePushTokenSource({FirebaseMessaging? messaging})
      : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;
  StreamSubscription<String>? _refreshSub;
  final _refresh = StreamController<String>.broadcast();
  final _foreground = StreamController<PushMessageLite>.broadcast();
  StreamSubscription<RemoteMessage>? _fgSub;
  bool _listening = false;

  Future<void> startListening() async {
    if (_listening) return;
    _listening = true;
    _refreshSub =
        // ignore: deprecated_member_use
        _messaging.onTokenRefresh.listen(_refresh.add);
    _fgSub = FirebaseMessaging.onMessage.listen((message) {
      final n = message.notification;
      _foreground.add(
        PushMessageLite(
          title: n?.title,
          body: n?.body,
          data: message.data.map((k, v) => MapEntry(k, v.toString())),
        ),
      );
    });
  }

  @override
  Future<bool> requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    final status = settings.authorizationStatus;
    return status == AuthorizationStatus.authorized ||
        status == AuthorizationStatus.provisional;
  }

  @override
  Future<String?> getToken() async {
    try {
      // ignore: deprecated_member_use
      final token = await _messaging.getToken();
      if (token == null || token.length < 20) return null;
      return token;
    } catch (e, st) {
      debugPrint('FCM getToken failed: $e\n$st');
      return null;
    }
  }

  @override
  Stream<String> get onTokenRefresh => _refresh.stream;

  @override
  Stream<PushMessageLite> get onForegroundMessage => _foreground.stream;

  @override
  Future<void> dispose() async {
    await _refreshSub?.cancel();
    await _fgSub?.cancel();
    await _refresh.close();
    await _foreground.close();
  }
}
