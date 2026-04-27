import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../../../core/theme/app_colors.dart';

/// Animated SOS button extracted as its own widget.
/// Contains two expanding pulse rings + opacity breathe on the button itself.
class SosButton extends ConsumerStatefulWidget {
  const SosButton({super.key});

  @override
  ConsumerState<SosButton> createState() => _SosButtonState();
}

class _SosButtonState extends ConsumerState<SosButton>
    with TickerProviderStateMixin {
  // Ring 1 — starts immediately
  late final AnimationController _ring1Ctrl;
  late final Animation<double> _ring1Scale;
  late final Animation<double> _ring1Opacity;

  // Ring 2 — delayed 0.9 s
  late final AnimationController _ring2Ctrl;
  late final Animation<double> _ring2Scale;
  late final Animation<double> _ring2Opacity;

  // Button pulse
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseOpacity;

  @override
  void initState() {
    super.initState();

    const ringDuration = Duration(milliseconds: 2600);

    // ── Ring 1 ─────────────────────────────────────────────────────────────
    _ring1Ctrl = AnimationController(vsync: this, duration: ringDuration)
      ..repeat();
    _ring1Scale = Tween<double>(begin: 1.0, end: 2.4).animate(
      CurvedAnimation(parent: _ring1Ctrl, curve: Curves.easeOut),
    );
    _ring1Opacity = Tween<double>(begin: 0.55, end: 0.0).animate(
      CurvedAnimation(parent: _ring1Ctrl, curve: Curves.easeOut),
    );

    // ── Ring 2 — 0.9 s delay ───────────────────────────────────────────────
    _ring2Ctrl = AnimationController(vsync: this, duration: ringDuration);
    _ring2Scale = Tween<double>(begin: 1.0, end: 2.4).animate(
      CurvedAnimation(parent: _ring2Ctrl, curve: Curves.easeOut),
    );
    _ring2Opacity = Tween<double>(begin: 0.55, end: 0.0).animate(
      CurvedAnimation(parent: _ring2Ctrl, curve: Curves.easeOut),
    );
    Future.delayed(const Duration(milliseconds: 900), () {
      if (mounted) _ring2Ctrl.repeat();
    });

    // ── Button breathe ─────────────────────────────────────────────────────
    _pulseCtrl = AnimationController(vsync: this, duration: ringDuration)
      ..repeat(reverse: true);
    _pulseOpacity = Tween<double>(begin: 1.0, end: 0.55).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ring1Ctrl.dispose();
    _ring2Ctrl.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Column(
      children: [
        // ── "EMERGENCY ACCESS" label ─────────────────────────────────────
        Text(
          l10n.emergencyAccess.toUpperCase(),
          style: const TextStyle(
            fontSize: 10,
            letterSpacing: 1.8,
            fontWeight: FontWeight.w700,
            color: AppColors.sosLabel,
          ),
        ),
        const SizedBox(height: 16),

        // ── Button + rings stack ─────────────────────────────────────────
        SizedBox(
          width: 160,
          height: 160,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Ring 1
              AnimatedBuilder(
                animation: _ring1Ctrl,
                builder: (_, __) => Transform.scale(
                  scale: _ring1Scale.value,
                  child: Opacity(
                    opacity: _ring1Opacity.value,
                    child: _buildRing(),
                  ),
                ),
              ),
              // Ring 2
              AnimatedBuilder(
                animation: _ring2Ctrl,
                builder: (_, __) => Transform.scale(
                  scale: _ring2Scale.value,
                  child: Opacity(
                    opacity: _ring2Opacity.value,
                    child: _buildRing(),
                  ),
                ),
              ),
              // SOS button
              AnimatedBuilder(
                animation: _pulseCtrl,
                builder: (_, child) => Opacity(
                  opacity: _pulseOpacity.value,
                  child: child,
                ),
                child: GestureDetector(
                  onTap: () {
                    // TODO: trigger GPS + SMS alert
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('SOS alert sent to supervisor.'),
                        backgroundColor: AppColors.sosBg,
                      ),
                    );
                  },
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.sosBg,
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x55D85A30),
                          blurRadius: 16,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'SOS',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                          ),
                        ),
                        Text(
                          l10n.sosTapToAlert,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 9,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // ── Permanent calm description ───────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            l10n.sosGpsInfo,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.mintAccent,
              height: 1.5,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRing() => Container(
        width: 100,
        height: 100,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.sosBg, width: 2),
        ),
      );
}
