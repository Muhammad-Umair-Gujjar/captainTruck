import 'package:equatable/equatable.dart';

class AuthUser extends Equatable {
  const AuthUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    required this.status,
    this.phone,
  });

  final String id;
  final String email;
  final String fullName;
  final String role;
  final String status;
  final String? phone;

  bool get isCustomer => role.toLowerCase() == 'customer';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'].toString(),
      email: json['email'].toString(),
      fullName: json['fullName'].toString(),
      role: json['role'].toString(),
      status: json['status'].toString(),
      phone: json['phone']?.toString(),
    );
  }

  @override
  List<Object?> get props => [id, email, fullName, role, status, phone];
}

class AuthSession extends Equatable {
  const AuthSession({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  final AuthUser user;
  final String accessToken;
  final String refreshToken;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final userRaw = json['user'];
    if (userRaw is! Map) {
      throw FormatException('auth session missing user');
    }
    return AuthSession(
      user: AuthUser.fromJson(Map<String, dynamic>.from(userRaw)),
      accessToken: json['accessToken'].toString(),
      refreshToken: json['refreshToken'].toString(),
    );
  }

  @override
  List<Object?> get props => [user, accessToken, refreshToken];
}
