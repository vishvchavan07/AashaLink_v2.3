import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  FileText, 
  Bed, 
  Droplet, 
  PlusSquare, 
  Home, 
  ClipboardList, 
  User, 
  Menu, 
  Wifi,
  Activity,
  X,
  Settings,
  Globe,
  HelpCircle,
  LogOut,
  Search,
  Plus,
  ArrowLeft,
  MapPin,
  Phone,
  AlertTriangle,
  WifiOff,
  Cpu,
  Play,
  Square,
  Save,
  Trash2,
  Calendar,
  Volume2,
  VolumeX,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Navigation,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import rawData from './data/raw_datasets.json';
import { db, auth, addCollectionData, getCollectionData } from './firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import localforage from 'localforage';
import { analyzeEntities } from './utils/googleNlp';
import { translateTextGoogleCloudV3 } from './utils/googleTranslate';

// Fix for default marker icon in react-leaflet
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Types ---
type NetworkStatus = 'Good' | 'Poor' | 'No network';
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
type Language = 'English' | 'Hindi' | 'Marathi' | 'Tamil' | 'Kannada';
const langCodeMap: Record<Language, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Tamil: 'ta-IN',
  Kannada: 'kn-IN'
};
type Screen = 'home' | 'patient-records' | 'blood-bank' | 'med-assistant' | 'bed-availability' | 'voice-diary' | 'settings' | 'language' | 'login' | 'profile';
type Patient = { 
  name: string; 
  age: string; 
  disease: string; 
  loc: string; 
  date: string; 
  bloodGroup: string;
  dob: string;
  contact: string;
  emergencyContact: string;
  address: string;
  photo?: string;
};
type BloodBank = { name: string; address: string; phone: string; lat: number; lng: number; groups: string[]; lowStockGroups?: string[]; distance: number };
type VoiceDiaryEntry = { id: string; patientName: string; date: string; duration: string; transcript: string; translatedTranscript?: string };

type AshaWorker = {
  name: string;
  ashaId: string;
  village: string;
  designation: string;
  contactNumber: string;
};

type MedicalRecord = {
  id: number;
  disease: string;
  keywords: string[];
  medicines: string;
  precautions: string;
  red_flags: string;
  remedies: string;
  duration_warning: string;
};

// --- Translation Context ---
const TranslationContext = React.createContext<{
  selectedLanguage: Language;
  setSelectedLanguage: (l: Language) => void;
  t: (key: string, original?: string) => string;
  dynamicTranslations: Record<string, Record<string, string>>;
  setDynamicTranslations: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
} | null>(null);

const T = ({ children, k }: { children: string, k?: string }) => {
  const context = React.useContext(TranslationContext);
  if (!context) return <>{children}</>;
  const { selectedLanguage, dynamicTranslations, setDynamicTranslations } = context;

  const [translated, setTranslated] = useState<string>(() => {
    if (selectedLanguage === 'English') return children;
    if (k && translations[selectedLanguage]?.[k]) return translations[selectedLanguage][k];
    return dynamicTranslations[children]?.[selectedLanguage] || children;
  });

  useEffect(() => {
    if (selectedLanguage === 'English') {
      setTranslated(children);
      return;
    }

    if (k && translations[selectedLanguage]?.[k]) {
      setTranslated(translations[selectedLanguage][k]);
      return;
    }

    if (dynamicTranslations[children]?.[selectedLanguage]) {
      setTranslated(dynamicTranslations[children][selectedLanguage]);
      return;
    }

    const performTranslation = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY || import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
      const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID;
      if (!apiKey || !projectId) return;

      try {
        const result = await translateTextGoogleCloudV3(
          children, 
          langCodeMap[selectedLanguage].split('-')[0], 
          projectId, 
          apiKey
        );
        
        setDynamicTranslations(prev => ({
          ...prev,
          [children]: { ...(prev[children] || {}), [selectedLanguage]: result }
        }));
        setTranslated(result);
      } catch (e) {
        console.error("Auto-translation error:", e);
      }
    };

    performTranslation();
  }, [children, selectedLanguage, k, dynamicTranslations, setDynamicTranslations]);

  return <>{translated}</>;
};

const translations: Record<Language, any> = {
  English: {
    home: "Home",
    records: "Records",
    voice: "Voice",
    profile: "Profile",
    selectLanguage: "Select Language",
    ashaLink: "AashaLink",
    patientRecords: "Patient Records",
    bloodBank: "Blood Bank",
    bedAvailability: "Bed Availability",
    medAssistant: "Medi Assistant",
    voiceDiary: "Voice Diary",
    settings: "Settings",
    helpSupport: "Help & Support",
    logout: "Logout",
    voiceDiaryLabel: "Voice Diary",
    patientRecordsLabel: "Patient Records",
    bedAvailabilityLabel: "Bed Availability",
    bloodBankLabel: "Blood Bank",
    mediAssistantLabel: "Medi Assistant",
    mediAssistantSub: "AI-powered medical support",
    personalDetails: "Personal Details",
    assignedVillage: "Assigned Village",
    ashaId: "Asha ID",
    contactNumber: "Contact Number",
    designation: "Designation"
  },
  Hindi: {
    home: "होम",
    records: "रिकॉर्ड्स",
    voice: "आवाज़",
    profile: "प्रोफ़ाइल",
    selectLanguage: "भाषा चुनें",
    ashaLink: "आशा लिंक",
    patientRecords: "रोगी रिकॉर्ड",
    bloodBank: "ब्लड बैंक",
    bedAvailability: "बिस्तर की उपलब्धता",
    medAssistant: "मेड असिस्टेंट",
    voiceDiary: "वॉयस डायरी",
    settings: "सेटिंग्स",
    helpSupport: "सहायता और समर्थन",
    logout: "लॉगआउट",
    voiceDiaryLabel: "वॉयस डायरी",
    patientRecordsLabel: "रोगी रिकॉर्ड",
    bedAvailabilityLabel: "बिस्तर उपलब्धता",
    bloodBankLabel: "ब्लड बैंक",
    mediAssistantLabel: "मेड असिस्टेंट",
    mediAssistantSub: "AI-आधारित चिकित्सा सहायता",
    personalDetails: "व्यक्तिगत विवरण",
    assignedVillage: "नियुक्त गाँव",
    ashaId: "आशा आईडी",
    contactNumber: "संपर्क नंबर",
    designation: "पद"
  },
  Marathi: {
    home: "होम",
    records: "रेकॉर्ड्स",
    voice: "आवाज",
    profile: "प्रोफाइल",
    selectLanguage: "भाषा निवडा",
    ashaLink: "आशा लिंक",
    patientRecords: "रुग्ण रेकॉर्ड",
    bloodBank: "ब्लड बँक",
    bedAvailability: "बेड उपलब्धता",
    medAssistant: "मेड असिस्टंट",
    voiceDiary: "व्हॉइस डायरी",
    settings: "सेटिंग्ज",
    helpSupport: "मदत आणि समर्थन",
    logout: "लॉगआउट",
    voiceDiaryLabel: "व्हॉइस डायरी",
    patientRecordsLabel: "रुग्ण रेकॉर्ड",
    bedAvailabilityLabel: "बेड उपलब्धता",
    bloodBankLabel: "ब्लड बँक",
    mediAssistantLabel: "मेड असिस्टंट",
    mediAssistantSub: "AI-आधारित वैद्यकीय मदत",
    personalDetails: "वैयक्तिक तपशील",
    assignedVillage: "नियुक्त गाव",
    ashaId: "आशा आयडी",
    contactNumber: "संपर्क क्रमांक",
    designation: "पद"
  },
  Tamil: {
    home: "முகப்பு",
    records: "பதிவுகள்",
    voice: "குரல்",
    profile: "சுயவிவரம்",
    selectLanguage: "மொழியைத் தேர்ந்தெடுக்கவும்",
    ashaLink: "ஆஷா லிங்க்",
    patientRecords: "நோயாளி பதிவுகள்",
    bloodBank: "இரத்த வங்கி",
    bedAvailability: "படுக்கை வசதி",
    medAssistant: "மருத்துவ உதவியாளர்",
    voiceDiary: "குரல் நாட்குறிப்பு",
    settings: "அமைப்புகள்",
    helpSupport: "உதவி மற்றும் ஆதரவு",
    logout: "வெளியேறு",
    voiceDiaryLabel: "குரல் நாட்குறிப்பு",
    patientRecordsLabel: "நோயாளி பதிவுகள்",
    bedAvailabilityLabel: "படுக்கை வசதி",
    bloodBankLabel: "இரத்த வங்கி",
    mediAssistantLabel: "மருத்துவ உதவியாளர்",
    mediAssistantSub: "AI-இயங்கும் மருத்துவ ஆதரவு",
    personalDetails: "தனிப்பட்ட விவரங்கள்",
    assignedVillage: "ஒதுக்கப்பட்ட கிராமம்",
    ashaId: "ஆஷா ஐடி",
    contactNumber: "தொடர்பு எண்",
    designation: "பதவி"
  },
  Kannada: {
    home: "ಮುಖಪುಟ",
    records: "ದಾಖಲೆಗಳು",
    voice: "ಧ್ವನಿ",
    profile: "ಪ್ರೊಫೈಲ್",
    selectLanguage: "ಭಾಷೆಯನ್ನು ಆರಿಸಿ",
    ashaLink: "ಆಶಾ ಲಿಂಕ್",
    patientRecords: "ರೋಗಿಗಳ ದಾಖಲೆಗಳು",
    bloodBank: "ರಕ್ತ ನಿಧಿ",
    bedAvailability: "ಹಾಸಿಗೆ ಲಭ್ಯತೆ",
    medAssistant: "ವೈದ್ಯಕೀಯ ಸಹಾಯಕ",
    voiceDiary: "ಧ್ವನಿ ಡೈರಿ",
    settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    helpSupport: "ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ",
    logout: "ಲಾಗ್ ಔಟ್",
    voiceDiaryLabel: "ಧ್ವನಿ ಡೈರಿ",
    patientRecordsLabel: "ರೋಗಿಗಳ ದಾಖಲೆಗಳು",
    bedAvailabilityLabel: "ಹಾಸಿಗೆ ಲಭ್ಯತೆ",
    bloodBankLabel: "ರಕ್ತ ನಿಧಿ",
    mediAssistantLabel: "ವೈದ್ಯಕೀಯ ಸಹಾಯಕ",
    mediAssistantSub: "AI-ಚಾಲಿತ ವೈದ್ಯಕೀಯ ಬೆಂಬಲ",
    personalDetails: "ವೈಯಕ್ತಿಕ ವಿವರಗಳು",
    assignedVillage: "ನಿಯೋಜಿತ ಗ್ರಾಮ",
    ashaId: "ಆಶಾ ಐಡಿ",
    contactNumber: "ಸಂಪರ್ಕ ಸಂಖ್ಯೆ",
    designation: "ಹುದ್ದೆ"
  }
};

// --- Components ---

const NetworkIndicator = ({ status, syncStatus, onToggle }: { status: NetworkStatus, syncStatus: SyncStatus, onToggle?: () => void }) => {
  const getNetworkColor = () => {
    switch (status) {
      case 'Good': return 'text-emerald-600';
      case 'Poor': return 'text-amber-500';
      case 'No network': return 'text-rose-500';
      default: return 'text-stone-400';
    }
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-600" />;
      case 'synced': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'error': return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'offline': return <CloudOff className="w-3.5 h-3.5 text-stone-400" />;
      default: return <Cloud className="w-3.5 h-3.5 text-stone-300" />;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing': return <T k="syncing">Syncing...</T>;
      case 'synced': return <T k="synced">All data synced</T>;
      case 'error': return <T k="error">Sync failed</T>;
      case 'offline': return <T k="offline">Offline mode</T>;
      default: return <T k="cloudReady">Cloud ready</T>;
    }
  };

  return (
    <div className="bg-stone-50/80 backdrop-blur-sm border-b border-stone-100 w-full flex divide-x divide-stone-100">
      <button 
        onClick={onToggle}
        className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-stone-100 transition-colors cursor-pointer"
      >
        {status === 'No network' ? <WifiOff className={`w-4 h-4 ${getNetworkColor()}`} /> : <Wifi className={`w-4 h-4 ${getNetworkColor()}`} />}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${getNetworkColor()}`}>{status} Network</span>
      </button>
      <div className="flex-1 flex items-center justify-center gap-2 py-2">
        {getSyncIcon()}
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{getSyncText()}</span>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col items-center justify-center gap-3 hover:shadow-md hover:border-primary-100 transition-all group"
  >
    <div className="p-4 bg-primary-50 rounded-2xl group-hover:bg-primary-100 transition-colors">
      <Icon className="w-8 h-8 text-primary-600" />
    </div>
    <span className="text-sm font-bold text-stone-700"><T>{label}</T></span>
  </motion.button>
);

const NavItem = ({ icon: Icon, label, active = false, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 ${active ? 'text-primary-600' : 'text-stone-400 hover:text-stone-600'} transition-colors`}>
    <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="text-[10px] font-bold uppercase tracking-widest"><T>{label}</T></span>
  </button>
);

const DrawerItem = ({ icon: Icon, label, isRed = false, onClick }: { icon: any; label: string; isRed?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors ${isRed ? 'text-rose-600' : 'text-stone-700'}`}>
    <Icon className="w-6 h-6" />
    <span className="font-semibold"><T>{label}</T></span>
  </button>
);

import { transcribeAudioGoogleCloudV2 } from './utils/googleSpeech';

const HighlightText = ({ text, query }: { text: string, query: string }) => {
  if (!query.trim()) return <>{text}</>;
  const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return <>{text}</>;
  const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-primary-100 text-primary-900 rounded-sm px-0.5 font-bold">{part}</mark> : part)}
    </>
  );
};

// --- Main App ---

export default function App() {
  const [network, setNetwork] = useState<NetworkStatus>('Good');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AshaWorker | null>(() => {
    try {
      const saved = localStorage.getItem('aashalink_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('aashalink_language');
      return (saved as Language) || 'English';
    } catch (e) {
      return 'English';
    }
  });

  useEffect(() => {
    localStorage.setItem('aashalink_language', selectedLanguage);
  }, [selectedLanguage]);

  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem('aashalink_dynamic_translations');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('aashalink_dynamic_translations', JSON.stringify(dynamicTranslations));
  }, [dynamicTranslations]);

  const t_func = (key: string, original?: string) => {
    const textToTranslate = original || key;
    if (selectedLanguage === 'English') return textToTranslate;
    if (translations[selectedLanguage]?.[key]) return translations[selectedLanguage][key];
    if (dynamicTranslations[textToTranslate]?.[selectedLanguage]) return dynamicTranslations[textToTranslate][selectedLanguage];
    return textToTranslate;
  };

  const contextValue = {
    selectedLanguage,
    setSelectedLanguage,
    t: t_func,
    dynamicTranslations,
    setDynamicTranslations
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    try {
      return localStorage.getItem('aashalink_user') ? 'home' : 'login';
    } catch (e) {
      return 'login';
    }
  });

  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteDiaryConfirm, setShowDeleteDiaryConfirm] = useState(false);
  const [isSosActive, setIsSosActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // --- Voice Diary State ---
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const medRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const medAudioChunksRef = useRef<Blob[]>([]);

  const [voiceDiaries, setVoiceDiaries] = useState<VoiceDiaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('aashalink_diaries');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [diarySearchQuery, setDiarySearchQuery] = useState('');
  const [diaryDateFilter, setDiaryDateFilter] = useState('');
  const [diarySortBy, setDiarySortBy] = useState<'date-newest' | 'date-oldest' | 'name-az' | 'name-za'>('date-newest');

  // --- Login State ---
  const [loginStep, setLoginStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [workerProfile, setWorkerProfile] = useState<AshaWorker>({
    name: '', ashaId: '', village: '', designation: 'ASHA Worker', contactNumber: ''
  });

  useEffect(() => {
    if (!authUser && currentScreen !== 'login') {
      setCurrentScreen('login');
    }
  }, [authUser, currentScreen]);

  // --- Patient Records State ---
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('aashalink_patients');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
');
    }
  };

  useEffect(() => {
    let wasOffline = !navigator.onLine;

    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        setNetwork('No network');
        wasOffline = true;
        return;
      }

      // Use Network Information API if available
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      let isGood = true;
      if (conn) {
        // effectiveType can be 'slow-2g', '2g', '3g', or '4g'
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g') {
          setNetwork('Poor');
          isGood = false;
        } else {
          setNetwork('Good');
        }
      } else {
        // Fallback if API not supported but online
        setNetwork('Good');
      }

      if (wasOffline && (isGood || conn)) {
        // Network restored
        syncOfflineDataToFirebase();
        wasOffline = false;
      } else if (!navigator.onLine) {
        setSyncStatus('offline');
      }
    };

    // Initial check
    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (conn) {
        conn.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  // --- Patient Records State ---
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('aashalink_patients');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing patients from localStorage", e);
    }
    return [];
  });

  // Listen to Firebase updates for patients if online
  useEffect(() => {
    if ((network === 'Good' || network === 'Poor') && Object.keys(db).length !== 0) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'patients'), (snapshot) => {
          const fetchedPatients = snapshot.docs.map(doc => doc.data() as Patient);
          if (fetchedPatients.length > 0) {
            setPatients(fetchedPatients);
          }
        }, (error) => {
          console.error("Error listening to patients in Firebase:", error);
        });
        return () => unsubscribe();
      } catch (e) {
        console.warn("Firebase not configured properly, skipping live updates.");
      }
    }
  }, [network]);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientDateFilter, setPatientDateFilter] = useState('');
  const [patientBloodGroupFilter, setPatientBloodGroupFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [newPatient, setNewPatient] = useState<Patient>({ 
    name: '', 
    age: '', 
    loc: '', 
    disease: '', 
    date: new Date().toISOString().split('T')[0], 
    bloodGroup: 'A+',
    dob: '',
    contact: '',
    emergencyContact: '',
    address: ''
  });

  useEffect(() => {
    localStorage.setItem('aashalink_patients', JSON.stringify(patients));
  }, [patients]);

  const filteredPatients = patients.filter(p => {
    const terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
    const matchesSearch = terms.length === 0 || terms.every(term => 
      p.name.toLowerCase().includes(term) ||
      p.disease.toLowerCase().includes(term) ||
      p.loc.toLowerCase().includes(term)
    );
    const matchesDate = patientDateFilter ? p.date === patientDateFilter : true;
    const matchesBloodGroup = patientBloodGroupFilter ? p.bloodGroup === patientBloodGroupFilter : true;
    return matchesSearch && matchesDate && matchesBloodGroup;
  });

  const handleAddPatient = async () => {
    if (!newPatient.name || !newPatient.age || !newPatient.loc || !newPatient.disease) return;
    setPatients(prev => [...prev, newPatient]);
    const patientDataToSave = { ...newPatient };
    setNewPatient({ 
      name: '', 
      age: '', 
      loc: '', 
      disease: '', 
      date: new Date().toISOString().split('T')[0], 
      bloodGroup: 'A+',
      dob: '',
      contact: '',
      emergencyContact: '',
      address: ''
    });
    setIsAddModalOpen(false);

    if (network === 'No network') {
      const pending = JSON.parse(localStorage.getItem('aashalink_pending_sync') || '[]');
      pending.push({ type: 'ADD_PATIENT', data: patientDataToSave });
      localStorage.setItem('aashalink_pending_sync', JSON.stringify(pending));
    } else {
      // Sync immediately
      try {
        setSyncStatus('syncing');
        await addCollectionData('patients', patientDataToSave);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err) {
        setSyncStatus('error');
      }
    }
  };

  // --- Blood Bank State ---
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string | null>(null);
  const [bbSearchQuery, setBbSearchQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState<number>(50); // Default 50km
  const [bbViewMode, setBbViewMode] = useState<'list' | 'map'>('list');

  const bloodBanksData: BloodBank[] = React.useMemo(() => {
    if (!rawData.pmc_infrastructure || rawData.pmc_infrastructure.length === 0) return [];
    return rawData.pmc_infrastructure.map((facility: any, index: number) => {
      const allGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const groups = allGroups.filter((_, i) => (index + i) % 3 !== 0);
      const lowStockGroups = groups.filter((_, i) => (index + i) % 5 === 0);
      return {
        name: facility['Facility Name'] || `PMC Facility ${index}`,
        address: `${facility['Ward Name'] || ''}, ${facility['City Name'] || 'Pune'}`,
        phone: '104',
        lat: 18.5204 + (Math.random() - 0.5) * 0.1, // Approximate Pune coords with random offset
        lng: 73.8567 + (Math.random() - 0.5) * 0.1,
        groups,
        lowStockGroups,
        distance: Math.floor(Math.random() * 20) + 1
      };
    });
  }, []);

  const filteredBloodBanks = bloodBanksData.filter(bb => {
    if (selectedBloodGroup) {
      const isSpecific = selectedBloodGroup.includes('+') || selectedBloodGroup.includes('-');
      if (isSpecific) {
        if (!bb.groups.includes(selectedBloodGroup)) return false;
      } else {
        if (!bb.groups.some(g => g.startsWith(selectedBloodGroup))) return false;
      }
    }
    if (bbSearchQuery) {
      const terms = bbSearchQuery.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
      if (!terms.every(term => bb.name.toLowerCase().includes(term) || bb.address.toLowerCase().includes(term))) return false;
    }
    if (bb.distance > maxDistance) return false;
    return true;
  }).sort((a, b) => a.distance - b.distance);

  const allLowStock = filteredBloodBanks.reduce((acc, bb) => {
    if (bb.lowStockGroups && bb.lowStockGroups.length > 0) {
      acc.push({ name: bb.name, groups: bb.lowStockGroups });
    }
    return acc;
  }, [] as { name: string; groups: string[] }[]);

  // Load from localForage on mount
  useEffect(() => {
    localforage.getItem<Patient[]>('aashalink_patients_db').then(saved => {
      if (saved && saved.length > 0) setPatients(saved);
    });
    localforage.getItem<VoiceDiaryEntry[]>('aashalink_diaries_db').then(saved => {
      if (saved && saved.length > 0) setVoiceDiaries(saved);
    });
  }, []);

  // Sync to localForage on change
  useEffect(() => {
    localforage.setItem('aashalink_patients_db', patients);
    localStorage.setItem('aashalink_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localforage.setItem('aashalink_diaries_db', voiceDiaries);
    localStorage.setItem('aashalink_diaries', JSON.stringify(voiceDiaries));
  }, [voiceDiaries]);

  // Listen to Firebase updates for diaries if online
  useEffect(() => {
    if ((network === 'Good' || network === 'Poor') && Object.keys(db).length !== 0) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'voiceDiaries'), (snapshot) => {
          const fetchedDiaries = snapshot.docs.map(doc => doc.data() as VoiceDiaryEntry);
          if (fetchedDiaries.length > 0) {
            setVoiceDiaries(fetchedDiaries);
          }
        }, (error) => {
          console.error("Error listening to voiceDiaries in Firebase:", error);
        });
        return () => unsubscribe();
      } catch (e) {
        console.warn("Firebase not configured properly, skipping live updates.");
      }
    }
  }, [network]);

  const [diaryTab, setDiaryTab] = useState<'record' | 'list'>('record');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [diaryToDelete, setDiaryToDelete] = useState<VoiceDiaryEntry | null>(null);

  const filteredVoiceDiaries = React.useMemo(() => {
    return voiceDiaries
      .filter(d => {
        const terms = diarySearchQuery.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
        const matchesSearch = terms.length === 0 || terms.every(term => 
          d.patientName.toLowerCase().includes(term) || 
          d.transcript.toLowerCase().includes(term)
        );
        const matchesDate = diaryDateFilter ? d.date === diaryDateFilter : true;
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => {
        if (diarySortBy === 'date-newest') return b.date.localeCompare(a.date);
        if (diarySortBy === 'date-oldest') return a.date.localeCompare(b.date);
        if (diarySortBy === 'name-az') return a.patientName.localeCompare(b.patientName);
        if (diarySortBy === 'name-za') return b.patientName.localeCompare(a.patientName);
        return 0;
      });
  }, [voiceDiaries, diarySearchQuery, diaryDateFilter, diarySortBy]);

  const toggleMedRecording = async () => {
    if (isMedRecording) {
      if (medRecorderRef.current && medRecorderRef.current.state === 'recording') {
        medRecorderRef.current.stop();
        medRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsMedRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        medRecorderRef.current = mediaRecorder;
        medAudioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) medAudioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(medAudioChunksRef.current, { type: 'audio/webm' });
          const apiKey = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY;
          const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID;
          
          if (!apiKey || !projectId) {
            alert('Google Cloud API Key or Project ID is missing in .env');
            return;
          }

          setIsTranscribing(true);
          try {
            const result = await transcribeAudioGoogleCloudV2(audioBlob, langCodeMap[selectedLanguage] || 'en-IN', projectId, apiKey);
            if (result) {
              setMedInput(prev => ({...prev, symptoms: prev.symptoms + (prev.symptoms ? ' ' : '') + result.trim()}));
            }
          } catch (error) {
            console.error('Speech-to-Text Error:', error);
            alert('Speech recognition failed. Ensure you have network connectivity and valid API keys.');
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setIsMedRecording(true);
      } catch (err) {
        console.error("Microphone access denied or error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      setTranscript('');
      setRecordingTime(0);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const apiKey = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY;
          const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID;

          if (!apiKey || !projectId) {
            alert('Google Cloud API Key or Project ID is missing in .env');
            return;
          }

          setIsTranscribing(true);
          try {
            const result = await transcribeAudioGoogleCloudV2(audioBlob, langCodeMap[selectedLanguage] || 'en-IN', projectId, apiKey);
            if (result) {
              setTranscript(prev => prev + (prev ? ' ' : '') + result.trim());
            }
          } catch (error) {
            console.error('Speech-to-Text Error:', error);
            alert('Speech recognition failed. Ensure you have network connectivity and valid API keys.');
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied or error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveDiary = async () => {
    if (!transcript.trim()) return;
    const newEntry: VoiceDiaryEntry = {
      id: Date.now().toString(),
      patientName: activePatient?.name || 'Unknown Patient',
      date: new Date().toISOString().split('T')[0],
      duration: formatTime(recordingTime),
      transcript: transcript
    };
    setVoiceDiaries(prev => [newEntry, ...prev]);
    setTranscript('');
    setRecordingTime(0);
    setDiaryTab('list');

    if (network === 'No network') {
      const pending = JSON.parse(localStorage.getItem('aashalink_pending_sync') || '[]');
      pending.push({ type: 'ADD_DIARY', data: newEntry });
      localStorage.setItem('aashalink_pending_sync', JSON.stringify(pending));
    } else {
      try {
        setSyncStatus('syncing');
        await addCollectionData('voiceDiaries', newEntry);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err) {
        setSyncStatus('error');
      }
    }
  };

  const playDiary = (id: string, text: string) => {
    if (isPlaying === id) {
      window.speechSynthesis.cancel();
      setIsPlaying(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.onend = () => setIsPlaying(null);
    utterance.onerror = () => setIsPlaying(null);
    
    setIsPlaying(id);
    window.speechSynthesis.speak(utterance);
  };

  // --- Med Assistant State ---
  const [medInput, setMedInput] = useState({ name: '', disease: '', symptoms: '', time: '', existing: '' });
  const [isMedRecording, setIsMedRecording] = useState(false);
  const [medStatus, setMedStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [medResult, setMedResult] = useState<MedicalRecord | null>(null);

  // Auto-fill Med Assistant when active patient changes
  useEffect(() => {
    if (activePatient) {
      setMedInput(prev => ({ ...prev, name: activePatient.name, disease: activePatient.disease, existing: activePatient.disease }));
    }
  }, [activePatient]);

  const handleSaveReport = () => {
    if (!activePatient || !medResult) return;
    
    // Update active patient with new data
    const updatedPatient = {
      ...activePatient,
      disease: medResult.disease
    };
    
    // Update patients list
    const updatedPatients = patients.map(p => 
      p.name === activePatient.name ? updatedPatient : p
    );
    
    setPatients(updatedPatients);
    setActivePatient(updatedPatient);

    if (network === 'No network') {
      const pending = JSON.parse(localStorage.getItem('aashalink_pending_sync') || '[]');
      pending.push({ type: 'UPDATE_PATIENT', data: updatedPatient });
      localStorage.setItem('aashalink_pending_sync', JSON.stringify(pending));
    } else {
      // Sync immediately
      // TODO: Firebase call
    }
    
    // Reset Med Assistant
    setMedStatus('idle');
    setMedInput({ name: '', disease: '', symptoms: '', time: '', existing: '' });
  };

  const medicalDataset: MedicalRecord[] = [];

  const handleAnalyze = async () => {
    if (!medInput.symptoms) return;
    setMedStatus('loading');
    
    // NLP Pre-analysis (Entity recognition)
    let nlpEntities: any[] = [];
    try {
      const nlpData = await analyzeEntities(`${medInput.disease} ${medInput.symptoms} ${medInput.existing}`);
      nlpEntities = nlpData.entities;
    } catch (err) {
      console.warn("NLP Analysis failed:", err);
    }

    const performAnalysisLocal = async () => {
      const inputWords = `${medInput.disease} ${medInput.symptoms} ${medInput.time} ${medInput.existing}`.toLowerCase().split(/\W+/);
      const combinedInput = `${medInput.disease} ${medInput.symptoms} ${medInput.time} ${medInput.existing}`.toLowerCase();
      
      let bestMatch: MedicalRecord | null = null;
      let highestScore = 0;

      for (const record of medicalDataset) {
        let score = 0;
        for (const keyword of record.keywords) {
          const kwLower = keyword.toLowerCase();
          if (combinedInput.includes(kwLower)) {
            score += 2;
          } else if (inputWords.some(word => word.includes(kwLower) || kwLower.includes(word))) {
            score += 1;
          }
        }
        if (score > highestScore) {
          highestScore = score;
          bestMatch = record;
        }
      }

      if (highestScore > 0 && bestMatch) {
        // Use Google Translation API to translate the local English record if user is online
        const apiKey = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY; 
        const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID;
        
        if (apiKey && projectId && selectedLanguage !== 'English') {
          try {
            const translated: any = { ...bestMatch };
            const fieldsToTranslate = ['disease', 'medicines', 'precautions', 'red_flags', 'remedies', 'duration_warning'];
            
            for (const field of fieldsToTranslate) {
              translated[field] = await translateTextGoogleCloudV3(bestMatch[field as keyof MedicalRecord] as string, langCodeMap[selectedLanguage].split('-')[0], projectId, apiKey);
            }
            setMedResult({ id: Date.now(), keywords: [], ...translated });
          } catch (e) {
            setMedResult({ id: Date.now(), keywords: [], ...bestMatch });
          }
        } else {
          setMedResult({ id: Date.now(), keywords: [], ...bestMatch });
        }
        setMedStatus('success');
      } else {
        setMedStatus('error');
      }
    };

    if (network === 'Good' || !import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY.includes('your_gemini')) {
      // Online mode: Call Gemini AI
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const entityNames = nlpEntities.map(e => e.name).join(', ');
        const prompt = `You are a medical assistant for an ASHA worker in rural India.
Analyze these symptoms:
Disease suspected: ${medInput.disease}
Symptoms: ${medInput.symptoms}
Duration: ${medInput.time}
Existing conditions: ${medInput.existing}
NLP Detected Terms: ${entityNames}

Reply STRICTLY in JSON format with EXACTLY these string keys (no markdown formatting outside the JSON).
Crucially, all the values inside the JSON MUST be translated to this language: ${selectedLanguage}.
{
  "disease": "Short name of most likely condition",
  "medicines": "Suggested standard OTC medicines with dosage",
  "precautions": "3-4 bullet points of precautions",
  "red_flags": "When to immediately refer to a hospital",
  "remedies": "Home remedies suitable for rural India",
  "duration_warning": "Warning about duration"
}`;
        
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          setMedResult({ id: Date.now(), keywords: [], ...aiResult });
          setMedStatus('success');
        } else {
          throw new Error("Invalid format from AI");
        }
      } catch (err) {
        console.error("Gemini AI failed, falling back to local dataset", err);
        performAnalysisLocal();
      }
    } else {
      // Offline mode or no API key: Process using local dataset
      setTimeout(performAnalysisLocal, 800);
    }
  };
  // --- Login Functions ---
  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setLoginError('Please enter a valid phone number');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    
    // Check if Firebase Auth is mocked
    if (Object.keys(auth).length === 0) {
      // Mock OTP flow
      setTimeout(() => {
        setLoginStep('otp');
        setLoginLoading(false);
        console.warn("Mock OTP sent: 123456");
      }, 1000);
      return;
    }

    try {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, (window as any).recaptchaVerifier);
      setConfirmationResult(confirmation);
      setLoginStep('otp');
    } catch (err: any) {
      setLoginError(err.message || 'Failed to send OTP. Please try again.');
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setLoginError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoginError('');
    setLoginLoading(true);

    if (Object.keys(auth).length === 0) {
      setTimeout(() => {
        if (otp === '123456') {
          setLoginStep('profile');
        } else {
          setLoginError('Invalid Mock OTP. Use 123456');
        }
        setLoginLoading(false);
      }, 1000);
      return;
    }

    try {
      await confirmationResult.confirm(otp);
      setLoginStep('profile');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSaveProfile = () => {
    if (!workerProfile.name || !workerProfile.ashaId || !workerProfile.village) {
      setLoginError('Please fill all required fields');
      return;
    }
    const finalProfile = { ...workerProfile, contactNumber: phoneNumber };
    setAuthUser(finalProfile);
    localStorage.setItem('aashalink_user', JSON.stringify(finalProfile));
    setCurrentScreen('home');
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('ASHA Worker Patient Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated by: ${authUser?.name || 'ASHA Worker'} (${authUser?.ashaId || 'N/A'})`, 14, 32);
    doc.text(`Village/Ward: ${authUser?.village || 'N/A'}`, 14, 38);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 44);

    const tableColumn = ["Name", "Age", "Location", "Blood Group", "Latest Disease"];
    const tableRows: any[] = [];

    patients.forEach(patient => {
      const patientData = [
        patient.name,
        patient.age,
        patient.loc,
        patient.bloodGroup || 'N/A',
        patient.disease || 'N/A',
      ];
      tableRows.push(patientData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [4, 52, 44] } // Primary color
    });

    if (navigator.vibrate) navigator.vibrate(50);
    doc.save(`AashaLink_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <TranslationContext.Provider value={contextValue}>
      <div className="min-h-screen bg-background font-sans text-stone-900 flex flex-col relative overflow-hidden">
        {/* Top Section */}
        {currentScreen !== 'login' && (
          <header className="h-16 flex items-center justify-between px-6 border-b border-stone-100 bg-white relative z-10">
            {currentScreen === 'home' ? (
              <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 hover:bg-stone-50 rounded-full transition-colors">
                <Menu className="w-6 h-6 text-stone-700" />
              </button>
            ) : (
              <button onClick={() => setCurrentScreen('home')} className="p-2 -ml-2 hover:bg-stone-50 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-stone-700" />
              </button>
            )}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-extrabold text-stone-800 tracking-tight">
              {currentScreen === 'home' && <T k="ashaLink">AashaLink</T>}
              {currentScreen === 'patient-records' && <T k="patientRecords">Patient Records</T>}
              {currentScreen === 'blood-bank' && (selectedBloodGroup ? `Blood: ${selectedBloodGroup}` : <T k="bloodBank">Blood Bank</T>)}
              {currentScreen === 'bed-availability' && <T k="bedAvailability">Bed Availability</T>}
              {currentScreen === 'med-assistant' && <T k="medAssistant">Medi Assistant</T>}
              {currentScreen === 'voice-diary' && <T k="voiceDiary">Voice Diary</T>}
              {currentScreen === 'settings' && <T k="settings">Settings</T>}
              {currentScreen === 'language' && <T k="selectLanguage">Select Language</T>}
              {currentScreen === 'profile' && <T k="profile">Profile</T>}
            </h1>
            {activePatient && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full mt-0.5">
                <T>Active</T>: {activePatient.name}
              </span>
            )}
          </div>
          <button onClick={() => setCurrentScreen('profile')} className="p-2 -mr-2 hover:bg-stone-50 rounded-full transition-colors">
            <User className="w-6 h-6 text-stone-700" />
          </button>
        </header>
        )}

        {/* Network Status Bar */}
        {currentScreen === 'home' && (
          <NetworkIndicator 
            status={network} 
            syncStatus={syncStatus}
            onToggle={() => setNetwork(prev => prev === 'Good' ? 'No network' : 'Good')} 
          />
        )}

        <main className="flex-1 max-w-md mx-auto w-full px-6 py-8 flex flex-col overflow-y-auto">
        {currentScreen === 'home' ? (
          <>
            {isSosActive ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col gap-4 pb-12"
              >
                <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-500 p-2 rounded-full animate-pulse">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-rose-800 font-black">SOS MODE ACTIVE</h3>
                      <p className="text-xs text-rose-600 font-bold">Emergency services notified</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSosActive(false)}
                    className="bg-white text-rose-600 px-4 py-2 rounded-xl font-bold text-xs border border-rose-200 shadow-sm"
                  >
                    CANCEL SOS
                  </button>
                </div>

                <div className="h-[350px] rounded-3xl overflow-hidden border-4 border-rose-100 shadow-xl relative z-0">
                  <MapContainer 
                    center={userLocation ? [userLocation.lat, userLocation.lng] : [34.0522, -118.2437]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {userLocation && (
                      <Marker position={[userLocation.lat, userLocation.lng]}>
                        <Popup>
                          <div className="p-1 text-center">
                            <p className="font-bold text-primary-600">YOU ARE HERE</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {emergencyServices.map((service, i) => (
                      <Marker key={i} position={[service.lat, service.lng]}>
                        <Popup>
                          <div className="p-1">
                            <h4 className="font-extrabold text-stone-800 mb-1">{service.name}</h4>
                            <p className="text-xs text-stone-500 mb-2">{service.type}</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => window.open(`tel:${service.phone}`)}
                                className="flex-1 bg-rose-500 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                              >
                                <Phone className="w-3 h-3" /> Call
                              </button>
                              <button 
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lng}`, '_blank')}
                                className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-rose-100"
                              >
                                Directions
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-black text-stone-800 uppercase tracking-widest px-2">Nearby Help</h4>
                  {emergencyServices.map((service, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-stone-50 p-2 rounded-xl">
                          {service.type === 'Hospital' ? <Activity className="w-5 h-5 text-rose-500" /> : <ShieldAlert className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div>
                          <p className="font-bold text-stone-800 text-sm">{service.name}</p>
                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{service.type}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open(`tel:${service.phone}`)}
                        className="p-3 bg-rose-50 text-rose-600 rounded-xl"
                      >
                        <Phone className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <>
                {/* Feature Grid (2x2) */}
                <div className="grid grid-cols-2 gap-4 mb-12">
                  <FeatureCard icon={Mic} label={<T k="voiceDiary">Voice Diary</T>} onClick={() => setCurrentScreen('voice-diary')} />
                  <FeatureCard icon={FileText} label={<T k="patientRecords">Patient Records</T>} onClick={() => setCurrentScreen('patient-records')} />
                  <FeatureCard icon={Bed} label={<T k="bedAvailability">Bed Availability</T>} onClick={() => setCurrentScreen('bed-availability')} />
                  <FeatureCard icon={Droplet} label={<T k="bloodBank">Blood Bank</T>} onClick={() => { setCurrentScreen('blood-bank'); setSelectedBloodGroup(null); }} />
                </div>

                {/* Center SOS Element */}
                <div className="flex justify-center mb-12">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if ('vibrate' in navigator) {
                        // SOS Morse Code Pattern: 3 short, 3 long, 3 short
                        navigator.vibrate([100, 100, 100, 100, 100, 200, 300, 200, 300, 200, 300, 200, 100, 100, 100, 100, 100]);
                      }
                      
                      const triggerSOS = (lat?: number, lng?: number) => {
                        setIsSosActive(true);
                        let message = `🚨 EMERGENCY ALERT from ASHA Worker: ${authUser?.name || 'Unknown'} (ID: ${authUser?.ashaId || 'Unknown'})!\n\nI need immediate assistance at my location!`;
                        if (lat && lng) {
                          message += `\n\nMy live location: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                        }
                        window.open(`whatsapp://send?text=${encodeURIComponent(message)}`, '_blank');
                      };

                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                            triggerSOS(position.coords.latitude, position.coords.longitude);
                          },
                          (error) => {
                            console.error("Error getting location", error);
                            triggerSOS();
                          }
                        );
                      } else {
                        triggerSOS();
                      }
                    }}
                    animate={{ 
                      boxShadow: [
                        "0 0 0 0px rgba(225, 29, 72, 0.4)", 
                        "0 0 0 24px rgba(225, 29, 72, 0)"
                      ] 
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-36 h-36 bg-gradient-to-b from-rose-500 to-rose-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-rose-200/50 border-4 border-white"
                  >
                    <span className="text-4xl font-black tracking-tighter"><T k="sos">SOS</T></span>
                  </motion.button>
                </div>

                {/* Med Assistant Card */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentScreen('med-assistant')}
                  className="w-full bg-white border-2 border-primary-100 p-5 rounded-3xl flex items-center gap-5 shadow-sm hover:border-primary-200 hover:shadow-md transition-all group mb-8"
                >
                  <div className="p-4 bg-primary-600 rounded-2xl shadow-inner shadow-primary-700/50 group-hover:bg-primary-500 transition-colors">
                    <PlusSquare className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-extrabold text-stone-800"><T k="mediAssistantLabel">Medi Assistant</T></h3>
                    <p className="text-xs text-stone-500 font-medium mt-0.5"><T k="mediAssistantSub">Symptom analysis tool</T></p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <Activity className="w-5 h-5 text-primary-600" />
                  </div>
                </motion.button>

                {/* Dataset Insights Section */}
                <div className="bg-stone-50 rounded-3xl p-6 border border-stone-200 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-stone-200 p-2 rounded-lg">
                      <ClipboardList className="w-5 h-5 text-stone-600" />
                    </div>
                    <h3 className="font-extrabold text-stone-800 tracking-tight"><T k="datasetInsights">Public Health Dataset Insights</T></h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-stone-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 p-2 rounded-xl"><Activity className="w-4 h-4 text-emerald-600"/></div>
                        <span className="text-sm font-bold text-stone-700"><T k="totalStates">Total States Tracked</T></span>
                      </div>
                      <span className="text-lg font-black text-emerald-600">{rawData.hospitals_and_beds.length - 2}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-stone-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-xl"><MapPin className="w-4 h-4 text-blue-600"/></div>
                        <span className="text-sm font-bold text-stone-700"><T k="healthFacilities">Health Facilities</T></span>
                      </div>
                      <span className="text-lg font-black text-blue-600">{rawData.pmc_infrastructure.length}</span>
                    </div>

                    <div className="bg-primary-600 p-4 rounded-2xl text-white shadow-lg shadow-primary-200">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1"><T k="topFacilityCity">Top Facility City</T></p>
                      <p className="text-xl font-black">Pune PMC Area</p>
                      <div className="w-full bg-white/20 h-1 rounded-full mt-3 overflow-hidden">
                        <div className="bg-white h-full w-[85%]" />
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setCurrentScreen('bed-availability')}
                    className="w-full mt-4 text-xs font-black text-stone-400 py-2 hover:text-primary-600 transition-colors uppercase tracking-widest"
                  >
                    <T k="viewAllRecords">View All Dataset Records</T> →
                  </button>
                </div>
              </>
            )}
          </>
        ) : currentScreen === 'patient-records' ? (
          <div className="pb-24">
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t_func("searchPatients", "Search patients...")} 
                  className="w-full pl-12 pr-10 py-3.5 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button 
                onClick={handleExportPDF}
                className="bg-primary-600 text-white p-3.5 rounded-2xl flex items-center justify-center shadow-sm hover:bg-primary-700 transition-colors"
                title={t_func("exportPdf", "Export PDF Report")}
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            
            {/* Advanced Filters */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex-shrink-0 flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider"><T k="date">Date</T></span>
                <input 
                  type="date" 
                  value={patientDateFilter}
                  onChange={(e) => setPatientDateFilter(e.target.value)}
                  className="text-sm font-medium text-stone-700 bg-transparent focus:outline-none"
                />
                {patientDateFilter && (
                  <button onClick={() => setPatientDateFilter('')} className="ml-1 text-stone-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider"><T k="blood">Blood</T></span>
                <select 
                  value={patientBloodGroupFilter}
                  onChange={(e) => setPatientBloodGroupFilter(e.target.value)}
                  className="text-sm font-medium text-stone-700 bg-transparent focus:outline-none appearance-none pr-4"
                >
                  <option value=""><T k="all">All</T></option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPatients.length === 0 ? (
                <p className="text-center text-stone-500 mt-8 font-medium"><T k="noPatientsFound">No patients found.</T></p>
              ) : (
                filteredPatients.map((p, i) => (
                  <div key={i} className={`bg-white p-5 rounded-2xl border ${activePatient?.name === p.name ? 'border-primary-400 ring-1 ring-primary-400 bg-primary-50/30' : 'border-stone-100'} shadow-sm flex justify-between items-start transition-all`}>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          {p.photo && (
                            <img src={p.photo} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-stone-200 flex-shrink-0 shadow-sm" />
                          )}
                          <div>
                            <h3 className="font-extrabold text-stone-800 text-lg">
                              <HighlightText text={p.name} query={searchQuery} />
                            </h3>
                            <p className="text-sm text-stone-500 mt-0.5 font-medium">
                              <T k="age">Age</T>: {p.age} • <T k="loc">Loc</T>: <HighlightText text={p.loc} query={searchQuery} />
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5 font-medium"><T k="dob">DOB</T>: {p.dob} • <T k="blood">Blood</T>: {p.bloodGroup}</p>
                            <p className="text-xs text-stone-400 mt-0.5 font-medium"><T k="contact">Contact</T>: {p.contact}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setPatientToDelete(p)}
                          className="p-2 text-stone-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <button 
                          onClick={() => setActivePatient(p)}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition-colors ${activePatient?.name === p.name ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                        >
                          {activePatient?.name === p.name ? <T k="selected">Selected</T> : <T k="selectPatient">Select Patient</T>}
                        </button>
                        <span className="bg-primary-50 text-primary-700 border border-primary-100 text-xs font-bold px-3 py-1.5 rounded-full">
                          <HighlightText text={p.disease} query={searchQuery} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="fixed bottom-24 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-xl shadow-primary-200 flex items-center justify-center z-40 hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-8 h-8" />
            </button>

            {/* Add Patient Modal */}
            <AnimatePresence>
              {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsAddModalOpen(false)}
                    className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-extrabold text-stone-800"><T k="addNewPatient">Add New Patient</T></h2>
                      <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-stone-50 rounded-full"><X className="w-5 h-5 text-stone-500" /></button>
                    </div>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1"><T k="basicInfo">Basic Info</T></label>
                        <input type="text" placeholder={t_func("fullName", "Full Name")} value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" placeholder={t_func("age", "Age")} value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                          <div className="relative">
                            <select 
                              value={newPatient.bloodGroup} 
                              onChange={e => setNewPatient({...newPatient, bloodGroup: e.target.value})}
                              className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium appearance-none"
                            >
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                              <Droplet className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1"><T k="medicalInfo">Medical Info</T></label>
                        <input type="text" placeholder={t_func("locationWard", "Location / Ward")} value={newPatient.loc} onChange={e => setNewPatient({...newPatient, loc: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <input type="text" placeholder={t_func("diseaseCondition", "Disease / Condition")} value={newPatient.disease} onChange={e => setNewPatient({...newPatient, disease: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1"><T k="personalDetails">Personal Details</T></label>
                        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5">
                          <span className="text-xs font-bold text-stone-400 uppercase"><T k="dob">DOB</T></span>
                          <input type="date" value={newPatient.dob} onChange={e => setNewPatient({...newPatient, dob: e.target.value})} className="flex-1 bg-transparent focus:outline-none font-medium text-stone-700" />
                        </div>
                        <input type="tel" placeholder={t_func("contactNumber", "Contact Number")} value={newPatient.contact} onChange={e => setNewPatient({...newPatient, contact: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <input type="tel" placeholder={t_func("emergencyContact", "Emergency Contact")} value={newPatient.emergencyContact} onChange={e => setNewPatient({...newPatient, emergencyContact: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <textarea placeholder={t_func("address", "Address")} value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium min-h-[80px]" />
                        
                        <div className="mt-2">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 mb-1 block"><T k="photoAttachment">Photo Attachment</T></label>
                          <input type="file" accept="image/*" capture="environment" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setNewPatient({...newPatient, photo: event.target?.result as string});
                              };
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none font-medium text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                          {newPatient.photo && <img src={newPatient.photo} alt="Preview" className="w-20 h-20 object-cover rounded-xl mt-2 border-2 border-stone-200 shadow-sm" />}
                        </div>
                      </div>

                      <button onClick={handleAddPatient} className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl mt-2 hover:bg-primary-700 transition-colors shadow-md shadow-primary-200 sticky bottom-0">
                        <T k="savePatient">Save Patient</T>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Delete Patient Confirmation Modal */}
            <AnimatePresence>
              {patientToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setPatientToDelete(null)}
                    className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl"
                  >
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                      <Trash2 className="w-8 h-8 text-rose-500" />
                    </div>
                    <h2 className="text-xl font-extrabold text-stone-800 mb-2"><T k="deletePatientRecord">Delete Patient Record</T></h2>
                    <p className="text-stone-600 font-medium mb-6"><T k="confirmDelete">Are you sure you want to delete the record for</T> <span className="text-stone-900 font-bold">{patientToDelete.name}</span>? <T k="cannotUndo">This action cannot be undone.</T></p>
                    <div className="flex gap-3">
                      <button onClick={() => setPatientToDelete(null)} className="flex-1 bg-stone-100 text-stone-800 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">
                        <T k="cancel">Cancel</T>
                      </button>
                      <button 
                        onClick={() => {
                          setPatients(prev => prev.filter(p => p.name !== patientToDelete.name || p.date !== patientToDelete.date));
                          if (activePatient?.name === patientToDelete.name) {
                            setActivePatient(null);
                          }
                          setPatientToDelete(null);
                        }} 
                        className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-md shadow-rose-200"
                      >
                        <T k="delete">Delete</T>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : currentScreen === 'blood-bank' ? (
          <div className="pb-24">
            {activePatient && (
              <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 p-3 rounded-full"><User className="w-6 h-6 text-primary-600"/></div>
                  <div>
                    <p className="text-sm text-stone-600 font-medium"><T k="findingBloodFor">Finding blood for:</T></p>
                    <p className="font-extrabold text-stone-800 text-lg">{activePatient.name} | {activePatient.age} | {activePatient.bloodGroup}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentScreen('patient-records')}
                  className="text-xs font-bold text-primary-600 bg-white px-3 py-1.5 rounded-xl border border-primary-200 hover:bg-primary-50 transition-colors"
                >
                  <T k="change">Change</T>
                </button>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={bbSearchQuery}
                  onChange={(e) => setBbSearchQuery(e.target.value)}
                  placeholder={t_func("searchBloodBanks", "Search blood banks...")} 
                  className="w-full pl-12 pr-12 py-3.5 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                />
                {bbSearchQuery && (
                  <button 
                    onClick={() => setBbSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <select 
                    value={selectedBloodGroup || ''}
                    onChange={(e) => setSelectedBloodGroup(e.target.value || null)}
                    className="w-full pl-4 pr-10 py-3.5 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm appearance-none font-bold text-stone-700 text-sm"
                  >
                    <option value=""><T k="allGroups">All Groups</T></option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <Droplet className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 w-4 h-4 pointer-events-none" />
                </div>

                <div className="relative">
                  <select 
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full pl-4 pr-10 py-3.5 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm appearance-none font-bold text-stone-700 text-sm"
                  >
                    <option value={5}><T k="within5km">Within 5km</T></option>
                    <option value={10}><T k="within10km">Within 10km</T></option>
                    <option value={20}><T k="within20km">Within 20km</T></option>
                    <option value={50}><T k="within50km">Within 50km</T></option>
                    <option value={100}><T k="within100km">Within 100km</T></option>
                  </select>
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>

            {allLowStock.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-200 p-4 rounded-2xl mb-6 flex items-start gap-3"
              >
                <div className="bg-rose-100 p-2 rounded-full shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-rose-800"><T k="criticalStockAlert">Critical Stock Alert</T></p>
                  <div className="mt-1 space-y-1">
                    {allLowStock.map((alert, idx) => (
                      <p key={idx} className="text-xs text-rose-700 font-medium">
                        <span className="font-bold underline">{alert.groups.join(', ')}</span> <T k="lowAt">low at</T> <span className="font-bold">{alert.name}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex bg-stone-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setBbViewMode('list')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${bbViewMode === 'list' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <T k="listView">List View</T>
              </button>
              <button 
                onClick={() => setBbViewMode('map')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${bbViewMode === 'map' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <T k="mapView">Map View</T>
              </button>
            </div>

            {bbViewMode === 'map' ? (
              <div className="h-[400px] rounded-2xl overflow-hidden border border-stone-200 shadow-sm relative z-0">
                <MapContainer center={[34.07, -118.26]} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {filteredBloodBanks.map((bb, i) => (
                    <Marker key={i} position={[bb.lat, bb.lng]}>
                      <Popup>
                        <div className="p-1">
                          <h4 className="font-extrabold text-stone-800 mb-1">{bb.name}</h4>
                          <p className="text-xs text-stone-500 mb-2">{bb.address}</p>
                          <p className="text-xs font-bold text-rose-600 mb-3">{bb.distance} <T k="kmAway">km away</T></p>
                          <button 
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${bb.lat},${bb.lng}`, '_blank')}
                            className="w-full bg-rose-50 text-rose-600 py-2 rounded-lg font-bold text-xs hover:bg-rose-100 transition-colors"
                          >
                            <T k="getDirections">Get Directions</T>
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBloodBanks.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-stone-100">
                    <Droplet className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-500 font-bold"><T k="noBloodBanksFound">No blood banks found</T></p>
                    <p className="text-xs text-stone-400 mt-1"><T k="adjustFilters">Try adjusting your filters</T></p>
                    <button 
                      onClick={() => { setSelectedBloodGroup(null); setMaxDistance(50); setBbSearchQuery(''); }}
                      className="mt-6 text-sm font-bold text-rose-600 hover:underline"
                    >
                      <T k="resetFilters">Reset Filters</T>
                    </button>
                  </div>
                ) : (
                  filteredBloodBanks.map((bb, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-stone-800 text-lg">
                          <HighlightText text={bb.name} query={bbSearchQuery} />
                        </h3>
                        <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-lg">{bb.distance} km</span>
                      </div>
                      <p className="text-sm text-stone-500 mt-1 mb-3 font-medium">
                        <HighlightText text={bb.address} query={bbSearchQuery} />
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {bb.groups.map(g => {
                          const isLow = bb.lowStockGroups?.includes(g);
                          return (
                            <div key={g} className="relative">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedBloodGroup === g ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                                {g}
                              </span>
                              {isLow && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${bb.lat},${bb.lng}`, '_blank')}
                          className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-700 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors border border-stone-200"
                        >
                          <MapPin className="w-4 h-4" /> <T k="location">Location</T>
                        </button>
                        <button className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors border border-rose-100">
                          <Phone className="w-4 h-4" /> <T k="call">Call</T>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : currentScreen === 'bed-availability' ? (
          <div className="pb-24">
            {activePatient && (
              <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 p-3 rounded-full"><User className="w-6 h-6 text-primary-600"/></div>
                  <div>
                    <p className="text-sm text-stone-600 font-medium"><T k="findingBedFor">Finding bed for:</T></p>
                    <p className="font-extrabold text-stone-800 text-lg">{activePatient.name} | {activePatient.age} | {activePatient.loc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentScreen('patient-records')}
                  className="text-xs font-bold text-primary-600 bg-white px-3 py-1.5 rounded-xl border border-primary-200 hover:bg-primary-50 transition-colors"
                >
                  <T k="change">Change</T>
                </button>
              </div>
            )}
            <div className="space-y-4">
              {rawData.pmc_infrastructure.slice(0, 10).map((facility: any, index: number) => (
                <div key={index} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="font-extrabold text-stone-800 text-lg">{facility['Facility Name']}</h3>
                  <p className="text-sm text-stone-500 mt-1 mb-5 font-medium">{facility['Ward Name']}, {facility['City Name']} • {facility['Type  (Hospital / Nursing Home / Lab)']}</p>
                  <div className="flex justify-between items-center">
                    <span className={parseInt(facility['Number of Beds in facility type'] || '0') > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                      {facility['Number of Beds in facility type'] || '0'} <T k="bedsAvailable">Beds Available</T>
                    </span>
                    <button className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors shadow-md shadow-primary-200">
                      <T k="requestBook">Request Book</T>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentScreen === 'voice-diary' ? (
          <div className="pb-24 flex flex-col h-full">
            {/* Tabs */}
            <div className="flex bg-stone-100 p-1 rounded-2xl mb-6 shrink-0">
              <button onClick={() => setDiaryTab('record')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${diaryTab === 'record' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}><T k="recordNew">Record New</T></button>
              <button onClick={() => setDiaryTab('list')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${diaryTab === 'list' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}><T k="savedEntries">Saved Entries</T></button>
            </div>

            {diaryTab === 'record' ? (
              <>
                {activePatient && (
                  <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-100 p-3 rounded-full"><User className="w-6 h-6 text-primary-600"/></div>
                      <div>
                        <p className="text-sm text-stone-600 font-medium"><T k="recordingFor">Recording for:</T></p>
                        <p className="font-extrabold text-stone-800 text-lg">{activePatient.name} | {activePatient.age} | {activePatient.loc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setCurrentScreen('patient-records')}
                      className="text-xs font-bold text-primary-600 bg-white px-3 py-1.5 rounded-xl border border-primary-200 hover:bg-primary-50 transition-colors"
                    >
                      <T k="change">Change</T>
                    </button>
                  </div>
                )}
                <div className="flex-1 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col mb-6 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="font-extrabold text-stone-800 text-lg"><T k="transcript">Transcript</T></h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${isRecording ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-stone-100 text-stone-500 border border-stone-200'}`}>
                      {isRecording && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                      {formatTime(recordingTime)}
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full flex flex-col relative">
                    {isTranscribing && (
                      <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl">
                        <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-3"></div>
                        <p className="text-stone-600 font-bold animate-pulse"><T k="transcribing">Transcribing with Google Cloud AI...</T></p>
                      </div>
                    )}
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder={t_func("diaryPlaceholder", "Tap the microphone below to start recording, or type your manual diary entry here...")}
                      className="flex-1 w-full resize-none outline-none text-stone-700 font-medium leading-relaxed text-lg placeholder:text-stone-300 bg-transparent"
                    />
                  </div>
                </div>
                <div className="shrink-0 flex items-center justify-center gap-6 mb-8">
                  <button 
                    onClick={() => setShowDeleteDiaryConfirm(true)}
                    disabled={isRecording || !transcript}
                    className="w-14 h-14 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl border-4 border-white transition-colors ${isRecording ? 'bg-rose-500 shadow-rose-200/50' : 'bg-primary-600 shadow-primary-200/50 hover:bg-primary-700'}`}
                  >
                    {isRecording ? <div className="w-6 h-6 bg-white rounded-sm" /> : <Mic className="w-8 h-8" />}
                  </motion.button>
                  
                  <button 
                    onClick={handleSaveDiary}
                    disabled={isRecording || !transcript}
                    className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-6 h-6" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search & Filter Bar */}
                <div className="space-y-3 mb-6 shrink-0">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search by patient or keyword..."
                      value={diarySearchQuery}
                      onChange={(e) => setDiarySearchQuery(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                    />
                    {diarySearchQuery && (
                      <button 
                        onClick={() => setDiarySearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Date</span>
                      <input 
                        type="date" 
                        value={diaryDateFilter}
                        onChange={(e) => setDiaryDateFilter(e.target.value)}
                        className="flex-1 text-sm font-medium text-stone-700 bg-transparent focus:outline-none"
                      />
                      {diaryDateFilter && (
                        <button onClick={() => setDiaryDateFilter('')} className="text-stone-400 hover:text-rose-500">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm">
                      <Settings className="w-4 h-4 text-stone-400" />
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Sort</span>
                      <select 
                        value={diarySortBy}
                        onChange={(e) => setDiarySortBy(e.target.value as any)}
                        className="flex-1 text-sm font-medium text-stone-700 bg-transparent focus:outline-none appearance-none"
                      >
                        <option value="date-newest">Newest</option>
                        <option value="date-oldest">Oldest</option>
                        <option value="name-az">Name A-Z</option>
                        <option value="name-za">Name Z-A</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-4">
                  {filteredVoiceDiaries.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-stone-100">
                      <Mic className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                      <p className="text-stone-500 font-bold">No entries found</p>
                      <p className="text-xs text-stone-400 mt-1">Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    filteredVoiceDiaries.map(diary => (
                      <div key={diary.id} className="bg-white border border-stone-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-extrabold text-stone-800 text-lg">
                              <HighlightText text={diary.patientName} query={diarySearchQuery} />
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-bold text-stone-400">{diary.date}</span>
                              <span className="w-1 h-1 rounded-full bg-stone-300" />
                              <span className="text-xs font-bold text-primary-600">{diary.duration}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={async () => {
                                if (diary.translatedTranscript) {
                                  // Toggle back to original?
                                  setVoiceDiaries(prev => prev.map(d => d.id === diary.id ? {...d, translatedTranscript: undefined} : d));
                                  return;
                                }
                                const apiKey = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY;
                                const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID;
                                if (!apiKey || !projectId) {
                                  alert('Google API Key or Project ID missing');
                                  return;
                                }
                                setIsTranscribing(true);
                                try {
                                  const translated = await translateTextGoogleCloudV3(diary.transcript, 'en', projectId, apiKey);
                                  setVoiceDiaries(prev => prev.map(d => d.id === diary.id ? {...d, translatedTranscript: translated} : d));
                                } catch (e) {
                                  alert('Translation failed');
                                } finally {
                                  setIsTranscribing(false);
                                }
                              }}
                              className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-2"
                              title="Translate to English"
                            >
                              <Globe className="w-5 h-5" />
                              <span className="text-xs font-bold">{diary.translatedTranscript ? 'Original' : 'Translate'}</span>
                            </button>
                            <button 
                              onClick={() => playDiary(diary.id, diary.translatedTranscript || diary.transcript)}
                              className={`p-2.5 rounded-xl transition-colors ${isPlaying === diary.id ? 'bg-rose-100 text-rose-600' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}
                            >
                              {isPlaying === diary.id ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <button 
                              onClick={() => setDiaryToDelete(diary)}
                              className="p-2.5 bg-stone-50 text-stone-400 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-stone-600 leading-relaxed bg-stone-50/50 p-4 rounded-xl border border-stone-50 whitespace-pre-wrap">
                          {diary.translatedTranscript && <span className="block text-[10px] uppercase tracking-wider font-bold text-indigo-500 mb-2 italic">English Translation:</span>}
                          <HighlightText text={diary.translatedTranscript || diary.transcript} query={diarySearchQuery} />
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : currentScreen === 'med-assistant' ? (
          <div className="pb-24">
            {activePatient && (
              <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 p-3 rounded-full"><User className="w-6 h-6 text-primary-600"/></div>
                  <div>
                    <p className="text-sm text-stone-600 font-medium">Current Patient:</p>
                    <p className="font-extrabold text-stone-800 text-lg">{activePatient.name} | {activePatient.age} | {activePatient.loc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentScreen('patient-records')}
                  className="text-xs font-bold text-primary-600 bg-white px-3 py-1.5 rounded-xl border border-primary-200 hover:bg-primary-50 transition-colors"
                >
                  Change
                </button>
              </div>
            )}
            {network !== 'Good' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-full shrink-0">
                  <WifiOff className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-amber-800">Offline Mode Active</p>
                  <p className="text-xs text-amber-700 mt-0.5 font-medium">Using local AI engine and pre-loaded dataset for symptom analysis.</p>
                </div>
              </div>
            )}
            {medStatus === 'idle' && (
              <div className="space-y-4">
                <input type="text" placeholder="Patient name" value={medInput.name} onChange={e => setMedInput({...medInput, name: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm" />
                <input type="text" placeholder="Known or suspected disease (optional)" value={medInput.disease} onChange={e => setMedInput({...medInput, disease: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm" />
                
                <div className="relative">
                  <textarea placeholder="Enter symptoms (e.g. fever, headache, vomiting) or use microphone" rows={3} value={medInput.symptoms} onChange={e => setMedInput({...medInput, symptoms: e.target.value})} className={`w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm resize-none pr-14 ${isTranscribing ? 'opacity-50 pointer-events-none' : ''}`} />
                  {isTranscribing ? (
                    <div className="absolute right-4 bottom-4 w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  ) : (
                    <button 
                      onClick={toggleMedRecording}
                      className={`absolute right-3 bottom-3 p-2 rounded-xl transition-colors ${isMedRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <input type="text" placeholder="Since when? (e.g. 2 days, 5 hours)" value={medInput.time} onChange={e => setMedInput({...medInput, time: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm" />
                <input type="text" placeholder="Existing conditions (e.g. diabetes, pregnant, BP)" value={medInput.existing} onChange={e => setMedInput({...medInput, existing: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm" />
                
                <button 
                  onClick={handleAnalyze}
                  disabled={!medInput.symptoms}
                  className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl mt-6 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-md shadow-primary-200"
                >
                  Analyze
                </button>
              </div>
            )}

            {medStatus === 'loading' && (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-stone-500 font-bold tracking-wide">Analyzing symptoms...</p>
              </div>
            )}

            {medStatus === 'error' && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>
                <p className="text-rose-600 font-extrabold text-xl">Symptoms not recognized.</p>
                <p className="text-stone-500 font-medium">Please refer patient to nearest PHC.</p>
                <button onClick={() => setMedStatus('idle')} className="mt-6 px-8 py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors">Try Again</button>
              </div>
            )}

            {medStatus === 'success' && medResult && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-rose-600 font-bold text-sm tracking-wide"><T k="offlineModeDataset">Offline Mode - Local Dataset</T></span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-1.5"><T k="possibleDisease">Possible Disease</T></h4>
                  <p className="text-xl font-black text-stone-800"><T>{medResult.disease}</T></p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3"><T k="medicines">Medicines</T></h4>
                  <p className="text-stone-700 font-medium whitespace-pre-line leading-relaxed"><T>{medResult.medicines}</T></p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3"><T k="precautions">Precautions</T></h4>
                  <p className="text-stone-700 font-medium whitespace-pre-line leading-relaxed"><T>{medResult.precautions}</T></p>
                </div>

                <div className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-200">
                  <h4 className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> <T k="referToDoctorIf">Refer to Doctor If</T>
                  </h4>
                  <p className="text-rose-800 font-bold whitespace-pre-line leading-relaxed"><T>{medResult.red_flags}</T></p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3"><T k="homeRemedies">Home Remedies</T></h4>
                  <p className="text-stone-700 font-medium whitespace-pre-line leading-relaxed"><T>{medResult.remedies}</T></p>
                </div>

                <div className="pt-6 space-y-3">
                  <button 
                    onClick={handleSaveReport}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                  >
                    <T k="saveReportToRecords">Save Report to Records</T>
                  </button>
                  <button 
                    onClick={() => { setMedStatus('idle'); setMedInput({ name: '', disease: '', symptoms: '', time: '', existing: '' }); }}
                    className="w-full bg-stone-100 text-stone-700 font-bold py-4 rounded-2xl hover:bg-stone-200 transition-colors"
                  >
                    <T k="newPatient">New Patient</T>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : currentScreen === 'login' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 h-full min-h-[80vh]">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-6 shrink-0">
              <User className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-stone-800 mb-2"><T k="portalTitle">ASHA Worker Portal</T></h2>
            <p className="text-stone-500 mb-8 text-center">
              {loginStep === 'phone' ? <T k="enterPhone">Enter your mobile number to continue</T> : 
               loginStep === 'otp' ? <T k="enterOtp">Enter the verification code sent to your phone</T> : 
               <T k="completeProfile">Complete your profile setup</T>}
            </p>
            
            <div className="w-full bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
              {loginError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-medium text-center">
                  {loginError}
                </div>
              )}
              
              {loginStep === 'phone' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Mobile Number</label>
                    <input 
                      type="tel" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-colors"
                    />
                  </div>
                  <div id="recaptcha-container"></div>
                  <button 
                    onClick={handleSendOtp} 
                    disabled={loginLoading}
                    className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-70 flex justify-center items-center h-14"
                  >
                    {loginLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <T k="sendOtp">Send OTP</T>}
                  </button>
                </div>
              )}

              {loginStep === 'otp' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">6-Digit OTP</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-colors text-center tracking-widest text-lg"
                    />
                  </div>
                  <button 
                    onClick={handleVerifyOtp} 
                    disabled={loginLoading}
                    className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-70 flex justify-center items-center h-14"
                  >
                    {loginLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Verify & Continue'}
                  </button>
                </div>
              )}

              {loginStep === 'profile' && (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1 py-1 -mx-1">
                  <div>
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Full Name</label>
                    <input 
                      type="text" 
                      value={workerProfile.name} 
                      onChange={(e) => setWorkerProfile({...workerProfile, name: e.target.value})}
                      placeholder="Sita Devi"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">ASHA Worker ID</label>
                    <input 
                      type="text" 
                      value={workerProfile.ashaId} 
                      onChange={(e) => setWorkerProfile({...workerProfile, ashaId: e.target.value})}
                      placeholder="AW-2026-8942"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Assigned Village / Ward</label>
                    <input 
                      type="text" 
                      value={workerProfile.village} 
                      onChange={(e) => setWorkerProfile({...workerProfile, village: e.target.value})}
                      placeholder="Village Name"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-colors"
                    />
                  </div>
                  <button 
                    onClick={handleSaveProfile} 
                    className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 mt-2"
                  >
                    Complete Registration
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : currentScreen === 'settings' ? (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-extrabold text-stone-800 mb-6">Settings</h2>
            <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex items-center justify-between">
              <span className="font-bold text-stone-700">Notifications</span>
              <div className="w-12 h-6 bg-primary-600 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex items-center justify-between">
              <span className="font-bold text-stone-700">Dark Mode</span>
              <div className="w-12 h-6 bg-stone-200 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1"></div>
              </div>
            </div>
          </div>
        ) : currentScreen === 'language' ? (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-extrabold text-stone-800 mb-6">{t.selectLanguage}</h2>
            {(['English', 'Hindi', 'Marathi', 'Tamil', 'Kannada'] as Language[]).map((lang, i) => {
              const langLabels = {
                English: 'English',
                Hindi: 'हिंदी (Hindi)',
                Marathi: 'मराठी (Marathi)',
                Tamil: 'தமிழ் (Tamil)',
                Kannada: 'ಕನ್ನಡ (Kannada)'
              };
              return (
                <button 
                  key={lang} 
                  onClick={() => {
                    setSelectedLanguage(lang);
                    setCurrentScreen('home');
                  }} 
                  className={`w-full bg-white rounded-2xl border p-5 shadow-sm flex items-center justify-between transition-colors ${selectedLanguage === lang ? 'border-primary-500 ring-1 ring-primary-500' : 'border-stone-100 hover:border-primary-200'}`}
                >
                  <span className={`font-bold ${selectedLanguage === lang ? 'text-primary-700' : 'text-stone-700'}`}>{langLabels[lang]}</span>
                  {selectedLanguage === lang ? (
                    <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-stone-300"></div>
                  )}
                </button>
              );
            })}
          </div>
        ) : currentScreen === 'profile' ? (
          <div className="p-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
              <User className="w-12 h-12 text-primary-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-stone-800">{authUser?.name || 'ASHA Worker'}</h2>
            <p className="text-stone-500 font-medium mb-8">{authUser?.contactNumber || 'No contact info'}</p>

            <div className="w-full space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2"><T k="personalDetails">Personal Details</T></p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><User className="w-5 h-5 text-primary-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider"><T k="name">Name</T></p>
                      <p className="font-extrabold text-stone-800">{authUser?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><MapPin className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider"><T k="assignedVillage">Assigned Village</T></p>
                      <p className="font-extrabold text-stone-800">{authUser?.village}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2"><T k="officialInfo">Official Info</T></p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider"><T k="ashaId">Asha ID</T></p>
                      <p className="font-extrabold text-stone-800">{authUser?.ashaId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Phone className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider"><T k="contactNumber">Contact Number</T></p>
                      <p className="font-extrabold text-stone-800">{authUser?.contactNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full space-y-3 mt-6">
              <button onClick={() => setCurrentScreen('settings')} className="w-full bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex items-center gap-4 hover:border-primary-200 transition-colors text-left">
                <Settings className="w-6 h-6 text-stone-400" />
                <span className="font-bold text-stone-700 flex-1"><T k="settings">Settings</T></span>
              </button>
              <button onClick={() => setCurrentScreen('language')} className="w-full bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex items-center gap-4 hover:border-primary-200 transition-colors text-left">
                <Globe className="w-6 h-6 text-stone-400" />
                <span className="font-bold text-stone-700 flex-1"><T k="selectLanguage">Select Language</T></span>
              </button>
              <button onClick={() => setShowHelpDialog(true)} className="w-full bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex items-center gap-4 hover:border-primary-200 transition-colors text-left">
                <HelpCircle className="w-6 h-6 text-stone-400" />
                <span className="font-bold text-stone-700 flex-1">{t.helpSupport}</span>
              </button>
              <button onClick={() => setShowLogoutConfirm(true)} className="w-full bg-rose-50 rounded-2xl border border-rose-100 p-4 shadow-sm flex items-center gap-4 hover:border-rose-200 transition-colors text-left mt-4">
                <LogOut className="w-6 h-6 text-rose-500" />
                <span className="font-bold text-rose-600 flex-1">{t.logout}</span>
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Bottom Navigation */}
      {currentScreen !== 'login' && (
        <nav className="h-20 bg-white border-t border-stone-100 flex items-center justify-around px-4 pb-2 relative z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <NavItem icon={Home} label={t.home} active={currentScreen === 'home'} onClick={() => setCurrentScreen('home')} />
          <NavItem icon={ClipboardList} label={t.records} active={currentScreen === 'patient-records'} onClick={() => setCurrentScreen('patient-records')} />
          <NavItem icon={Mic} label={t.voice} active={currentScreen === 'voice-diary'} onClick={() => setCurrentScreen('voice-diary')} />
          <NavItem icon={User} label={t.profile} active={currentScreen === 'profile'} onClick={() => setCurrentScreen('profile')} />
        </nav>
      )}

      {/* Side Navigation Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[60]"
            />
            
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-white z-[70] shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-stone-800">{t.ashaLink}</h2>
                    <p className="text-xs text-stone-500 font-medium">vishvcode@gmail.com</p>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto py-4">
                <DrawerItem icon={Settings} label={t.settings} onClick={() => { setCurrentScreen('settings'); setIsDrawerOpen(false); }} />
                <DrawerItem icon={Globe} label={t.selectLanguage} onClick={() => { setCurrentScreen('language'); setIsDrawerOpen(false); }} />
                <DrawerItem icon={HelpCircle} label={t.helpSupport} onClick={() => { setShowHelpDialog(true); setIsDrawerOpen(false); }} />
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-stone-100">
                <DrawerItem icon={LogOut} label={t.logout} isRed onClick={() => { setShowLogoutConfirm(true); setIsDrawerOpen(false); }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Help Dialog */}
      <AnimatePresence>
        {showHelpDialog && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHelpDialog(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl">
              <h2 className="text-xl font-extrabold text-stone-800 mb-4">{t.helpSupport}</h2>
              <div className="space-y-3 text-stone-600 font-medium">
                <p>📞 Health Helpline: <span className="font-bold text-stone-800">104</span></p>
                <p>🚑 Ambulance: <span className="font-bold text-stone-800">108</span></p>
                <p>👩 Women Helpline: <span className="font-bold text-stone-800">1091</span></p>
                <p>🏥 Blood Bank: <span className="font-bold text-stone-800">1910</span></p>
                <div className="border-t border-stone-100 my-4 pt-4">
                  <p className="text-sm text-stone-500">App Version: 1.0<br/>For Asha Workers - Govt of India</p>
                </div>
              </div>
              <button onClick={() => setShowHelpDialog(false)} className="w-full bg-stone-100 text-stone-800 font-bold py-3 rounded-xl mt-2 hover:bg-stone-200 transition-colors">
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirm Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogoutConfirm(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl">
              <h2 className="text-xl font-extrabold text-stone-800 mb-2">{t.logout}</h2>
              <p className="text-stone-600 font-medium mb-6">Are you sure you want to logout?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-stone-100 text-stone-800 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">
                  Cancel
                </button>
                <button onClick={() => { 
                  setShowLogoutConfirm(false); 
                  setAuthUser(null);
                  localStorage.removeItem('aashalink_user');
                  setLoginStep('phone');
                  setPhoneNumber('+91');
                  setOtp('');
                  setCurrentScreen('login'); 
                }} className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-md shadow-rose-200">
                  Yes, Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Diary Confirm Dialog */}
      <AnimatePresence>
        {showDeleteDiaryConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteDiaryConfirm(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl">
              <h2 className="text-xl font-extrabold text-stone-800 mb-2">Delete Entry</h2>
              <p className="text-stone-600 font-medium mb-6">Are you sure you want to delete this voice diary entry? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteDiaryConfirm(false)} className="flex-1 bg-stone-100 text-stone-800 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">
                  Cancel
                </button>
                <button onClick={() => { setShowDeleteDiaryConfirm(false); setTranscript(''); }} className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-md shadow-rose-200">
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Saved Diary Confirm Dialog */}
      <AnimatePresence>
        {diaryToDelete && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDiaryToDelete(null)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-extrabold text-stone-800 mb-2">Delete Saved Entry</h2>
              <p className="text-stone-600 font-medium mb-6">Are you sure you want to delete the diary for <span className="text-stone-900 font-bold">{diaryToDelete.patientName}</span>? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDiaryToDelete(null)} className="flex-1 bg-stone-100 text-stone-800 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={() => { 
                    setVoiceDiaries(prev => prev.filter(d => d.id !== diaryToDelete.id));
                    if (isPlaying === diaryToDelete.id) {
                      window.speechSynthesis.cancel();
                      setIsPlaying(null);
                    }
                    setDiaryToDelete(null); 
                  }} 
                  className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-md shadow-rose-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </TranslationContext.Provider>
  );
}
