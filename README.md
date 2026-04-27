<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AashaLink

**AashaLink** is a comprehensive healthcare connectivity platform specifically designed for **ASHA (Accredited Social Health Activist) workers** in India. It bridges the gap in rural healthcare by providing offline-first tools for patient management, AI-assisted symptom triage, and emergency response.

## 🚀 Project Overview

AashaLink provides a suite of tools to empower health workers in the field, ensuring that critical patient data is captured and life-saving information is accessible even without a stable internet connection.

### Core Features

-   **🆘 Emergency SOS System**: Instant alert system with location sharing and integrated mapping to nearby hospitals, police, and fire services.
-   **📋 Patient Records (Offline-First)**: Full CRUD management of patient history with local persistence and background synchronization.
-   **🤖 AI Medi Assistant**: Intelligent symptom analyzer providing triage recommendations, medicine guidance, and "Red Flag" warnings.
-   **🎙️ Voice Diary**: Real-time speech-to-text transcription for clinical notes, allowing workers to stay hands-free during consultations.
-   **🩸 Resource Finder**: Real-time tracking of Blood Bank inventory and Hospital Bed availability.
-   **🌍 Multi-language Support**: Fully localized interface for English, Hindi, Marathi, Tamil, and Kannada.

---

## 🛠️ Strategic Roadmap (Flutter Migration)

We are currently evolving from the web prototype to a native **Flutter** application to enhance performance and offline capabilities.

### Recommended Stack
- **State Management**: Riverpod (`@riverpod`)
- **Persistence**: Drift (Encrypted SQLite)
- **Navigation**: GoRouter
- **AI Strategy**: `google_generative_ai` (Gemini 2.0 Flash) with on-device fallback (MediaPipe)
- **Maps**: `flutter_map` + OpenStreetMap (Offline tile caching)

### Feature Priority
1. **Tier 1**: Symptom Screening, Patient Records, Voice Diary.
2. **Tier 2**: Resource Finder, Emergency SOS.
3. **Tier 3**: ABDM API integration, On-device ML models.

---

## 🏗️ Architecture

![AashaLink Architecture](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

---

## 💻 Getting Started (Web Prototype)

### Prerequisites
-   **Node.js** (LTS version)
-   **Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### Installation & Run
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Configure Environment**:
    Create a `.env` file in the root and add your key:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```
3.  **Launch the App**:
    ```bash
    npm run dev
    ```

---
*Developed for healthcare connectivity and digital empowerment.*
