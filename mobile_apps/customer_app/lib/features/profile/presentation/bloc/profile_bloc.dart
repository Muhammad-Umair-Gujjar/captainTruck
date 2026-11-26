import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../../auth/data/auth_models.dart';
import '../../data/profile_repository.dart';

part 'profile_event.dart';
part 'profile_state.dart';

class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  ProfileBloc(this._repository) : super(const ProfileState()) {
    on<ProfileStarted>(_onStarted);
    on<ProfileSaveSubmitted>(_onSave);
  }

  final ProfileRepository _repository;

  Future<void> _onStarted(
    ProfileStarted event,
    Emitter<ProfileState> emit,
  ) async {
    emit(state.copyWith(status: ProfileStatus.loading, clearMessage: true));
    try {
      final user = await _repository.fetchMe();
      emit(
        state.copyWith(
          status: ProfileStatus.ready,
          user: user,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: ProfileStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onSave(
    ProfileSaveSubmitted event,
    Emitter<ProfileState> emit,
  ) async {
    emit(state.copyWith(busy: true, clearMessage: true));
    try {
      final user = await _repository.updateMe(
        fullName: event.fullName,
        email: event.email,
        phone: event.phone,
      );
      emit(
        state.copyWith(
          status: ProfileStatus.saved,
          user: user,
          busy: false,
          message: 'Profile updated',
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: ProfileStatus.failure,
          busy: false,
          message: _msg(e),
        ),
      );
    }
  }

  String _msg(Object e) {
    if (e is ApiException) return e.toString();
    return e.toString();
  }
}
