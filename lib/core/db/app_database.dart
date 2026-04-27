import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:flutter_riverpod/flutter_riverpod.dart';

part 'app_database.g.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Table definitions
// ─────────────────────────────────────────────────────────────────────────────

class Workers extends Table {
  IntColumn    get id          => integer().autoIncrement()();
  TextColumn   get name        => text()();
  TextColumn   get phone       => text().unique()();
  TextColumn   get block       => text()();
  TextColumn   get firebaseUid => text().unique()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

class Patients extends Table {
  IntColumn    get id        => integer().autoIncrement()();
  TextColumn   get name      => text().withLength(min: 1, max: 100)();
  IntColumn    get age       => integer()();
  TextColumn   get gender    => text()(); // male/female/other
  TextColumn   get phone     => text().nullable()();
  TextColumn   get address   => text()();
  TextColumn   get workerUid => text()();
  BoolColumn   get isSynced  => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

class Visits extends Table {
  IntColumn    get id           => integer().autoIncrement()();
  IntColumn    get patientId    => integer().references(Patients, #id)();
  TextColumn   get notes        => text()();
  TextColumn   get symptoms     => text()(); // JSON array
  TextColumn   get triageLevel  => text()(); // green/yellow/red
  BoolColumn   get isSynced     => boolean().withDefault(const Constant(false))();
  DateTimeColumn get visitDate  => dateTime().withDefault(currentDateAndTime)();
}

class SymptomSessions extends Table {
  IntColumn    get id            => integer().autoIncrement()();
  IntColumn    get patientId     => integer().references(Patients, #id)();
  TextColumn   get workerUid     => text()();
  TextColumn   get symptoms      => text()();  // JSON array
  TextColumn   get severity      => text()();  // mild/moderate/severe
  IntColumn    get durationDays  => integer()();
  TextColumn   get aiAnalysis    => text().nullable()();
  TextColumn   get triageLevel   => text()();  // green/yellow/red
  TextColumn   get referralNote  => text().nullable()();
  BoolColumn   get isSynced      => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt   => dateTime().withDefault(currentDateAndTime)();
}

class DiaryEntries extends Table {
  IntColumn    get id          => integer().autoIncrement()();
  TextColumn   get workerUid   => text()();
  TextColumn   get audioPath   => text()();
  TextColumn   get transcript  => text()();
  TextColumn   get aiSummary   => text().nullable()();
  BoolColumn   get isSynced    => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

class SyncQueue extends Table {
  IntColumn    get id          => integer().autoIncrement()();
  TextColumn   get tableName   => text()();
  TextColumn   get operation   => text()(); // insert/update/delete
  TextColumn   get payload     => text()(); // JSON
  BoolColumn   get synced      => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

// ─────────────────────────────────────────────────────────────────────────────
// Database class
// ─────────────────────────────────────────────────────────────────────────────

@DriftDatabase(tables: [Workers, Patients, Visits, SymptomSessions, DiaryEntries, SyncQueue])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // ── Worker queries ────────────────────────────────────────────────────────
  Future<Worker?> getWorkerByUid(String uid) =>
      (select(workers)..where((w) => w.firebaseUid.equals(uid))).getSingleOrNull();

  Future<int> upsertWorker(WorkersCompanion worker) =>
      into(workers).insertOnConflictUpdate(worker);

  // ── Patient queries ───────────────────────────────────────────────────────
  Stream<List<Patient>> watchAllPatients(String workerUid) =>
      (select(patients)
            ..where((p) => p.workerUid.equals(workerUid))
            ..orderBy([(p) => OrderingTerm.desc(p.createdAt)]))
          .watch();

  Future<List<Patient>> searchPatients(String workerUid, String query) =>
      (select(patients)
            ..where((p) =>
                p.workerUid.equals(workerUid) &
                (p.name.like('%$query%') | p.address.like('%$query%'))))
          .get();

  Future<Patient?> getPatientById(int id) =>
      (select(patients)..where((p) => p.id.equals(id))).getSingleOrNull();

  Future<int> insertPatient(PatientsCompanion patient) =>
      into(patients).insert(patient);

  Future<bool> updatePatient(PatientsCompanion patient) =>
      update(patients).replace(patient);

  Future<int> deletePatient(int id) =>
      (delete(patients)..where((p) => p.id.equals(id))).go();

  // ── Visit queries ─────────────────────────────────────────────────────────
  Stream<List<Visit>> watchVisitsForPatient(int patientId) =>
      (select(visits)
            ..where((v) => v.patientId.equals(patientId))
            ..orderBy([(v) => OrderingTerm.desc(v.visitDate)]))
          .watch();

  Future<int> insertVisit(VisitsCompanion visit) =>
      into(visits).insert(visit);

  Future<List<Visit>> getRecentVisits(int limit) =>
      (select(visits)
            ..orderBy([(v) => OrderingTerm.desc(v.visitDate)])
            ..limit(limit))
          .get();

  // ── SymptomSession queries ────────────────────────────────────────────────
  Future<int> insertSymptomSession(SymptomSessionsCompanion session) =>
      into(symptomSessions).insert(session);

  Stream<List<SymptomSession>> watchSessionsForPatient(int patientId) =>
      (select(symptomSessions)
            ..where((s) => s.patientId.equals(patientId))
            ..orderBy([(s) => OrderingTerm.desc(s.createdAt)]))
          .watch();

  Future<int> getTodaySessionCount(String workerUid) async {
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day);
    final end   = start.add(const Duration(days: 1));
    final rows  = await (select(symptomSessions)
          ..where((s) =>
              s.workerUid.equals(workerUid) &
              s.createdAt.isBiggerOrEqualValue(start) &
              s.createdAt.isSmallerThanValue(end)))
        .get();
    return rows.length;
  }

  Future<int> getTodayReferredCount(String workerUid) async {
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day);
    final end   = start.add(const Duration(days: 1));
    final rows  = await (select(symptomSessions)
          ..where((s) =>
              s.workerUid.equals(workerUid) &
              s.createdAt.isBiggerOrEqualValue(start) &
              s.createdAt.isSmallerThanValue(end) &
              s.triageLevel.equals('red')))
        .get();
    return rows.length;
  }

  // ── DiaryEntry queries ────────────────────────────────────────────────────
  Stream<List<DiaryEntry>> watchAllDiaryEntries(String workerUid) =>
      (select(diaryEntries)
            ..where((d) => d.workerUid.equals(workerUid))
            ..orderBy([(d) => OrderingTerm.desc(d.createdAt)]))
          .watch();

  Future<int> insertDiaryEntry(DiaryEntriesCompanion entry) =>
      into(diaryEntries).insert(entry);

  Future<void> updateDiarySummary(int id, String summary) =>
      (update(diaryEntries)..where((d) => d.id.equals(id)))
          .write(DiaryEntriesCompanion(aiSummary: Value(summary)));

  Future<int> getTodayDiaryCount(String workerUid) async {
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day);
    final end   = start.add(const Duration(days: 1));
    final rows  = await (select(diaryEntries)
          ..where((d) =>
              d.workerUid.equals(workerUid) &
              d.createdAt.isBiggerOrEqualValue(start) &
              d.createdAt.isSmallerThanValue(end)))
        .get();
    return rows.length;
  }

  // ── SyncQueue queries ─────────────────────────────────────────────────────
  Future<List<SyncQueueData>> getPendingSync() =>
      (select(syncQueue)..where((q) => q.synced.equals(false))).get();

  Future<void> markSynced(int id) =>
      (update(syncQueue)..where((q) => q.id.equals(id)))
          .write(const SyncQueueCompanion(synced: Value(true)));

  Future<int> addToSyncQueue(SyncQueueCompanion entry) =>
      into(syncQueue).insert(entry);
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection
// ─────────────────────────────────────────────────────────────────────────────

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir  = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'aashalink.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Riverpod provider (singleton)
// ─────────────────────────────────────────────────────────────────────────────

final dbProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});
