import '../../../core/network/api_client.dart';
import 'dispatch_models.dart';

class DispatchesRepository {
  DispatchesRepository(this._client);

  final ApiClient _client;

  Future<DispatchRequest> create(CreateDispatchInput input) async {
    final envelope = await _client.postEnvelope<DispatchRequest>(
      '/dispatches',
      data: input.toJson(),
      parseData: _parseDispatch,
    );
    return envelope.data!;
  }

  Future<DispatchRequest> generateRoutes(String dispatchId) async {
    final envelope = await _client.postEnvelope<DispatchRequest>(
      '/dispatches/$dispatchId/routes/generate',
      parseData: _parseDispatch,
    );
    return envelope.data!;
  }

  Future<DispatchRequest> selectRoute({
    required String dispatchId,
    required String routeOptionId,
    required int aiCostCents,
  }) async {
    final envelope = await _client.postEnvelope<DispatchRequest>(
      '/dispatches/$dispatchId/routes/$routeOptionId/select',
      data: {'aiCostCents': aiCostCents},
      parseData: _parseDispatch,
    );
    return envelope.data!;
  }

  DispatchRequest _parseDispatch(Object? raw) {
    if (raw is! Map) {
      throw const FormatException('dispatch payload invalid');
    }
    return DispatchRequest.fromJson(Map<String, dynamic>.from(raw));
  }
}
