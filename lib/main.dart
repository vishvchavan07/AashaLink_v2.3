import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'core/providers/providers.dart';
import 'core/sync/sync_service.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const ProviderScope(child: AashaLinkApp()));
}

class AashaLinkApp extends ConsumerWidget {
  const AashaLinkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final router = ref.watch(routerProvider);

    // Trigger sync whenever connectivity is restored
    ref.listen(connectivityProvider, (prev, next) {
      next.whenData((result) {
        if (result != ConnectivityResult.none) {
          ref.read(syncServiceProvider).syncPending();
          ref.invalidate(todayStatsProvider);
        }
      });
    });

    return MaterialApp.router(
      title:                    'AashaLink',
      debugShowCheckedModeBanner: false,
      theme:                    AppTheme.darkTheme,
      locale:                   locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      routerConfig: router,
    );
  }
}
