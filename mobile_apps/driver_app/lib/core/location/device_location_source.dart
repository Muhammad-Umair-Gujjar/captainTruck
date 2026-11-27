import 'dart:async';

import 'package:geolocator/geolocator.dart';

class DevicePosition {
  const DevicePosition({
    required this.lat,
    required this.lng,
    this.heading,
    this.speedMps,
    required this.timestamp,
  });

  final double lat;
  final double lng;
  final double? heading;
  final double? speedMps;
  final DateTime timestamp;
}

abstract class DeviceLocationSource {
  Future<bool> ensurePermission();
  Stream<DevicePosition> watchPositions();
  Future<void> dispose();
}

class GeolocatorLocationSource implements DeviceLocationSource {
  StreamSubscription<Position>? _sub;
  final _controller = StreamController<DevicePosition>.broadcast();

  @override
  Future<bool> ensurePermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return false;
    }
    return true;
  }

  @override
  Stream<DevicePosition> watchPositions() {
    unawaited(_start());
    return _controller.stream;
  }

  Future<void> _start() async {
    await _sub?.cancel();
    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 8,
      ),
    ).listen((pos) {
      if (_controller.isClosed) return;
      _controller.add(
        DevicePosition(
          lat: pos.latitude,
          lng: pos.longitude,
          heading: pos.heading >= 0 ? pos.heading : null,
          speedMps: pos.speed >= 0 ? pos.speed : null,
          timestamp: pos.timestamp,
        ),
      );
    });
  }

  @override
  Future<void> dispose() async {
    await _sub?.cancel();
    await _controller.close();
  }
}

/// In-memory source for unit tests.
class FakeDeviceLocationSource implements DeviceLocationSource {
  FakeDeviceLocationSource({this.permissionGranted = true});

  bool permissionGranted;
  final _controller = StreamController<DevicePosition>.broadcast();

  void emit(DevicePosition position) => _controller.add(position);

  @override
  Future<bool> ensurePermission() async => permissionGranted;

  @override
  Stream<DevicePosition> watchPositions() => _controller.stream;

  @override
  Future<void> dispose() async {
    await _controller.close();
  }
}
