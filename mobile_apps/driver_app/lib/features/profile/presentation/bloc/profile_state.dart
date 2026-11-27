part of 'profile_bloc.dart';

enum ProfileStatus { initial, loading, ready, saved, failure }

final class ProfileState extends Equatable {
  const ProfileState({
    this.status = ProfileStatus.initial,
    this.user,
    this.message,
    this.busy = false,
  });

  final ProfileStatus status;
  final AuthUser? user;
  final String? message;
  final bool busy;

  ProfileState copyWith({
    ProfileStatus? status,
    AuthUser? user,
    String? message,
    bool? busy,
    bool clearMessage = false,
  }) {
    return ProfileState(
      status: status ?? this.status,
      user: user ?? this.user,
      message: clearMessage ? null : (message ?? this.message),
      busy: busy ?? this.busy,
    );
  }

  @override
  List<Object?> get props => [status, user, message, busy];
}
