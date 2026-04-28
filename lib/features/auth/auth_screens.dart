import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';

/// AuthGate — shown at route '/'.
/// Listens to Firebase auth stream, redirects to /home when authenticated.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
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
        SnackBar(
          content: Text(authState.error!), 
          backgroundColor: AppTheme.sosBorder,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.forestGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Spacer(flex: 2),
                  
                  // Brand Icon / Logo
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.vitalsGreen.withOpacity(0.1),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.vitalsGreen.withOpacity(0.2)),
                    ),
                    child: const Icon(LucideIcons.heartPulse, color: AppTheme.vitalsGreen, size: 42),
                  ).animate().scale(duration: 600.ms, curve: Curves.backOut).fade(),
                  
                  const SizedBox(height: 32),
                  
                  Text(
                    l10n.loginTitle,
                    style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                  ).animate().fadeIn(delay: 200.ms, duration: 600.ms).slideX(begin: -0.2),
                  
                  const SizedBox(height: 8),
                  
                  Text(
                    l10n.loginSubtitle,
                    style: TextStyle(
                      fontSize: 16, 
                      color: AppTheme.mintText.withOpacity(0.8),
                      height: 1.5,
                    ),
                  ).animate().fadeIn(delay: 300.ms, duration: 600.ms),
                  
                  const SizedBox(height: 48),
                  
                  // Input Label
                  Text(
                    l10n.enterMobile.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.mintSub,
                      letterSpacing: 1.2,
                    ),
                  ).animate().fadeIn(delay: 400.ms),
                  
                  const SizedBox(height: 12),
                  
                  TextFormField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w600),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(LucideIcons.phone, color: AppTheme.mintSub, size: 20),
                      prefixText: '+91 ',
                      prefixStyle: const TextStyle(color: AppTheme.mintSub, fontSize: 20, fontWeight: FontWeight.w600),
                      hintText: l10n.phoneHint,
                      hintStyle: TextStyle(color: Colors.white.withOpacity(0.2)),
                      fillColor: Colors.white.withOpacity(0.05),
                      filled: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppTheme.vitalsGreen, width: 2),
                      ),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().length != 10) {
                        return l10n.invalidPhone;
                      }
                      return null;
                    },
                  ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),
                  
                  const SizedBox(height: 32),
                  
                  SizedBox(
                    width: double.infinity,
                    height: 58,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _send,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.vitalsGreen,
                        foregroundColor: Colors.white,
                        elevation: 8,
                        shadowColor: AppTheme.vitalsGreen.withOpacity(0.4),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 3, color: Colors.white),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  l10n.sendOtp,
                                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(width: 8),
                                const Icon(LucideIcons.arrowRight, size: 18),
                              ],
                            ),
                    ),
                  ).animate().fadeIn(delay: 600.ms).scale(begin: const Offset(0.8, 0.8), curve: Curves.elasticOut),
                  
                  const Spacer(flex: 3),
                  
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.03),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Text(
                        l10n.dpdpNotice,
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: AppTheme.mintText.withOpacity(0.5), height: 1.5),
                      ),
                    ),
                  ).animate().fadeIn(delay: 800.ms),
                  
                  const SizedBox(height: 20),
                ],
              ),
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
        SnackBar(
          content: Text(authState.error!), 
          backgroundColor: AppTheme.sosBorder,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.forestGradient),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(LucideIcons.arrowLeft, color: Colors.white),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 16),
                      
                      // Lock Icon
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.vitalsGreen.withOpacity(0.1),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.vitalsGreen.withOpacity(0.2)),
                        ),
                        child: const Icon(LucideIcons.shieldCheck, color: AppTheme.vitalsGreen, size: 42),
                      ).animate().scale(duration: 600.ms, curve: Curves.backOut).fade(),
                      
                      const SizedBox(height: 32),
                      
                      Text(
                        l10n.otpTitle,
                        style: const TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ).animate().fadeIn(delay: 200.ms, duration: 600.ms).slideX(begin: -0.2),
                      
                      const SizedBox(height: 8),
                      
                      Text(
                        l10n.otpSubtitle,
                        style: TextStyle(
                          fontSize: 16, 
                          color: AppTheme.mintText.withOpacity(0.8),
                          height: 1.5,
                        ),
                      ).animate().fadeIn(delay: 300.ms, duration: 600.ms),
                      
                      const SizedBox(height: 48),
                      
                      TextField(
                        controller: _otpCtrl,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          letterSpacing: 16,
                          fontWeight: FontWeight.w800,
                        ),
                        decoration: InputDecoration(
                          counterText: '',
                          fillColor: Colors.white.withOpacity(0.05),
                          filled: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 20),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: const BorderSide(color: AppTheme.vitalsGreen, width: 2),
                          ),
                        ),
                        onChanged: (v) {
                          if (v.length == 6) _verify();
                        },
                      ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
                      
                      const SizedBox(height: 32),
                      
                      SizedBox(
                        width: double.infinity,
                        height: 58,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _verify,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.vitalsGreen,
                            foregroundColor: Colors.white,
                            elevation: 8,
                            shadowColor: AppTheme.vitalsGreen.withOpacity(0.4),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: _loading
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(strokeWidth: 3, color: Colors.white),
                                )
                              : Text(
                                  l10n.verifyAndContinue,
                                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                                ),
                        ),
                      ).animate().fadeIn(delay: 500.ms).scale(begin: const Offset(0.8, 0.8), curve: Curves.elasticOut),
                      
                      const SizedBox(height: 24),
                      
                      Center(
                        child: TextButton(
                          onPressed: () => context.pop(),
                          child: Text(
                            l10n.resendCode,
                            style: const TextStyle(color: AppTheme.mintSub, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ).animate().fadeIn(delay: 700.ms),
                    ],
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
