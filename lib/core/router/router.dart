import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/patient_records/presentation/patient_list_screen.dart';

part 'router.g.dart';

@riverpod
GoRouter router(RouterRef ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/records',
        builder: (context, state) => const PatientListScreen(),
      ),
      GoRoute(
        path: '/diary',
        builder: (context, state) => const Scaffold(body: Center(child: Text('Voice Diary - Coming Soon'))),
      ),
      GoRoute(
        path: '/assistant',
        builder: (context, state) => const Scaffold(body: Center(child: Text('Symptom Screening - Coming Soon'))),
      ),
    ],
  );
}
