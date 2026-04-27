import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Triage Result model
// ─────────────────────────────────────────────────────────────────────────────

enum TriageLevel { green, yellow, red }

class TriageResult {
  final TriageLevel level;
  final String      reasoning;
  final String      homeAdvice;
  final String      referralNote;
  final bool        isAiGenerated;

  const TriageResult({
    required this.level,
    required this.reasoning,
    required this.homeAdvice,
    required this.referralNote,
    this.isAiGenerated = false,
  });

  String get levelLabel {
    switch (level) {
      case TriageLevel.green:  return 'GREEN — Home Care';
      case TriageLevel.yellow: return 'YELLOW — Monitor Closely';
      case TriageLevel.red:    return 'RED — Refer Immediately';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom exception
// ─────────────────────────────────────────────────────────────────────────────

class GeminiUnavailableException implements Exception {
  final String message;
  const GeminiUnavailableException(this.message);
  @override
  String toString() => 'GeminiUnavailableException: $message';
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini AI Service
// ─────────────────────────────────────────────────────────────────────────────

class GeminiService {
  static const _apiKey = String.fromEnvironment('GEMINI_API_KEY');

  final _model = GenerativeModel(
    model: 'gemini-2.0-flash',
    apiKey: _apiKey,
    generationConfig: GenerationConfig(
      responseMimeType: 'application/json',
      temperature: 0.2,
    ),
  );

  Future<TriageResult> analyseSymptoms({
    required List<String> symptoms,
    required String       severity,
    required int          durationDays,
    required String       languageCode,
  }) async {
    final prompt = '''
You are an expert rural health advisor assisting an ASHA worker in India.
Respond ONLY in valid JSON. Do not include markdown code fences.
Language for advice fields: $languageCode

Patient symptoms: ${symptoms.join(', ')}
Severity: $severity
Duration: $durationDays days

Respond with this exact JSON structure:
{
  "triageLevel": "green" | "yellow" | "red",
  "reasoning": "Brief clinical reasoning in $languageCode",
  "homeAdvice": "3-4 actionable home care steps in $languageCode",
  "referralNote": "When to refer or what to tell PHC staff in $languageCode"
}

Rules:
- RED if: chest pain, breathing difficulty, or fever lasting > 3 days, or unconscious
- YELLOW if: 3+ symptoms present, or severity is severe, or duration > 7 days
- GREEN otherwise
''';

    try {
      final response = await _model.generateContent([Content.text(prompt)]);
      final text     = response.text ?? '';
      final json     = jsonDecode(text) as Map<String, dynamic>;
      return TriageResult(
        level: _parseLevel(json['triageLevel'] as String? ?? 'yellow'),
        reasoning:    json['reasoning']    as String? ?? '',
        homeAdvice:   json['homeAdvice']   as String? ?? '',
        referralNote: json['referralNote'] as String? ?? '',
        isAiGenerated: true,
      );
    } catch (e) {
      throw GeminiUnavailableException(e.toString());
    }
  }

  Future<String> summariseDiaryTranscript({
    required String transcript,
    required String languageCode,
  }) async {
    final prompt = '''
You are a medical note summariser. 
Summarise the following clinical field note in 3-5 lines in language: $languageCode.
Include: key observations, any symptoms mentioned, and recommended follow-up.
Do not add markdown formatting.

Transcript:
$transcript
''';
    try {
      final response = await _model.generateContent([Content.text(prompt)]);
      return response.text?.trim() ?? transcript;
    } catch (e) {
      throw GeminiUnavailableException(e.toString());
    }
  }

  TriageLevel _parseLevel(String raw) {
    switch (raw.toLowerCase()) {
      case 'red':    return TriageLevel.red;
      case 'yellow': return TriageLevel.yellow;
      default:       return TriageLevel.green;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule-based triage (offline fallback)
// ─────────────────────────────────────────────────────────────────────────────

class RuleBasedTriage {
  static const _redSymptoms = {
    'chest pain',
    'chest_pain',
    'breathing difficulty',
    'breathing_difficulty',
    'breathlessness',
    'unconscious',
  };

  static TriageResult analyse({
    required List<String> symptoms,
    required String       severity,
    required int          durationDays,
  }) {
    final lower = symptoms.map((s) => s.toLowerCase()).toSet();

    final hasRedSymptom = lower.any((s) => _redSymptoms.contains(s));
    final hasFever      = lower.contains('fever');
    final isRed         = hasRedSymptom || (hasFever && durationDays > 3);

    if (isRed) {
      return const TriageResult(
        level:        TriageLevel.red,
        reasoning:    'Critical symptoms detected. Immediate referral required.',
        homeAdvice:   'Do not delay. Take patient to nearest PHC or hospital now.',
        referralNote: 'Urgent referral. Possible severe infection or cardiac event.',
      );
    }

    final isYellow = symptoms.length >= 3 ||
        severity == 'severe' ||
        durationDays > 7;

    if (isYellow) {
      return const TriageResult(
        level:        TriageLevel.yellow,
        reasoning:    'Multiple symptoms or prolonged duration. Close monitoring needed.',
        homeAdvice:   'Rest, adequate fluids, ORS if needed. Monitor temperature twice daily.',
        referralNote: 'Refer if symptoms worsen or do not improve within 2 days.',
      );
    }

    return const TriageResult(
      level:        TriageLevel.green,
      reasoning:    'Mild symptoms, short duration. Home care is appropriate.',
      homeAdvice:   'Rest, drink warm fluids, take paracetamol for fever if needed.',
      referralNote: 'Return if new symptoms develop or current symptoms worsen.',
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Selector — network-aware, with offline fallback
// ─────────────────────────────────────────────────────────────────────────────

class AiSelector {
  static final _gemini = GeminiService();

  static Future<TriageResult> triage({
    required List<String> symptoms,
    required String       severity,
    required int          durationDays,
    required String       languageCode,
  }) async {
    final result = await Connectivity().checkConnectivity();
    final hasNetwork = result != ConnectivityResult.none;

    if (hasNetwork) {
      try {
        return await _gemini.analyseSymptoms(
          symptoms:     symptoms,
          severity:     severity,
          durationDays: durationDays,
          languageCode: languageCode,
        );
      } catch (_) {
        // Network present but AI call failed — fall through to offline
      }
    }

    return RuleBasedTriage.analyse(
      symptoms:     symptoms,
      severity:     severity,
      durationDays: durationDays,
    );
  }
}
