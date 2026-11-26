import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/money/pkr.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_panel.dart';
import 'bloc/create_dispatch_bloc.dart';
import 'widgets/dispatch_map.dart';

class CreateDispatchPage extends StatefulWidget {
  const CreateDispatchPage({super.key});

  @override
  State<CreateDispatchPage> createState() => _CreateDispatchPageState();
}

class _CreateDispatchPageState extends State<CreateDispatchPage> {
  final _pickupSearch = TextEditingController();
  final _dropoffSearch = TextEditingController();
  final _notes = TextEditingController();

  @override
  void dispose() {
    _pickupSearch.dispose();
    _dropoffSearch.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Book a truck')),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFFFF7ED),
                  Color(0xFFE0E7FF),
                  Color(0xFFCCFBF1),
                ],
              ),
            ),
          ),
          SafeArea(
            child: BlocConsumer<CreateDispatchBloc, CreateDispatchState>(
              listener: (context, state) {
                if (state.status == CreateDispatchStatus.success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        state.message ?? 'Dispatch created',
                      ),
                    ),
                  );
                  Navigator.of(context).pop(state.created);
                } else if (state.message != null &&
                    state.status == CreateDispatchStatus.failure) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message!)),
                  );
                } else if (state.message != null &&
                    state.status == CreateDispatchStatus.editing) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.message!)),
                  );
                }
              },
              builder: (context, state) {
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    GlassPanel(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Truck',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          if (state.truckTypes.isEmpty)
                            const Text('No active truck types available.')
                          else
                            DropdownButtonFormField<String>(
                              initialValue: state.truckTypeId,
                              decoration: const InputDecoration(
                                border: OutlineInputBorder(),
                                labelText: 'Type',
                              ),
                              items: [
                                for (final t in state.truckTypes)
                                  DropdownMenuItem(
                                    value: t.id,
                                    child: Text(
                                      '${t.name} · ${formatPkrCents(t.currentRateCents)}',
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                              ],
                              onChanged: (id) {
                                if (id == null) return;
                                context.read<CreateDispatchBloc>().add(
                                      CreateDispatchTruckTypeChanged(id),
                                    );
                              },
                            ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Text('Count'),
                              const Spacer(),
                              IconButton(
                                onPressed: state.truckCount <= 1
                                    ? null
                                    : () => context
                                        .read<CreateDispatchBloc>()
                                        .add(
                                          CreateDispatchTruckCountChanged(
                                            state.truckCount - 1,
                                          ),
                                        ),
                                icon: const Icon(Icons.remove_circle_outline),
                              ),
                              Text(
                                '${state.truckCount}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 16,
                                ),
                              ),
                              IconButton(
                                onPressed: state.truckCount >= 20
                                    ? null
                                    : () => context
                                        .read<CreateDispatchBloc>()
                                        .add(
                                          CreateDispatchTruckCountChanged(
                                            state.truckCount + 1,
                                          ),
                                        ),
                                icon: const Icon(Icons.add_circle_outline),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SegmentedButton<DispatchPinMode>(
                      segments: const [
                        ButtonSegment(
                          value: DispatchPinMode.pickup,
                          label: Text('Pickup pin'),
                          icon: Icon(Icons.trip_origin),
                        ),
                        ButtonSegment(
                          value: DispatchPinMode.dropoff,
                          label: Text('Dropoff pin'),
                          icon: Icon(Icons.flag),
                        ),
                      ],
                      selected: {state.pinMode},
                      onSelectionChanged: (s) {
                        context.read<CreateDispatchBloc>().add(
                              CreateDispatchPinModeChanged(s.first),
                            );
                      },
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tap map to set ${state.pinMode == DispatchPinMode.pickup ? 'pickup' : 'dropoff'}',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: AppTheme.inkMuted),
                    ),
                    const SizedBox(height: 8),
                    DispatchMap(
                      pickup: state.pickup,
                      dropoff: state.dropoff,
                      onTap: (point) => context
                          .read<CreateDispatchBloc>()
                          .add(CreateDispatchMapTapped(point)),
                    ),
                    const SizedBox(height: 12),
                    GlassPanel(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _AddressField(
                            label: 'Pickup address',
                            controller: _pickupSearch,
                            hint: state.pickupAddress.isEmpty
                                ? 'Search or pin on map'
                                : state.pickupAddress,
                            onChanged: (v) => context
                                .read<CreateDispatchBloc>()
                                .add(CreateDispatchPickupAddressChanged(v)),
                            onSearch: () => context
                                .read<CreateDispatchBloc>()
                                .add(
                                  CreateDispatchSearchRequested(
                                    query: _pickupSearch.text,
                                    target: DispatchPinMode.pickup,
                                  ),
                                ),
                          ),
                          const SizedBox(height: 12),
                          _AddressField(
                            label: 'Dropoff address',
                            controller: _dropoffSearch,
                            hint: state.dropoffAddress.isEmpty
                                ? 'Search or pin on map'
                                : state.dropoffAddress,
                            onChanged: (v) => context
                                .read<CreateDispatchBloc>()
                                .add(CreateDispatchDropoffAddressChanged(v)),
                            onSearch: () => context
                                .read<CreateDispatchBloc>()
                                .add(
                                  CreateDispatchSearchRequested(
                                    query: _dropoffSearch.text,
                                    target: DispatchPinMode.dropoff,
                                  ),
                                ),
                          ),
                          if (state.searching)
                            const Padding(
                              padding: EdgeInsets.only(top: 12),
                              child: LinearProgressIndicator(),
                            ),
                          if (state.suggestions.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            for (final s in state.suggestions)
                              ListTile(
                                dense: true,
                                contentPadding: EdgeInsets.zero,
                                title: Text(s.displayName),
                                onTap: () {
                                  final target = state.searchTarget ??
                                      state.pinMode;
                                  context.read<CreateDispatchBloc>().add(
                                        CreateDispatchSuggestionSelected(
                                          suggestion: s,
                                          target: target,
                                        ),
                                      );
                                  if (target == DispatchPinMode.pickup) {
                                    _pickupSearch.text = s.displayName;
                                  } else {
                                    _dropoffSearch.text = s.displayName;
                                  }
                                },
                              ),
                          ],
                          const SizedBox(height: 12),
                          TextField(
                            controller: _notes,
                            maxLines: 2,
                            decoration: const InputDecoration(
                              labelText: 'Notes (optional)',
                              border: OutlineInputBorder(),
                            ),
                            onChanged: (v) => context
                                .read<CreateDispatchBloc>()
                                .add(CreateDispatchNotesChanged(v)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: state.status ==
                              CreateDispatchStatus.submitting
                          ? null
                          : () => context
                              .read<CreateDispatchBloc>()
                              .add(const CreateDispatchSubmitted()),
                      child: state.status == CreateDispatchStatus.submitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Create request'),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Routes & AI cost come in C4 after create.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppTheme.inkMuted),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _AddressField extends StatelessWidget {
  const _AddressField({
    required this.label,
    required this.controller,
    required this.hint,
    required this.onChanged,
    required this.onSearch,
  });

  final String label;
  final TextEditingController controller;
  final String hint;
  final ValueChanged<String> onChanged;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: const OutlineInputBorder(),
        suffixIcon: IconButton(
          tooltip: 'Search',
          onPressed: onSearch,
          icon: const Icon(Icons.search),
        ),
      ),
      onChanged: onChanged,
      onSubmitted: (_) => onSearch(),
    );
  }
}
