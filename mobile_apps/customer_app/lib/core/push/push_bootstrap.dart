import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../../features/notifications/data/device_push_token_source.dart';
import '../../features/notifications/data/firebase_push_token_source.dart';
import '../../firebase_options.dart';

/// Initializes Firebase when possible; otherwise returns a no-op token source.
class PushBootstrap {
  PushBootstrap._();

  static bool firebaseReady = false;

  static Future<DevicePushTokenSource> createTokenSource({
    DevicePushTokenSource? override,
  }) async {
    if (override != null) return override;

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      }
      firebaseReady = true;
      final source = FirebasePushTokenSource();
      await source.startListening();
      return source;
    } catch (e, st) {
      debugPrint(
        'Firebase unavailable — push registration disabled until '
        'google-services.json / GoogleService-Info.plist are configured.\n$e\n$st',
      );
      firebaseReady = false;
      return FakeDevicePushTokenSource(
        token: null,
        permissionGranted: false,
      );
    }
  }
}
