import 'package:freezed_annotation/freezed_annotation.dart';

part 'symptom_model.freezed.dart';
part 'symptom_model.g.dart';

@freezed
class SymptomSession with _$SymptomSession {
  const factory SymptomSession({
    required int id,
    required int patientId,
    required List<String> symptoms,
    required String duration,
    required String riskLevel, // Low, Medium, High
    required String recommendations,
    required DateTime timestamp,
  }) = _SymptomSession;

  factory SymptomSession.fromJson(Map<String, dynamic> json) => _$SymptomSessionFromJson(json);
}
