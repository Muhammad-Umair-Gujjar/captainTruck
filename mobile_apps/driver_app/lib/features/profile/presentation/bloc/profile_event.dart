part of 'profile_bloc.dart';

sealed class ProfileEvent extends Equatable {
  const ProfileEvent();

  @override
  List<Object?> get props => [];
}

final class ProfileStarted extends ProfileEvent {
  const ProfileStarted();
}

final class ProfileAccountSaveSubmitted extends ProfileEvent {
  const ProfileAccountSaveSubmitted({
    required this.fullName,
    required this.email,
    this.phone,
  });

  final String fullName;
  final String email;
  final String? phone;

  @override
  List<Object?> get props => [fullName, email, phone];
}

final class ProfileDriverSaveSubmitted extends ProfileEvent {
  const ProfileDriverSaveSubmitted({
    required this.licenseNumber,
    required this.vehiclePlate,
    required this.isAvailable,
  });

  final String licenseNumber;
  final String vehiclePlate;
  final bool isAvailable;

  @override
  List<Object?> get props => [licenseNumber, vehiclePlate, isAvailable];
}
