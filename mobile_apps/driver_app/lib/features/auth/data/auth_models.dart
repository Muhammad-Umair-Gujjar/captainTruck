import 'package:equatable/equatable.dart';

class DriverProfile extends Equatable {
  const DriverProfile({
    required this.id,
    this.licenseNumber,
    this.vehiclePlate,
    required this.isAvailable,
    this.docsUrls = const [],
    this.adminNotes,
  });

  final String id;
  final String? licenseNumber;
  final String? vehiclePlate;
  final bool isAvailable;
  final List<String> docsUrls;
  final String? adminNotes;

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    final docs = json['docsUrls'];
    return DriverProfile(
      id: json['id'].toString(),
      licenseNumber: json['licenseNumber']?.toString(),
      vehiclePlate: json['vehiclePlate']?.toString(),
      isAvailable: json['isAvailable'] == true,
      docsUrls: docs is List
          ? docs.map((e) => e.toString()).toList()
          : const [],
      adminNotes: json['adminNotes']?.toString(),
    );
  }

  @override
  List<Object?> get props =>
      [id, licenseNumber, vehiclePlate, isAvailable, docsUrls, adminNotes];
}

class AuthUser extends Equatable {
  const AuthUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    required this.status,
    this.phone,
    this.driverProfile,
  });

  final String id;
  final String email;
  final String fullName;
  final String role;
  final String status;
  final String? phone;
  final DriverProfile? driverProfile;

  bool get isDriver => role.toLowerCase() == 'driver';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final profileRaw = json['driverProfile'];
    return AuthUser(
      id: json['id'].toString(),
      email: json['email'].toString(),
      fullName: json['fullName'].toString(),
      role: json['role'].toString(),
      status: json['status'].toString(),
      phone: json['phone']?.toString(),
      driverProfile: profileRaw is Map
          ? DriverProfile.fromJson(Map<String, dynamic>.from(profileRaw))
          : null,
    );
  }

  @override
  List<Object?> get props =>
      [id, email, fullName, role, status, phone, driverProfile];
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
