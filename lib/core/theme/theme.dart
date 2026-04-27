import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF006A6A), // Primary Teal
        primary: const Color(0xFF006A6A),
        secondary: const Color(0xFF4A6363),
        error: const Color(0xFFBA1A1A),
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(),
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Color(0xFF191C1C),
      ),
    );
  }
}
