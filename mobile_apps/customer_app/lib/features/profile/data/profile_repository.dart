import '../../../core/network/api_client.dart';
import '../../auth/data/auth_models.dart';

class ProfileRepository {
  ProfileRepository(this._client);

  final ApiClient _client;

  Future<AuthUser> fetchMe() async {
    final envelope = await _client.getEnvelope<AuthUser>(
      '/users/me',
      parseData: _parseUser,
    );
    return envelope.data!;
  }

  Future<AuthUser> updateMe({
    String? fullName,
    String? email,
    String? phone,
  }) async {
    final body = <String, dynamic>{
      if (fullName != null) 'fullName': fullName.trim(),
      if (email != null) 'email': email.trim(),
      if (phone != null) 'phone': phone.trim().isEmpty ? null : phone.trim(),
    };
    final envelope = await _client.patchEnvelope<AuthUser>(
      '/users/me',
      data: body,
      parseData: _parseUser,
    );
    return envelope.data!;
  }

  AuthUser _parseUser(Object? raw) {
    if (raw is! Map) {
      throw const FormatException('profile payload invalid');
    }
    return AuthUser.fromJson(Map<String, dynamic>.from(raw));
  }
}
