import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:firebase_auth/firebase_auth.dart';
import '../../../core/ai/gemini_service.dart';
import '../../../core/db/app_database.dart';
import '../../../core/theme/app_theme.dart';

// ── State ──────────────────────────────────────────────────────────────────

class SymptomScreeningState {
  final int currentStep;
  final Patient? selectedPatient;
  final List<String> selectedSymptoms;
  final String severity;
  final int durationDays;
  final String voiceNote;
  final TriageResult? result;
  final bool isAnalysing;
  final String? error;

  const SymptomScreeningState({
    this.currentStep = 0,
    this.selectedPatient,
    this.selectedSymptoms = const [],
    this.severity = 'mild',
    this.durationDays = 1,
    this.voiceNote = '',
    this.result,
    this.isAnalysing = false,
    this.error,
  });

  SymptomScreeningState copyWith({
    int? currentStep, Patient? selectedPatient, List<String>? selectedSymptoms,
    String? severity, int? durationDays, String? voiceNote,
    TriageResult? result, bool? isAnalysing, String? error,
  }) => SymptomScreeningState(
    currentStep:      currentStep      ?? this.currentStep,
    selectedPatient:  selectedPatient  ?? this.selectedPatient,
    selectedSymptoms: selectedSymptoms ?? this.selectedSymptoms,
    severity:         severity         ?? this.severity,
    durationDays:     durationDays     ?? this.durationDays,
    voiceNote:        voiceNote        ?? this.voiceNote,
    result:           result           ?? this.result,
    isAnalysing:      isAnalysing      ?? this.isAnalysing,
    error:            error            ?? this.error,
  );
}

class SymptomScreeningNotifier extends StateNotifier<SymptomScreeningState> {
  final AppDatabase _db;
  SymptomScreeningNotifier(this._db) : super(const SymptomScreeningState());

  void next()  => state = state.copyWith(currentStep: state.currentStep + 1);
  void back()  => state = state.copyWith(currentStep: state.currentStep - 1);
  void reset() => state = const SymptomScreeningState();
  void selectPatient(Patient p) => state = state.copyWith(selectedPatient: p);
  void setSeverity(String s)    => state = state.copyWith(severity: s);
  void setDuration(int d)       => state = state.copyWith(durationDays: d);
  void setVoiceNote(String v)   => state = state.copyWith(voiceNote: v);

  void toggleSymptom(String s) {
    final updated = List<String>.from(state.selectedSymptoms);
    if (updated.contains(s)) updated.remove(s); else updated.add(s);
    state = state.copyWith(selectedSymptoms: updated);
  }

  Future<void> analyse(String languageCode) async {
    state = state.copyWith(currentStep: 5, isAnalysing: true, error: null);
    final result = await AiSelector.triage(
      symptoms: state.selectedSymptoms, severity: state.severity,
      durationDays: state.durationDays, languageCode: languageCode,
    );
    state = state.copyWith(result: result, isAnalysing: false, currentStep: 6);
  }

  Future<void> saveAndRefer(String workerUid) async {
    if (state.selectedPatient == null || state.result == null) return;
    final sessionId = await _db.insertSymptomSession(SymptomSessionsCompanion.insert(
      patientId:    state.selectedPatient!.id,
      workerUid:    workerUid,
      symptoms:     jsonEncode(state.selectedSymptoms),
      severity:     state.severity,
      durationDays: state.durationDays,
      aiAnalysis:   Value(state.result!.reasoning),
      triageLevel:  state.result!.level.name,
      referralNote: Value(state.result!.referralNote),
    ));
    await _db.addToSyncQueue(SyncQueueCompanion.insert(
      tableName: 'symptomSessions',
      operation: 'insert',
      payload: jsonEncode({
        'id': sessionId, 'patientId': state.selectedPatient!.id,
        'workerUid': workerUid, 'triage': state.result!.level.name,
      }),
    ));
  }
}

final symptomScreeningProvider =
    StateNotifierProvider<SymptomScreeningNotifier, SymptomScreeningState>(
  (ref) => SymptomScreeningNotifier(ref.read(dbProvider)),
);

// ── Constants ──────────────────────────────────────────────────────────────

const _kSymptoms = [
  'fever', 'cough', 'breathing difficulty', 'vomiting', 'diarrhea',
  'rash', 'headache', 'fatigue', 'abdominal pain', 'swelling',
  'jaundice', 'chest pain',
];

// ── Screen ─────────────────────────────────────────────────────────────────

class SymptomScreeningScreen extends ConsumerStatefulWidget {
  final int? initialPatientId;
  const SymptomScreeningScreen({super.key, this.initialPatientId});

  @override
  ConsumerState<SymptomScreeningScreen> createState() => _State();
}

class _State extends ConsumerState<SymptomScreeningScreen> {
  final _speech   = stt.SpeechToText();
  bool _listening = false;

  @override
  void initState() {
    super.initState();
    ref.read(symptomScreeningProvider.notifier).reset();
    if (widget.initialPatientId != null) _loadPatient();
  }

  Future<void> _loadPatient() async {
    final p = await ref.read(dbProvider).getPatientById(widget.initialPatientId!);
    if (p != null && mounted) {
      ref.read(symptomScreeningProvider.notifier).selectPatient(p);
      ref.read(symptomScreeningProvider.notifier).next();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state    = ref.watch(symptomScreeningProvider);
    final notifier = ref.read(symptomScreeningProvider.notifier);
    return Scaffold(
      appBar: AppBar(
        title: Text('Symptom Screening · ${state.currentStep + 1}/7'),
        leading: BackButton(onPressed: state.currentStep > 0 ? notifier.back : () => context.pop()),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        child: KeyedSubtree(
          key: ValueKey(state.currentStep),
          child: _buildStep(context, state, notifier),
        ),
      ),
    );
  }

  Widget _buildStep(BuildContext ctx, SymptomScreeningState s, SymptomScreeningNotifier n) {
    switch (s.currentStep) {
      case 0: return _PatientStep(notifier: n);
      case 1: return _SymptomsStep(state: s, notifier: n);
      case 2: return _SeverityStep(state: s, notifier: n);
      case 3: return _DurationStep(state: s, notifier: n);
      case 4: return _VoiceStep(state: s, notifier: n, speech: _speech, listening: _listening, setListening: (v) => setState(() => _listening = v));
      case 5: return const _LoadingStep();
      case 6: return _ResultStep(state: s, notifier: n);
      default: return const SizedBox.shrink();
    }
  }
}

// Step 0
class _PatientStep extends ConsumerWidget {
  final SymptomScreeningNotifier notifier;
  const _PatientStep({required this.notifier});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uid = FirebaseAuth.instance.currentUser?.uid ?? '';
    return FutureBuilder<List<Patient>>(
      future: ref.read(dbProvider).searchPatients(uid, ''),
      builder: (ctx, snap) {
        final list = snap.data ?? [];
        return Column(children: [
          const _Header(title: 'Select Patient', sub: 'Who is being screened?'),
          Expanded(
            child: list.isEmpty
                ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Text('No patients yet.'),
                    TextButton(onPressed: () => ctx.push('/patients/add'), child: const Text('Add patient')),
                  ]))
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final p = list[i];
                      return Card(child: ListTile(
                        leading: CircleAvatar(backgroundColor: AppTheme.mintBg,
                          child: Text(p.name[0], style: const TextStyle(color: AppTheme.vitalsGreen, fontWeight: FontWeight.w800))),
                        title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text('${p.age} yrs · ${p.gender}'),
                        onTap: () { notifier.selectPatient(p); notifier.next(); },
                      ));
                    },
                  ),
          ),
        ]);
      },
    );
  }
}

// Step 1
class _SymptomsStep extends StatelessWidget {
  final SymptomScreeningState state;
  final SymptomScreeningNotifier notifier;
  const _SymptomsStep({required this.state, required this.notifier});

  @override
  Widget build(BuildContext context) => Column(children: [
    const _Header(title: 'Select Symptoms', sub: 'Tap all that apply'),
    Expanded(child: GridView.count(
      padding: const EdgeInsets.all(16), crossAxisCount: 2,
      childAspectRatio: 2.8, crossAxisSpacing: 10, mainAxisSpacing: 10,
      children: _kSymptoms.map((s) {
        final on = state.selectedSymptoms.contains(s);
        return GestureDetector(onTap: () => notifier.toggleSymptom(s),
          child: AnimatedContainer(duration: const Duration(milliseconds: 160),
            decoration: BoxDecoration(
              color: on ? AppTheme.vitalsGreen : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: on ? AppTheme.vitalsGreen : const Color(0xFFCCDDD8)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Center(child: Text(s[0].toUpperCase() + s.substring(1),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                color: on ? Colors.white : AppTheme.deepForest)))));
      }).toList(),
    )),
    _NextBtn(label: 'Next: Severity', onTap: state.selectedSymptoms.isNotEmpty ? notifier.next : null),
  ]);
}

// Step 2
class _SeverityStep extends StatelessWidget {
  final SymptomScreeningState state;
  final SymptomScreeningNotifier notifier;
  const _SeverityStep({required this.state, required this.notifier});

  @override
  Widget build(BuildContext context) {
    final opts = [
      ('mild', Icons.sentiment_satisfied_rounded, 'Mild', 'Can do daily activities'),
      ('moderate', Icons.sentiment_neutral_rounded, 'Moderate', 'Some difficulty'),
      ('severe', Icons.sentiment_very_dissatisfied_rounded, 'Severe', 'Bedridden / unable to function'),
    ];
    return Column(children: [
      const _Header(title: 'How severe?', sub: 'Pick the closest description'),
      Expanded(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: opts.map((o) {
        final on = state.severity == o.$1;
        return GestureDetector(onTap: () => notifier.setSeverity(o.$1),
          child: AnimatedContainer(duration: const Duration(milliseconds: 160),
            margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: on ? AppTheme.mintBg : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: on ? AppTheme.vitalsGreen : const Color(0xFFCCDDD8), width: on ? 2 : 1),
            ),
            child: Row(children: [
              Icon(o.$2, size: 36, color: on ? AppTheme.vitalsGreen : AppTheme.mintSub),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o.$3, style: TextStyle(fontWeight: FontWeight.w700, color: on ? AppTheme.deepForest : AppTheme.mintSub)),
                Text(o.$4, style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
              ])),
              if (on) const Icon(Icons.check_circle_rounded, color: AppTheme.vitalsGreen),
            ])));
      }).toList()))),
      _NextBtn(label: 'Next: Duration', onTap: notifier.next),
    ]);
  }
}

// Step 3
class _DurationStep extends StatelessWidget {
  final SymptomScreeningState state;
  final SymptomScreeningNotifier notifier;
  const _DurationStep({required this.state, required this.notifier});

  @override
  Widget build(BuildContext context) => Column(children: [
    const _Header(title: 'How long?', sub: 'Days since symptoms started'),
    Expanded(child: Center(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Text('${state.durationDays} ${state.durationDays == 1 ? "day" : "days"}',
        style: const TextStyle(fontSize: 52, fontWeight: FontWeight.w800, color: AppTheme.vitalsGreen)),
      Slider(value: state.durationDays.toDouble(), min: 1, max: 14, divisions: 13,
        activeColor: AppTheme.vitalsGreen, onChanged: (v) => notifier.setDuration(v.round())),
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [
        Text('1 day', style: TextStyle(color: AppTheme.mintSub, fontSize: 12)),
        Text('14 days', style: TextStyle(color: AppTheme.mintSub, fontSize: 12)),
      ]),
    ])))),
    _NextBtn(label: 'Next: Voice Note', onTap: notifier.next),
  ]);
}

// Step 4
class _VoiceStep extends StatelessWidget {
  final SymptomScreeningState state;
  final SymptomScreeningNotifier notifier;
  final stt.SpeechToText speech;
  final bool listening;
  final ValueChanged<bool> setListening;
  const _VoiceStep({required this.state, required this.notifier, required this.speech, required this.listening, required this.setListening});

  Future<void> _toggle() async {
    if (listening) {
      await speech.stop();
      setListening(false);
    } else {
      if (await speech.initialize()) {
        setListening(true);
        speech.listen(onResult: (r) {
          notifier.setVoiceNote(r.recognizedWords);
          if (r.finalResult) setListening(false);
        }, localeId: 'hi_IN');
      }
    }
  }

  @override
  Widget build(BuildContext context) => Column(children: [
    const _Header(title: 'Voice Note', sub: 'Optional — speak extra observations'),
    Expanded(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
      GestureDetector(onTap: _toggle, child: AnimatedContainer(duration: const Duration(milliseconds: 200),
        width: 80, height: 80,
        decoration: BoxDecoration(shape: BoxShape.circle, color: listening ? AppTheme.sosBorder : AppTheme.vitalsGreen),
        child: Icon(listening ? Icons.stop_rounded : Icons.mic_rounded, color: Colors.white, size: 36))),
      const SizedBox(height: 12),
      Text(listening ? 'Listening…' : 'Tap to record', style: const TextStyle(color: AppTheme.mintSub)),
      if (state.voiceNote.isNotEmpty) ...[
        const SizedBox(height: 20),
        Container(padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppTheme.mintBg, borderRadius: BorderRadius.circular(12)),
          child: Text(state.voiceNote, style: const TextStyle(fontSize: 13, height: 1.5))),
      ],
    ]))),
    _NextBtn(label: 'Analyse Symptoms', onTap: () => notifier.analyse('hi')),
  ]);
}

// Step 5
class _LoadingStep extends StatelessWidget {
  const _LoadingStep();

  @override
  Widget build(BuildContext context) => const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    CircularProgressIndicator(color: AppTheme.vitalsGreen, strokeWidth: 3),
    SizedBox(height: 24),
    Text('AI is analysing symptoms…', style: TextStyle(fontSize: 16, color: AppTheme.mintSub)),
  ]));
}

// Step 6
class _ResultStep extends ConsumerWidget {
  final SymptomScreeningState state;
  final SymptomScreeningNotifier notifier;
  const _ResultStep({required this.state, required this.notifier});

  Color _color(TriageLevel? l) {
    switch (l) {
      case TriageLevel.red:    return AppTheme.sosBorder;
      case TriageLevel.yellow: return const Color(0xFFF5A623);
      default:                 return AppTheme.vitalsGreen;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = state.result;
    if (r == null) return const SizedBox.shrink();
    final c = _color(r.level);
    return Column(children: [
      Expanded(child: SingleChildScrollView(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: double.infinity, padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(14), border: Border.all(color: c, width: 2)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(width: 12, height: 12, decoration: BoxDecoration(shape: BoxShape.circle, color: c)),
              const SizedBox(width: 8),
              Text(r.levelLabel, style: TextStyle(fontWeight: FontWeight.w800, color: c)),
              if (r.isAiGenerated) ...[const Spacer(), const Icon(Icons.auto_awesome_rounded, size: 14, color: AppTheme.mintSub), const SizedBox(width: 4), const Text('AI', style: TextStyle(fontSize: 10, color: AppTheme.mintSub))],
            ]),
            const SizedBox(height: 8),
            Text(r.reasoning, style: const TextStyle(fontSize: 13, height: 1.5)),
          ])),
        const SizedBox(height: 16),
        Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('🏠 Home Advice', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(r.homeAdvice, style: const TextStyle(fontSize: 13, height: 1.5)),
        ]))),
        const SizedBox(height: 10),
        Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('🏥 Referral Note', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(r.referralNote, style: const TextStyle(fontSize: 13, height: 1.5)),
        ]))),
      ]))),
      Padding(padding: const EdgeInsets.all(16), child: Row(children: [
        Expanded(child: OutlinedButton(onPressed: () { notifier.reset(); context.pop(); }, child: const Text('Close'))),
        const SizedBox(width: 12),
        Expanded(child: ElevatedButton(
          onPressed: () async {
            final uid = FirebaseAuth.instance.currentUser?.uid ?? '';
            await notifier.saveAndRefer(uid);
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved & queued for sync.')));
              notifier.reset();
              context.pop();
            }
          },
          child: const Text('Save & Refer'))),
      ])),
    ]);
  }
}

// ── Shared widgets ──────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  final String title, sub;
  const _Header({required this.title, required this.sub});

  @override
  Widget build(BuildContext context) => Container(
    color: AppTheme.deepForest, width: double.infinity,
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.mintText)),
      const SizedBox(height: 4),
      Text(sub, style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
    ]));
}

class _NextBtn extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  const _NextBtn({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
    child: ElevatedButton(onPressed: onTap, child: Text(label)));
}
