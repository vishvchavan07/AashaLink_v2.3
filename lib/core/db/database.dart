import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'database.g.dart';

class Patients extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().withLength(min: 1, max: 50)();
  TextColumn get age => text()();
  TextColumn get disease => text()();
  TextColumn get loc => text()(); // Ward/Location
  DateTimeColumn get date => dateTime()();
  TextColumn get bloodGroup => text()();
  DateTimeColumn get dob => dateTime().nullable()();
  TextColumn get contact => text().nullable()();
  TextColumn get emergencyContact => text().nullable()();
  TextColumn get address => text().nullable()();

  // For offline sync
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
}

class DiaryEntries extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get patientId => integer().references(Patients, #id)();
  DateTimeColumn get date => dateTime()();
  TextColumn get duration => text()();
  TextColumn get transcript => text()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
}

@DriftDatabase(tables: [Patients, DiaryEntries])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'db.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
