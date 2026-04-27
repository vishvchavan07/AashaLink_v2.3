import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../../../core/theme/app_colors.dart';

/// 2×2 feature grid.
/// Top cards (Voice Diary, Patients) use dark teal styling.
/// Bottom cards (Bed Finder, Blood Bank) use light surface styling.
class FeatureGrid extends StatelessWidget {
  final VoidCallback onVoiceDiary;
  final VoidCallback onPatients;
  final VoidCallback onBedFinder;
  final VoidCallback onBloodBank;

  const FeatureGrid({
    super.key,
    required this.onVoiceDiary,
    required this.onPatients,
    required this.onBedFinder,
    required this.onBloodBank,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return GridView(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.05,
      ),
      children: [
        // ── Top-left: Voice Diary (dark teal) ──────────────────────────
        _DarkFeatureCard(
          icon: Icons.mic_rounded,
          label: l10n.voiceDiary,
          subtitle: l10n.voiceDiarySubtitle,
          hint: l10n.voiceDiaryHint,
          onTap: onVoiceDiary,
        ),
        // ── Top-right: Patients (dark teal) ────────────────────────────
        _DarkFeatureCard(
          icon: Icons.folder_open_rounded,
          label: l10n.patientRecords,
          subtitle: l10n.patientsCardSubtitle,
          hint: l10n.patientRecordsHint,
          onTap: onPatients,
        ),
        // ── Bottom-left: Bed Finder (light surface) ─────────────────────
        _LightFeatureCard(
          icon: Icons.home_work_outlined,
          label: l10n.bedAvailability,
          subtitle: l10n.bedAvailabilitySubtitle,
          iconBg: AppColors.surface,
          iconColor: AppColors.tealPrimary,
          onTap: onBedFinder,
        ),
        // ── Bottom-right: Blood Bank (warm light tile) ──────────────────
        _LightFeatureCard(
          icon: Icons.water_drop_outlined,
          label: l10n.bloodBank,
          subtitle: '',
          iconBg: AppColors.bloodTileBg,
          iconColor: AppColors.bloodIcon,
          onTap: onBloodBank,
        ),
      ],
    );
  }
}

// ── Dark teal card ──────────────────────────────────────────────────────────

class _DarkFeatureCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final String hint;
  final VoidCallback onTap;

  const _DarkFeatureCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.hint,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.cardDark,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        splashColor: AppColors.cardDarkBorder,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.cardDarkBorder, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.headerBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.mintAccent, size: 22),
              ),
              const Spacer(),
              // Label
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.mintWhite,
                ),
              ),
              const SizedBox(height: 2),
              // Subtitle
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.mintAccent,
                ),
              ),
              const SizedBox(height: 4),
              // Encouragement hint
              Text(
                hint,
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.textSubtleDark,
                  fontStyle: FontStyle.italic,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Light surface card ──────────────────────────────────────────────────────

class _LightFeatureCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color iconBg;
  final Color iconColor;
  final VoidCallback onTap;

  const _LightFeatureCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.iconBg,
    required this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceCard,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2EDE9), width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const Spacer(),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textOnLight,
                ),
              ),
              if (subtitle.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
