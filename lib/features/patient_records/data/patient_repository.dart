import 'package:drift/drift.dart';
import '../../../core/db/database.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'patient_repository.g.dart';

class PatientRepository {
  final AppDatabase _db;

  PatientRepository(this._db);

  Stream<List<Patient>> watchPatients() {
    return _db.select(_db.patients).watch();
  }

  Future<int> addPatient(PatientsCompanion patient) {
    return _db.into(_db.patients).insert(patient);
  }

  Future<bool> updatePatient(PatientsCompanion patient) {
    return _db.update(_db.patients).replace(patient);
  }

  Future<int> deletePatient(int id) {
    return (_db.delete(_db.patients)..where((t) => t.id.equals(id))).go();
  }
}

@riverpod
AppDatabase database(DatabaseRef ref) {
  return AppDatabase();
}

@riverpod
PatientRepository patientRepository(PatientRepositoryRef ref) {
  return PatientRepository(ref.watch(databaseProvider));
}

@riverpod
Stream<List<Patient>> patientsStream(PatientsStreamRef ref) {
  return ref.watch(patientRepositoryProvider).watchPatients();
}
