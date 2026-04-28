import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi')
  ];

  /// No description provided for @ashaLink.
  ///
  /// In en, this message translates to:
  /// **'AashaLink'**
  String get ashaLink;

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Health Worker OS'**
  String get appTitle;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @screen.
  ///
  /// In en, this message translates to:
  /// **'Screen'**
  String get screen;

  /// No description provided for @records.
  ///
  /// In en, this message translates to:
  /// **'Records'**
  String get records;

  /// No description provided for @voice.
  ///
  /// In en, this message translates to:
  /// **'Voice'**
  String get voice;

  /// No description provided for @diary.
  ///
  /// In en, this message translates to:
  /// **'Diary'**
  String get diary;

  /// No description provided for @resources.
  ///
  /// In en, this message translates to:
  /// **'Resources'**
  String get resources;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @symptomScreening.
  ///
  /// In en, this message translates to:
  /// **'Symptom Screening'**
  String get symptomScreening;

  /// No description provided for @symptomScreeningSubtitle.
  ///
  /// In en, this message translates to:
  /// **'लक्षण जांच · Triage in your language'**
  String get symptomScreeningSubtitle;

  /// No description provided for @patientRecords.
  ///
  /// In en, this message translates to:
  /// **'Patient Records'**
  String get patientRecords;

  /// No description provided for @patientRecordsHint.
  ///
  /// In en, this message translates to:
  /// **'24 people trust you today'**
  String get patientRecordsHint;

  /// No description provided for @bloodBank.
  ///
  /// In en, this message translates to:
  /// **'Blood Bank'**
  String get bloodBank;

  /// No description provided for @bedAvailability.
  ///
  /// In en, this message translates to:
  /// **'Bed Availability'**
  String get bedAvailability;

  /// No description provided for @bedAvailabilitySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Nearby PHCs'**
  String get bedAvailabilitySubtitle;

  /// No description provided for @voiceDiary.
  ///
  /// In en, this message translates to:
  /// **'Voice Diary'**
  String get voiceDiary;

  /// No description provided for @voiceDiarySubtitle.
  ///
  /// In en, this message translates to:
  /// **'AI field notes'**
  String get voiceDiarySubtitle;

  /// No description provided for @voiceDiaryHint.
  ///
  /// In en, this message translates to:
  /// **'Your notes, summarised by AI'**
  String get voiceDiaryHint;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout;

  /// No description provided for @selectLanguage.
  ///
  /// In en, this message translates to:
  /// **'Select Language'**
  String get selectLanguage;

  /// No description provided for @emergencyAccess.
  ///
  /// In en, this message translates to:
  /// **'Emergency Access'**
  String get emergencyAccess;

  /// No description provided for @sosTapToAlert.
  ///
  /// In en, this message translates to:
  /// **'tap to alert'**
  String get sosTapToAlert;

  /// No description provided for @sosGpsInfo.
  ///
  /// In en, this message translates to:
  /// **'In an emergency, one tap sends your GPS location and an SMS to your supervisor.'**
  String get sosGpsInfo;

  /// No description provided for @workerName.
  ///
  /// In en, this message translates to:
  /// **'Anjali Patil'**
  String get workerName;

  /// No description provided for @workerStatus1.
  ///
  /// In en, this message translates to:
  /// **'Online · Pimpri Block 4'**
  String get workerStatus1;

  /// No description provided for @workerStatus2.
  ///
  /// In en, this message translates to:
  /// **'Last sync: just now'**
  String get workerStatus2;

  /// No description provided for @workerStatus3.
  ///
  /// In en, this message translates to:
  /// **'DPDP secure · all data encrypted'**
  String get workerStatus3;

  /// No description provided for @todayPatients.
  ///
  /// In en, this message translates to:
  /// **'patients'**
  String get todayPatients;

  /// No description provided for @todayReferred.
  ///
  /// In en, this message translates to:
  /// **'referred'**
  String get todayReferred;

  /// No description provided for @statsScreened.
  ///
  /// In en, this message translates to:
  /// **'Screened'**
  String get statsScreened;

  /// No description provided for @statsReferredForCare.
  ///
  /// In en, this message translates to:
  /// **'referred for care'**
  String get statsReferredForCare;

  /// No description provided for @statsVoiceLogs.
  ///
  /// In en, this message translates to:
  /// **'Voice logs'**
  String get statsVoiceLogs;

  /// No description provided for @greetingMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning, Anjali 🌿'**
  String get greetingMorning;

  /// No description provided for @greetingAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon, Anjali ☀️'**
  String get greetingAfternoon;

  /// No description provided for @greetingEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening, Anjali 🌙'**
  String get greetingEvening;

  /// No description provided for @patientsCardSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Drift · encrypted'**
  String get patientsCardSubtitle;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'AashaLink'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Health Worker Companion'**
  String get loginSubtitle;

  /// No description provided for @enterMobile.
  ///
  /// In en, this message translates to:
  /// **'Enter your mobile number'**
  String get enterMobile;

  /// No description provided for @phoneHint.
  ///
  /// In en, this message translates to:
  /// **'9876543210'**
  String get phoneHint;

  /// No description provided for @sendOtp.
  ///
  /// In en, this message translates to:
  /// **'Send OTP'**
  String get sendOtp;

  /// No description provided for @otpTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter OTP'**
  String get otpTitle;

  /// No description provided for @otpSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We sent a 6-digit code to your number.'**
  String get otpSubtitle;

  /// No description provided for @verifyOtp.
  ///
  /// In en, this message translates to:
  /// **'Verify OTP'**
  String get verifyOtp;

  /// No description provided for @verifyAndContinue.
  ///
  /// In en, this message translates to:
  /// **'Verify & Continue'**
  String get verifyAndContinue;

  /// No description provided for @resendCode.
  ///
  /// In en, this message translates to:
  /// **'Resend Code'**
  String get resendCode;

  /// No description provided for @invalidPhone.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid 10-digit mobile number'**
  String get invalidPhone;

  /// No description provided for @dpdpNotice.
  ///
  /// In en, this message translates to:
  /// **'Your data stays on your device.\nDPDP compliant · end-to-end encrypted.'**
  String get dpdpNotice;

  /// No description provided for @offlineBanner.
  ///
  /// In en, this message translates to:
  /// **'Offline mode — data saves locally'**
  String get offlineBanner;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
