import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../../../core/db/app_database.dart';
import '../../../core/theme/app_theme.dart';

final _patientsStreamProvider = StreamProvider.family<List<Patient>, String>((ref, uid) {
  return ref.read(dbProvider).watchAllPatients(uid);
});

class PatientListScreen extends ConsumerStatefulWidget {
  const PatientListScreen({super.key});

  @override
  ConsumerState<PatientListScreen> createState() => _PatientListScreenState();
}

class _PatientListScreenState extends ConsumerState<PatientListScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final uid  = FirebaseAuth.instance.currentUser?.uid ?? '';
    final patientsAsync = ref.watch(_patientsStreamProvider(uid));

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.patientRecords),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => context.push('/patients/add'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => setState(() => _query = v.trim()),
              decoration: InputDecoration(
                hintText: 'Search by name or address…',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
              ),
            ),
          ),
          Expanded(
            child: patientsAsync.when(
              data: (all) {
                final patients = _query.isEmpty
                    ? all
                    : all.where((p) =>
                        p.name.toLowerCase().contains(_query.toLowerCase()) ||
                        p.address.toLowerCase().contains(_query.toLowerCase())).toList();

                if (patients.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.folder_open_rounded, size: 64, color: AppTheme.mintSub.withOpacity(0.4)),
                        const SizedBox(height: 12),
                        Text(
                          _query.isEmpty ? 'No patients yet.\nTap + to add your first patient.' : 'No results for "$_query".',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppTheme.mintSub.withOpacity(0.6)),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: patients.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final p = patients[i];
                    return _PatientCard(
                      patient: p,
                      onTap: () => context.push('/patients/${p.id}'),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error:   (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/patients/add'),
        backgroundColor: AppTheme.vitalsGreen,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_rounded),
        label: const Text('Add Patient'),
      ),
    );
  }
}

class _PatientCard extends StatelessWidget {
  final Patient  patient;
  final VoidCallback onTap;

  const _PatientCard({required this.patient, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppTheme.mintBg,
                child: Text(
                  patient.name.isNotEmpty ? patient.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: AppTheme.vitalsGreen,
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      patient.name,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${patient.age} yrs · ${patient.gender} · ${patient.address}',
                      style: TextStyle(fontSize: 12, color: AppTheme.mintSub.withOpacity(0.8)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (!patient.isSynced)
                const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: Icon(Icons.cloud_off_rounded, size: 16, color: AppTheme.coralText),
                ),
              const Icon(Icons.chevron_right_rounded, color: AppTheme.mintSub),
            ],
          ),
        ),
      ),
    );
  }
}
