import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/auth_models.dart';
import '../../data/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._repository) : super(const AuthState()) {
    on<AuthStarted>(_onStarted);
    on<AuthLoginSubmitted>(_onLogin);
    on<AuthRegisterSubmitted>(_onRegister);
    on<AuthLogoutRequested>(_onLogout);
    on<AuthUserSynced>(_onUserSynced);
  }

  final AuthRepository _repository;

  Future<void> _onStarted(AuthStarted event, Emitter<AuthState> emit) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final session = await _repository.restoreSession();
      if (session == null) {
        emit(
          state.copyWith(
            status: AuthStatus.unauthenticated,
            busy: false,
            clearUser: true,
          ),
        );
        return;
      }
      emit(
        state.copyWith(
          status: AuthStatus.authenticated,
          user: session.user,
          busy: false,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: AuthStatus.unauthenticated,
          busy: false,
          clearUser: true,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onLogin(
    AuthLoginSubmitted event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final session = await _repository.login(
        email: event.email,
        password: event.password,
      );
      emit(
        state.copyWith(
          status: AuthStatus.authenticated,
          user: session.user,
          busy: false,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: AuthStatus.failure,
          busy: false,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onRegister(
    AuthRegisterSubmitted event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final session = await _repository.register(
        email: event.email,
        password: event.password,
        fullName: event.fullName,
        phone: event.phone,
      );
      emit(
        state.copyWith(
          status: AuthStatus.authenticated,
          user: session.user,
          busy: false,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: AuthStatus.failure,
          busy: false,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onLogout(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    await _repository.logout();
    emit(
      state.copyWith(
        status: AuthStatus.unauthenticated,
        busy: false,
        clearUser: true,
      ),
    );
  }

  void _onUserSynced(AuthUserSynced event, Emitter<AuthState> emit) {
    if (state.status != AuthStatus.authenticated) return;
    emit(state.copyWith(user: event.user));
  }

  String _msg(Object e) {
    if (e is ApiException) return e.toString();
    return e.toString();
  }
}
