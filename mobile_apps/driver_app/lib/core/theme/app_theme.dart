import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static const Color ink = Color(0xFF1A1F2E);
  static const Color inkMuted = Color(0xFF5C6578);
  static const Color accent = Color(0xFF0F766E);
  static const Color accentSoft = Color(0xFFF0FDFA);
  static const Color panel = Color(0xFFF8FAFC);
  static const Color line = Color(0xFFE2E8F0);
  static const Color danger = Color(0xFFB91C1C);
  static const Color ok = Color(0xFF15803D);

  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: accent,
        brightness: Brightness.light,
        primary: accent,
        surface: panel,
      ),
      scaffoldBackgroundColor: const Color(0xFFEEF2F7),
      fontFamily: 'Roboto',
    );

    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: ink,
        centerTitle: false,
      ),
      textTheme: base.textTheme.apply(
        bodyColor: ink,
        displayColor: ink,
      ),
    );
  }
}
