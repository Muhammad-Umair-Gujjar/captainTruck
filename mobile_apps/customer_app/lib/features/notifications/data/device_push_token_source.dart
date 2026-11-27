import 'dart:async';

import 'notification_models.dart';

/// Abstraction over FCM so tests and unconfigured builds can no-op / fake.
abstract class DevicePushTokenSource {
  Future<bool> requestPermission();

  Future<String?> getToken();

  Stream<String> get onTokenRefresh;

  Stream<PushMessageLite> get onForegroundMessage;

  Future<void> dispose();
}

/// In-memory source for unit tests and when Firebase is unavailable.
class FakeDevicePushTokenSource implements DevicePushTokenSource {
  FakeDevicePushTokenSource({
    this.token = 'fake-fcm-token-xxxxxxxxxxxxxxxxxxxx',
    this.permissionGranted = true,
  });

  String? token;
  bool permissionGranted;
  final _refresh = StreamController<String>.broadcast();
  final _foreground = StreamController<PushMessageLite>.broadcast();

  void emitRefresh(String next) {
    token = next;
    _refresh.add(next);
  }

  void emitForeground(PushMessageLite message) => _foreground.add(message);

  @override
  Future<bool> requestPermission() async => permissionGranted;

  @override
  Future<String?> getToken() async =>
      permissionGranted && token != null && token!.length >= 20 ? token : null;

  @override
  Stream<String> get onTokenRefresh => _refresh.stream;

  @override
  Stream<PushMessageLite> get onForegroundMessage => _foreground.stream;

  @override
  Future<void> dispose() async {
    await _refresh.close();
    await _foreground.close();
  }
}
