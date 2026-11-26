/// On-device trip cost estimator (PKR cents).
///
/// API-shaped for a future TFLite model swap; current implementation is a
/// distance+duration heuristic that stays under server outlier limits
/// (`PricingService`: hard max 20 cents/meter).
abstract class TripCostEstimator {
  int estimateCents({
    required int distanceMeters,
    required int durationSeconds,
  });
}

class DistanceTripCostEstimator implements TripCostEstimator {
  const DistanceTripCostEstimator({
    this.centsPerKm = 1200, // PKR 12 / km
    this.centsPerMinute = 150, // PKR 1.50 / min
    this.maxCentsPerMeter = 15, // under server hard cap of 20
  });

  final int centsPerKm;
  final int centsPerMinute;
  final int maxCentsPerMeter;

  @override
  int estimateCents({
    required int distanceMeters,
    required int durationSeconds,
  }) {
    if (distanceMeters < 0 || durationSeconds < 0) return 0;
    final distancePart =
        ((distanceMeters / 1000) * centsPerKm).round();
    final timePart = ((durationSeconds / 60) * centsPerMinute).round();
    var cents = distancePart + timePart;
    if (distanceMeters > 0) {
      final maxAllowed = distanceMeters * maxCentsPerMeter;
      if (cents > maxAllowed) cents = maxAllowed;
    }
    if (cents > 10_000_000) cents = 10_000_000;
    return cents;
  }
}
