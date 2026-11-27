// Placeholder Firebase options for Captain Truck FYP.
// Replace via `flutterfire configure` (or paste real values) before production push.
// App starts without crashing if init fails — push sync becomes a no-op.

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError('Web is out of scope for the customer app.');
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'Firebase options not configured for $defaultTargetPlatform',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyReplaceMe_AndroidFcmApiKey________',
    appId: '1:000000000000:android:0000000000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'captain-truck-fyp',
    storageBucket: 'captain-truck-fyp.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyReplaceMe_IosFcmApiKey____________',
    appId: '1:000000000000:ios:0000000000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'captain-truck-fyp',
    storageBucket: 'captain-truck-fyp.appspot.com',
    iosBundleId: 'com.example.customerApp',
  );
}
