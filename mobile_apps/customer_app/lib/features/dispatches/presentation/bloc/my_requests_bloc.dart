import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/dispatch_models.dart';
import '../../data/dispatches_repository.dart';

part 'my_requests_event.dart';
part 'my_requests_state.dart';

class MyRequestsBloc extends Bloc<MyRequestsEvent, MyRequestsState> {
  MyRequestsBloc(this.repository) : super(const MyRequestsState()) {
    on<MyRequestsStarted>(_onLoad);
    on<MyRequestsRefreshed>(_onLoad);
    on<MyRequestsFilterChanged>(_onFilter);
    on<MyRequestsLoadMore>(_onMore);
  }

  final DispatchesRepository repository;

  Future<void> _onLoad(
    MyRequestsEvent event,
    Emitter<MyRequestsState> emit,
  ) async {
    emit(
      state.copyWith(
        status: MyRequestsStatus.loading,
        clearMessage: true,
        page: 1,
      ),
    );
    try {
      final page = await repository.listMine(
        status: state.statusFilter,
        page: 1,
      );
      emit(
        state.copyWith(
          status: MyRequestsStatus.ready,
          items: page.items,
          page: page.page,
          totalPages: page.totalPages,
          total: page.total,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: MyRequestsStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onFilter(
    MyRequestsFilterChanged event,
    Emitter<MyRequestsState> emit,
  ) async {
    emit(state.copyWith(statusFilter: event.status, clearFilter: event.status == null));
    add(const MyRequestsStarted());
  }

  Future<void> _onMore(
    MyRequestsLoadMore event,
    Emitter<MyRequestsState> emit,
  ) async {
    if (state.status != MyRequestsStatus.ready) return;
    if (state.page >= state.totalPages || state.loadingMore) return;

    emit(state.copyWith(loadingMore: true, clearMessage: true));
    try {
      final next = state.page + 1;
      final page = await repository.listMine(
        status: state.statusFilter,
        page: next,
      );
      emit(
        state.copyWith(
          loadingMore: false,
          items: [...state.items, ...page.items],
          page: page.page,
          totalPages: page.totalPages,
          total: page.total,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          loadingMore: false,
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
