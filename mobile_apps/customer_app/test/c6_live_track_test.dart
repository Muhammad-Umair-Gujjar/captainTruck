import 'dart:convert';

import 'package:bloc_test/bloc_test.dart';
import 'package:customer_app/core/network/api_client.dart';
import 'package:customer_app/core/realtime/realtime_client.dart';
import 'package:customer_app/features/trips/data/trip_models.dart';
import 'package:customer_app/features/trips/data/trips_repository.dart';
import 'package:customer_app/features/trips/presentation/bloc/live_track_bloc.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockTrips extends Mock implements TripsRepository {}

void main() {
  test('TripsRepository getById + location', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/trips/t1'] = {
      'success': true,
      'data': {
        'id': 't1',
        'requestId': 'd1',
        'driverId': 'drv1',
        'status': 'IN_TRANSIT',
        'lastLat': 31.52,
        'lastLng': 74.35,
        'driver': {
          'id': 'drv1',
          'fullName': 'Ali Driver',
          'phone': '+92300',
          'driverProfile': {'vehiclePlate': 'LEA-123'},
        },
        'liveLocation': {
          'tripId': 't1',
          'lat': 31.53,
          'lng': 74.36,
          'updatedAt': '2026-11-27T00:00:00.000Z',
          'stale': false,
          'sealed': false,
        },
      },
    };
    adapter.onGet['/trips/t1/location'] = {
      'success': true,
      'data': {
        'tripId': 't1',
        'lat': 31.54,
        'lng': 74.37,
        'updatedAt': '2026-11-27T00:01:00.000Z',
        'stale': false,
        'sealed': false,
      },
    };

    final repo = TripsRepository(ApiClient(dio: dio));
    final trip = await repo.getById('t1');
    expect(trip.status, 'IN_TRANSIT');
    expect(trip.driver?.vehiclePlate, 'LEA-123');
    expect(trip.liveLocation?.lat, 31.53);

    final loc = await repo.getLocation('t1');
    expect(loc?.lng, 74.37);
  });

  group('LiveTrackBloc', () {
    late _MockTrips repo;
    late FakeRealtimeClient realtime;

    setUp(() {
      repo = _MockTrips();
      realtime = FakeRealtimeClient(
        joinLocation: LiveLocation(
          tripId: 't1',
          lat: 31.52,
          lng: 74.35,
          updatedAt: DateTime.parse('2026-11-27T00:00:00.000Z'),
        ),
      );
    });

    tearDown(() => realtime.dispose());

    blocTest<LiveTrackBloc, LiveTrackState>(
      'joins room and applies location updates',
      build: () {
        when(() => repo.getById('t1')).thenAnswer(
          (_) async => TripDetail(
            id: 't1',
            requestId: 'd1',
            driverId: 'drv1',
            status: 'EN_ROUTE_PICKUP',
            driver: const TripDriver(id: 'drv1', fullName: 'Ali'),
          ),
        );
        when(() => repo.getLocation('t1')).thenAnswer((_) async => null);
        return LiveTrackBloc(
          repository: repo,
          realtime: realtime,
          tripId: 't1',
        );
      },
      act: (bloc) async {
        bloc.add(const LiveTrackStarted());
        await bloc.stream.firstWhere((s) => s.status == LiveTrackStatus.live);
        realtime.pushLocation(
          LiveLocation(
            tripId: 't1',
            lat: 31.6,
            lng: 74.4,
            updatedAt: DateTime.parse('2026-11-27T00:05:00.000Z'),
          ),
        );
        await Future<void>.delayed(const Duration(milliseconds: 20));
      },
      wait: const Duration(milliseconds: 50),
      expect: () => [
        isA<LiveTrackState>().having(
          (s) => s.status,
          'status',
          LiveTrackStatus.loading,
        ),
        isA<LiveTrackState>()
            .having((s) => s.status, 'status', LiveTrackStatus.live)
            .having((s) => s.location?.lat, 'lat', 31.52)
            .having((s) => s.socketConnected, 'socket', true),
        isA<LiveTrackState>().having(
          (s) => s.location?.lat,
          'updated lat',
          31.6,
        ),
      ],
      verify: (_) {
        expect(realtime.joinCount, greaterThanOrEqualTo(1));
      },
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
