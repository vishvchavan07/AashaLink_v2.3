# App AI Chat Feature: MediChat

**MediChat** is the proposed real-time, multi-turn conversational AI assistant for AashaLink. Designed specifically for ASHA workers, it expands upon the existing single-shot `analyzeSymptoms` flow by maintaining context through an interactive chat interface. It acts as an always-on medical companion to help synthesize patient records, triage symptoms, and answer clinical questions.

## 🚀 Features

- **Multi-turn Contextual Chat**: Context is preserved using Gemini's `ChatSession`, allowing follow-up questions (e.g., "What if the patient also has a rash?").
- **Voice-to-Text Integration**: Seamlessly integrates with the existing Voice Diary capability so ASHA workers can send voice messages directly.
- **Patient Context Injection**: Automatically injects the currently selected patient's active records (disease, blood group, age) into the prompt secretly, ensuring highly contextual advice.
- **Multilingual Output**: Answers chat queries in the currently selected app language (English, Hindi, Marathi, Tamil, Kannada).
- **Offline Fallback (Future Phase)**: Graceful degradation to an on-device MediaPipe LLM (e.g., Gemma 2B) when the network is `Poor` or `No network`.

## 🏗️ Architecture

### 1. State Management (Riverpod)
We will create a new state notifier `ChatStateNotifier` under `lib/features/ai_chat/`. It will maintain a list of `ChatMessage` objects.

### 2. Gemini Integration
We will extend `GeminiService` (`lib/core/ai/gemini_service.dart`) with a new method:

```dart
ChatSession startChatSession(String systemInstruction) {
  return _model.startChat(
    history: [
      Content.text('System Instruction: $systemInstruction')
    ]
  );
}
```

By providing a strong `systemInstruction`, we ensure the model behaves like a strict clinical assistant and does not hallucinate treatments without "Red Flag" warnings.

### 3. UI Implementation
- **Chat Bubbles**: Distinct styles for `User` and `Assistant`.
- **Quick Prompts**: Chips at the bottom for quick interactions (e.g., "Check standard dosage," "Symptoms of Dengue", "Translate to Hindi").
- **Voice Button**: Tap-to-talk integration at the bottom bar.

## 🛠️ Implementation Strategy

### Flutter Migration Steps
1. **Create Feature Module**: Setup `lib/features/ai_chat` with `presentation/`, `domain/`, and `data/` layers.
2. **Setup ChatSession**: Leverage the `google_generative_ai` package's continuous chat session APIs.
3. **Draft the System Prompt**:
   ```text
   You are an AI Clinical Assistant for ASHA (Accredited Social Health Activist) workers in rural India.
   Your goal is to triage symptoms, recommend basic first aid, and strictly advise hospital visits for red-flag cases.
   Never invent medical facts.
   ```
4. **Build UI Components**: `ChatScreen`, `ChatMessageWidget`, `ChatInputFieldWidget`.

## 🔌 Setup

Ensure your `.env` contains the API key (which is already configured by the project):
```env
GEMINI_API_KEY="your_api_key_here"
```

To regenerate Riverpod providers after adding `ai_chat`:
```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
```
