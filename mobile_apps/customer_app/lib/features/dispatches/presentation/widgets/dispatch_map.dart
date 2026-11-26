import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_theme.dart';

/// Default map center: Lahore, PK.
const LatLng kDefaultMapCenter = LatLng(31.5204, 74.3587);

class DispatchMap extends StatelessWidget {
  const DispatchMap({
    super.key,
    required this.pickup,
    required this.dropoff,
    required this.onTap,
    this.height = 280,
  });

  final LatLng? pickup;
  final LatLng? dropoff;
  final ValueChanged<LatLng> onTap;
  final double height;

  @override
  Widget build(BuildContext context) {
    final center = dropoff ?? pickup ?? kDefaultMapCenter;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: SizedBox(
        height: height,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: center,
            initialZoom: 12,
            onTap: (_, point) => onTap(point),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.captaintruck.customer',
            ),
            MarkerLayer(
              markers: [
                if (pickup != null)
                  Marker(
                    point: pickup!,
                    width: 40,
                    height: 40,
                    child: const Icon(
                      Icons.trip_origin,
                      color: AppTheme.ok,
                      size: 32,
                    ),
                  ),
                if (dropoff != null)
                  Marker(
                    point: dropoff!,
                    width: 40,
                    height: 40,
                    child: const Icon(
                      Icons.flag,
                      color: AppTheme.danger,
                      size: 32,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
