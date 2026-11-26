class ApiEnvelope<T> {
  const ApiEnvelope({
    required this.success,
    this.data,
    this.error,
    this.meta,
  });

  final bool success;
  final T? data;
  final ApiErrorBody? error;
  final Map<String, dynamic>? meta;

  factory ApiEnvelope.fromJson(
    Map<String, dynamic> json,
    T Function(Object? raw)? parseData,
  ) {
    return ApiEnvelope<T>(
      success: json['success'] == true,
      data: json['data'] == null || parseData == null
          ? null
          : parseData(json['data']),
      error: json['error'] is Map<String, dynamic>
          ? ApiErrorBody.fromJson(json['error'] as Map<String, dynamic>)
          : null,
      meta: json['meta'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['meta'] as Map)
          : null,
    );
  }
}

class ApiErrorBody {
  const ApiErrorBody({required this.code, required this.message});

  final String code;
  final String message;

  factory ApiErrorBody.fromJson(Map<String, dynamic> json) {
    return ApiErrorBody(
      code: (json['code'] ?? 'UNKNOWN').toString(),
      message: (json['message'] ?? 'Request failed').toString(),
    );
  }

  @override
  String toString() => '$code: $message';
}
