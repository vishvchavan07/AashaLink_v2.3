import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

abstract final class AppTheme {
  // ── Brand palette ─────────────────────────────────────────────────────────
  static const deepForest   = Color(0xFF04342C);
  static const forestCard   = Color(0xFF085041);
  static const forestBorder = Color(0xFF0F6E56);
  static const vitalsGreen  = Color(0xFF1D9E75);
  static const mintText     = Color(0xFF9FE1CB);
  static const mintSub      = Color(0xFF5DCAA5);
  static const mintBg       = Color(0xFFE1F5EE);
  static const sosBg        = Color(0xFFFAECE7);
  static const sosBorder    = Color(0xFFD85A30);
  static const sosDeep      = Color(0xFF993C1D);
  static const bloodBg      = Color(0xFFFAECE7);
  static const coralText    = Color(0xFFF0997B);
  static const amberDev     = Color(0xFF854F0B);
  static const surface      = Color(0xFFF5F9F7);

  static ThemeData get darkTheme {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: vitalsGreen,
        primary: vitalsGreen,
        onPrimary: Colors.white,
        primaryContainer: mintBg,
        onPrimaryContainer: deepForest,
        secondary: mintSub,
        onSecondary: deepForest,
        secondaryContainer: forestCard,
        onSecondaryContainer: mintText,
        surface: surface,
        onSurface: deepForest,
        error: sosBorder,
        onError: Colors.white,
      ),
      scaffoldBackgroundColor: surface,
      textTheme: GoogleFonts.plusJakartaSansTextTheme(),
    );

    return base.copyWith(
      // ── AppBar ─────────────────────────────────────────────────────────
      appBarTheme: const AppBarTheme(
        backgroundColor: deepForest,
        foregroundColor: mintText,
        elevation: 0,
        centerTitle: false,
      ),

      // ── Cards ──────────────────────────────────────────────────────────
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFFDDEDE8)),
        ),
        margin: EdgeInsets.zero,
      ),

      // ── Inputs ─────────────────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCCDDD8)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCCDDD8)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: vitalsGreen, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: sosBorder),
        ),
        labelStyle: const TextStyle(color: mintSub),
        hintStyle: const TextStyle(color: Color(0xFF8AADA5)),
      ),

      // ── Elevated Button ────────────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: vitalsGreen,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          elevation: 0,
        ),
      ),

      // ── Bottom Navigation ──────────────────────────────────────────────
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: vitalsGreen,
        unselectedItemColor: Color(0xFF8AADA5),
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
        unselectedLabelStyle: TextStyle(fontSize: 10),
      ),
    );
  }
}
