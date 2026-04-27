import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../../../core/theme/app_colors.dart';

/// Stats row — 3 equal columns with count-up animation on entry.
/// Numbers animate via TweenSequence<int> over 800 ms when the widget
/// is first inserted into the tree.
class StatsRow extends StatelessWidget {
  final int screened;
  final int referred;
  final int voiceLogs;

  const StatsRow({
    super.key,
    this.screened = 47,
    this.referred = 8,
    this.voiceLogs = 12,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            endValue: screened,
            label: l10n.statsScreened,
            valueColor: AppColors.tealPrimary,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            endValue: referred,
            label: l10n.statsReferredForCare,
            valueColor: AppColors.sosBg,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            endValue: voiceLogs,
            label: l10n.statsVoiceLogs,
            valueColor: AppColors.tealPrimary,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatefulWidget {
  final int endValue;
  final String label;
  final Color valueColor;

  const _StatCard({
    required this.endValue,
    required this.label,
    required this.valueColor,
  });

  @override
  State<_StatCard> createState() => _StatCardState();
}

class _StatCardState extends State<_StatCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<int> _counter;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _counter = IntTween(begin: 0, end: widget.endValue).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
    // Start the count-up after one frame so it's visible
    WidgetsBinding.instance.addPostFrameCallback((_) => _ctrl.forward());
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDDEDE8), width: 1),
      ),
      child: Column(
        children: [
          AnimatedBuilder(
            animation: _counter,
            builder: (_, __) => Text(
              '${_counter.value}',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: widget.valueColor,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            widget.label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.textMuted,
              height: 1.3,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
