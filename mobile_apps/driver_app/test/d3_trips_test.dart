import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:driver_app/features/trips/data/trips_repository.dart';
import 'package:driver_app/features/trips/presentation/bloc/my_trips_bloc.dart';
import 'package:driver_app/features/trips/presentation/bloc/trip_detail_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Map<String, dynamic> tripJson({
    String id = 't1',
    String status = 'ASSIGNED',
  }) {
    return {
      'id': id,
      'requestId': 'r1',
      'driverId': 'd1',
      'status': status,
      'finalBillCents': null,
      'createdAt': '2026-01-01T00:00:00.000Z',
      'request': {
        'id': 'r1',
        'pickupAddress': 'Warehouse A',
        'dropoffAddress': 'Site B',
        'paymentMethod': 'CASH',
        'customer': {
          'id': 'c1',
          'fullName': 'Cust',
          'phone': '+92000',
          'email': 'c@test.com',
        },
        'truckType': {'id': 'tt1', 'name': 'Mazda', 'code': 'MZ'},
        'routeOptions': [
          {'id': 'ro1', 'aiCostCents': 150000, 'isSelected': true},
        ],
      },
    };
  }

  test('TripsRepository listMine + getById', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/trips/mine'] = {
      'success': true,
      'data': {
        'items': [tripJson()],
        'meta': {'page': 1, 'limit': 20, 'total': 1, 'totalPages': 1},
      },
    };
    adapter.onGet['/trips/t1'] = {
      'success': true,
      'data': tripJson(status: 'EN_ROUTE_PICKUP'),
    };

    final repo = TripsRepository(ApiClient(dio: dio));
    final page = await repo.listMine();
    expect(page.items, hasLength(1));
    expect(page.items.first.request?.pickupAddress, 'Warehouse A');
    expect(page.items.first.request?.customer?.fullName, 'Cust');
    expect(page.total, 1);

    final detail = await repo.getById('t1');
    expect(detail.status, 'EN_ROUTE_PICKUP');
    expect(detail.request?.truckType?.name, 'Mazda');
  });

  test('MyTripsBloc loads assignments', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/trips/mine'] = {
      'success': true,
      'data': {
        'items': [tripJson(), tripJson(id: 't2', status: 'IN_TRANSIT')],
        'meta': {'page': 1, 'limit': 20, 'total': 2, 'totalPages': 1},
      },
    };

    final bloc = MyTripsBloc(TripsRepository(ApiClient(dio: dio)));
    bloc.add(const MyTripsStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<MyTripsState>()
            .having((s) => s.status, 'status', MyTripsStatus.ready)
            .having((s) => s.items.length, 'count', 2),
      ),
    );
    await bloc.close();
  });

  test('TripDetailBloc loads trip', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/trips/t1'] = {
      'success': true,
      'data': tripJson(),
    };

    final bloc = TripDetailBloc(
      repository: TripsRepository(ApiClient(dio: dio)),
      tripId: 't1',
    );
    bloc.add(const TripDetailStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>()
            .having((s) => s.status, 'status', TripDetailStatus.ready)
            .having((s) => s.trip?.id, 'id', 't1')
            .having(
              (s) => s.trip?.request?.dropoffAddress,
              'drop',
              'Site B',
            ),
      ),
    );
    await bloc.close();
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
