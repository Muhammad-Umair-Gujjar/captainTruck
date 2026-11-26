import 'dart:convert';

import 'package:bloc_test/bloc_test.dart';
import 'package:customer_app/core/network/api_client.dart';
import 'package:customer_app/features/dispatches/data/dispatch_models.dart';
import 'package:customer_app/features/dispatches/data/dispatches_repository.dart';
import 'package:customer_app/features/dispatches/presentation/bloc/create_dispatch_bloc.dart';
import 'package:customer_app/features/places/data/place_models.dart';
import 'package:customer_app/features/places/data/places_repository.dart';
import 'package:customer_app/features/truck_types/data/truck_type_models.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockPlaces extends Mock implements PlacesRepository {}

class _MockDispatches extends Mock implements DispatchesRepository {}

void main() {
  setUpAll(() {
    registerFallbackValue(
      const CreateDispatchInput(
        truckTypeId: 'tt1',
        truckCount: 1,
        pickupAddress: 'pickup addr',
        dropoffAddress: 'dropoff addr',
        pickupLat: 1,
        pickupLng: 2,
        dropoffLat: 3,
        dropoffLng: 4,
      ),
    );
  });

  const truck = TruckType(
    id: 'tt1',
    code: 'SMALL',
    name: 'Small Truck',
    isActive: true,
    currentRateCents: 150000,
  );

  group('DispatchesRepository', () {
    test('create posts body and parses dispatch', () async {
      final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
      final adapter = _JsonAdapter();
      dio.httpClientAdapter = adapter;
      adapter.onPost['/dispatches'] = {
        'success': true,
        'data': {
          'id': 'd1',
          'truckTypeId': 'tt1',
          'status': 'AWAITING_ROUTE_SELECTION',
          'truckCount': 1,
          'pickupAddress': 'Lahore Warehouse',
          'dropoffAddress': 'Islamabad Site',
          'paymentMethod': 'CASH',
          'pickupLat': 31.52,
          'pickupLng': 74.35,
          'dropoffLat': 33.68,
          'dropoffLng': 73.04,
          'lockedBaseRateCents': 150000,
        },
      };

      final repo = DispatchesRepository(ApiClient(dio: dio));
      final created = await repo.create(
        const CreateDispatchInput(
          truckTypeId: 'tt1',
          truckCount: 1,
          pickupAddress: 'Lahore Warehouse',
          dropoffAddress: 'Islamabad Site',
          pickupLat: 31.52,
          pickupLng: 74.35,
          dropoffLat: 33.68,
          dropoffLng: 73.04,
        ),
      );

      expect(created.id, 'd1');
      expect(created.status, 'AWAITING_ROUTE_SELECTION');
      expect(adapter.lastPostBody?['truckTypeId'], 'tt1');
      expect(adapter.lastPostBody?['asDraft'], false);
    });
  });

  group('CreateDispatchBloc', () {
    late _MockPlaces places;
    late _MockDispatches dispatches;

    setUp(() {
      places = _MockPlaces();
      dispatches = _MockDispatches();
    });

    blocTest<CreateDispatchBloc, CreateDispatchState>(
      'map taps set pickup then dropoff',
      build: () => CreateDispatchBloc(
        dispatchesRepository: dispatches,
        placesRepository: places,
        truckTypes: const [truck],
      ),
      act: (bloc) {
        bloc.add(const CreateDispatchMapTapped(LatLng(31.5, 74.3)));
        bloc.add(const CreateDispatchMapTapped(LatLng(33.6, 73.0)));
      },
      expect: () => [
        isA<CreateDispatchState>()
            .having((s) => s.pickup?.latitude, 'pickup lat', 31.5)
            .having((s) => s.pinMode, 'mode', DispatchPinMode.dropoff),
        isA<CreateDispatchState>()
            .having((s) => s.dropoff?.longitude, 'drop lng', 73.0),
      ],
    );

    blocTest<CreateDispatchBloc, CreateDispatchState>(
      'submit creates dispatch when valid',
      build: () {
        when(
          () => dispatches.create(any()),
        ).thenAnswer(
          (_) async => const DispatchRequest(
            id: 'd1',
            truckTypeId: 'tt1',
            status: 'AWAITING_ROUTE_SELECTION',
            truckCount: 1,
            pickupAddress: 'A Street Lahore',
            dropoffAddress: 'B Street Islamabad',
            paymentMethod: 'CASH',
            lockedBaseRateCents: 150000,
          ),
        );
        return CreateDispatchBloc(
          dispatchesRepository: dispatches,
          placesRepository: places,
          truckTypes: const [truck],
        );
      },
      seed: () => CreateDispatchState(
        truckTypes: const [truck],
        truckTypeId: 'tt1',
        pickup: const LatLng(31.5, 74.3),
        dropoff: const LatLng(33.6, 73.0),
        pickupAddress: 'A Street Lahore',
        dropoffAddress: 'B Street Islamabad',
      ),
      act: (bloc) => bloc.add(const CreateDispatchSubmitted()),
      expect: () => [
        isA<CreateDispatchState>().having(
          (s) => s.status,
          'status',
          CreateDispatchStatus.submitting,
        ),
        isA<CreateDispatchState>()
            .having((s) => s.status, 'status', CreateDispatchStatus.success)
            .having((s) => s.created?.id, 'id', 'd1'),
      ],
      verify: (_) {
        verify(() => dispatches.create(any())).called(1);
      },
    );

    blocTest<CreateDispatchBloc, CreateDispatchState>(
      'search loads suggestions',
      build: () {
        when(() => places.autocomplete(any())).thenAnswer(
          (_) async => const [
            PlaceSuggestion(
              lat: 31.52,
              lng: 74.35,
              displayName: 'Lahore, Pakistan',
            ),
          ],
        );
        return CreateDispatchBloc(
          dispatchesRepository: dispatches,
          placesRepository: places,
          truckTypes: const [truck],
        );
      },
      act: (bloc) => bloc.add(
        const CreateDispatchSearchRequested(
          query: 'Lahore',
          target: DispatchPinMode.pickup,
        ),
      ),
      expect: () => [
        isA<CreateDispatchState>().having((s) => s.searching, 'searching', true),
        isA<CreateDispatchState>()
            .having((s) => s.searching, 'searching', false)
            .having((s) => s.suggestions, 'suggestions', hasLength(1)),
      ],
    );
  });
}

class _JsonAdapter implements HttpClientAdapter {
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
    if (options.method == 'POST' && onPost.containsKey(options.path)) {
      if (requestStream != null) {
        final chunks = await requestStream.toList();
        final bytes = chunks.expand((e) => e).toList();
        if (bytes.isNotEmpty) {
          lastPostBody =
              jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
        }
      }
      return ResponseBody.fromString(
        jsonEncode(onPost[options.path]),
        201,
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
