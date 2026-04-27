import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

/// Reusable FlutterMap widget used in BedFinder, BloodBank, and SOS screens.
class AshaMap extends StatelessWidget {
  final LatLng              center;
  final double              zoom;
  final List<Marker>        markers;
  final bool                interactive;

  const AshaMap({
    super.key,
    required this.center,
    this.zoom        = 13.0,
    this.markers     = const [],
    this.interactive = true,
  });

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      options: MapOptions(
        initialCenter: center,
        initialZoom:   zoom,
        interactionOptions: InteractionOptions(
          flags: interactive
              ? InteractiveFlag.all
              : InteractiveFlag.none,
        ),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.aashalink.app',
        ),
        MarkerLayer(markers: markers),
      ],
    );
  }
}

/// Helper — build a coloured pin marker.
Widget buildPin(Color color) => Icon(
      Icons.location_pin,
      color: color,
      size: 36,
    );
