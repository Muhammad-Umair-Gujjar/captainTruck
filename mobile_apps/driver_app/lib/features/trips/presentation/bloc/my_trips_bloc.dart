import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/trip_models.dart';
import '../../data/trips_repository.dart';

part 'my_trips_event.dart';
part 'my_trips_state.dart';

class MyTripsBloc extends Bloc<MyTripsEvent, MyTripsState> {
  MyTripsBloc(this.repository) : super(const MyTripsState()) {
    on<MyTripsStarted>(_onLoad);
    on<MyTripsRefreshed>(_onLoad);
    on<MyTripsFilterChanged>(_onFilter);
    on<MyTripsLoadMore>(_onMore);
  }

  final TripsRepository repository;

  Future<void> _onLoad(
    MyTripsEvent event,
    Emitter<MyTripsState> emit,
  ) async {
    emit(
      state.copyWith(
        status: MyTripsStatus.loading,
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
          status: MyTripsStatus.ready,
          items: page.items,
          page: page.page,
          totalPages: page.totalPages,
          total: page.total,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: MyTripsStatus.failure,
          message: _msg(e),
        ),
      );
    }
  }

  Future<void> _onFilter(
    MyTripsFilterChanged event,
    Emitter<MyTripsState> emit,
  ) async {
    emit(
      state.copyWith(
        statusFilter: event.status,
        clearFilter: event.status == null,
      ),
    );
    add(const MyTripsStarted());
  }

  Future<void> _onMore(
    MyTripsLoadMore event,
    Emitter<MyTripsState> emit,
  ) async {
    if (state.status != MyTripsStatus.ready) return;
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
