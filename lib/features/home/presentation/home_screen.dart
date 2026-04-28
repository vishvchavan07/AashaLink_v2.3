import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/providers.dart';
import '../../sos/presentation/sos_button.dart';
import 'worker_strip.dart';
import 'feature_grid.dart';
import 'stats_row.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  static String _greeting(AppLocalizations l10n) {
    final h = DateTime.now().hour;
    if (h < 12) return l10n.greetingMorning;
    if (h < 17) return l10n.greetingAfternoon;
    return l10n.greetingEvening;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n         = AppLocalizations.of(context)!;
    final workerAsync  = ref.watch(workerProvider);
    final statsAsync   = ref.watch(todayStatsProvider);
    final connectivity = ref.watch(connectivityProvider);
    final isOffline    = connectivity.valueOrNull == ConnectivityResult.none;

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppTheme.surface,
        bottomNavigationBar: _BottomNav(l10n: l10n),
        body: Column(children: [
          // ── Zone 1: Fixed dark header ─────────────────────────────────
          ColoredBox(
            color: AppTheme.deepForest,
            child: Column(children: [
              // Connectivity offline banner
              if (isOffline)
                Container(
                  color: AppTheme.sosBorder.withOpacity(0.15),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Row(children: const [
                    Icon(Icons.cloud_off_rounded, size: 14, color: AppTheme.sosBorder),
                    SizedBox(width: 6),
                    Text(l10n.offlineBanner, style: const TextStyle(fontSize: 11, color: AppTheme.sosBorder)),
                  ]),
                ),

              // App bar
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                child: Row(children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(l10n.appTitle.toUpperCase(),
                      style: const TextStyle(fontSize: 10, letterSpacing: 1.6, color: AppTheme.mintSub, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(l10n.ashaLink,
                      style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w500, color: AppTheme.mintText)),
                  ]),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => context.push('/settings'),
                    child: Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle, color: AppTheme.forestCard,
                        border: Border.all(color: AppTheme.vitalsGreen, width: 2)),
                      child: Center(child: Text(
                        workerAsync.valueOrNull?.name.isNotEmpty == true
                            ? workerAsync.valueOrNull!.name[0].toUpperCase()
                            : 'A',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.mintSub))),
                    ),
                  ),
                ]),
              ),

              const SizedBox(height: 20),
              const SosButton(),
              const SizedBox(height: 20),
            ]),
          ),

          // ── Zone 2: Scrollable surface ────────────────────────────────
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    // Greeting
                    Text(_greeting(l10n),
                      style: const TextStyle(fontSize: 14, color: AppTheme.vitalsGreen, fontStyle: FontStyle.italic)),
                    const SizedBox(height: 14),

                    // Worker strip (real name + block from provider)
                    workerAsync.when(
                      data: (worker) => WorkerStrip(
                        workerName:   worker?.name  ?? l10n.workerName,
                        blockName:    worker?.block ?? 'Pimpri Block 4',
                        patientCount: statsAsync.valueOrNull?.screened ?? 0,
                        referredCount: statsAsync.valueOrNull?.referred ?? 0,
                      ),
                      loading: () => const WorkerStrip(patientCount: 0, referredCount: 0),
                      error:   (_, __) => const WorkerStrip(patientCount: 0, referredCount: 0),
                    ),
                    const SizedBox(height: 14),

                    // Symptom hero card
                    _SymptomHeroCard(l10n: l10n),
                    const SizedBox(height: 14),

                    // Feature grid
                    FeatureGrid(
                      onVoiceDiary: () => context.push('/diary'),
                      onPatients:   () => context.push('/patients'),
                      onBedFinder:  () => context.push('/resources/beds'),
                      onBloodBank:  () => context.push('/resources/blood'),
                    ),
                    const SizedBox(height: 14),

                    // Stats row (live from provider)
                    statsAsync.when(
                      data: (s) => StatsRow(screened: s.screened, referred: s.referred, voiceLogs: s.voiceLogs),
                      loading: () => const StatsRow(screened: 0, referred: 0, voiceLogs: 0),
                      error:   (_, __) => const StatsRow(screened: 0, referred: 0, voiceLogs: 0),
                    ),
                  ]),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

// Symptom hero card with blinking dot
class _SymptomHeroCard extends StatefulWidget {
  final AppLocalizations l10n;
  const _SymptomHeroCard({required this.l10n});

  @override
  State<_SymptomHeroCard> createState() => _SymptomHeroCardState();
}

class _SymptomHeroCardState extends State<_SymptomHeroCard> with SingleTickerProviderStateMixin {
  late final AnimationController _blink;
  late final Animation<double>   _opacity;

  @override
  void initState() {
    super.initState();
    _blink   = AnimationController(vsync: this, duration: const Duration(milliseconds: 800))..repeat(reverse: true);
    _opacity = Tween<double>(begin: 1.0, end: 0.1).animate(CurvedAnimation(parent: _blink, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _blink.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final l10n = widget.l10n;
    return Material(color: AppTheme.forestCard, borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => context.push('/symptom'),
        borderRadius: BorderRadius.circular(14),
        child: Container(padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.forestBorder)),
          child: Row(children: [
            Container(width: 42, height: 42,
              decoration: BoxDecoration(color: AppTheme.deepForest, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.monitor_heart_outlined, color: AppTheme.mintSub, size: 24)),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(l10n.symptomScreening, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.mintText)),
              const SizedBox(height: 3),
              Text(l10n.symptomScreeningSubtitle, style: const TextStyle(fontSize: 11, color: AppTheme.mintSub)),
            ])),
            Column(children: [
              AnimatedBuilder(animation: _blink, builder: (_, __) => Opacity(opacity: _opacity.value,
                child: Container(width: 8, height: 8, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.vitalsGreen)))),
              const SizedBox(height: 6),
              const Icon(Icons.chevron_right_rounded, color: AppTheme.mintSub, size: 20),
            ]),
          ])),
      ));
  }
}

// Bottom navigation
class _BottomNav extends StatelessWidget {
  final AppLocalizations l10n;
  const _BottomNav({required this.l10n});

  @override
  Widget build(BuildContext context) => BottomNavigationBar(
    currentIndex: 0,
    onTap: (i) {
      switch (i) {
        case 0: context.go('/home');      break;
        case 1: context.push('/symptom'); break;
        case 2: context.push('/patients'); break;
        case 3: context.push('/diary');   break;
        case 4: context.push('/resources'); break;
      }
    },
    items: [
      BottomNavigationBarItem(icon: const Icon(Icons.home_outlined), activeIcon: const Icon(Icons.home_rounded), label: l10n.home),
      BottomNavigationBarItem(icon: const Icon(Icons.monitor_heart_outlined), activeIcon: const Icon(Icons.monitor_heart_rounded), label: l10n.screen),
      BottomNavigationBarItem(icon: const Icon(Icons.folder_outlined), activeIcon: const Icon(Icons.folder_rounded), label: l10n.records),
      BottomNavigationBarItem(icon: const Icon(Icons.mic_none_rounded), activeIcon: const Icon(Icons.mic_rounded), label: l10n.diary),
      BottomNavigationBarItem(icon: const Icon(Icons.local_hospital_outlined), activeIcon: const Icon(Icons.local_hospital_rounded), label: l10n.resources),
    ],
  );
}
