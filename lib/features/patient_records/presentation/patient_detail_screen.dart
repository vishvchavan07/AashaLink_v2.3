import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/db/app_database.dart';
import '../../../core/theme/app_theme.dart';

final _patientByIdProvider = FutureProvider.family<Patient?, int>((ref, id) {
  return ref.read(dbProvider).getPatientById(id);
});

final _visitsForPatientProvider = StreamProvider.family<List<Visit>, int>((ref, id) {
  return ref.read(dbProvider).watchVisitsForPatient(id);
});

final _sessionsForPatientProvider = StreamProvider.family<List<SymptomSession>, int>((ref, id) {
  return ref.read(dbProvider).watchSessionsForPatient(id);
});

class PatientDetailScreen extends ConsumerWidget {
  final int patientId;

  const PatientDetailScreen({super.key, required this.patientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patientAsync  = ref.watch(_patientByIdProvider(patientId));
    final visitsAsync   = ref.watch(_visitsForPatientProvider(patientId));
    final sessionsAsync = ref.watch(_sessionsForPatientProvider(patientId));

    return patientAsync.when(
      data: (patient) {
        if (patient == null) {
          return Scaffold(appBar: AppBar(), body: const Center(child: Text('Patient not found')));
        }
        return Scaffold(
          appBar: AppBar(
            title: Text(patient.name),
            actions: [
              TextButton.icon(
                icon: const Icon(Icons.monitor_heart_outlined, color: AppTheme.mintText),
                label: const Text('Screen', style: TextStyle(color: AppTheme.mintText)),
                onPressed: () => context.push('/symptom?patientId=$patientId'),
              ),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _addVisit(context, ref, patient),
            backgroundColor: AppTheme.vitalsGreen,
            foregroundColor: Colors.white,
            icon: const Icon(Icons.add_rounded),
            label: const Text('Add Visit'),
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Profile card
              _ProfileCard(patient: patient),
              const SizedBox(height: 20),

              // Symptom sessions
              const _SectionHeader(label: 'Screening History'),
              sessionsAsync.when(
                data: (sessions) => sessions.isEmpty
                    ? const _EmptyHint(text: 'No screenings yet. Tap "Screen" above.')
                    : Column(
                        children: sessions.map((s) => _SessionTile(session: s)).toList(),
                      ),
                loading: () => const LinearProgressIndicator(),
                error:   (e, _) => Text('Error: $e'),
              ),

              const SizedBox(height: 20),

              // Visit notes
              const _SectionHeader(label: 'Visit Notes'),
              visitsAsync.when(
                data: (visits) => visits.isEmpty
                    ? const _EmptyHint(text: 'No visit notes. Tap + to add one.')
                    : Column(
                        children: visits.map((v) => _VisitTile(visit: v)).toList(),
                      ),
                loading: () => const LinearProgressIndicator(),
                error:   (e, _) => Text('Error: $e'),
              ),
              const SizedBox(height: 80),
            ],
          ),
        );
      },
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error:   (e, _) => Scaffold(body: Center(child: Text('$e'))),
    );
  }

  void _addVisit(BuildContext context, WidgetRef ref, Patient patient) {
    final notesCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Add Visit Note', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 12),
            TextField(
              controller: notesCtrl,
              maxLines: 4,
              autofocus: true,
              decoration: const InputDecoration(hintText: 'Observations from this visit…'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                if (notesCtrl.text.trim().isEmpty) return;
                await ref.read(dbProvider).insertVisit(VisitsCompanion.insert(
                  patientId:   patient.id,
                  notes:       notesCtrl.text.trim(),
                  symptoms:    '[]',
                  triageLevel: 'green',
                ));
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save Visit'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final Patient patient;
  const _ProfileCard({required this.patient});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.forestCard,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: AppTheme.deepForest,
            child: Text(
              patient.name[0].toUpperCase(),
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppTheme.mintText),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(patient.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.mintText)),
                const SizedBox(height: 4),
                Text('${patient.age} yrs · ${patient.gender}', style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
                if (patient.phone != null)
                  Text(patient.phone!, style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
                Text(patient.address, style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  const _SectionHeader({required this.label});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(label,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.vitalsGreen)),
      );
}

class _EmptyHint extends StatelessWidget {
  final String text;
  const _EmptyHint({required this.text});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(text, style: const TextStyle(color: AppTheme.mintSub, fontSize: 13)),
      );
}

class _SessionTile extends StatelessWidget {
  final SymptomSession session;
  const _SessionTile({required this.session});

  Color get _levelColor {
    switch (session.triageLevel) {
      case 'red':    return AppTheme.sosBorder;
      case 'yellow': return const Color(0xFFF5A623);
      default:       return AppTheme.vitalsGreen;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 10, height: 10,
              decoration: BoxDecoration(shape: BoxShape.circle, color: _levelColor),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.triageLevel.toUpperCase(),
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _levelColor),
                  ),
                  if (session.aiAnalysis != null)
                    Text(session.aiAnalysis!, maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12)),
                ],
              ),
            ),
            Text(
              DateFormat('dd MMM').format(session.createdAt),
              style: const TextStyle(fontSize: 11, color: AppTheme.mintSub),
            ),
          ],
        ),
      ),
    );
  }
}

class _VisitTile extends StatelessWidget {
  final Visit visit;
  const _VisitTile({required this.visit});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(DateFormat('dd MMM yyyy').format(visit.visitDate),
                style: const TextStyle(fontSize: 11, color: AppTheme.mintSub)),
            const SizedBox(height: 4),
            Text(visit.notes, style: const TextStyle(fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
