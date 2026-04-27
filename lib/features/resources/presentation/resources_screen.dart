import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class ResourcesScreen extends StatelessWidget {
  const ResourcesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Resources')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          _ResourceCard(
            icon: Icons.home_work_rounded, title: 'Bed Finder',
            subtitle: 'Find available beds at nearby PHCs',
            color: AppTheme.vitalsGreen,
            onTap: () => context.push('/resources/beds'),
          ),
          const SizedBox(height: 16),
          _ResourceCard(
            icon: Icons.water_drop_rounded, title: 'Blood Bank',
            subtitle: 'Find blood banks by blood group',
            color: AppTheme.sosDeep,
            onTap: () => context.push('/resources/blood'),
          ),
        ]),
      ),
    );
  }
}

class _ResourceCard extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  final Color color;
  final VoidCallback onTap;
  const _ResourceCard({required this.icon, required this.title, required this.subtitle, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(14),
        child: Padding(padding: const EdgeInsets.all(20), child: Row(children: [
          Container(width: 48, height: 48,
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 26)),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
          ])),
          const Icon(Icons.chevron_right_rounded, color: AppTheme.mintSub),
        ]))),
    );
  }
}
