import 'package:driver_app/app.dart';
import 'package:driver_app/core/auth/token_storage.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows driver login when no session', (tester) async {
    final storage = MemoryTokenStorage();
    final dio = Dio(
      BaseOptions(
        baseUrl: 'http://test/api/v1',
        connectTimeout: const Duration(milliseconds: 50),
        receiveTimeout: const Duration(milliseconds: 50),
      ),
    );
    dio.httpClientAdapter = _FailAdapter();

    await tester.pumpWidget(
      CaptainTruckDriverApp(
        apiClient: ApiClient(dio: dio, tokenStorage: storage),
        tokenStorage: storage,
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.textContaining('Driver sign in'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.textContaining('No self-register'), findsOneWidget);
  });
}

class _FailAdapter implements HttpClientAdapter {
  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    throw DioException(
      requestOptions: options,
      type: DioExceptionType.connectionError,
      message: 'offline',
    );
  }
}
