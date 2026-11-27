import 'dart:convert';

import 'package:bloc_test/bloc_test.dart';
import 'package:customer_app/core/network/api_client.dart';
import 'package:customer_app/features/payments/data/payment_models.dart';
import 'package:customer_app/features/payments/data/payments_repository.dart';
import 'package:customer_app/features/payments/data/stripe_sheet.dart';
import 'package:customer_app/features/payments/presentation/bloc/payment_bloc.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockPayments extends Mock implements PaymentsRepository {}

void main() {
  test('PaymentsRepository create cash + list', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;

    adapter.onGet['/payments/stripe/status'] = {
      'success': true,
      'data': {
        'configured': true,
        'publishableKey': 'pk_test_x',
        'mode': 'test',
      },
    };
    adapter.onPost['/payments'] = {
      'success': true,
      'data': {
        'id': 'pay1',
        'requestId': 'd1',
        'provider': 'CASH',
        'status': 'CASH_PENDING',
        'amountCents': 150000,
        'currency': 'PKR',
        'idempotencyKey': 'cust-d1-key',
      },
    };
    adapter.onGet['/payments/by-request/d1'] = {
      'success': true,
      'data': {
        'items': [
          {
            'id': 'pay1',
            'requestId': 'd1',
            'provider': 'CASH',
            'status': 'CASH_PENDING',
            'amountCents': 150000,
            'currency': 'PKR',
            'idempotencyKey': 'cust-d1-key',
          },
        ],
      },
    };

    final repo = PaymentsRepository(ApiClient(dio: dio));
    final status = await repo.stripeStatus();
    expect(status.configured, isTrue);

    final created = await repo.create(
      requestId: 'd1',
      provider: 'CASH',
      idempotencyKey: 'cust-d1-abcdefgh',
      clientAmountCents: 150000,
    );
    expect(created.status, 'CASH_PENDING');
    expect(adapter.lastPostBody?['provider'], 'CASH');

    final list = await repo.listByRequest('d1');
    expect(list, hasLength(1));
  });

  group('PaymentBloc', () {
    late _MockPayments repo;
    late FakeStripeSheetLauncher sheet;

    setUp(() {
      repo = _MockPayments();
      sheet = FakeStripeSheetLauncher();
      when(() => repo.newIdempotencyKey(any())).thenReturn('cust-d1-testkey01');
    });

    blocTest<PaymentBloc, PaymentState>(
      'cash create registers pending payment',
      build: () {
        when(() => repo.stripeStatus()).thenAnswer(
          (_) async => const StripeStatus(
            configured: true,
            publishableKey: 'pk_test',
          ),
        );
        when(() => repo.listByRequest('d1')).thenAnswer((_) async => const []);
        when(
          () => repo.create(
            requestId: any(named: 'requestId'),
            provider: any(named: 'provider'),
            idempotencyKey: any(named: 'idempotencyKey'),
            clientAmountCents: any(named: 'clientAmountCents'),
          ),
        ).thenAnswer(
          (_) async => const PaymentRecord(
            id: 'pay1',
            provider: 'CASH',
            status: 'CASH_PENDING',
            amountCents: 150000,
            currency: 'PKR',
            idempotencyKey: 'cust-d1-testkey01',
            requestId: 'd1',
          ),
        );
        return PaymentBloc(
          repository: repo,
          requestId: 'd1',
          expectedAmountCents: 150000,
          stripeSheet: sheet,
        );
      },
      act: (bloc) async {
        bloc.add(const PaymentStarted());
        await bloc.stream.firstWhere((s) => s.status == PaymentUiStatus.ready);
        bloc.add(const PaymentCashRequested());
      },
      wait: const Duration(milliseconds: 50),
      expect: () => [
        isA<PaymentState>().having(
          (s) => s.status,
          'status',
          PaymentUiStatus.loading,
        ),
        isA<PaymentState>().having(
          (s) => s.status,
          'status',
          PaymentUiStatus.ready,
        ),
        isA<PaymentState>().having((s) => s.busy, 'busy', true),
        isA<PaymentState>()
            .having((s) => s.busy, 'busy', false)
            .having((s) => s.active?.status, 'active', 'CASH_PENDING'),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'stripe presents sheet then refreshes',
      build: () {
        when(() => repo.stripeStatus()).thenAnswer(
          (_) async => const StripeStatus(
            configured: true,
            publishableKey: 'pk_test',
          ),
        );
        when(() => repo.listByRequest('d1')).thenAnswer((_) async => const []);
        when(
          () => repo.create(
            requestId: any(named: 'requestId'),
            provider: any(named: 'provider'),
            idempotencyKey: any(named: 'idempotencyKey'),
            clientAmountCents: any(named: 'clientAmountCents'),
          ),
        ).thenAnswer(
          (_) async => const PaymentRecord(
            id: 'pay2',
            provider: 'STRIPE',
            status: 'REQUIRES_ACTION',
            amountCents: 150000,
            currency: 'PKR',
            idempotencyKey: 'cust-d1-testkey01',
            requestId: 'd1',
            stripe: StripeClientPayload(
              paymentIntentId: 'pi_1',
              clientSecret: 'pi_1_secret',
              publishableKey: 'pk_test',
            ),
          ),
        );
        when(() => repo.getById('pay2')).thenAnswer(
          (_) async => const PaymentRecord(
            id: 'pay2',
            provider: 'STRIPE',
            status: 'PAID',
            amountCents: 150000,
            currency: 'PKR',
            idempotencyKey: 'cust-d1-testkey01',
            requestId: 'd1',
          ),
        );
        return PaymentBloc(
          repository: repo,
          requestId: 'd1',
          expectedAmountCents: 150000,
          stripeSheet: sheet,
        );
      },
      act: (bloc) async {
        bloc.add(const PaymentStarted());
        await bloc.stream.firstWhere((s) => s.status == PaymentUiStatus.ready);
        bloc.add(const PaymentStripeRequested());
      },
      wait: const Duration(seconds: 5),
      expect: () => [
        isA<PaymentState>().having(
          (s) => s.status,
          'status',
          PaymentUiStatus.loading,
        ),
        isA<PaymentState>().having(
          (s) => s.status,
          'status',
          PaymentUiStatus.ready,
        ),
        isA<PaymentState>().having((s) => s.busy, 'busy', true),
        isA<PaymentState>()
            .having((s) => s.busy, 'busy', false)
            .having((s) => s.active?.status, 'active', 'PAID'),
      ],
      verify: (_) {
        expect(sheet.presentCount, 1);
        expect(sheet.lastClientSecret, 'pi_1_secret');
      },
    );
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
    if (options.method == 'GET' && onGet.containsKey(options.path)) {
      return _ok(onGet[options.path]!);
    }
    if (options.method == 'POST' && onPost.containsKey(options.path)) {
      if (requestStream != null) {
        final chunks = await requestStream.toList();
        final bytes = chunks.expand((e) => e).toList();
        if (bytes.isNotEmpty) {
          lastPostBody =
              jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
        }
      }
      return _ok(onPost[options.path]!, status: 201);
    }
    throw DioException(
      requestOptions: options,
      message: 'unmapped ${options.method} ${options.path}',
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
