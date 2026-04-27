import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/asha_map.dart';

class SosScreen extends ConsumerStatefulWidget {
  const SosScreen({super.key});

  @override
  ConsumerState<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends ConsumerState<SosScreen> with TickerProviderStateMixin {
  LatLng? _pos;
  bool _locating = true;
  bool _sent     = false;
  bool _counting = false;
  int  _countdown = 5;
  Timer? _timer;
  String? _sentAt;

  late final AnimationController _ring1;
  late final AnimationController _ring2;

  @override
  void initState() {
    super.initState();
    _ring1 = AnimationController(vsync: this, duration: const Duration(milliseconds: 2600))..repeat();
    _ring2 = AnimationController(vsync: this, duration: const Duration(milliseconds: 2600));
    Future.delayed(const Duration(milliseconds: 900), () { if (mounted) _ring2.repeat(); });
    _locateUser();
  }

  @override
  void dispose() { _ring1.dispose(); _ring2.dispose(); _timer?.cancel(); super.dispose(); }

  Future<void> _locateUser() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      setState(() { _pos = LatLng(pos.latitude, pos.longitude); _locating = false; });
    } catch (_) {
      setState(() { _pos = const LatLng(18.6279, 73.7997); _locating = false; });
    }
  }

  void _startCountdown() {
    setState(() { _counting = true; _countdown = 5; });
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown <= 1) { t.cancel(); _sendSos(); }
      else { setState(() => _countdown--); }
    });
  }

  void _cancel() {
    _timer?.cancel();
    setState(() { _counting = false; _countdown = 5; });
  }

  Future<void> _sendSos() async {
    setState(() => _counting = false);
    if (_pos == null) return;
    final prefs     = await SharedPreferences.getInstance();
    final supervisor = prefs.getString('supervisor_phone') ?? '';
    final user      = FirebaseAuth.instance.currentUser;
    final name      = user?.displayName ?? user?.phoneNumber ?? 'ASHA Worker';
    final lat       = _pos!.latitude;
    final lng       = _pos!.longitude;
    final mapsUrl   = 'https://maps.google.com/?q=$lat,$lng';
    final smsBody   = 'EMERGENCY — $name needs help. Location: $mapsUrl — AshaLink';

    if (supervisor.isNotEmpty) {
      final uri = Uri(scheme: 'sms', path: supervisor, queryParameters: {'body': smsBody});
      await launchUrl(uri);
    }

    try {
      await FirebaseFirestore.instance.collection('sos_alerts').add({
        'workerUid': user?.uid ?? '', 'workerName': name,
        'lat': lat, 'lng': lng, 'mapsUrl': mapsUrl,
        'timestamp': FieldValue.serverTimestamp(),
      });
    } catch (_) {}

    setState(() { _sent = true; _sentAt = DateTime.now().toString().substring(0, 19); });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Emergency SOS')),
      body: Column(children: [
        SizedBox(height: 200, child: _pos == null
            ? const Center(child: CircularProgressIndicator())
            : AshaMap(center: _pos!, zoom: 15, interactive: false,
                markers: [Marker(point: _pos!, child: const Icon(Icons.my_location_rounded, color: AppTheme.sosBorder, size: 32))])),
        Expanded(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(children: [
          if (_sent) ...[
            Container(padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppTheme.mintBg, borderRadius: BorderRadius.circular(16)),
              child: Column(children: [
                const Icon(Icons.check_circle_rounded, color: AppTheme.vitalsGreen, size: 48),
                const SizedBox(height: 12),
                const Text('SOS Sent', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text('Sent at $_sentAt', style: const TextStyle(fontSize: 12, color: AppTheme.mintSub)),
                const SizedBox(height: 8),
                const Text('Your supervisor has been alerted with your GPS location.',
                  textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: AppTheme.deepForest)),
              ])),
          ] else if (_counting) ...[
            const Text('Sending SOS in…', style: TextStyle(fontSize: 16, color: AppTheme.mintSub)),
            const SizedBox(height: 16),
            Text('$_countdown', style: const TextStyle(fontSize: 72, fontWeight: FontWeight.w900, color: AppTheme.sosBorder)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _cancel,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppTheme.sosBorder,
                side: const BorderSide(color: AppTheme.sosBorder)),
              child: const Text('Cancel')),
          ] else ...[
            SizedBox(width: 180, height: 180, child: Stack(alignment: Alignment.center, children: [
              AnimatedBuilder(animation: _ring1, builder: (_, __) => Transform.scale(
                scale: 1.0 + _ring1.value * 1.4,
                child: Opacity(opacity: (1 - _ring1.value) * 0.55,
                  child: Container(width: 100, height: 100,
                    decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: AppTheme.sosBorder, width: 2)))))),
              AnimatedBuilder(animation: _ring2, builder: (_, __) => Transform.scale(
                scale: 1.0 + _ring2.value * 1.4,
                child: Opacity(opacity: (1 - _ring2.value) * 0.55,
                  child: Container(width: 100, height: 100,
                    decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: AppTheme.sosBorder, width: 2)))))),
              GestureDetector(
                onTap: _locating ? null : _startCountdown,
                child: Container(width: 100, height: 100,
                  decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.sosBorder),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: const [
                    Text('SOS', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: 2)),
                    Text('tap to alert', style: TextStyle(color: Colors.white70, fontSize: 9)),
                  ]))),
            ])),
            const SizedBox(height: 20),
            const Text('In an emergency, one tap sends your GPS location and an SMS to your supervisor.',
              textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppTheme.mintSub, height: 1.6)),
          ],
        ]))),
      ]),
    );
  }
}
