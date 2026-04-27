import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Auth State
// ─────────────────────────────────────────────────────────────────────────────

enum AuthStatus { unauthenticated, verifying, authenticated, error }

class AuthState {
  final AuthStatus status;
  final String?    verificationId;
  final String?    error;
  final User?      user;

  const AuthState({
    required this.status,
    this.verificationId,
    this.error,
    this.user,
  });

  const AuthState.initial()
      : status = AuthStatus.unauthenticated,
        verificationId = null,
        error = null,
        user = null;

  AuthState copyWith({
    AuthStatus? status,
    String?     verificationId,
    String?     error,
    User?       user,
  }) =>
      AuthState(
        status:         status         ?? this.status,
        verificationId: verificationId ?? this.verificationId,
        error:          error          ?? this.error,
        user:           user           ?? this.user,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Notifier
// ─────────────────────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  final FirebaseAuth _auth;

  AuthNotifier(this._auth) : super(const AuthState.initial()) {
    // Restore session if already signed in
    final current = _auth.currentUser;
    if (current != null) {
      state = AuthState(status: AuthStatus.authenticated, user: current);
    }
  }

  Future<void> sendOtp(String phone) async {
    state = state.copyWith(status: AuthStatus.verifying, error: null);
    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: phone,
        verificationCompleted: (credential) async {
          final result = await _auth.signInWithCredential(credential);
          state = state.copyWith(
            status: AuthStatus.authenticated,
            user:   result.user,
          );
        },
        verificationFailed: (e) {
          state = state.copyWith(
            status: AuthStatus.error,
            error:  e.message ?? 'Verification failed',
          );
        },
        codeSent: (verificationId, _) {
          state = state.copyWith(
            status:         AuthStatus.verifying,
            verificationId: verificationId,
          );
        },
        codeAutoRetrievalTimeout: (_) {},
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error:  e.toString(),
      );
    }
  }

  Future<void> verifyOtp(String otp) async {
    if (state.verificationId == null) return;
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: state.verificationId!,
        smsCode:        otp,
      );
      final result = await _auth.signInWithCredential(credential);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user:   result.user,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.error,
        error:  'Invalid OTP. Please try again.',
      );
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
    state = const AuthState.initial();
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(FirebaseAuth.instance);
});

// Stream of Firebase User (drives AuthGate)
final authStateProvider = StreamProvider<User?>((ref) {
  return FirebaseAuth.instance.authStateChanges();
});
