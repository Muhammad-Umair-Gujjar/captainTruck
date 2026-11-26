import 'dart:convert';

import 'package:bloc_test/bloc_test.dart';
import 'package:customer_app/core/network/api_client.dart';
import 'package:customer_app/features/dispatches/data/dispatch_models.dart';
import 'package:customer_app/features/dispatches/data/dispatches_repository.dart';
import 'package:customer_app/features/dispatches/presentation/bloc/dispatch_detail_bloc.dart';
import 'package:customer_app/features/dispatches/presentation/bloc/my_requests_bloc.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockRepo extends Mock implements DispatchesRepository {}

void main() {
  test('listMine parses items + pagination meta', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/dispatches/mine'] = {
      'success': true,
      'data': {
        'items': [
          {
            'id': 'd1',
            'truckTypeId': 'tt1',
            'status': 'PENDING_ADMIN',
            'truckCount': 1,
            'pickupAddress': 'Lahore',
            'dropoffAddress': 'Islamabad',
            'paymentMethod': 'CASH',
            'truckType': {'id': 'tt1', 'name': 'Small Truck', 'code': 'SMALL'},
          },
        ],
        'meta': {'page': 1, 'limit': 20, 'total': 1, 'totalPages': 1},
      },
    };

    final repo = DispatchesRepository(ApiClient(dio: dio));
    final page = await repo.listMine();
    expect(page.items, hasLength(1));
    expect(page.items.first.status, 'PENDING_ADMIN');
    expect(page.items.first.truckTypeName, 'Small Truck');
    expect(page.items.first.isPendingAdmin, isTrue);
    expect(page.total, 1);
  });

  group('MyRequestsBloc', () {
    late _MockRepo repo;

    setUp(() => repo = _MockRepo());

    blocTest<MyRequestsBloc, MyRequestsState>(
      'loads mine list',
      build: () {
        when(
          () => repo.listMine(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          ),
        ).thenAnswer(
          (_) async => const DispatchListPage(
            items: [
              DispatchRequest(
                id: 'd1',
                truckTypeId: 'tt1',
                status: 'PENDING_ADMIN',
                truckCount: 1,
                pickupAddress: 'A',
                dropoffAddress: 'B',
                paymentMethod: 'CASH',
              ),
            ],
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          ),
        );
        return MyRequestsBloc(repo);
      },
      act: (bloc) => bloc.add(const MyRequestsStarted()),
      expect: () => [
        isA<MyRequestsState>().having(
          (s) => s.status,
          'status',
          MyRequestsStatus.loading,
        ),
        isA<MyRequestsState>()
            .having((s) => s.status, 'status', MyRequestsStatus.ready)
            .having((s) => s.items, 'items', hasLength(1)),
      ],
    );
  });

  group('DispatchDetailBloc', () {
    late _MockRepo repo;

    setUp(() => repo = _MockRepo());

    blocTest<DispatchDetailBloc, DispatchDetailState>(
      'loads then cancels',
      build: () {
        when(() => repo.getById('d1')).thenAnswer(
          (_) async => const DispatchRequest(
            id: 'd1',
            truckTypeId: 'tt1',
            status: 'PENDING_ADMIN',
            truckCount: 1,
            pickupAddress: 'A',
            dropoffAddress: 'B',
            paymentMethod: 'CASH',
          ),
        );
        when(() => repo.cancel('d1')).thenAnswer(
          (_) async => const DispatchRequest(
            id: 'd1',
            truckTypeId: 'tt1',
            status: 'CANCELLED',
            truckCount: 1,
            pickupAddress: 'A',
            dropoffAddress: 'B',
            paymentMethod: 'CASH',
          ),
        );
        return DispatchDetailBloc(repository: repo, dispatchId: 'd1');
      },
      act: (bloc) async {
        bloc.add(const DispatchDetailStarted());
        await bloc.stream.firstWhere(
          (s) => s.status == DispatchDetailStatus.ready,
        );
        bloc.add(const DispatchDetailCancelRequested());
      },
      wait: const Duration(milliseconds: 50),
      expect: () => [
        isA<DispatchDetailState>().having(
          (s) => s.status,
          'status',
          DispatchDetailStatus.loading,
        ),
        isA<DispatchDetailState>().having(
          (s) => s.dispatch?.status,
          'status',
          'PENDING_ADMIN',
        ),
        isA<DispatchDetailState>().having((s) => s.busy, 'busy', true),
        isA<DispatchDetailState>()
            .having((s) => s.dispatch?.status, 'status', 'CANCELLED')
            .having((s) => s.busy, 'busy', false),
      ],
    );
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.method == 'GET' && onGet.containsKey(options.path)) {
      return ResponseBody.fromString(
        jsonEncode(onGet[options.path]),
        200,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    }
    throw DioException(
      requestOptions: options,
      message: 'unmapped ${options.method} ${options.path}',
    );
  }
}
