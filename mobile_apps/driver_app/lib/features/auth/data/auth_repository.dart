import '../../../core/auth/token_storage.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import 'auth_models.dart';

class AuthRepository {
  AuthRepository({
    required this.client,
    required this.tokenStorage,
  });

  final ApiClient client;
  final TokenStorage tokenStorage;

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final envelope = await client.postEnvelope<AuthSession>(
      '/auth/login',
      data: {
        'email': email.trim(),
        'password': password,
      },
      parseData: _parseSession,
    );
    final session = envelope.data!;
    _assertDriver(session.user);
    await tokenStorage.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  Future<AuthSession?> restoreSession() async {
    final refresh = await tokenStorage.readRefreshToken();
    if (refresh == null || refresh.isEmpty) return null;
    try {
      return await refreshSession(refresh);
    } catch (_) {
      await tokenStorage.clear();
      return null;
    }
  }

  Future<AuthSession> refreshSession([String? rawRefresh]) async {
    final refresh = rawRefresh ?? await tokenStorage.readRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      throw const ApiException(
        code: 'NO_REFRESH',
        message: 'No refresh token',
      );
    }
    final envelope = await client.postEnvelope<AuthSession>(
      '/auth/refresh',
      data: {'refreshToken': refresh},
      parseData: _parseSession,
    );
    final session = envelope.data!;
    _assertDriver(session.user);
    await tokenStorage.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  Future<bool> tryRefresh() async {
    try {
      await refreshSession();
      return true;
    } catch (_) {
      await tokenStorage.clear();
      return false;
    }
  }

  Future<AuthUser> me() async {
    final envelope = await client.getEnvelope<AuthUser>(
      '/auth/me',
      parseData: (raw) {
        if (raw is! Map) throw const FormatException('me payload invalid');
        return AuthUser.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    final user = envelope.data!;
    _assertDriver(user);
    return user;
  }

  Future<void> logout() async {
    final refresh = await tokenStorage.readRefreshToken();
    try {
      if (refresh != null && refresh.isNotEmpty) {
        await client.postEnvelope<Object?>(
          '/auth/logout',
          data: {'refreshToken': refresh},
          parseData: (_) => null,
        );
      }
    } catch (_) {
      // still clear local session
    } finally {
      await tokenStorage.clear();
    }
  }

  AuthSession _parseSession(Object? raw) {
    if (raw is! Map) throw const FormatException('auth payload invalid');
    return AuthSession.fromJson(Map<String, dynamic>.from(raw));
  }

  void _assertDriver(AuthUser user) {
    if (!user.isDriver) {
      throw ApiException(
        code: 'ROLE_FORBIDDEN',
        message: 'This app is for drivers only (got ${user.role})',
      );
    }
  }
}
