import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../db/app_database.dart';

/// Syncs any pending local Drift records to Firestore.
/// Called whenever connectivity is restored.
class SyncService {
  final AppDatabase        _db;
  final FirebaseFirestore  _firestore;

  SyncService(this._db, this._firestore);

  Future<void> syncPending() async {
    final queue = await _db.getPendingSync();
    for (final item in queue) {
      try {
        final payload = jsonDecode(item.payload) as Map<String, dynamic>;
        await _firestore
            .collection(item.tableName)
            .doc(payload['id']?.toString() ?? item.id.toString())
            .set(payload, SetOptions(merge: true));
        await _db.markSynced(item.id);
      } catch (_) {
        // Leave in queue — will retry on next connectivity event
      }
    }
  }
}

final syncServiceProvider = Provider<SyncService>((ref) {
  return SyncService(
    ref.watch(dbProvider),
    FirebaseFirestore.instance,
  );
});
