import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:driver_app/features/commissions/data/commission_models.dart';
import 'package:driver_app/features/commissions/data/commissions_repository.dart';
import 'package:driver_app/features/commissions/presentation/bloc/commissions_bloc.dart';
import 'package:driver_app/features/payments/data/payments_repository.dart';
import 'package:driver_app/features/payments/presentation/bloc/cash_payment_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('PaymentsRepository list + collect cash', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;

    adapter.onGet['/payments/by-request/r1'] = {
      'success': true,
      'data': {
        'items': [
          {
            'id': 'pay1',
            'requestId': 'r1',
            'tripId': 't1',
            'provider': 'CASH',
            'status': 'CASH_PENDING',
            'amountCents': 150000,
            'currency': 'PKR',
          },
        ],
      },
    };
    adapter.onPost['/payments/pay1/cash/collect'] = {
      'success': true,
      'data': {
        'id': 'pay1',
        'requestId': 'r1',
        'tripId': 't1',
        'provider': 'CASH',
        'status': 'CASH_COLLECTED',
        'amountCents': 150000,
        'currency': 'PKR',
      },
    };

    final repo = PaymentsRepository(ApiClient(dio: dio));
    final list = await repo.listByRequest('r1');
    expect(list, hasLength(1));
    expect(list.first.isCashPending, isTrue);

    final collected = await repo.collectCash('pay1');
    expect(collected.status, 'CASH_COLLECTED');
    expect(collected.isSettled, isTrue);
  });

  test('CashPaymentBloc loads and collects', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/payments/by-request/r1'] = {
      'success': true,
      'data': {
        'items': [
          {
            'id': 'pay1',
            'provider': 'CASH',
            'status': 'CASH_PENDING',
            'amountCents': 50000,
            'currency': 'PKR',
          },
        ],
      },
    };
    adapter.onPost['/payments/pay1/cash/collect'] = {
      'success': true,
      'data': {
        'id': 'pay1',
        'provider': 'CASH',
        'status': 'CASH_COLLECTED',
        'amountCents': 50000,
        'currency': 'PKR',
      },
    };

    final bloc = CashPaymentBloc(
      repository: PaymentsRepository(ApiClient(dio: dio)),
      requestId: 'r1',
    );
    bloc.add(const CashPaymentStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<CashPaymentState>()
            .having((s) => s.status, 's', CashPaymentStatus.ready)
            .having((s) => s.pendingCash?.id, 'pending', 'pay1'),
      ),
    );

    bloc.add(const CashPaymentCollectRequested('pay1'));
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<CashPaymentState>()
            .having((s) => s.busy, 'busy', false)
            .having((s) => s.pendingCash, 'pending', isNull)
            .having((s) => s.payments.first.isSettled, 'settled', true),
      ),
    );
    await bloc.close();
  });

  test('CommissionsRepository listMine + CommissionsBloc', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/commissions/mine'] = {
      'success': true,
      'data': {
        'items': [
          {
            'id': 'c1',
            'driverId': 'd1',
            'tripId': 't1',
            'expectedCents': 15000,
            'collectedCents': 0,
            'pendingCents': 15000,
            'commissionPercent': 10,
            'confirmed': false,
            'createdAt': '2026-11-27T00:00:00.000Z',
            'trip': {
              'id': 't1',
              'status': 'COMPLETED',
              'finalBillCents': 150000,
            },
          },
        ],
        'meta': {'page': 1, 'limit': 20, 'total': 1, 'totalPages': 1},
      },
    };

    final repo = CommissionsRepository(ApiClient(dio: dio));
    final page = await repo.listMine();
    expect(page.items, hasLength(1));
    expect(page.items.first.pendingCents, 15000);
    expect(
      CommissionLedgerEntry.fromJson({
        'id': 'c1',
        'driverId': 'd1',
        'tripId': 't1',
        'expectedCents': 1,
        'collectedCents': 0,
        'pendingCents': 1,
        'commissionPercent': 10,
        'confirmed': false,
        'createdAt': '2026-11-27T00:00:00.000Z',
      }).confirmed,
      isFalse,
    );

    final bloc = CommissionsBloc(repository: repo);
    bloc.add(const CommissionsStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<CommissionsState>()
            .having((s) => s.status, 's', CommissionsStatus.ready)
            .having((s) => s.items, 'items', hasLength(1))
            .having((s) => s.pendingTotalCents, 'pending', 15000),
      ),
    );
    await bloc.close();
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};
  final Map<String, Map<String, dynamic>> onPost = {};

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    // Strip query for GET map lookup.
    final path = options.path.split('?').first;
    if (options.method == 'GET' && onGet.containsKey(path)) {
      return _ok(onGet[path]!);
    }
    if (options.method == 'POST' && onPost.containsKey(path)) {
      return _ok(onPost[path]!, status: 201);
    }
    throw DioException(
      requestOptions: options,
      message: 'unmapped ${options.method} $path',
    );
  }

  ResponseBody _ok(Map<String, dynamic> body, {int status = 200}) {
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}
