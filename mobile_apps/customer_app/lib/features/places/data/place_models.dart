import 'package:equatable/equatable.dart';

class PlaceSuggestion extends Equatable {
  const PlaceSuggestion({
    required this.lat,
    required this.lng,
    required this.displayName,
  });

  final double lat;
  final double lng;
  final String displayName;

  factory PlaceSuggestion.fromJson(Map<String, dynamic> json) {
    return PlaceSuggestion(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      displayName: (json['displayName'] ?? '').toString(),
    );
  }

  @override
  List<Object?> get props => [lat, lng, displayName];
}
