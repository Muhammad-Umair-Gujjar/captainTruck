import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:driver_app/core/location/device_location_source.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:driver_app/core/realtime/realtime_client.dart';
import 'package:driver_app/features/trips/data/trip_models.dart';
import 'package:driver_app/features/trips/data/trips_repository.dart';
import 'package:driver_app/features/trips/presentation/bloc/trip_detail_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Map<String, dynamic> tripJson({String status = 'ASSIGNED'}) {
    return {
      'id': 't1',
      'requestId': 'r1',
      'driverId': 'd1',
      'status': status,
      'request': {
        'id': 'r1',
        'pickupAddress': 'A',
        'dropoffAddress': 'B',
      },
    };
  }

  test('TripsRepository updateLocation posts REST body', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onPost['/trips/t1/location'] = {
      'success': true,
      'data': {
        'tripId': 't1',
        'lat': 31.52,
        'lng': 74.35,
        'updatedAt': '2026-01-01T00:00:00.000Z',
        'stale': false,
        'sealed': false,
      },
    };

    final repo = TripsRepository(ApiClient(dio: dio));
    final loc = await repo.updateLocation(
      tripId: 't1',
      lat: 31.52,
      lng: 74.35,
      heading: 90,
    );
    expect(loc.lat, 31.52);
    expect(adapter.lastPostBody?['lng'], 74.35);
    expect(adapter.lastPostBody?['heading'], 90);
  });

  test('TripDetailBloc starts GPS and publishes via socket', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/trips/t1'] = {
      'success': true,
      'data': tripJson(),
    };

    final realtime = FakeRealtimeClient();
    final locations = FakeDeviceLocationSource();
    final bloc = TripDetailBloc(
      repository: TripsRepository(ApiClient(dio: dio)),
      tripId: 't1',
      realtime: realtime,
      locationSource: locations,
    );

    bloc.add(const TripDetailStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>()
            .having((s) => s.status, 's', TripDetailStatus.ready),
      ),
    );

    bloc.add(const TripDetailGpsStartRequested());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>().having((s) => s.gpsSharing, 'gps', true),
      ),
    );
    expect(realtime.joinCount, 1);

    locations.emit(
      DevicePosition(
        lat: 31.5,
        lng: 74.3,
        timestamp: DateTime.now().toUtc(),
      ),
    );
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>()
            .having((s) => s.publishCount, 'count', greaterThanOrEqualTo(1))
            .having((s) => s.lastPublished?.lat, 'lat', 31.5),
      ),
    );
    expect(realtime.locationUpdateCount, greaterThanOrEqualTo(1));

    bloc.add(const TripDetailGpsStopRequested());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>().having((s) => s.gpsSharing, 'gps', false),
      ),
    );
    await bloc.close();
  });

  test('GPS falls back to REST when socket update fails', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/trips/t1'] = {
      'success': true,
      'data': tripJson(),
    };
    adapter.onPost['/trips/t1/location'] = {
      'success': true,
      'data': {
        'tripId': 't1',
        'lat': 32.1,
        'lng': 74.1,
        'updatedAt': '2026-01-01T00:00:03.000Z',
        'stale': false,
        'sealed': false,
      },
    };

    final realtime = _FailingUpdateRealtime();
    final locations = FakeDeviceLocationSource();
    final bloc = TripDetailBloc(
      repository: TripsRepository(ApiClient(dio: dio)),
      tripId: 't1',
      realtime: realtime,
      locationSource: locations,
    );

    bloc.add(const TripDetailStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>()
            .having((s) => s.status, 's', TripDetailStatus.ready),
      ),
    );
    bloc.add(const TripDetailGpsStartRequested());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>().having((s) => s.gpsSharing, 'gps', true),
      ),
    );

    locations.emit(
      DevicePosition(
        lat: 32.1,
        lng: 74.1,
        timestamp: DateTime.now().toUtc(),
      ),
    );
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<TripDetailState>()
            .having((s) => s.lastPublished?.lat, 'lat', 32.1)
            .having((s) => s.publishCount, 'count', greaterThanOrEqualTo(1)),
      ),
    );
    expect(adapter.postCount['/trips/t1/location'], greaterThanOrEqualTo(1));
    await bloc.close();
  });
}

class _FailingUpdateRealtime extends FakeRealtimeClient {
  @override
  Future<LiveLocation?> updateLocation({
    required String tripId,
    required double lat,
    required double lng,
    double? heading,
    double? speedMps,
  }) async {
    throw StateError('socket down');
  }
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};
  final Map<String, Map<String, dynamic>> onPost = {};
  final Map<String, int> postCount = {};
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
      postCount[options.path] = (postCount[options.path] ?? 0) + 1;
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
