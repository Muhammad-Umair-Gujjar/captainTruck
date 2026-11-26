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

  Future<DispatchListPage> listMine({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final envelope = await _client.getEnvelope<DispatchListPage>(
      '/dispatches/mine',
      query: {
        'page': page,
        'limit': limit,
        if (status != null && status.isNotEmpty) 'status': status,
      },
      parseData: (raw) {
        if (raw is! Map) {
          throw const FormatException('dispatch list payload invalid');
        }
        return DispatchListPage.fromJson(Map<String, dynamic>.from(raw));
      },
    );
    return envelope.data!;
  }

  Future<DispatchRequest> getById(String id) async {
    final envelope = await _client.getEnvelope<DispatchRequest>(
      '/dispatches/$id',
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

  Future<DispatchRequest> cancel(String dispatchId) async {
    final envelope = await _client.postEnvelope<DispatchRequest>(
      '/dispatches/$dispatchId/cancel',
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
