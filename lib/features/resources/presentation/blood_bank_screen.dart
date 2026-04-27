import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/data/seed_data.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/asha_map.dart';

class BloodBankScreen extends StatefulWidget {
  const BloodBankScreen({super.key});

  @override
  State<BloodBankScreen> createState() => _BloodBankScreenState();
}

class _BloodBankScreenState extends State<BloodBankScreen> {
  String? _selectedGroup;
  LatLng  _userPos = const LatLng(18.6279, 73.7997);

  final _groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  @override
  void initState() { super.initState(); _locate(); }

  Future<void> _locate() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      final pos = await Geolocator.getCurrentPosition();
      setState(() => _userPos = LatLng(pos.latitude, pos.longitude));
    } catch (_) {}
  }

  List<BloodBankEntry> get _filtered {
    final dist = const Distance();
    var list = kBloodBankData.toList();
    if (_selectedGroup != null) {
      list = list.where((b) => (b.stock[_selectedGroup!] ?? 0) > 0).toList();
    }
    list.sort((a, b) => dist.as(LengthUnit.Kilometer, _userPos, a.position)
        .compareTo(dist.as(LengthUnit.Kilometer, _userPos, b.position)));
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    return Scaffold(
      appBar: AppBar(title: const Text('Blood Bank')),
      body: Column(children: [
        // Blood group selector
        Container(color: AppTheme.deepForest, padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: SingleChildScrollView(scrollDirection: Axis.horizontal,
            child: Row(children: _groups.map((g) {
              final on = _selectedGroup == g;
              return Padding(padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(onTap: () => setState(() => _selectedGroup = on ? null : g),
                  child: AnimatedContainer(duration: const Duration(milliseconds: 160),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: on ? AppTheme.sosBorder : AppTheme.forestCard,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: on ? AppTheme.sosBorder : AppTheme.forestBorder),
                    ),
                    child: Text(g, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                      color: on ? Colors.white : AppTheme.mintText)))));
            }).toList()))),
        // Map
        SizedBox(height: 200,
          child: AshaMap(center: _userPos, zoom: 11,
            markers: [
              Marker(point: _userPos, child: const Icon(Icons.my_location_rounded, color: AppTheme.vitalsGreen, size: 28)),
              ...filtered.map((b) => Marker(point: b.position,
                child: const Icon(Icons.water_drop_rounded, color: AppTheme.sosBorder, size: 28))),
            ])),
        // List
        Expanded(child: filtered.isEmpty
            ? const Center(child: Padding(padding: EdgeInsets.all(24),
                child: Text('No blood banks found with selected group.\nTry another group.',
                  textAlign: TextAlign.center, style: TextStyle(color: AppTheme.mintSub))))
            : ListView.separated(
                padding: const EdgeInsets.all(16), itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final b = filtered[i];
                  final dist = const Distance();
                  final km = dist.as(LengthUnit.Kilometer, _userPos, b.position);
                  final units = _selectedGroup != null ? b.stock[_selectedGroup!] ?? 0 : null;
                  return Card(child: ListTile(
                    leading: Container(width: 40, height: 40,
                      decoration: BoxDecoration(color: AppTheme.bloodBg, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.water_drop_rounded, color: AppTheme.sosDeep, size: 20)),
                    title: Text(b.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    subtitle: Text('${km.toStringAsFixed(1)} km${units != null ? " · $units units available" : ""}',
                      style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
                    trailing: IconButton(
                      icon: const Icon(Icons.call_rounded, color: AppTheme.vitalsGreen),
                      onPressed: () => launchUrl(Uri.parse('tel:${b.phone}')),
                    ),
                  ));
                })),
      ]),
    );
  }
}
