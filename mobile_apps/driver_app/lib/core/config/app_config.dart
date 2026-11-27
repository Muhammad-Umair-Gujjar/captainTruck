/// Compile-time config via `--dart-define`.
///
/// Emulator → host Nest: `--dart-define=API_BASE_URL=http://10.0.2.2:3000`
/// Device → LAN IP of the machine running the API.
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const String apiPrefix = '/api/v1';

  static String get apiRoot => '$apiBaseUrl$apiPrefix';

  /// Socket.IO namespace root (no `/api/v1`).
  static String get realtimeUrl => '$apiBaseUrl/realtime';
}
