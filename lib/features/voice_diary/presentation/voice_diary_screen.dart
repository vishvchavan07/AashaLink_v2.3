import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:intl/intl.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../core/ai/gemini_service.dart';
import '../../../core/db/app_database.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

final _diaryStreamProvider = StreamProvider<List<DiaryEntry>>((ref) {
  final uid = FirebaseAuth.instance.currentUser?.uid ?? '';
  return ref.read(dbProvider).watchAllDiaryEntries(uid);
});

class VoiceDiaryScreen extends ConsumerStatefulWidget {
  const VoiceDiaryScreen({super.key});

  @override
  ConsumerState<VoiceDiaryScreen> createState() => _VoiceDiaryScreenState();
}

class _VoiceDiaryScreenState extends ConsumerState<VoiceDiaryScreen> {
  final _recorder    = AudioRecorder();
  bool  _isRecording = false;
  String? _audioPath;

  Future<void> _startRecording() async {
    if (!await _recorder.hasPermission()) return;
    final dir  = await getApplicationDocumentsDirectory();
    final path = '${dir.path}/diary_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: path);
    setState(() { _isRecording = true; _audioPath = path; });
  }

  Future<void> _stopAndSave() async {
    await _recorder.stop();
    setState(() => _isRecording = false);
    if (_audioPath == null) return;

    final uid = FirebaseAuth.instance.currentUser?.uid ?? '';
    final db  = ref.read(dbProvider);
    final transcript = 'Field note: ${_audioPath!.split('/').last}';

    final id = await db.insertDiaryEntry(DiaryEntriesCompanion.insert(
      workerUid: uid, audioPath: _audioPath!, transcript: transcript,
    ));

    // Attempt AI summary when online
    final conn = await Connectivity().checkConnectivity();
    if (conn != ConnectivityResult.none) {
      try {
        final summary = await GeminiService().summariseDiaryTranscript(
          transcript: transcript, languageCode: 'en',
        );
        await db.updateDiarySummary(id, summary);
      } catch (_) {}
    }
    setState(() => _audioPath = null);
  }

  @override
  void dispose() { _recorder.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final entries = ref.watch(_diaryStreamProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Voice Diary')),
      body: Column(children: [
        Container(
          color: AppTheme.deepForest,
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Center(child: Column(children: [
            GestureDetector(
              onTap: _isRecording ? _stopAndSave : _startRecording,
              child: AnimatedContainer(duration: const Duration(milliseconds: 200),
                width: 72, height: 72,
                decoration: BoxDecoration(shape: BoxShape.circle,
                  color: _isRecording ? AppTheme.sosBorder : AppTheme.vitalsGreen),
                child: Icon(_isRecording ? Icons.stop_rounded : Icons.mic_rounded, color: Colors.white, size: 34)),
            ),
            const SizedBox(height: 10),
            Text(_isRecording ? 'Recording… tap to stop' : 'Tap to record field notes',
              style: const TextStyle(color: AppTheme.mintSub, fontSize: 12)),
          ])),
        ),
        Expanded(child: entries.when(
          data: (list) => list.isEmpty
              ? const Center(child: Text('No diary entries yet.', style: TextStyle(color: AppTheme.mintSub)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16), itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _DiaryCard(entry: list[i])),
          loading: () => const Center(child: CircularProgressIndicator()),
          error:   (e, _) => Center(child: Text('$e')),
        )),
      ]),
    );
  }
}

class _DiaryCard extends StatelessWidget {
  final DiaryEntry entry;
  const _DiaryCard({required this.entry});

  @override
  Widget build(BuildContext context) {
    return Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text(DateFormat('dd MMM · HH:mm').format(entry.createdAt),
          style: const TextStyle(fontSize: 11, color: AppTheme.mintSub)),
        if (entry.aiSummary != null) ...[
          const Spacer(),
          Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: AppTheme.mintBg, borderRadius: BorderRadius.circular(20)),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.auto_awesome_rounded, size: 10, color: AppTheme.vitalsGreen),
              SizedBox(width: 4),
              Text('AI Summary', style: TextStyle(fontSize: 10, color: AppTheme.vitalsGreen, fontWeight: FontWeight.w600)),
            ])),
        ],
      ]),
      const SizedBox(height: 8),
      if (entry.aiSummary != null)
        Text(entry.aiSummary!, style: const TextStyle(fontSize: 13, height: 1.5))
      else
        Text(entry.transcript, maxLines: 3, overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13, color: AppTheme.mintSub, height: 1.5)),
    ])));
  }
}
