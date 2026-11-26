part of 'profile_bloc.dart';

sealed class ProfileEvent extends Equatable {
  const ProfileEvent();

  @override
  List<Object?> get props => [];
}

final class ProfileStarted extends ProfileEvent {
  const ProfileStarted();
}

final class ProfileSaveSubmitted extends ProfileEvent {
  const ProfileSaveSubmitted({
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
