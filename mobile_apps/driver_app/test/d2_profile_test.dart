import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:driver_app/core/network/api_client.dart';
import 'package:driver_app/features/profile/data/profile_repository.dart';
import 'package:driver_app/features/profile/presentation/bloc/profile_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Map<String, dynamic> mePayload({
    String fullName = 'Driver One',
    String? plate = 'LEA-123',
    bool available = true,
  }) {
    return {
      'success': true,
      'data': {
        'id': 'd1',
        'email': 'driver@test.com',
        'fullName': fullName,
        'role': 'DRIVER',
        'status': 'ACTIVE',
        'phone': '+923001112223',
        'driverProfile': {
          'id': 'dp1',
          'licenseNumber': 'LIC-9',
          'vehiclePlate': plate,
          'isAvailable': available,
          'docsUrls': <String>[],
          'adminNotes': null,
        },
      },
    };
  }

  test('ProfileRepository fetch + update account + driver profile', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/users/me'] = mePayload();
    adapter.onPatch['/users/me'] = mePayload(fullName: 'Driver Updated');
    adapter.onPatch['/users/me/driver-profile'] =
        mePayload(plate: 'LEB-999', available: false);

    final repo = ProfileRepository(ApiClient(dio: dio));
    final me = await repo.fetchMe();
    expect(me.driverProfile?.vehiclePlate, 'LEA-123');
    expect(me.driverProfile?.isAvailable, isTrue);

    final account = await repo.updateMe(
      fullName: 'Driver Updated',
      email: 'driver@test.com',
      phone: '+923001112223',
    );
    expect(account.fullName, 'Driver Updated');
    expect(adapter.lastPatchBody?['fullName'], 'Driver Updated');

    final driver = await repo.updateDriverProfile(
      licenseNumber: 'LIC-9',
      vehiclePlate: 'LEB-999',
      isAvailable: false,
    );
    expect(driver.driverProfile?.vehiclePlate, 'LEB-999');
    expect(driver.driverProfile?.isAvailable, isFalse);
    expect(adapter.lastPatchBody?['isAvailable'], isFalse);
  });

  test('ProfileBloc loads then saves account', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/users/me'] = mePayload();
    adapter.onPatch['/users/me'] = mePayload(fullName: 'Saved Name');

    final bloc = ProfileBloc(ProfileRepository(ApiClient(dio: dio)));
    bloc.add(const ProfileStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<ProfileState>()
            .having((s) => s.status, 'status', ProfileStatus.ready)
            .having((s) => s.user?.email, 'email', 'driver@test.com'),
      ),
    );

    bloc.add(
      const ProfileAccountSaveSubmitted(
        fullName: 'Saved Name',
        email: 'driver@test.com',
        phone: '+923001112223',
      ),
    );
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<ProfileState>()
            .having((s) => s.status, 'status', ProfileStatus.saved)
            .having((s) => s.user?.fullName, 'name', 'Saved Name'),
      ),
    );
    await bloc.close();
  });

  test('ProfileBloc saves driver profile', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'));
    final adapter = _JsonAdapter();
    dio.httpClientAdapter = adapter;
    adapter.onGet['/users/me'] = mePayload();
    adapter.onPatch['/users/me/driver-profile'] =
        mePayload(plate: 'XYZ-1', available: false);

    final bloc = ProfileBloc(ProfileRepository(ApiClient(dio: dio)));
    bloc.add(const ProfileStarted());
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<ProfileState>().having((s) => s.status, 's', ProfileStatus.ready),
      ),
    );

    bloc.add(
      const ProfileDriverSaveSubmitted(
        licenseNumber: 'LIC-9',
        vehiclePlate: 'XYZ-1',
        isAvailable: false,
      ),
    );
    await expectLater(
      bloc.stream,
      emitsThrough(
        isA<ProfileState>()
            .having((s) => s.status, 'status', ProfileStatus.saved)
            .having(
              (s) => s.user?.driverProfile?.vehiclePlate,
              'plate',
              'XYZ-1',
            ),
      ),
    );
    await bloc.close();
  });
}

class _JsonAdapter implements HttpClientAdapter {
  final Map<String, Map<String, dynamic>> onGet = {};
  final Map<String, Map<String, dynamic>> onPatch = {};
  Map<String, dynamic>? lastPatchBody;

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
    if (options.method == 'PATCH' && onPatch.containsKey(options.path)) {
      lastPatchBody = bodyFromOptions();
      return _ok(onPatch[options.path]!);
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
