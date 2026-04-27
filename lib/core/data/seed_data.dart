import 'package:latlong2/latlong.dart';

class PhcEntry {
  final String  name;
  final String  phone;
  final int     beds;
  final LatLng  position;

  const PhcEntry({
    required this.name,
    required this.phone,
    required this.beds,
    required this.position,
  });
}

/// 10 Pimpri-Chinchwad area PHCs seeded with real approximate coordinates.
const List<PhcEntry> kPhcData = [
  PhcEntry(name: 'PHC Pimpri',           phone: '02027420001', beds: 12, position: LatLng(18.6279, 73.7997)),
  PhcEntry(name: 'PHC Chinchwad',        phone: '02027351002', beds: 8,  position: LatLng(18.6099, 73.8000)),
  PhcEntry(name: 'PHC Nigdi',            phone: '02027643003', beds: 15, position: LatLng(18.6500, 73.7700)),
  PhcEntry(name: 'PHC Akurdi',           phone: '02027482004', beds: 10, position: LatLng(18.6447, 73.7630)),
  PhcEntry(name: 'PHC Dehu Road',        phone: '02114230005', beds: 20, position: LatLng(18.6990, 73.7460)),
  PhcEntry(name: 'PHC Bhosari',          phone: '02027120006', beds: 6,  position: LatLng(18.6334, 73.8433)),
  PhcEntry(name: 'PHC Talawade',         phone: '02027590007', beds: 9,  position: LatLng(18.6670, 73.7880)),
  PhcEntry(name: 'PHC Wakad',            phone: '02027400008', beds: 11, position: LatLng(18.5975, 73.7620)),
  PhcEntry(name: 'PHC Ravet',            phone: '02027620009', beds: 14, position: LatLng(18.6480, 73.7480)),
  PhcEntry(name: 'PHC Moshi',            phone: '02027570010', beds: 7,  position: LatLng(18.6779, 73.8514)),
];

class BloodBankEntry {
  final String       name;
  final String       phone;
  final LatLng       position;
  final Map<String, int> stock; // blood group → units available

  const BloodBankEntry({
    required this.name,
    required this.phone,
    required this.position,
    required this.stock,
  });
}

/// 8 blood banks seeded in Pimpri-Chinchwad / Pune area.
const List<BloodBankEntry> kBloodBankData = [
  BloodBankEntry(
    name:     'PCMC Blood Bank',
    phone:    '02027420100',
    position: LatLng(18.6270, 73.7990),
    stock:    {'A+': 12, 'A-': 4, 'B+': 18, 'B-': 2, 'O+': 25, 'O-': 3, 'AB+': 6, 'AB-': 1},
  ),
  BloodBankEntry(
    name:     'Lokmanya Hospital Blood Bank',
    phone:    '02027654200',
    position: LatLng(18.6099, 73.8020),
    stock:    {'A+': 8,  'A-': 2, 'B+': 10, 'B-': 1, 'O+': 15, 'O-': 2, 'AB+': 4, 'AB-': 0},
  ),
  BloodBankEntry(
    name:     'Aditya Birla Blood Bank',
    phone:    '02027474300',
    position: LatLng(18.6447, 73.7620),
    stock:    {'A+': 20, 'A-': 5, 'B+': 14, 'B-': 3, 'O+': 30, 'O-': 5, 'AB+': 8, 'AB-': 2},
  ),
  BloodBankEntry(
    name:     'Yashwantrao Chavan Blood Bank',
    phone:    '02114236400',
    position: LatLng(18.6990, 73.7470),
    stock:    {'A+': 6,  'A-': 1, 'B+': 9,  'B-': 0, 'O+': 12, 'O-': 1, 'AB+': 3, 'AB-': 0},
  ),
  BloodBankEntry(
    name:     'Red Cross Blood Bank Pune',
    phone:    '02026125500',
    position: LatLng(18.5204, 73.8567),
    stock:    {'A+': 30, 'A-': 8, 'B+': 22, 'B-': 4, 'O+': 40, 'O-': 7, 'AB+': 10, 'AB-': 3},
  ),
  BloodBankEntry(
    name:     'Sahyadri Blood Bank',
    phone:    '02027210600',
    position: LatLng(18.5984, 73.8100),
    stock:    {'A+': 14, 'A-': 3, 'B+': 16, 'B-': 2, 'O+': 20, 'O-': 4, 'AB+': 5, 'AB-': 1},
  ),
  BloodBankEntry(
    name:     'Deenanath Mangeshkar Blood Bank',
    phone:    '02040151700',
    position: LatLng(18.5289, 73.8490),
    stock:    {'A+': 18, 'A-': 6, 'B+': 20, 'B-': 3, 'O+': 35, 'O-': 6, 'AB+': 9, 'AB-': 2},
  ),
  BloodBankEntry(
    name:     'Bharati Vidyapeeth Blood Bank',
    phone:    '02024372800',
    position: LatLng(18.4607, 73.8601),
    stock:    {'A+': 10, 'A-': 2, 'B+': 12, 'B-': 1, 'O+': 18, 'O-': 3, 'AB+': 4, 'AB-': 0},
  ),
];
