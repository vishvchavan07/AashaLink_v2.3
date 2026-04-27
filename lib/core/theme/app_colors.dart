import 'package:flutter/material.dart';

/// All AashaLink brand colors as compile-time constants.
/// Widgets must reference this file — never use inline Color(0x...) literals.
abstract final class AppColors {
  // ── Deep Teal Header/Card backgrounds ──────────────────────────────────
  static const headerBg      = Color(0xFF04342C);
  static const cardDark      = Color(0xFF085041);
  static const cardDarkBorder= Color(0xFF0F6E56);

  // ── Mint / Teal accents ─────────────────────────────────────────────────
  static const mintWhite     = Color(0xFFE0F5EE);
  static const mintAccent    = Color(0xFF5DCAA5);
  static const tealPrimary   = Color(0xFF1D9E75);

  // ── SOS / Emergency ─────────────────────────────────────────────────────
  static const sosBg         = Color(0xFFD85A30);
  static const sosLabel      = Color(0xFF993C1D);

  // ── Referred coral ──────────────────────────────────────────────────────
  static const coralReferred = Color(0xFFF0997B);

  // ── Blood Bank tile ─────────────────────────────────────────────────────
  static const bloodTileBg   = Color(0xFFFAECE7);
  static const bloodIcon     = Color(0xFF993C1D);

  // ── Surface (light scrollable zone) ────────────────────────────────────
  static const surface       = Color(0xFFF5F9F7);
  static const surfaceCard   = Color(0xFFFFFFFF);

  // ── Text ────────────────────────────────────────────────────────────────
  static const textOnDark    = Color(0xFFE0F5EE);   // mint-white
  static const textSubtleDark= Color(0xFF5DCAA5);   // teal-mint subtitle
  static const textOnLight   = Color(0xFF0D2B22);
  static const textMuted     = Color(0xFF5D7A71);
}
