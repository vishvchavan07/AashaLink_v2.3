import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../core/db/app_database.dart';
import '../../../core/theme/app_theme.dart';

class AddPatientScreen extends ConsumerStatefulWidget {
  const AddPatientScreen({super.key});

  @override
  ConsumerState<AddPatientScreen> createState() => _AddPatientScreenState();
}

class _AddPatientScreenState extends ConsumerState<AddPatientScreen> {
  final _form    = GlobalKey<FormState>();
  final _name    = TextEditingController();
  final _age     = TextEditingController();
  final _phone   = TextEditingController();
  final _address = TextEditingController();
  String _gender = 'female';
  bool   _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _age.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);

    final uid = FirebaseAuth.instance.currentUser?.uid ?? '';
    final db  = ref.read(dbProvider);

    final id = await db.insertPatient(PatientsCompanion.insert(
      name:      _name.text.trim(),
      age:       int.parse(_age.text.trim()),
      gender:    _gender,
      phone:     Value(_phone.text.trim().isEmpty ? null : _phone.text.trim()),
      address:   _address.text.trim(),
      workerUid: uid,
    ));

    // Queue for Firestore sync
    await db.addToSyncQueue(SyncQueueCompanion.insert(
      tableName: 'patients',
      operation: 'insert',
      payload: jsonEncode({
        'id':        id,
        'name':      _name.text.trim(),
        'age':       int.parse(_age.text.trim()),
        'gender':    _gender,
        'phone':     _phone.text.trim(),
        'address':   _address.text.trim(),
        'workerUid': uid,
      }),
    ));

    if (mounted) {
      setState(() => _saving = false);
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Patient')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Name
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Full Name *',
                prefixIcon: Icon(Icons.person_rounded),
              ),
              validator: (v) => (v?.trim().isEmpty ?? true) ? 'Name is required' : null,
            ),
            const SizedBox(height: 16),

            // Age
            TextFormField(
              controller: _age,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Age *',
                prefixIcon: Icon(Icons.cake_rounded),
              ),
              validator: (v) {
                if (v?.trim().isEmpty ?? true) return 'Age is required';
                final n = int.tryParse(v!.trim());
                if (n == null || n < 0 || n > 120) return 'Enter a valid age';
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Gender
            const Text('Gender *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Row(
              children: ['female', 'male', 'other'].map((g) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(g[0].toUpperCase() + g.substring(1)),
                      selected: _gender == g,
                      selectedColor: AppTheme.mintBg,
                      onSelected: (_) => setState(() => _gender = g),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // Phone
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone (optional)',
                prefixIcon: Icon(Icons.phone_rounded),
              ),
            ),
            const SizedBox(height: 16),

            // Address
            TextFormField(
              controller: _address,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Village / Address *',
                prefixIcon: Icon(Icons.location_on_rounded),
              ),
              validator: (v) => (v?.trim().isEmpty ?? true) ? 'Address is required' : null,
            ),
            const SizedBox(height: 32),

            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 22, height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Save Patient'),
            ),
          ],
        ),
      ),
    );
  }
}
