import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../../features/auth/auth_notifier.dart';
import '../../features/auth/auth_screens.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/symptom_screening/presentation/symptom_screening_screen.dart';
import '../../features/patient_records/presentation/patient_list_screen.dart';
import '../../features/patient_records/presentation/add_patient_screen.dart';
import '../../features/patient_records/presentation/patient_detail_screen.dart';
import '../../features/voice_diary/presentation/voice_diary_screen.dart';
import '../../features/resources/presentation/resources_screen.dart';
import '../../features/resources/presentation/bed_finder_screen.dart';
import '../../features/resources/presentation/blood_bank_screen.dart';
import '../../features/sos/presentation/sos_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuthenticated = authState.valueOrNull != null;
      final isOnAuth = state.matchedLocation == '/' ||
          state.matchedLocation == '/otp';

      if (!isAuthenticated && !isOnAuth) return '/';
      if (isAuthenticated && isOnAuth)  return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        name: 'auth',
        builder: (_, __) => const AuthGate(),
      ),
      GoRoute(
        path: '/otp',
        name: 'otp',
        builder: (_, __) => const OtpScreen(),
      ),
      GoRoute(
        path: '/home',
        name: 'home',
        builder: (_, __) => const HomeScreen(),
      ),
      GoRoute(
        path: '/symptom',
        name: 'symptom',
        builder: (context, state) {
          final patientId = state.uri.queryParameters['patientId'];
          return SymptomScreeningScreen(
            initialPatientId: patientId != null ? int.tryParse(patientId) : null,
          );
        },
      ),
      GoRoute(
        path: '/patients',
        name: 'patients',
        builder: (_, __) => const PatientListScreen(),
      ),
      GoRoute(
        path: '/patients/add',
        name: 'addPatient',
        builder: (_, __) => const AddPatientScreen(),
      ),
      GoRoute(
        path: '/patients/:id',
        name: 'patientDetail',
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          return PatientDetailScreen(patientId: id);
        },
      ),
      GoRoute(
        path: '/diary',
        name: 'diary',
        builder: (_, __) => const VoiceDiaryScreen(),
      ),
      GoRoute(
        path: '/resources',
        name: 'resources',
        builder: (_, __) => const ResourcesScreen(),
      ),
      GoRoute(
        path: '/resources/beds',
        name: 'beds',
        builder: (_, __) => const BedFinderScreen(),
      ),
      GoRoute(
        path: '/resources/blood',
        name: 'blood',
        builder: (_, __) => const BloodBankScreen(),
      ),
      GoRoute(
        path: '/sos',
        name: 'sos',
        builder: (_, __) => const SosScreen(),
      ),
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (_, __) => const SettingsScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.error}')),
    ),
  );
});
