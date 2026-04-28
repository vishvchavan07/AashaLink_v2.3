import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../db/app_database.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Locale provider
// ─────────────────────────────────────────────────────────────────────────────

import 'dart:ui';

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(const Locale('hi')) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final code  = prefs.getString('locale') ?? 'hi';
    state = Locale(code);
  }

  Future<void> setLocale(Locale locale) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('locale', locale.languageCode);
    state = locale;
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>(
  (_) => LocaleNotifier(),
);

// ─────────────────────────────────────────────────────────────────────────────
// Connectivity provider
// ─────────────────────────────────────────────────────────────────────────────

final connectivityProvider = StreamProvider<ConnectivityResult>((ref) {
  return Connectivity().onConnectivityChanged;
});

// ─────────────────────────────────────────────────────────────────────────────
// Worker provider
// ─────────────────────────────────────────────────────────────────────────────

final workerProvider = FutureProvider<Worker?>((ref) async {
  final uid = FirebaseAuth.instance.currentUser?.uid;
  if (uid == null) return null;
  return ref.watch(dbProvider).getWorkerByUid(uid);
});

// ─────────────────────────────────────────────────────────────────────────────
// Today stats provider
// ─────────────────────────────────────────────────────────────────────────────

class TodayStats {
  final int screened;
  final int referred;
  final int voiceLogs;

  const TodayStats({
    required this.screened,
    required this.referred,
    required this.voiceLogs,
  });
}

final todayStatsProvider = FutureProvider<TodayStats>((ref) async {
  final db  = ref.watch(dbProvider);
  final uid = FirebaseAuth.instance.currentUser?.uid ?? '';
  final screened   = await db.getTodaySessionCount(uid);
  final referred   = await db.getTodayReferredCount(uid);
  final voiceLogs  = await db.getTodayDiaryCount(uid);
  return TodayStats(screened: screened, referred: referred, voiceLogs: voiceLogs);
});

// ─────────────────────────────────────────────────────────────────────────────
// Developer mode provider
// ─────────────────────────────────────────────────────────────────────────────

class DevModeNotifier extends StateNotifier<bool> {
  DevModeNotifier() : super(false) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getBool('dev_mode') ?? false;
  }

  Future<void> toggle() async {
    final prefs = await SharedPreferences.getInstance();
    state = !state;
    await prefs.setBool('dev_mode', state);
  }

  Future<void> activate() async {
    final prefs = await SharedPreferences.getInstance();
    // Mark that dev mode was ever activated (shows the toggle in settings)
    await prefs.setBool('dev_mode_ever_activated', true);
    state = true;
    await prefs.setBool('dev_mode', true);
  }
}

final devModeProvider = StateNotifierProvider<DevModeNotifier, bool>(
  (_) => DevModeNotifier(),
);

final devModeEverActivatedProvider = FutureProvider<bool>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('dev_mode_ever_activated') ?? false;
});
