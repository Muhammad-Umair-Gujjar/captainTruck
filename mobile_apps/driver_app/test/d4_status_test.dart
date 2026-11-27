import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:driver_app/features/trips/data/trip_models.dart';
import 'package:driver_app/features/trips/data/trips_repository.dart';
import 'package:driver_app/features/trips/presentation/bloc/trip_detail_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Map<String, dynamic> tripJson(String status) {
    return {
      'id': 't1',
      'requestId': 'r1',
      'driverId': 'd1',
      'status': status,
      'request': {
        'id': 'r1',
        'pickupAddress': 'A',
        'dropoffAddress': 'B',
        'customer': {
          'id': 'c1',
          'fullName': 'Cust',
        },
      },
    };
  }

  test('nextDriverStatus walks forward without cancel', () {
    expect(nextDriverStatus('ASSIGNED'), 'EN_ROUTE_PICKUP');
    expect(nextDriverStatus('EN_ROUTE_PICKUP'), 'ARRIVED_PICKUP');
    expect(nextDriverStatus('ARRIVED_PICKUP'), 'IN_TRANSIT');
    expect(nextDriverStatus('IN_TRANSIT'), 'DELIVERED');
    expect(nextDriverStatus('DELIVERED'), 'COMPLETED');
    expect(nextDriverStatus('COMPLETED'), isNull);
    expect(nextDriverStatus('CANCELLED'), isNull);
  });

  test('TripsRepository updateStatus posts next status', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onPost['/trips/t1/status'] = {
      'success': true,
      'data': tripJson('EN_ROUTE_PICKUP'),
    };

    final repo = TripsRepository(ApiClient(dio: dio));
    final updated = await repo.updateStatus(
      tripId: 't1',
      status: 'EN_ROUTE_PICKUP',
    );
    expect(updated.status, 'EN_ROUTE_PICKUP');
    expect(adapter.lastPostBody?['status'], 'EN_ROUTE_PICKUP');
  });

  test('TripDetailBloc advances status', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/trips/t1'] = {
      'success': true,
      'data': tripJson('ASSIGNED'),
    };
    adapter.onPost['/trips/t1/status'] = {
      'success': true,
      'data': tripJson('EN_ROUTE_PICKUP'),
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
            .having((s) => s.status, 's', TripDetailStatus.ready)
            .having((s) => s.trip?.status, 'trip', 'ASSIGNED'),
      ),
    );

    bloc.add(const TripDetailAdvanceRequested('EN_ROUTE_PICKUP'));
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>()
            .having((s) => s.trip?.status, 'trip', 'EN_ROUTE_PICKUP')
            .having((s) => s.busy, 'busy', false)
            .having((s) => s.message, 'msg', contains('en route')),
      ),
    );
    await bloc.close();
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};
  final Map<String, Map<String, dynamic>> onPost = {};
  Map<String, dynamic>? lastPostBody;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    Map<String, dynamic>? bodyFromOptions() {
      final data = options.data;
      if (data is Map) return Map<String, dynamic>.from(data);
      return null;
    }

    if (options.method == 'GET' && onGet.containsKey(options.path)) {
      return _ok(onGet[options.path]!);
    }
    if (options.method == 'POST' && onPost.containsKey(options.path)) {
      lastPostBody = bodyFromOptions();
      return _ok(onPost[options.path]!);
    }
    throw DioException(
      requestOptions: options,
      message: 'unmapped ${options.method} ${options.path}',
    );
  }

  ResponseBody _ok(Map<String, dynamic> body) {
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
