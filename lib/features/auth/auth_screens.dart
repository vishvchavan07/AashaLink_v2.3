import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'auth_notifier.dart';
import '../../../core/theme/app_theme.dart';

/// AuthGate — shown at route '/'.
/// Listens to Firebase auth stream, redirects to /home when authenticated.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Router redirect handles navigation, but this screen is shown while
    // auth stream is loading.
    return const PhoneScreen();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone number entry screen
// ─────────────────────────────────────────────────────────────────────────────

class PhoneScreen extends ConsumerStatefulWidget {
  const PhoneScreen({super.key});

  @override
  ConsumerState<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends ConsumerState<PhoneScreen> {
  final _phoneCtrl = TextEditingController();
  final _form      = GlobalKey<FormState>();
  bool _loading    = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _loading = true);
    await ref.read(authNotifierProvider.notifier).sendOtp('+91${_phoneCtrl.text.trim()}');
    if (mounted) setState(() => _loading = false);
    final authState = ref.read(authNotifierProvider);
    if (mounted && authState.verificationId != null) {
      context.push('/otp');
    } else if (mounted && authState.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authState.error!), backgroundColor: AppTheme.sosBorder),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.deepForest,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Form(
            key: _form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(),
                const Text(
                  'AashaLink',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.mintText,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Health Worker Companion',
                  style: TextStyle(fontSize: 14, color: AppTheme.mintSub),
                ),
                const SizedBox(height: 48),
                const Text(
                  'Enter your mobile number',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.mintText,
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: Colors.white, fontSize: 18),
                  decoration: InputDecoration(
                    prefixText: '+91 ',
                    prefixStyle: const TextStyle(color: AppTheme.mintSub, fontSize: 18),
                    hintText: '9876543210',
                    hintStyle: const TextStyle(color: Colors.white30),
                    fillColor: AppTheme.forestCard,
                    filled: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.forestBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.forestBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.vitalsGreen, width: 2),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().length != 10) {
                      return 'Enter a valid 10-digit mobile number';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _send,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.vitalsGreen,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text(
                            'Send OTP',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                  ),
                ),
                const Spacer(flex: 2),
                const Center(
                  child: Text(
                    'Your data stays on your device.\nDPDP compliant · end-to-end encrypted.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: AppTheme.mintSub, height: 1.6),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP verification screen
// ─────────────────────────────────────────────────────────────────────────────

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _otpCtrl = TextEditingController();
  bool _loading  = false;

  @override
  void dispose() {
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final otp = _otpCtrl.text.trim();
    if (otp.length != 6) return;
    setState(() => _loading = true);
    await ref.read(authNotifierProvider.notifier).verifyOtp(otp);
    if (mounted) setState(() => _loading = false);
    final authState = ref.read(authNotifierProvider);
    if (mounted && authState.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authState.error!), backgroundColor: AppTheme.sosBorder),
      );
    }
    // Router redirect handles navigation to /home on authenticated
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.deepForest,
      appBar: AppBar(
        backgroundColor: AppTheme.deepForest,
        foregroundColor: AppTheme.mintText,
        elevation: 0,
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              const Text(
                'Enter OTP',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.mintText,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'We sent a 6-digit code to your number.',
                style: TextStyle(fontSize: 13, color: AppTheme.mintSub),
              ),
              const SizedBox(height: 36),
              TextField(
                controller: _otpCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  letterSpacing: 12,
                  fontWeight: FontWeight.w700,
                ),
                decoration: InputDecoration(
                  counterText: '',
                  fillColor: AppTheme.forestCard,
                  filled: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.forestBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.forestBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.vitalsGreen, width: 2),
                  ),
                ),
                onChanged: (v) {
                  if (v.length == 6) _verify();
                },
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _verify,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.vitalsGreen,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Verify OTP',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
