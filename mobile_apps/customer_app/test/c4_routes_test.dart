import 'dart:convert';

import 'package:bloc_test/bloc_test.dart';
import 'package:customer_app/core/maps/polyline_codec.dart';
import 'package:customer_app/core/network/api_client.dart';
import 'package:customer_app/features/dispatches/data/dispatch_models.dart';
import 'package:customer_app/features/dispatches/data/dispatches_repository.dart';
import 'package:customer_app/features/dispatches/presentation/bloc/select_routes_bloc.dart';
import 'package:customer_app/features/pricing/data/trip_cost_estimator.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockDispatches extends Mock implements DispatchesRepository {}

void main() {
  test('DistanceTripCostEstimator stays under outlier cap', () {
    const estimator = DistanceTripCostEstimator();
    final cents = estimator.estimateCents(
      distanceMeters: 10_000,
      durationSeconds: 900,
    );
    expect(cents, greaterThan(0));
    expect(cents, lessThanOrEqualTo(10_000 * 15));
  });

  test('decodePolyline reads a short encoded path', () {
    // Encoded ~ (38.5, -120.2) (40.7, -120.95) classic sample
    final points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(points.length, greaterThanOrEqualTo(2));
    expect(points.first.latitude, closeTo(38.5, 0.01));
  });

  test('DispatchesRepository generate + select', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;

    adapter.onPost['/dispatches/d1/routes/generate'] = {
      'success': true,
      'data': {
        'id': 'd1',
        'truckTypeId': 'tt1',
        'status': 'AWAITING_ROUTE_SELECTION',
        'truckCount': 1,
        'pickupAddress': 'A',
        'dropoffAddress': 'B',
        'paymentMethod': 'CASH',
        'lockedBaseRateCents': 100000,
        'routeOptions': [
          {
            'id': 'r1',
            'polyline': '_p~iF~ps|U_ulLnnqC',
            'distanceMeters': 5000,
            'durationSeconds': 600,
            'aiCostCents': 0,
            'isRecommended': true,
            'isSelected': false,
          },
          {
            'id': 'r2',
            'polyline': '_p~iF~ps|U',
            'distanceMeters': 7000,
            'durationSeconds': 900,
            'aiCostCents': 0,
            'isRecommended': false,
            'isSelected': false,
          },
        ],
      },
    };
    adapter.onPost['/dispatches/d1/routes/r1/select'] = {
      'success': true,
      'data': {
        'id': 'd1',
        'truckTypeId': 'tt1',
        'status': 'PENDING_ADMIN',
        'truckCount': 1,
        'pickupAddress': 'A',
        'dropoffAddress': 'B',
        'paymentMethod': 'CASH',
        'lockedBaseRateCents': 100000,
        'routeOptions': [
          {
            'id': 'r1',
            'polyline': '_p~iF~ps|U_ulLnnqC',
            'distanceMeters': 5000,
            'durationSeconds': 600,
            'aiCostCents': 7500,
            'isRecommended': true,
            'isSelected': true,
          },
        ],
        'billBreakdown': {
          'currency': 'PKR',
          'lockedBaseRateCents': 100000,
          'aiTripCostCents': 7500,
          'perTruckCents': 107500,
          'truckCount': 1,
          'totalBillCents': 107500,
          'authoritative': true,
          'flaggedOutlier': false,
        },
      },
    };

    final repo = DispatchesRepository(ApiClient(dio: dio));
    final generated = await repo.generateRoutes('d1');
    expect(generated.routeOptions, hasLength(2));
    expect(generated.routeOptions.first.isRecommended, isTrue);

    final selected = await repo.selectRoute(
      dispatchId: 'd1',
      routeOptionId: 'r1',
      aiCostCents: 7500,
    );
    expect(selected.status, 'PENDING_ADMIN');
    expect(selected.billBreakdown?.totalBillCents, 107500);
    expect(adapter.lastPostBody?['aiCostCents'], 7500);
  });

  group('SelectRoutesBloc', () {
    late _MockDispatches repo;

    setUp(() {
      repo = _MockDispatches();
    });

    blocTest<SelectRoutesBloc, SelectRoutesState>(
      'generates routes then confirms selection',
      build: () {
        when(() => repo.generateRoutes('d1')).thenAnswer(
          (_) async => const DispatchRequest(
            id: 'd1',
            truckTypeId: 'tt1',
            status: 'AWAITING_ROUTE_SELECTION',
            truckCount: 1,
            pickupAddress: 'A',
            dropoffAddress: 'B',
            paymentMethod: 'CASH',
            lockedBaseRateCents: 100000,
            routeOptions: [
              RouteOption(
                id: 'r1',
                polyline: 'abc',
                distanceMeters: 5000,
                durationSeconds: 600,
                aiCostCents: 0,
                isRecommended: true,
                isSelected: false,
              ),
            ],
          ),
        );
        when(
          () => repo.selectRoute(
            dispatchId: any(named: 'dispatchId'),
            routeOptionId: any(named: 'routeOptionId'),
            aiCostCents: any(named: 'aiCostCents'),
          ),
        ).thenAnswer(
          (_) async => const DispatchRequest(
            id: 'd1',
            truckTypeId: 'tt1',
            status: 'PENDING_ADMIN',
            truckCount: 1,
            pickupAddress: 'A',
            dropoffAddress: 'B',
            paymentMethod: 'CASH',
            lockedBaseRateCents: 100000,
            billBreakdown: BillBreakdown(
              lockedBaseRateCents: 100000,
              aiTripCostCents: 7500,
              perTruckCents: 107500,
              truckCount: 1,
              totalBillCents: 107500,
            ),
          ),
        );
        return SelectRoutesBloc(
          repository: repo,
          dispatchId: 'd1',
          estimator: const DistanceTripCostEstimator(),
        );
      },
      act: (bloc) async {
        bloc.add(const SelectRoutesStarted());
        await bloc.stream.firstWhere(
          (s) => s.status == SelectRoutesStatus.ready,
        );
        bloc.add(const SelectRoutesConfirmed());
      },
      wait: const Duration(milliseconds: 50),
      expect: () => [
        isA<SelectRoutesState>().having(
          (s) => s.status,
          'status',
          SelectRoutesStatus.generating,
        ),
        isA<SelectRoutesState>()
            .having((s) => s.status, 'status', SelectRoutesStatus.ready)
            .having((s) => s.selectedRouteId, 'selected', 'r1'),
        isA<SelectRoutesState>().having(
          (s) => s.status,
          'status',
          SelectRoutesStatus.submitting,
        ),
        isA<SelectRoutesState>()
            .having((s) => s.status, 'status', SelectRoutesStatus.success)
            .having((s) => s.dispatch?.status, 'dispatch', 'PENDING_ADMIN'),
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
