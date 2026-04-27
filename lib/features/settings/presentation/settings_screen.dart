import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/auth_notifier.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _supervisorCtrl = TextEditingController();
  String _version       = '';
  int    _tapCount      = 0;

  final _languages = [
    ('en', 'English'), ('hi', 'हिंदी'), ('mr', 'मराठी'),
    ('te', 'తెలుగు'), ('ta', 'தமிழ்'), ('bn', 'বাংলা'),
    ('gu', 'ગુજરાતી'), ('kn', 'ಕನ್ನಡ'), ('or', 'ଓଡ଼ିଆ'), ('pa', 'ਪੰਜਾਬੀ'),
  ];

  @override
  void initState() {
    super.initState();
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final info  = await PackageInfo.fromPlatform();
    _supervisorCtrl.text = prefs.getString('supervisor_phone') ?? '';
    setState(() => _version = '${info.version} (${info.buildNumber})');
  }

  Future<void> _saveSupervisor() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('supervisor_phone', _supervisorCtrl.text.trim());
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Supervisor number saved.')),
      );
    }
  }

  void _handleVersionTap() {
    _tapCount++;
    if (_tapCount >= 7) {
      _tapCount = 0;
      ref.read(devModeProvider.notifier).activate();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🛠 Developer mode activated!'), backgroundColor: AppTheme.amberDev),
      );
    }
  }

  @override
  void dispose() { _supervisorCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final locale      = ref.watch(localeProvider);
    final devMode     = ref.watch(devModeProvider);
    final devEverOn   = ref.watch(devModeEverActivatedProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(padding: const EdgeInsets.all(16), children: [

        // Language
        _SectionHeader(label: 'Language'),
        Card(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: DropdownButtonFormField<String>(
            value: locale.languageCode,
            decoration: const InputDecoration(labelText: 'App Language', border: InputBorder.none, enabledBorder: InputBorder.none),
            items: _languages.map((l) => DropdownMenuItem(value: l.$1, child: Text(l.$2))).toList(),
            onChanged: (code) {
              if (code != null) ref.read(localeProvider.notifier).setLocale(Locale(code));
            },
          ))),
        const SizedBox(height: 16),

        // Supervisor number
        _SectionHeader(label: 'Supervisor Contact'),
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
          TextField(
            controller: _supervisorCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Supervisor Phone Number',
              hintText: '+91XXXXXXXXXX',
              prefixIcon: Icon(Icons.phone_rounded),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _saveSupervisor, child: const Text('Save Number')),
        ]))),
        const SizedBox(height: 16),

        // Developer mode (only if ever activated)
        devEverOn.when(
          data: (ever) => ever
              ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _SectionHeader(label: 'Developer'),
                  Card(child: SwitchListTile(
                    title: const Text('Developer Mode', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Shows debug info and test controls'),
                    value: devMode,
                    activeColor: AppTheme.amberDev,
                    onChanged: (_) => ref.read(devModeProvider.notifier).toggle(),
                  )),
                  const SizedBox(height: 16),
                ])
              : const SizedBox.shrink(),
          loading: () => const SizedBox.shrink(),
          error:   (_, __) => const SizedBox.shrink(),
        ),

        // Sign out
        _SectionHeader(label: 'Account'),
        Card(child: ListTile(
          leading: const Icon(Icons.logout_rounded, color: AppTheme.sosBorder),
          title: const Text('Sign Out', style: TextStyle(color: AppTheme.sosBorder, fontWeight: FontWeight.w700)),
          onTap: () async {
            await ref.read(authNotifierProvider.notifier).signOut();
            if (context.mounted) context.go('/');
          },
        )),
        const SizedBox(height: 16),

        // App version (7-tap easter egg)
        GestureDetector(
          onTap: _handleVersionTap,
          child: Center(child: Text(
            'AashaLink v$_version',
            style: const TextStyle(fontSize: 11, color: AppTheme.mintSub),
          )),
        ),
        const SizedBox(height: 8),
      ]),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  const _SectionHeader({required this.label});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8, left: 4),
    child: Text(label.toUpperCase(),
      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.4, color: AppTheme.mintSub)));
}
