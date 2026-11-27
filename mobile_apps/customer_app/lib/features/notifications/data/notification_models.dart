class NotificationsStatus {
  const NotificationsStatus({required this.configured});

  final bool configured;

  factory NotificationsStatus.fromJson(Map<String, dynamic> json) {
    return NotificationsStatus(configured: json['configured'] == true);
  }
}

class TokenRegistrationResult {
  const TokenRegistrationResult({
    required this.registered,
    required this.tokenCount,
  });

  final bool registered;
  final int tokenCount;

  factory TokenRegistrationResult.fromJson(Map<String, dynamic> json) {
    return TokenRegistrationResult(
      registered: json['registered'] == true,
      tokenCount: (json['tokenCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class PushMessageLite {
  const PushMessageLite({
    this.title,
    this.body,
    this.data = const {},
  });

  final String? title;
  final String? body;
  final Map<String, String> data;
}
