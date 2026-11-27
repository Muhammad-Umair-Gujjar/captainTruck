part of 'auth_bloc.dart';

enum AuthStatus { unknown, authenticated, unauthenticated, failure }

final class AuthState extends Equatable {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.message,
    this.busy = false,
  });

  final AuthStatus status;
  final AuthUser? user;
  final String? message;
  final bool busy;

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    String? message,
    bool? busy,
    bool clearUser = false,
    bool clearMessage = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      message: clearMessage ? null : (message ?? this.message),
      busy: busy ?? this.busy,
    );
  }

  @override
  List<Object?> get props => [status, user, message, busy];
}
