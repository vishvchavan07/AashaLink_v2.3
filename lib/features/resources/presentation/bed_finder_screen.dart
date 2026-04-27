import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/data/seed_data.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/asha_map.dart';

class BedFinderScreen extends StatefulWidget {
  const BedFinderScreen({super.key});

  @override
  State<BedFinderScreen> createState() => _BedFinderScreenState();
}

class _BedFinderScreenState extends State<BedFinderScreen> {
  LatLng? _userPos;
  List<(PhcEntry, double)> _sorted = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _locate();
  }

  Future<void> _locate() async {
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.medium);
      final user = LatLng(pos.latitude, pos.longitude);
      final dist = const Distance();
      final sorted = kPhcData.map((p) {
        final km = dist.as(LengthUnit.Kilometer, user, p.position);
        return (p, km);
      }).toList()..sort((a, b) => a.$2.compareTo(b.$2));
      setState(() { _userPos = user; _sorted = sorted; _loading = false; });
    } catch (e) {
      // Use Pimpri default if location fails
      const def = LatLng(18.6279, 73.7997);
      final dist = const Distance();
      final sorted = kPhcData.map((p) {
        final km = dist.as(LengthUnit.Kilometer, def, p.position);
        return (p, km);
      }).toList()..sort((a, b) => a.$2.compareTo(b.$2));
      setState(() { _userPos = def; _sorted = sorted; _loading = false; _error = 'Using approximate location'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bed Finder')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(children: [
              if (_error != null)
                Container(color: AppTheme.sosBg, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Row(children: [const Icon(Icons.info_outline, size: 14, color: AppTheme.sosDeep), const SizedBox(width: 6),
                    Text(_error!, style: const TextStyle(fontSize: 12, color: AppTheme.sosDeep))])),
              SizedBox(height: 220,
                child: AshaMap(
                  center: _userPos!,
                  zoom: 12,
                  markers: [
                    if (_userPos != null) Marker(point: _userPos!, child: const Icon(Icons.my_location_rounded, color: AppTheme.vitalsGreen, size: 28)),
                    ..._sorted.map((e) => Marker(point: e.$1.position, child: const Icon(Icons.local_hospital_rounded, color: AppTheme.forestCard, size: 28))),
                  ],
                )),
              Expanded(child: ListView.separated(
                padding: const EdgeInsets.all(16), itemCount: _sorted.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final (phc, km) = _sorted[i];
                  return Card(child: ListTile(
                    leading: const CircleAvatar(backgroundColor: AppTheme.mintBg,
                      child: Icon(Icons.home_work_rounded, color: AppTheme.vitalsGreen, size: 20)),
                    title: Text(phc.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    subtitle: Text('${km.toStringAsFixed(1)} km · ${phc.beds} beds',
                      style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
                    trailing: IconButton(
                      icon: const Icon(Icons.call_rounded, color: AppTheme.vitalsGreen),
                      onPressed: () => launchUrl(Uri.parse('tel:${phc.phone}')),
                    ),
                  ));
                },
              )),
            ]),
    );
  }
}
