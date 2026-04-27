import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../../../core/theme/app_theme.dart';

/// Worker identity strip — shows her name, live dot, rotating status subtitle
/// and today's patient / referred counts.
class WorkerStrip extends StatefulWidget {
  final int    patientCount;
  final int    referredCount;
  final String workerName;
  final String blockName;

  const WorkerStrip({
    super.key,
    this.patientCount  = 24,
    this.referredCount = 3,
    this.workerName    = 'Anjali Patil',
    this.blockName     = 'Pimpri Block 4',
  });

  @override
  State<WorkerStrip> createState() => _WorkerStripState();
}

class _WorkerStripState extends State<WorkerStrip>
    with SingleTickerProviderStateMixin {
  // Rotating subtitle
  int _statusIndex = 0;
  Timer? _statusTimer;

  // Live green dot pulse
  late final AnimationController _dotCtrl;
  late final Animation<double> _dotScale;

  @override
  void initState() {
    super.initState();

    _dotCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _dotScale = Tween<double>(begin: 1.0, end: 1.7).animate(
      CurvedAnimation(parent: _dotCtrl, curve: Curves.easeInOut),
    );

    _statusTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) {
        setState(() => _statusIndex = (_statusIndex + 1) % 3);
      }
    });
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    _dotCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final statuses = [l10n.workerStatus1, l10n.workerStatus2, l10n.workerStatus3];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.forestCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.forestBorder, width: 1.2),
      ),
      child: Row(
        children: [
          // ── Left: name + live dot + rotating subtitle ──────────────────
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      widget.workerName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.mintText,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Live dot
                    AnimatedBuilder(
                      animation: _dotCtrl,
                      builder: (_, __) => Transform.scale(
                        scale: _dotScale.value,
                        child: Container(
                          width: 7,
                          height: 7,
                            decoration: const BoxDecoration(
                             shape: BoxShape.circle,
                             color: AppTheme.vitalsGreen,
                            ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // Rotating status with smooth crossfade
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 500),
                  transitionBuilder: (child, animation) => FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.3),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  ),
                  child: Text(
                    statuses[_statusIndex],
                    key: ValueKey(_statusIndex),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.mintSub,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Right: today's counts ──────────────────────────────────────
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _StatBadge(value: widget.patientCount, label: l10n.todayPatients, valueColor: AppTheme.mintText),
              const SizedBox(height: 4),
              _StatBadge(value: widget.referredCount, label: l10n.todayReferred, valueColor: AppTheme.coralText),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  final int value;
  final String label;
  final Color valueColor;

  const _StatBadge({
    required this.value,
    required this.label,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$value',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: valueColor,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: AppTheme.mintSub,
          ),
        ),
      ],
    );
  }
}
