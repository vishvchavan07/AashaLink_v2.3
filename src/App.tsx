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
  Download,
  ShieldCheck,
  Lock as LucideLock,
  Camera,
  ArrowRight,
  Box,
  Package,
  History as LucideHistory,
  Moon,
  Sun,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import rawData from './data/raw_datasets.json';
import { db, auth, addCollectionData, getCollectionData, updateCollectionData } from './firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import localforage from 'localforage';

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

import { 
  translations as initialTranslations, 
  Language, 
  translateWithAI, 
  getStoredDynamicTranslations, 
  saveDynamicTranslation 
} from './translations';
import { 
  transcribeAudioWithGemini, 
  translateTextWithGemini, 
  analyzeEntitiesWithGemini 
} from './ai';

// --- Types ---
type NetworkStatus = 'Good' | 'Poor' | 'No network';
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
const langCodeMap: Record<Language, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Tamil: 'ta-IN',
  Kannada: 'kn-IN'
};
type Screen = 'home' | 'patient-records' | 'blood-bank' | 'med-assistant' | 'bed-availability' | 'voice-diary' | 'settings' | 'language' | 'login' | 'profile' | 'permissions' | 'asha-news' | 'supply-requests';

const translations = initialTranslations;

const t_func = (selectedLanguage: Language, key: string, fallback: string) => {
  const dynamic = getStoredDynamicTranslations();
  return (translations[selectedLanguage] as any)[key] || (dynamic[key] && dynamic[key][selectedLanguage]) || (translations['English'] as any)[key] || fallback;
};

// --- Translation Context ---
const TranslationContext = React.createContext<{
  selectedLanguage: Language;
  setSelectedLanguage: (l: Language) => void;
  t: (key: string, original?: string) => string;
  translateMissingKey: (key: string, original: string) => Promise<void>;
} | null>(null);

const T = ({ k, children }: { k?: string, children: string }) => {
  const context = React.useContext(TranslationContext);
  const selectedLanguage = context?.selectedLanguage || 'English';
  const [displayText, setDisplayText] = React.useState(t_func(selectedLanguage, k || children, children));

  React.useEffect(() => {
    setDisplayText(t_func(selectedLanguage, k || children, children));
    
    if (k && selectedLanguage !== 'English' && !((translations[selectedLanguage] as any)[k] || (getStoredDynamicTranslations()[k] && getStoredDynamicTranslations()[k][selectedLanguage]))) {
      context?.translateMissingKey(k, children);
    }
  }, [selectedLanguage, k, children, context]);

  if (!k) return <span>{children}</span>;
  return (
    <motion.span
      key={displayText}
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {displayText}
    </motion.span>
  );
};

const StatusChip = ({ syncStatus }: { syncStatus: SyncStatus }) => {
  const context = React.useContext(TranslationContext);
  const selectedLanguage = context?.selectedLanguage || 'English';
  
  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return t_func(selectedLanguage, 'syncing', "Syncing...");
      case 'synced': return t_func(selectedLanguage, 'synced', "All data synced");
      case 'error': return t_func(selectedLanguage, 'error', "Sync failed");
      case 'offline': return t_func(selectedLanguage, 'offline', "Offline mode");
      default: return t_func(selectedLanguage, 'cloudReady', "Cloud ready");
    }
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
      syncStatus === 'syncing' ? 'bg-amber-100 text-amber-700' :
      syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-700' :
      syncStatus === 'error' ? 'bg-rose-100 text-rose-700' :
      'bg-blue-100 text-blue-700'
    }`}>
      {syncStatus === 'syncing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 
       syncStatus === 'synced' ? <CheckCircle2 className="w-3 h-3" /> :
       syncStatus === 'error' ? <AlertCircle className="w-3 h-3" /> :
       <Cloud className="w-3 h-3" />}
      {getStatusText()}
    </div>
  );
};

type Patient = { 
  id?: string;
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
  latitude?: number;
  longitude?: number;
};
type SupplyItem = { name: string; quantity: number; barcode?: string };
type SupplyRequest = { 
  id?: string;
  items: SupplyItem[];
  status: 'pending' | 'approved' | 'rejected';
  latitude?: number;
  longitude?: number;
  image_path?: string;
  sync_status: 'pending' | 'synced';
  created_at: string;
};
type KitTemplate = { name: string; items: SupplyItem[]; icon: any };
type BloodBank = { name: string; address: string; phone: string; lat: number; lng: number; groups: string[]; lowStockGroups?: string[]; distance: number };
type VoiceDiaryEntry = { id: string; patientName: string; date: string; duration: string; transcript: string; translatedTranscript?: string; tags?: string[] };

type AshaWorker = {
  name: string;
  ashaId: string;
  village: string;
  designation: string;
  contactNumber: string;
  emergencyContact1: string;
  supervisorContact: string;
  autoSosEnabled: boolean;
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

const emergencyServices = [
  { name: "City General Hospital", type: "Hospital", lat: 18.5204, lng: 73.8567, phone: "102" },
  { name: "Central Police Station", type: "Police", lat: 18.5254, lng: 73.8617, phone: "100" },
  { name: "Emergency Trauma Center", type: "Hospital", lat: 18.5154, lng: 73.8517, phone: "108" }
];

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

  return (
    <div className="glass-panel w-full flex divide-x divide-white/20 relative z-20">
      <button 
        onClick={onToggle}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-white/40 transition-colors cursor-pointer"
      >
        {status === 'No network' ? <WifiOff className={`w-4 h-4 ${getNetworkColor()}`} /> : <Wifi className={`w-4 h-4 ${getNetworkColor()}`} />}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${getNetworkColor()}`}><T k={status === 'No network' ? 'noNetwork' : status === 'Poor' ? 'poorNetwork' : 'goodNetwork'}>{status + " Network"}</T></span>
      </button>
      <div className="flex-1 flex items-center justify-center gap-2 py-2.5">
        <StatusChip syncStatus={syncStatus} />
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, label, k, onClick }: { icon: any; label: string; k?: string; onClick: () => void }) => (
  <motion.button
    whileTap={{ scale: 0.94, rotate: [-1, 1, 0] }}
    whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
    onClick={onClick}
    className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center gap-3 group relative overflow-hidden transition-shadow"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    <div className="relative p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl group-hover:shadow-md transition-all duration-300">
      <Icon className="w-8 h-8 text-primary-600 group-hover:scale-110 transition-transform duration-300" />
    </div>
    <span className="relative text-sm font-bold text-slate-800 tracking-tight"><T k={k}>{label}</T></span>
  </motion.button>
);

const NavItem = ({ icon: Icon, label, k, active = false, onClick }: { icon: any; label: string; k?: string; active?: boolean; onClick?: () => void }) => (
  <motion.button 
    whileTap={{ scale: 0.9, y: 2 }}
    onClick={onClick} 
    className={`flex flex-col items-center gap-1.5 ${active ? 'text-primary-600' : 'text-stone-400 hover:text-stone-600'} transition-colors`}
  >
    <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="text-[10px] font-bold uppercase tracking-widest"><T k={k}>{label}</T></span>
  </motion.button>
);

const DrawerItem = ({ icon: Icon, label, k, isRed = false, onClick }: { icon: any; label: string; k?: string; isRed?: boolean; onClick?: () => void }) => (
  <motion.button 
    whileTap={{ scale: 0.98, x: 5 }}
    onClick={onClick} 
    className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors ${isRed ? 'text-rose-600' : 'text-stone-700'}`}
  >
    <Icon className="w-6 h-6" />
    <span className="font-semibold"><T k={k}>{label}</T></span>
  </motion.button>
);



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

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h2>Something went wrong in App component.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const PermissionScreen = ({ onComplete }: { onComplete: (granted: { autoSms: boolean }) => void }) => {
  const [granted, setGranted] = useState({ mic: false, cam: false, loc: false, autoSms: false });
  const [requesting, setRequesting] = useState(false);

  const requestAll = async () => {
    setRequesting(true);
    
    // Request Microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setGranted(prev => ({ ...prev, mic: true }));
    } catch (e) { console.error("Mic denied"); }

    // Request Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setGranted(prev => ({ ...prev, cam: true }));
    } catch (e) { console.error("Cam denied"); }

    // Request Location
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      setGranted(prev => ({ ...prev, loc: true }));
    } catch (e) { console.error("Loc denied"); }

    // Request Automatic SMS Permission (Soft Permission)
    setGranted(prev => ({ ...prev, autoSms: true }));

    setRequesting(false);
  };

  const isAllDone = granted.mic && granted.loc; // Camera is optional for now

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 pt-20">
      <div className="flex-1 max-w-md mx-auto w-full flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
          <ShieldCheck className="w-10 h-10 text-primary-600" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4"><T k="onboardingTitle">App Permissions</T></h2>
        <p className="text-slate-500 font-medium mb-12"><T k="onboardingSub">AashaLink needs these permissions to provide life-saving health services.</T></p>

        <div className="w-full space-y-4 mb-12">
          <div className={`p-5 rounded-3xl border-2 transition-all flex items-center gap-5 ${granted.loc ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
            <div className={`p-3 rounded-2xl ${granted.loc ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <MapPin className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-bold text-slate-800"><T k="locationAccess">Location Access</T></h4>
              <p className="text-xs text-slate-500"><T k="locationSub">Needed for SOS emergency alerts and finding nearby beds.</T></p>
            </div>
            {granted.loc && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          </div>

          <div className={`p-5 rounded-3xl border-2 transition-all flex items-center gap-5 ${granted.mic ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
            <div className={`p-3 rounded-2xl ${granted.mic ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Mic className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-bold text-slate-800"><T k="micAccess">Microphone Access</T></h4>
              <p className="text-xs text-slate-500"><T k="micSub">Essential for recording Voice Diaries and AI transcription.</T></p>
            </div>
            {granted.mic && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          </div>

          <div className={`p-5 rounded-3xl border-2 transition-all flex items-center gap-5 ${granted.cam ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
            <div className={`p-3 rounded-2xl ${granted.cam ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-bold text-slate-800"><T k="cameraAccess">Camera Access</T></h4>
              <p className="text-xs text-slate-500"><T k="cameraSub">Used for scanning reports and taking profile photos.</T></p>
            </div>
            {granted.cam && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          </div>

          <div className={`p-5 rounded-3xl border-2 transition-all flex items-center gap-5 ${granted.autoSms ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
            <div className={`p-3 rounded-2xl ${granted.autoSms ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-bold text-slate-800"><T k="autoSmsAccess">Automatic Emergency Alerts</T></h4>
              <p className="text-xs text-slate-500"><T k="autoSmsSub">Allows sending SMS and WhatsApp alerts to supervisor automatically without confirmation.</T></p>
            </div>
            {granted.autoSms && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          </div>
        </div>

        {!isAllDone ? (
          <button 
            onClick={requestAll}
            disabled={requesting}
            className="w-full bg-primary-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-primary-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            {requesting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><LucideLock className="w-6 h-6" /> <T k="allowAccess">Allow Access</T></>}
          </button>
        ) : (
          <motion.button 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => onComplete({ autoSms: granted.autoSms })}
            className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <T k="continueToApp">Continue to App</T> <ArrowRight className="w-6 h-6" />
          </motion.button>
        )}
      </div>
    </div>
  );
};

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

  const t = translations[selectedLanguage] || translations['English'];

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

  const translateMissingKey = async (key: string, original: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || selectedLanguage === 'English') return;
    
    // Check if already translating
    const dynamic = getStoredDynamicTranslations();
    if (dynamic[key] && dynamic[key][selectedLanguage]) return;

    try {
      const translated = await translateWithAI(original, selectedLanguage, apiKey);
      saveDynamicTranslation(key, selectedLanguage, translated);
      // Force re-render of translation components
      setDynamicTranslations(getStoredDynamicTranslations());
    } catch (e) {
      console.error("Dynamic translation failed", e);
    }
  };

  const t_func_ctx = (key: string, original?: string) => {
    return t_func(selectedLanguage, key, original || key);
  };

  const pageTransition = {
    initial: { opacity: 0, scale: 0.98, filter: 'blur(10px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 1.02, filter: 'blur(10px)' },
    transition: { type: 'spring', damping: 25, stiffness: 200 }
  };

  const buttonClick = {
    whileTap: { scale: 0.94, rotate: [-1, 1, 0] },
    whileHover: { y: -2 }
  };

  const contextValue = React.useMemo(() => ({
    selectedLanguage,
    setSelectedLanguage,
    t: t_func_ctx,
    translateMissingKey
  }), [selectedLanguage, dynamicTranslations]);

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
  const [loginStep, setLoginStep] = useState<'language' | 'phone' | 'otp' | 'profile'>('language');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [workerProfile, setWorkerProfile] = useState<AshaWorker>({
    name: '', ashaId: '', village: '', designation: 'ASHA Worker', contactNumber: '',
    emergencyContact1: '', supervisorContact: '', autoSosEnabled: false
  });
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [showMockNotification, setShowMockNotification] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setDeviceType('mobile');
      else if (width < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!authUser && currentScreen !== 'login') {
      setCurrentScreen('login');
    }
  }, [authUser, currentScreen]);



  const syncOfflineDataToFirebase = async () => {
    if (network === 'No network') return;
    
    try {
      const syncQueue: any[] = await localforage.getItem('aashalink_sync_queue') || [];
      if (syncQueue.length === 0) {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
        return;
      }
      
      setSyncStatus('syncing');
      const failedItems: any[] = [];
      
      for (const item of syncQueue) {
        try {
          if (item.type === 'ADD_PATIENT') {
            await addCollectionData('patients', item.data);
          } else if (item.type === 'ADD_DIARY') {
            await addCollectionData('voiceDiaries', item.data);
          } else if (item.type === 'ADD_REPORT') {
            await addCollectionData('medicalReports', item.data);
          } else if (item.type === 'UPDATE_PATIENT') {
            await updateCollectionData('patients', item.id, item.data);
          }
        } catch (err) {
          console.error("Failed to sync item", item, err);
          failedItems.push(item);
        }
      }
      
      await localforage.setItem('aashalink_sync_queue', failedItems);
      
      if (failedItems.length === 0) {
        setSyncStatus('synced');
        // Refresh local data from Firebase after sync
        const freshPatients = await getCollectionData('patients');
        if (freshPatients.length > 0) {
          setPatients(freshPatients);
          await localforage.setItem('aashalink_patients', freshPatients);
        }
      } else {
        setSyncStatus('error');
      }
      
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      console.error("Sync process error", e);
      setSyncStatus('error');
    }
  };

  const addToSyncQueue = async (type: string, data: any, id?: string) => {
    const syncQueue: any[] = await localforage.getItem('aashalink_sync_queue') || [];
    syncQueue.push({ type, data, id, timestamp: Date.now() });
    await localforage.setItem('aashalink_sync_queue', syncQueue);
    
    if (network === 'Good') {
      syncOfflineDataToFirebase();
    }
  };

  useEffect(() => {
    let wasOffline = !navigator.onLine;

    const measureActualLatency = async (): Promise<number> => {
      try {
        const start = performance.now();
        await fetch('/favicon.ico?cache_bust=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
        return performance.now() - start;
      } catch (e) {
        return -1;
      }
    };

    const updateNetworkStatus = async () => {
      if (!navigator.onLine) {
        setNetwork('No network');
        wasOffline = true;
        setSyncStatus('offline');
        return;
      }

      let isPoor = false;
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          isPoor = true;
        }
      }

      const latency = await measureActualLatency();
      if (latency === -1) {
        setNetwork('No network');
        setSyncStatus('offline');
        wasOffline = true;
        return;
      } else if (latency > 800) {
        isPoor = true;
      }

      if (isPoor) {
        setNetwork('Poor');
        if (wasOffline) {
          syncOfflineDataToFirebase();
          wasOffline = false;
        }
      } else {
        setNetwork('Good');
        if (wasOffline) {
          syncOfflineDataToFirebase();
          wasOffline = false;
        }
      }
    };

    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    const interval = setInterval(updateNetworkStatus, 15000);

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      clearInterval(interval);
      if (conn) {
        conn.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  useEffect(() => {
    // Simulated Hardware Trigger (e.g. Volume Up 3 times)
    let clickCount = 0;
    let lastClickTime = 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Browsers can't intercept Power Button, so we use Volume buttons as simulated trigger
      if (e.key === 'VolumeUp' || e.key === 'AudioVolumeUp') {
        const now = Date.now();
        if (now - lastClickTime < 1000) {
          clickCount++;
        } else {
          clickCount = 1;
        }
        lastClickTime = now;

        if (clickCount >= 3) {
          console.log("Hardware Trigger Detected: Activating SOS");
          // Trigger the SOS logic by dispatching a click to the SOS button
          const sosBtn = document.getElementById('sos-trigger-btn');
          if (sosBtn) (sosBtn as HTMLElement).click();
          clickCount = 0;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authUser]);

  // --- Patient Records State ---
  const [ashaNews, setAshaNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5005';
        const res = await fetch(`${apiUrl}/api/updates`);
        const data = await res.json();
        setAshaNews(data);
      } catch (e) {
        console.error("Failed to fetch ASHA news:", e);
        // Fallback to empty if offline
      } finally {
        setNewsLoading(false);
      }
    };
    if (currentScreen === 'home' || currentScreen === 'asha-news') {
      fetchNews();
    }
  }, [currentScreen]);

  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>(() => {
    try {
      const saved = localStorage.getItem('aashalink_supply_requests');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('aashalink_patients');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing patients from localStorage", e);
    }
    return [];
  });

  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('aashalink_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('aashalink_theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#020617');
    } else {
      document.body.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
    }
  }, [theme]);

  const [masterItems, setMasterItems] = useState<SupplyItem[]>([]);
  const [kits, setKits] = useState<KitTemplate[]>([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      const itemsData = await getCollectionData('items');
      const templatesData = await getCollectionData('templates');
      
      if (itemsData.length > 0) setMasterItems(itemsData as any);
      if (templatesData.length > 0) {
        setKits(templatesData.map((t: any) => ({
          ...t,
          icon: t.name.includes('Maternal') ? User : t.name.includes('Emergency') ? ShieldAlert : Box
        })));
      } else {
        setKits(kitTemplates); // Fallback to local
      }
    };
    fetchMasterData();
  }, []);

  const syncAllData = async () => {
    if (network === 'No network') return;
    setSyncStatus('syncing');
    
    try {
      // Sync Patients
      const pendingPatients = patients.filter(p => !p.id);
      for (const p of pendingPatients) {
        const id = await addCollectionData('patients', { ...p, asha_id: authUser?.ashaId });
        setPatients(prev => prev.map(item => item.name === p.name ? { ...item, id } : item));
      }

      // Sync Supply Requests
      const pendingRequests = supplyRequests.filter(r => r.sync_status === 'pending');
      for (const r of pendingRequests) {
        let imageUrl = r.image_path;
        if (r.image_path && r.image_path.startsWith('data:')) {
          // In real app, convert base64 to blob and upload
          // imageUrl = await uploadFile(`requests/${Date.now()}.jpg`, blob);
        }
        await addCollectionData('supplyRequests', { ...r, asha_id: authUser?.ashaId, image_url: imageUrl, sync_status: 'synced' });
        setSupplyRequests(prev => prev.map(item => item.created_at === r.created_at ? { ...item, sync_status: 'synced' } : item));
      }

      setSyncStatus('synced');
    } catch (e) {
      console.error("Sync failed:", e);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    const timer = setInterval(syncAllData, 30000); // Sync every 30s
    return () => clearInterval(timer);
  }, [network, patients, supplyRequests]);

  useEffect(() => {
    localStorage.setItem('aashalink_supply_requests', JSON.stringify(supplyRequests));
  }, [supplyRequests]);

  const kitTemplates: KitTemplate[] = [
    { name: "Basic Kit", icon: Box, items: [{ name: "ORS Packet", quantity: 10 }, { name: "Paracetamol", quantity: 20 }, { name: "Bandages", quantity: 5 }] },
    { name: "Maternal Kit", icon: User, items: [{ name: "Iron Tablets", quantity: 100 }, { name: "Folic Acid", quantity: 100 }, { name: "Calcium", quantity: 50 }] },
    { name: "Emergency Kit", icon: ShieldAlert, items: [{ name: "Antiseptic", quantity: 2 }, { name: "Gauze", quantity: 10 }, { name: "Thermometer", quantity: 1 }] }
  ];

  const [currentRequest, setCurrentRequest] = useState<SupplyItem[]>([]);
  const [requestPhoto, setRequestPhoto] = useState<string | null>(null);

  const handleAddSupplyRequest = async () => {
    if (currentRequest.length === 0) return;
    
    const newReq: SupplyRequest = {
      items: [...currentRequest],
      status: 'pending',
      latitude: userLocation?.lat,
      longitude: userLocation?.lng,
      image_path: requestPhoto || undefined,
      sync_status: 'pending',
      created_at: new Date().toISOString()
    };

    setSupplyRequests(prev => [...prev, newReq]);
    setCurrentRequest([]);
    setRequestPhoto(null);
    setCurrentScreen('home');
  };


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
    address: '',
    photo: '',
    latitude: undefined,
    longitude: undefined
  });

  const handleAddPatient = async () => {
    if (!newPatient.name || !newPatient.age) {
      alert("Name and Age are required.");
      return;
    }

    const patientToAdd = {
      ...newPatient,
      date: new Date().toISOString().split('T')[0]
    };

    setPatients(prev => [...prev, patientToAdd]);
    
    // Save to Firebase if online
    if (Object.keys(db).length !== 0) {
      try {
        await addDoc(collection(db, 'patients'), patientToAdd);
      } catch (e) {
        console.error("Firebase sync failed, saved locally.");
      }
    }

    setIsAddModalOpen(false);
    setNewPatient({ 
      name: '', age: '', loc: '', disease: '', 
      date: new Date().toISOString().split('T')[0], 
      bloodGroup: 'A+', dob: '', contact: '', emergencyContact: '', 
      address: '', photo: '', latitude: undefined, longitude: undefined 
    });
  };

  useEffect(() => {
    localStorage.setItem('aashalink_patients', JSON.stringify(patients));
  }, [patients]);

  const [helpWordCount, setHelpWordCount] = useState(0);
  const helpTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!workerProfile.autoSosEnabled || isSosActive) return;

    // Initialize Voice SOS Trigger
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; 

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.toLowerCase();
          
          if (transcript.includes('help')) {
            const occurrences = (transcript.match(/help/g) || []).length;
            setHelpWordCount(prev => {
              const newCount = prev + occurrences;
              if (newCount >= 3) {
                console.warn("🚨 VOICE SOS TRIGGERED!");
                triggerSOS();
                return 0;
              }
              return newCount;
            });

            if (helpTimeoutRef.current) clearTimeout(helpTimeoutRef.current);
            helpTimeoutRef.current = setTimeout(() => {
              setHelpWordCount(0);
            }, 5000);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        console.error("Speech Recognition Error:", event.error);
      }
    };

    recognition.onend = () => {
      if (workerProfile.autoSosEnabled && !isSosActive) {
        try { recognition.start(); } catch(e) {}
      }
    };

    try {
      recognition.start();
    } catch(e) {}

    return () => {
      recognition.stop();
      if (helpTimeoutRef.current) clearTimeout(helpTimeoutRef.current);
    };
  }, [workerProfile.autoSosEnabled, isSosActive]);

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

  const handleSavePatient = async () => {
    if (!newPatient.name || !newPatient.age || !newPatient.loc || !newPatient.disease) return;
    
    const patientData = {
      ...newPatient,
      id: Date.now().toString(),
      lastUpdated: new Date().toISOString(),
      ashaId: authUser?.ashaId
    };

    const updatedPatients = [...patients, patientData];
    setPatients(updatedPatients);
    await localforage.setItem('aashalink_patients_db', updatedPatients);
    
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
      address: '',
      photo: '',
      latitude: undefined,
      longitude: undefined
    });
    setIsAddModalOpen(false);

    // Add to sync queue for Firebase
    const pending = JSON.parse(localStorage.getItem('aashalink_pending_sync') || '[]');
    pending.push({ type: 'ADD_PATIENT', data: patientData });
    localStorage.setItem('aashalink_pending_sync', JSON.stringify(pending));
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
          const audioBlob = new Blob(medAudioChunksRef.current, { type: medRecorderRef.current?.mimeType || 'audio/webm' });
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          
          if (!apiKey || apiKey.includes('your_gemini')) {
            alert('Gemini API Key is missing in .env');
            return;
          }

          setIsTranscribing(true);
          try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            const result = await transcribeAudioWithGemini(audioBlob, selectedLanguage, apiKey);
            if (result) {
              setMedInput(prev => ({...prev, symptoms: prev.symptoms + (prev.symptoms ? ' ' : '') + result.trim()}));
            }
          } catch (error) {
            console.error('AI Processing Error:', error);
            alert('AI recognition failed.');
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
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

          if (!apiKey || apiKey.includes('your_gemini')) {
            alert('Gemini API Key is missing in .env');
            return;
          }

          if (network === 'Good') {
            setIsTranscribing(true);
            try {
              const result = await transcribeAudioWithGemini(audioBlob, selectedLanguage, apiKey);
              if (result) {
                setTranscript(prev => prev + (prev ? ' ' : '') + result.trim());
              }
            } catch (error) {
              console.error('Speech-to-Text Error:', error);
              alert('Speech recognition failed. Ensure you have network connectivity and valid API keys.');
            } finally {
              setIsTranscribing(false);
            }
          } else {
            // Offline fallback: Web Speech API (often works offline on Chrome/Android)
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
              const recognition = new SpeechRecognition();
              recognition.lang = langCodeMap[selectedLanguage];
              recognition.continuous = false;
              recognition.interimResults = false;
              
              recognition.onresult = (event: any) => {
                const result = event.results[0][0].transcript;
                setTranscript(prev => prev + (prev ? ' ' : '') + result.trim());
              };
              
              recognition.onerror = () => {
                alert('Offline transcription unavailable. Please type your diary entry manually.');
              };
              
              recognition.start();
            } else {
              alert('Offline Mode Active: Voice-to-text requires an internet connection on this device. Please type your entry manually.');
            }
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
    
    let tags: string[] = [];
    
    if (network === 'Good') {
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (apiKey && !apiKey.includes('your_gemini')) {
          const nlpResult = await analyzeEntitiesWithGemini(transcript, apiKey);
          if (nlpResult && nlpResult.entities) {
            tags = nlpResult.entities
              .slice(0, 3)
              .map(e => e.name);
          }
        }
      } catch (e) {
        console.error("NLP extraction failed", e);
      }
    } else {
      // Local fallback: Simple keyword extraction
      const commonKeywords = ['fever', 'cough', 'pregnancy', 'delivery', 'vaccine', 'nutrition', 'blood', 'weakness', 'pain'];
      const words = transcript.toLowerCase().split(/\W+/);
      tags = commonKeywords.filter(kw => words.includes(kw)).slice(0, 3);
      if (tags.length === 0) tags = ['Offline Entry'];
    }

    const newEntry: VoiceDiaryEntry = {
      id: Date.now().toString(),
      patientName: activePatient?.name || 'Unknown Patient',
      date: new Date().toISOString().split('T')[0],
      duration: formatTime(recordingTime),
      transcript: transcript,
      tags: tags
    };
    
    const updatedDiaries = [newEntry, ...voiceDiaries];
    setVoiceDiaries(updatedDiaries);
    await localforage.setItem('aashalink_diaries_db', updatedDiaries);
    
    setTranscript('');
    setRecordingTime(0);
    setDiaryTab('list');

    const pending = JSON.parse(localStorage.getItem('aashalink_pending_sync') || '[]');
    pending.push({ type: 'ADD_DIARY', data: newEntry });
    localStorage.setItem('aashalink_pending_sync', JSON.stringify(pending));
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
    
    const updatedPatient = {
      ...activePatient,
      disease: medResult.disease
    };
    
    const updatedPatients = patients.map(p => 
      p.name === activePatient.name ? updatedPatient : p
    );
    
    setPatients(updatedPatients);
    setActivePatient(updatedPatient);

    const pending = JSON.parse(localStorage.getItem('aashalink_pending_sync') || '[]');
    pending.push({ type: 'UPDATE_PATIENT', data: updatedPatient });
    localStorage.setItem('aashalink_pending_sync', JSON.stringify(pending));
    
    setMedStatus('idle');
    setMedInput({ name: '', disease: '', symptoms: '', time: '', existing: '' });
  };

  const medicalDataset: MedicalRecord[] = [
    {
      id: 1,
      disease: 'Dengue Fever',
      keywords: ['high fever', 'severe headache', 'pain behind eyes', 'joint pain', 'muscle pain', 'rash', 'nausea'],
      medicines: 'Paracetamol 500mg, Hydration',
      precautions: 'Use mosquito nets, wear long sleeves, remove stagnant water.',
      red_flags: 'Severe abdominal pain, persistent vomiting, bleeding from gums or nose, difficulty breathing.',
      remedies: 'Rest, plenty of fluids, papaya leaf extract (traditional).',
      duration_warning: 'Symptoms typically last 2-7 days.'
    },
    {
      id: 2,
      disease: 'Common Cold / Flu',
      keywords: ['fever', 'cough', 'sore throat', 'runny nose', 'sneezing', 'body ache'],
      medicines: 'Cetirizine, Paracetamol, Vitamin C',
      precautions: 'Hand washing, avoid close contact, wear mask.',
      red_flags: 'High fever (>102F), chest pain, severe cough, difficulty swallowing.',
      remedies: 'Warm saltwater gargle, steam inhalation, ginger tea.',
      duration_warning: 'Should improve in 5-7 days.'
    },
    {
      id: 3,
      disease: 'Acute Diarrhea',
      keywords: ['loose stools', 'stomach cramps', 'nausea', 'vomiting', 'bloating'],
      medicines: 'ORS (Oral Rehydration Salts), Zinc tablets',
      precautions: 'Wash hands with soap, drink boiled water, keep food covered.',
      red_flags: 'Signs of dehydration (dry mouth, sunken eyes), bloody stools, severe weakness.',
      remedies: 'Coconut water, rice water, curd (probiotics).',
      duration_warning: 'Seek medical help if it persists beyond 48 hours.'
    },
    {
      id: 4,
      disease: 'Anemia',
      keywords: ['fatigue', 'weakness', 'pale skin', 'dizziness', 'shortness of breath', 'brittle nails'],
      medicines: 'Iron and Folic Acid (IFA) tablets',
      precautions: 'Eat iron-rich foods, avoid tea/coffee immediately after meals.',
      red_flags: 'Fainting spells, rapid heartbeat, extreme paleness.',
      remedies: 'Spinach, jaggery, amla, lentils, pomegranate.',
      duration_warning: 'Requires long-term dietary adjustment and supplementation.'
    }
  ];

  const handleAnalyze = async () => {
    if (!medInput.symptoms) return;
    setMedStatus('loading');
    
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
        const apiKey = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY; 
        const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID;
        
        if (apiKey && projectId && selectedLanguage !== 'English') {
          try {
            const translated: any = { ...bestMatch };
            const fieldsToTranslate = ['disease', 'medicines', 'precautions', 'red_flags', 'remedies', 'duration_warning'];
            for (const field of fieldsToTranslate) {
              translated[field] = bestMatch[field as keyof MedicalRecord];
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

    if (network === 'Good' && import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_GEMINI_API_KEY.includes('your_gemini')) {
      // Online mode: Call Gemini AI
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const entityNames = nlpEntities.map(e => e.name).join(', ');
        const prompt = `You are a medical assistant for an ASHA worker in rural India.
Suspected: ${medInput.disease}
Symptoms: ${medInput.symptoms}
Duration: ${medInput.time}
Existing conditions: ${medInput.existing}

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
          
          // Auto-voice feedback if enabled
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(`${t_func_ctx('possibleDisease', 'Possible Disease')}: ${aiResult.disease}. ${t_func_ctx('medicines', 'Medicines')}: ${aiResult.medicines}`);
            utterance.lang = langCodeMap[selectedLanguage] || 'en-IN';
            speechSynthesis.speak(utterance);
          }
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
    // Logical Validation: Must be 10 digits
    const cleanedPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanedPhone.length !== 10) {
      setLoginError(t_func_ctx('invalidPhoneError', 'Please enter a valid 10-digit mobile number'));
      if (navigator.vibrate) navigator.vibrate(100);
      return;
    }

    setLoginError('');
    setLoginLoading(true);
    
    // Check if Firebase Auth is mocked
    if (Object.keys(auth).length === 0 || !auth.config) {
      // Professional Mock OTP flow
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setMockOtp(generatedOtp);
      
      setTimeout(() => {
        setLoginStep('otp');
        setLoginLoading(false);
        setShowMockNotification(true);
        // Auto-hide notification after 10 seconds
        setTimeout(() => setShowMockNotification(false), 10000);
        
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }, 1500);
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
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      setLoginError(t_func_ctx('invalidOtpError', 'Please enter a valid 6-digit numeric OTP'));
      if (navigator.vibrate) navigator.vibrate(100);
      return;
    }
    setLoginError('');
    setLoginLoading(true);

    if (Object.keys(auth).length === 0 || !auth.config) {
      setTimeout(() => {
        if (otp === mockOtp || otp === '123456') {
          setLoginStep('profile');
          setShowMockNotification(false);
        } else {
          setLoginError('Invalid OTP. Please check the notification.');
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
    if (workerProfile.name.trim().length < 3) {
      setLoginError(t_func_ctx('invalidNameError', 'Please enter your full name (at least 3 characters)'));
      return;
    }
    if (workerProfile.ashaId.trim().length < 4) {
      setLoginError(t_func_ctx('invalidIdError', 'Please enter a valid ASHA Worker ID'));
      return;
    }
    if (workerProfile.village.trim().length < 3) {
      setLoginError(t_func_ctx('invalidVillageError', 'Please enter your village/ward name'));
      return;
    }
    if (!workerProfile.supervisorContact || workerProfile.supervisorContact.length < 10) {
      setLoginError(t_func_ctx('invalidSupervisorError', 'Please enter a valid supervisor contact number'));
      return;
    }

    const finalProfile = { ...workerProfile, contactNumber: phoneNumber };
    setAuthUser(finalProfile);
    localStorage.setItem('aashalink_user', JSON.stringify(finalProfile));
    
    const onboardingDone = localStorage.getItem('aashalink_onboarding_done');
    if (onboardingDone) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('permissions');
    }

  };

  const handleExportPDF = (days: number | 'all' = 'all') => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(4, 52, 44);
    doc.text('AashaLink: Patient Records Report', 14, 25);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`ASHA Worker: ${authUser?.name || 'N/A'}`, 14, 35);
    doc.text(`ID: ${authUser?.ashaId || 'N/A'} | Village: ${authUser?.village || 'N/A'}`, 14, 41);
    doc.text(`Period: ${days === 'all' ? 'All Records' : `Last ${days} Days`}`, 14, 47);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 53);

    const tableColumn = ["Date", "Name", "Age", "Location", "Diagnosis"];
    const tableRows: any[] = [];

    const now = new Date();
    const filteredPatients = patients.filter(p => {
      if (days === 'all') return true;
      const pDate = new Date(p.date);
      const diffTime = Math.abs(now.getTime() - pDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= days;
    });

    filteredPatients.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    filteredPatients.forEach(p => {
      tableRows.push([p.date, p.name, p.age, p.loc, p.disease || 'N/A']);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      theme: 'striped',
      headStyles: { fillColor: [4, 52, 44], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const fileName = `AashaLink_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    // Prepare WhatsApp Message
    const msg = `📑 *AashaLink Report Generated*\nWorker: ${authUser?.name}\nPeriod: ${days === 'all' ? 'All Time' : `Last ${days} days`}\nTotal Records: ${filteredPatients.length}\n\n_Note: PDF has been downloaded to device._`;
    window.open(`https://wa.me/${authUser?.supervisorContact}?text=${encodeURIComponent(msg)}`, '_blank');
    
    if (navigator.vibrate) navigator.vibrate(50);
  };

  return (
    <ErrorBoundary>
      <TranslationContext.Provider value={contextValue}>
        <div className="min-h-screen bg-background font-sans text-stone-900 flex flex-col relative overflow-hidden">
          {/* Mock OTP Notification Simulation */}
          <AnimatePresence>
            {showMockNotification && (
              <motion.div 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 20, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm bg-stone-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-primary-900/20">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">System Message</span>
                    <span className="text-[10px] font-bold text-stone-500 uppercase">Just now</span>
                  </div>
                  <p className="text-white text-sm font-bold leading-tight mb-2">Verification Code Issued</p>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/10 text-white px-3 py-1.5 rounded-lg font-black tracking-[0.4em] text-lg border border-white/5">{mockOtp}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(mockOtp);
                        if (navigator.vibrate) navigator.vibrate(50);
                      }}
                      className="text-[10px] font-black text-primary-400 uppercase tracking-widest hover:text-primary-300 transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowMockNotification(false)} className="text-stone-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Section */}
          {currentScreen !== 'login' && (
          <header className="h-20 flex items-center justify-between px-6 border-b border-white/20 bg-white/40 backdrop-blur-xl relative z-10 shadow-sm">
            {currentScreen === 'home' ? (
              <button onClick={() => setIsDrawerOpen(true)} className="p-2.5 -ml-2 bg-white/50 hover:bg-white rounded-2xl shadow-sm transition-all text-slate-700">
                <Menu className="w-6 h-6" />
              </button>
            ) : (
              <button onClick={() => setCurrentScreen('home')} className="p-2.5 -ml-2 bg-white/50 hover:bg-white rounded-2xl shadow-sm transition-all text-slate-700">
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              {currentScreen === 'home' && <T k="ashaLink">AashaLink</T>}
              {currentScreen === 'patient-records' && <T k="patientRecords">Patient Records</T>}
              {currentScreen === 'blood-bank' && (selectedBloodGroup ? `Blood: ${selectedBloodGroup}` : <T k="bloodBank">Blood Bank</T>)}
              {currentScreen === 'bed-availability' && <T k="bedAvailability">Bed Availability</T>}
              {currentScreen === 'med-assistant' && <T k="medAssistant">Medi Assistant</T>}
              {currentScreen === 'voice-diary' && <T k="voiceDiary">Voice Diary</T>}
              {currentScreen === 'settings' && <T k="settings">Settings</T>}
              {currentScreen === 'language' && <T k="selectLanguage">Select Language</T>}
              {currentScreen === 'profile' && <T k="profile">Profile</T>}
              {currentScreen === 'asha-news' && <T k="ashaNews">ASHA News</T>}
              {currentScreen === 'supply-requests' && <T k="supplyRequest">Supply Request</T>}
            </h1>
            {activePatient && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary-700 bg-primary-100/80 px-3 py-1 rounded-full mt-1 border border-primary-200/50 shadow-sm">
                <T>Active</T>: {activePatient.name}
              </span>
            )}
          </div>
          <button onClick={() => setCurrentScreen('profile')} className="p-2.5 -mr-2 bg-white/50 hover:bg-white rounded-2xl shadow-sm transition-all text-slate-700">
            <User className="w-6 h-6" />
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

        <main className="flex-1 max-w-md mx-auto w-full flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageTransition}
              className="flex-1 px-6 py-8 overflow-y-auto"
            >
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

                {/* Live News Section */}
                <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-[32px] shadow-xl shadow-slate-200/50 mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <T k="latestUpdates">Latest Updates</T>
                    </h3>
                    <button onClick={() => setCurrentScreen('asha-news')} className="text-xs font-black text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl">
                      VIEW ALL
                    </button>
                  </div>
                  <div className="space-y-4">
                    {ashaNews.slice(0, 2).map((news, idx) => (
                      <div key={idx} className="group cursor-pointer" onClick={() => window.open(news.url, '_blank')}>
                        <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                          <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-2">{news.title}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{news.published_date}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 self-center" />
                        </div>
                      </div>
                    ))}
                    {ashaNews.length === 0 && !newsLoading && (
                      <div className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <T k="noNews">No news found. Check your connection.</T>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-12">
                  <FeatureCard icon={Mic} label="Voice Diary" k="voiceDiary" onClick={() => setCurrentScreen('voice-diary')} />
                  <FeatureCard icon={FileText} label="Patient Records" k="patientRecords" onClick={() => setCurrentScreen('patient-records')} />
                  <FeatureCard icon={Package} label="Supply Request" k="requestSupplies" onClick={() => setCurrentScreen('supply-requests')} />
                  <FeatureCard icon={Droplet} label="Blood Bank" k="bloodBank" onClick={() => setCurrentScreen('blood-bank')} />
                  <FeatureCard icon={Bed} label="Bed Availability" k="bedAvailability" onClick={() => setCurrentScreen('bed-availability')} />
                  <FeatureCard icon={Settings} label="Settings" k="settings" onClick={() => setCurrentScreen('settings')} />
                </div>

                {/* Center SOS Element */}
                <div className="flex justify-center mb-12">
                  <motion.button
                    id="sos-trigger-btn"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if ('vibrate' in navigator) {
                        // SOS Morse Code Pattern: 3 short, 3 long, 3 short
                        navigator.vibrate([100, 100, 100, 100, 100, 200, 300, 200, 300, 200, 300, 200, 100, 100, 100, 100, 100]);
                      }
                      
                      const triggerSOS = (lat?: number, lng?: number) => {
                        setIsSosActive(true);
                        const locText = lat && lng ? `\n\nMy location: https://www.google.com/maps/search/?api=1&query=${lat},${lng} (${lat},${lng})` : "";
                        const message = `🚨 AASHALINK EMERGENCY! ASHA Worker ${authUser?.name} (ID: ${authUser?.ashaId}) is in DANGER and needs immediate help!${locText}`;
                        
                        // Sending SMS logic
                        // We use the sms: protocol which is widely supported in mobile browsers/PWAs
                        const contacts = [authUser?.emergencyContact1, authUser?.supervisorContact].filter(Boolean);
                        
                        if (contacts.length > 0) {
                          // Note: For background SMS, native Android implementation is required.
                          // For PWA, we trigger the SMS app for each contact.
                          contacts.forEach((phone, idx) => {
                            setTimeout(() => {
                              window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank');
                            }, idx * 1000); // Small delay to prevent popup blocking
                          });
                        } else {
                          // Fallback to WhatsApp if no contacts defined
                          window.open(`whatsapp://send?text=${encodeURIComponent(message)}`, '_blank');
                        }
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
                    className="w-40 h-40 bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 rounded-full flex items-center justify-center text-white shadow-[0_10px_40px_-10px_rgba(225,29,72,0.8)] border-[6px] border-white relative group"
                  >
                    <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    <span className="text-4xl font-black tracking-tighter drop-shadow-md"><T k="sos">SOS</T></span>
                  </motion.button>
                </div>


                {/* Dataset Insights Section */}
                <div className="glass-panel rounded-3xl p-6 border-b-4 border-b-slate-200/50 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
                  <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
                  
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="bg-slate-800 p-2.5 rounded-xl shadow-md">
                      <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 tracking-tight text-lg"><T k="datasetInsights">Public Health Dataset Insights</T></h3>
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
                  placeholder={t_func_ctx("searchPatients", "Search patients...")} 
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
                title={t_func_ctx("exportPdf", "Export PDF Report")}
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
                        <input type="text" placeholder={t_func_ctx("fullName", "Full Name")} value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" placeholder={t_func_ctx("age", "Age")} value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
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
                        <input type="text" placeholder={t_func_ctx("locationWard", "Location / Ward")} value={newPatient.loc} onChange={e => setNewPatient({...newPatient, loc: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <input type="text" placeholder={t_func_ctx("diseaseCondition", "Disease / Condition")} value={newPatient.disease} onChange={e => setNewPatient({...newPatient, disease: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1"><T k="personalDetails">Personal Details</T></label>
                        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5">
                          <span className="text-xs font-bold text-stone-400 uppercase"><T k="dob">DOB</T></span>
                          <input type="date" value={newPatient.dob} onChange={e => setNewPatient({...newPatient, dob: e.target.value})} className="flex-1 bg-transparent focus:outline-none font-medium text-stone-700" />
                        </div>
                        <input type="tel" placeholder={t_func_ctx("contactNumber", "Contact Number")} value={newPatient.contact} onChange={e => setNewPatient({...newPatient, contact: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <input type="tel" placeholder={t_func_ctx("emergencyContact", "Emergency Contact")} value={newPatient.emergencyContact} onChange={e => setNewPatient({...newPatient, emergencyContact: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <textarea placeholder={t_func_ctx("address", "Address")} value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium min-h-[80px]" />
                        
                        <div className="mt-4">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1 mb-2 block"><T k="geotaggedPhoto">Geotagged Patient Photo</T></label>
                          <div className="flex gap-4 items-start">
                            <button 
                              onClick={() => {
                                // Trigger camera capture and location simultaneously
                                const input = document.getElementById('patient-photo-input') as HTMLInputElement;
                                if (input) input.click();
                                
                                // Capture Location
                                if (navigator.geolocation) {
                                  navigator.geolocation.getCurrentPosition((pos) => {
                                    setNewPatient(prev => ({
                                      ...prev, 
                                      latitude: pos.coords.latitude, 
                                      longitude: pos.coords.longitude,
                                      loc: `${prev.loc} (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`
                                    }));
                                  }, (err) => console.error("Geotagging failed:", err));
                                }
                              }}
                              className="flex-1 bg-primary-50 border-2 border-dashed border-primary-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary-100 transition-colors group"
                            >
                              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-primary-200 group-active:scale-90 transition-transform">
                                <Camera className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] font-black text-primary-700 uppercase tracking-widest"><T k="capturePhoto">Capture Photo</T></span>
                            </button>
                            
                            <input 
                              id="patient-photo-input"
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    setNewPatient(prev => ({...prev, photo: event.target?.result as string}));
                                  };
                                  reader.readAsDataURL(e.target.files[0]);
                                }
                              }} 
                            />

                            {newPatient.photo && (
                              <div className="relative">
                                <img src={newPatient.photo} alt="Preview" className="w-24 h-24 object-cover rounded-2xl border-2 border-white shadow-md" />
                                {newPatient.latitude && (
                                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
                                    <MapPin className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {newPatient.latitude && (
                            <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1 uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" /> Geotagged: {newPatient.latitude.toFixed(4)}, {newPatient.longitude?.toFixed(4)}
                            </p>
                          )}
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
                  placeholder={t_func_ctx("searchBloodBanks", "Search blood banks...")} 
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
                      <div className="flex gap-2">
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${bb.lat},${bb.lng}`, '_system')}
                          className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-colors border border-slate-200"
                        >
                          <MapPin className="w-3.5 h-3.5" /> <T k="location">Location</T>
                        </button>
                        <button 
                          onClick={() => window.open(`tel:${bb.phone}`, '_system')}
                          className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-colors border border-emerald-100"
                        >
                          <Phone className="w-3.5 h-3.5" /> <T k="call">Call</T>
                        </button>
                        <button 
                          onClick={() => {
                            if (!activePatient) {
                              alert("Please select a patient first from the top of the screen or Patient Records.");
                              setCurrentScreen('patient-records');
                            } else {
                              alert(`Blood Request sent to ${bb.name} for patient ${activePatient.name}. The hospital authority will contact you shortly.`);
                            }
                          }}
                          className="flex-[1.5] bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-colors shadow-md shadow-rose-200"
                        >
                          <T k="requestBook">Request</T>
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
              {rawData.pmc_infrastructure.slice(0, 10).map((facility: any, index: number) => {
                const lat = 18.5204 + (Math.random() - 0.5) * 0.1;
                const lng = 73.8567 + (Math.random() - 0.5) * 0.1;
                const phone = "104";
                const beds = parseInt(facility['Number of Beds in facility type'] || '0');
                return (
                  <div key={index} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-extrabold text-slate-800 text-lg">{facility['Facility Name']}</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-4 font-medium">{facility['Ward Name']}, {facility['City Name']} • {facility['Type  (Hospital / Nursing Home / Lab)']}</p>
                    <div className="mb-4">
                      <span className={beds > 0 ? "text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-lg" : "text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-lg"}>
                        {beds} <T k="bedsAvailable">Beds Available</T>
                      </span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_system')}
                          className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-colors border border-slate-200"
                        >
                          <MapPin className="w-3.5 h-3.5" /> <T k="location">Location</T>
                        </button>
                        <button 
                          onClick={() => window.open(`tel:${phone}`, '_system')}
                          className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-colors border border-emerald-100"
                        >
                          <Phone className="w-3.5 h-3.5" /> <T k="call">Call</T>
                        </button>
                        <button 
                          onClick={() => {
                            if (!activePatient) {
                              alert("Please select a patient first from the top of the screen or Patient Records.");
                              setCurrentScreen('patient-records');
                            } else {
                              alert(`Bed Request sent to ${facility['Facility Name']} for patient ${activePatient.name}. The hospital authority will contact you shortly.`);
                            }
                          }}
                          className="flex-[1.5] bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-colors shadow-md shadow-primary-200"
                        >
                          <T k="requestBook">Request Bed</T>
                        </button>
                      </div>
                  </div>
                );
              })}
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
                        <p className="text-stone-600 font-bold animate-pulse"><T k="transcribing">Transcribing with Gemini AI...</T></p>
                      </div>
                    )}
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder={t_func_ctx("diaryPlaceholder", "Tap the microphone below to start recording, or type your manual diary entry here...")}
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
                                  const translated = await translateTextWithGemini(diary.transcript, 'English', apiKey);
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
                        {diary.tags && diary.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {diary.tags.map((tag, idx) => (
                              <span key={idx} className="bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
                    <p className="text-sm text-stone-600 font-medium"><T k="currentPatient">Current Patient:</T></p>
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
            {network !== 'Good' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-full shrink-0">
                  <WifiOff className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-amber-800"><T k="offlineModeActive">Offline Mode Active</T></p>
                  <p className="text-xs text-amber-700 mt-0.5 font-medium"><T k="usingLocalAI">Using local AI engine and pre-loaded dataset for symptom analysis.</T></p>
                </div>
              </div>
            )}
            {medStatus === 'idle' && (
              <div className="space-y-4">
                <input type="text" placeholder={t_func_ctx("patientName", "Patient name")} value={medInput.name} onChange={e => setMedInput({...medInput, name: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm" />
                <input type="text" placeholder={t_func_ctx("suspectedDisease", "Known or suspected disease (optional)")} value={medInput.disease} onChange={e => setMedInput({...medInput, disease: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm" />
                
                <div className="relative">
                  <textarea placeholder={t_func_ctx("enterSymptoms", "Enter symptoms (e.g. fever, headache, vomiting) or use microphone")} rows={3} value={medInput.symptoms} onChange={e => setMedInput({...medInput, symptoms: e.target.value})} className={`w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm resize-none pr-14 ${isTranscribing ? 'opacity-50 pointer-events-none' : ''}`} />
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

                <input type="text" placeholder={t_func_ctx("sinceWhen", "Since when? (e.g. 2 days, 5 hours)")} value={medInput.time} onChange={e => setMedInput({...medInput, time: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm" />
                <input type="text" placeholder={t_func_ctx("existingConditions", "Existing conditions (e.g. diabetes, pregnant, BP)")} value={medInput.existing} onChange={e => setMedInput({...medInput, existing: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm" />
                
                <button 
                  onClick={handleAnalyze}
                  disabled={!medInput.symptoms}
                  className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl mt-6 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-md shadow-primary-200"
                >
                  <T k="analyze">Analyze</T>
                </button>
              </div>
            )}

            {medStatus === 'loading' && (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-stone-500 font-bold tracking-wide"><T k="analyzingSymptoms">Analyzing symptoms...</T></p>
              </div>
            )}

            {medStatus === 'error' && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>
                <p className="text-rose-600 font-extrabold text-xl"><T k="symptomsNotRecognized">Symptoms not recognized.</T></p>
                <p className="text-stone-500 font-medium"><T k="referToPHC">Please refer patient to nearest PHC.</T></p>
                <button onClick={() => setMedStatus('idle')} className="mt-6 px-8 py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors"><T k="tryAgain">Try Again</T></button>
              </div>
            )}

            {medStatus === 'success' && medResult && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-rose-600 font-bold text-sm tracking-wide"><T k="offlineModeDataset">Offline Mode - Local Dataset</T></span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[80px] -mr-4 -mt-4 transition-all group-hover:scale-110" />
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 relative z-10"><T k="possibleDisease">Possible Disease</T></h4>
                  <div className="flex justify-between items-center relative z-10">
                    <p className="text-2xl font-black text-stone-800"><T>{medResult.disease}</T></p>
                    <button 
                      onClick={() => {
                        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                          const utterance = new SpeechSynthesisUtterance(`${t_func_ctx('possibleDisease', 'Possible Disease')}: ${medResult.disease}. ${t_func_ctx('medicines', 'Medicines')}: ${medResult.medicines}`);
                          utterance.lang = langCodeMap[selectedLanguage] || 'en-IN';
                          speechSynthesis.speak(utterance);
                        }
                      }}
                      className="p-2.5 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 active:scale-90 transition-all"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
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
                    onClick={() => {
                      const msg = `🚨 AashaLink Medi-Report\nPatient: ${activePatient?.name || medInput.name}\nDiagnosis: ${medResult.disease}\n\nMedicines: ${medResult.medicines}\n\nPrecautions: ${medResult.precautions}\n\n⚠️ Red Flags: ${medResult.red_flags}`;
                      window.open(`https://wa.me/${workerProfile.supervisorContact}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" /> <T k="shareWithSupervisor">Share with Supervisor</T>
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
        ) : currentScreen === 'supply-requests' ? (
          <div className="pb-24">
            <div className="bg-white p-6 rounded-[32px] border border-stone-100 shadow-xl mb-8">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <Package className="w-6 h-6 text-primary-600" />
                <T k="requestSupplies">Request Supplies</T>
              </h2>
              
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4"><T k="selectKit">Select a Kit Template</T></p>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide mb-8">
                {kits.map((kit, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentRequest(kit.items.map(i => ({ ...i })))}
                    className="flex-shrink-0 bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl text-left hover:border-primary-400 transition-all active:scale-95 group"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:bg-primary-600 group-hover:text-white transition-all">
                      <kit.icon className="w-6 h-6" />
                    </div>
                    <p className="font-black text-slate-800 text-sm tracking-tight">{kit.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{kit.items.length} Items</p>
                  </button>
                ))}
              </div>

              {currentRequest.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest"><T k="itemsInKit">Items in this Kit</T></p>
                    <button 
                      onClick={() => {
                        const code = prompt(t_func_ctx("scanBarcodePrompt", "Scan or Enter Barcode:"));
                        if (code) setCurrentRequest([...currentRequest, { name: `Item ${code}`, quantity: 1, barcode: code }]);
                      }}
                      className="text-[10px] font-black text-primary-600 flex items-center gap-1.5 bg-primary-50 px-3 py-1.5 rounded-xl"
                    >
                      <LucideLock className="w-3 h-3" /> <T k="scanBarcode">Scan Barcode</T>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {currentRequest.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                        <div className="flex items-center gap-4">
                          <button onClick={() => {
                            const newReq = [...currentRequest];
                            if (newReq[idx].quantity > 1) newReq[idx].quantity--;
                            else newReq.splice(idx, 1);
                            setCurrentRequest(newReq);
                          }} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 font-black">-</button>
                          <span className="font-black text-slate-800 w-4 text-center">{item.quantity}</span>
                          <button onClick={() => {
                            const newReq = [...currentRequest];
                            newReq[idx].quantity++;
                            setCurrentRequest(newReq);
                          }} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-500 font-black">+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setRequestPhoto("mock_photo_uri")}
                        className={`flex-1 py-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all ${requestPhoto ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-primary-400'}`}
                      >
                        <Camera className={`w-6 h-6 ${requestPhoto ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <p className={`text-[10px] font-black uppercase tracking-widest ${requestPhoto ? 'text-emerald-600' : 'text-slate-400'}`}>{requestPhoto ? "PHOTO ATTACHED" : t_func_ctx("addPhoto", "Add Photo Proof")}</p>
                      </button>
                      <div className="flex-1 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 flex flex-col items-center gap-2 opacity-50">
                        <MapPin className="w-6 h-6 text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">GEO-TAGGED</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleAddSupplyRequest}
                      className="w-full bg-primary-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-primary-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      <T k="submitRequest">Submit Request</T> <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {supplyRequests.length > 0 && (
              <div className="px-2">
                <p className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <LucideHistory className="w-4 h-4" /> RECENT REQUESTS
                </p>
                <div className="space-y-4">
                  {supplyRequests.slice().reverse().map((req, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{new Date(req.created_at).toLocaleDateString()}</p>
                          <h4 className="font-extrabold text-stone-800">{req.items.length} Items Requested</h4>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${req.sync_status === 'synced' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                          {req.sync_status}
                        </span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {req.items.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-1 rounded-md">{item.name} x{item.quantity}</span>
                        ))}
                        {req.items.length > 3 && <span className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-1 rounded-md">+{req.items.length - 3} more</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : currentScreen === 'asha-news' ? (
          <div className="pb-24">
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-[32px] shadow-xl shadow-slate-200/50 mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2">
                <FileText className="w-6 h-6 text-emerald-500" />
                <T k="latestUpdates">Latest Updates</T>
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-6">Real-time government notifications and guidelines for ASHA workers.</p>
              
              <div className="space-y-4">
                {ashaNews.map((news, idx) => (
                  <div key={idx} className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all cursor-pointer" onClick={() => window.open(news.url, '_blank')}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">{news.category || 'Notification'}</span>
                      <p className="text-[10px] text-slate-400 font-bold">{news.published_date}</p>
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-lg mb-4 line-clamp-3">{news.title}</h4>
                    <button className="w-full bg-slate-50 text-slate-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <T k="visitSite">Visit Source</T> <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {ashaNews.length === 0 && (
                  <div className="text-center py-20">
                    <CloudOff className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs"><T k="noNews">No news found. Check your connection.</T></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : currentScreen === 'permissions' ? (
          <PermissionScreen onComplete={(perms) => {
            if (authUser) {
              const updated = { ...authUser, autoSosEnabled: perms.autoSms };
              setAuthUser(updated);
              localStorage.setItem('aashalink_user', JSON.stringify(updated));
            }
            localStorage.setItem('aashalink_onboarding_done', 'true');
            setCurrentScreen('home');
          }} />
        ) : currentScreen === 'login' ? (
          <div className={`flex-1 flex flex-col items-center justify-center p-6 h-full min-h-[80vh] transition-all duration-500 ${deviceType === 'desktop' ? 'max-w-2xl mx-auto' : deviceType === 'tablet' ? 'max-w-xl mx-auto' : 'w-full'}`}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl flex items-center justify-center mb-8 shrink-0 shadow-inner"
            >
              <User className="w-12 h-12 text-primary-600" />
            </motion.div>
            <h2 className="text-3xl font-black text-stone-800 mb-3 tracking-tighter"><T k="portalTitle">ASHA Worker Portal</T></h2>
            <p className="text-stone-500 mb-10 text-center font-medium max-w-sm">
              {loginStep === 'language' ? <T k="selectLanguage">Please select your preferred language</T> :
               loginStep === 'phone' ? <T k="enterPhone">Enter your mobile number to continue</T> : 
               loginStep === 'otp' ? <T k="enterOtp">Enter the verification code sent to your phone</T> : 
               <T k="completeProfile">Complete your profile setup</T>}
            </p>
            
            <div className={`w-full bg-white p-8 rounded-[40px] border border-stone-100 shadow-2xl shadow-stone-200/50 overflow-hidden relative ${deviceType !== 'mobile' ? 'border-2' : ''}`}>
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-emerald-400 opacity-20"></div>
              
              {loginError && (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-2xl font-bold text-center flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {loginError}
                </motion.div>
              )}
              
              {loginStep === 'language' && (
                <div className="grid grid-cols-1 gap-4">
                  {(Object.keys(langCodeMap) as Language[]).map((lang) => (
                    <motion.button
                      key={lang}
                      whileHover={{ x: 5, backgroundColor: '#f0fdf4' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setLoginStep('phone');
                        if (navigator.vibrate) navigator.vibrate(50);
                      }}
                      className="w-full flex items-center justify-between p-6 bg-stone-50 rounded-[24px] border border-stone-100 transition-all text-left group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                          <Globe className="w-6 h-6" />
                        </div>
                        <span className="font-black text-stone-800 text-xl tracking-tight">{lang}</span>
                      </div>
                      <ArrowRight className="w-6 h-6 text-stone-300 group-hover:text-primary-500 transform group-hover:translate-x-1 transition-all" />
                    </motion.button>
                  ))}
                </div>
              )}

              {loginStep === 'phone' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 block px-1"><T k="mobileNumber">Mobile Number</T></label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 font-black text-lg">+91</div>
                      <input 
                        type="tel" 
                        value={phoneNumber} 
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={t_func_ctx('phonePlaceholder', '9876543210')}
                        className="w-full bg-stone-50 border-2 border-stone-50 rounded-3xl pl-16 pr-6 py-5 font-black text-xl text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div id="recaptcha-container"></div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSendOtp} 
                    disabled={loginLoading}
                    className="w-full bg-gradient-to-r from-primary-600 to-emerald-600 text-white font-black py-5 rounded-3xl hover:shadow-xl hover:shadow-primary-200 transition-all disabled:opacity-70 flex justify-center items-center h-16 text-lg"
                  >
                    {loginLoading ? <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <T k="sendOtp">Send OTP</T>}
                  </motion.button>
                </div>
              )}

              {loginStep === 'otp' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3 block px-1 text-center"><T k="otpLabel">Enter 6-Digit OTP</T></label>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder={t_func_ctx('otpPlaceholder', '••••••')}
                      className="w-full bg-stone-50 border-2 border-stone-50 rounded-3xl px-6 py-6 font-black text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-all text-center tracking-[0.8em] text-3xl shadow-sm"
                    />
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleVerifyOtp} 
                    disabled={loginLoading}
                    className="w-full bg-gradient-to-r from-primary-600 to-emerald-600 text-white font-black py-5 rounded-3xl hover:shadow-xl hover:shadow-primary-200 transition-all disabled:opacity-70 flex justify-center items-center h-16 text-lg"
                  >
                    {loginLoading ? <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <T k="verifyContinue">Verify & Continue</T>}
                  </motion.button>
                </div>
              )}

              {loginStep === 'profile' && (
                <div className="space-y-5 max-h-[60vh] overflow-y-auto px-2 py-1 -mx-2 scrollbar-hide">
                  <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100/50 mb-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center">Step 3: Setup your digital ID</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2 block px-1">Full Name</label>
                    <input 
                      type="text" 
                      value={workerProfile.name} 
                      onChange={(e) => setWorkerProfile({...workerProfile, name: e.target.value})}
                      placeholder={t_func_ctx('namePlaceholder', 'Your full name')}
                      className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl px-5 py-4 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2 block px-1">ASHA Worker ID</label>
                    <input 
                      type="text" 
                      value={workerProfile.ashaId} 
                      onChange={(e) => setWorkerProfile({...workerProfile, ashaId: e.target.value})}
                      placeholder={t_func_ctx('idPlaceholder', 'AW-XXXX-XXXX')}
                      className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl px-5 py-4 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2 block px-1">Village / Ward</label>
                    <input 
                      type="text" 
                      value={workerProfile.village} 
                      onChange={(e) => setWorkerProfile({...workerProfile, village: e.target.value})}
                      placeholder={t_func_ctx('villagePlaceholder', 'Enter village name')}
                      className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl px-5 py-4 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-2 block px-1 flex items-center gap-2">
                        <Home className="w-3.5 h-3.5" /> Emergency Contact
                      </label>
                      <input 
                        type="tel" 
                        value={workerProfile.emergencyContact1} 
                        onChange={(e) => setWorkerProfile({...workerProfile, emergencyContact1: e.target.value})}
                        placeholder="Family number"
                        className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl px-5 py-4 font-bold text-stone-700 outline-none focus:border-rose-400 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-primary-400 uppercase tracking-[0.2em] mb-2 block px-1 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" /> Supervisor Number
                      </label>
                      <input 
                        type="tel" 
                        value={workerProfile.supervisorContact} 
                        onChange={(e) => setWorkerProfile({...workerProfile, supervisorContact: e.target.value})}
                        placeholder="ANM number"
                        className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl px-5 py-4 font-bold text-stone-700 outline-none focus:border-primary-400 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveProfile} 
                    className="w-full bg-primary-600 text-white font-black py-5 rounded-3xl hover:shadow-xl hover:shadow-primary-200 transition-all mt-4 text-lg"
                  >
                    Complete Registration
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        ) : currentScreen === 'settings' ? (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-extrabold text-stone-800 mb-6 flex items-center gap-3">
              <Settings className="w-6 h-6 text-primary-600" />
              <T k="settings">Settings</T>
            </h2>
            
            <div className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm flex items-center justify-between group hover:border-primary-200 transition-all">
              <div>
                <p className="font-black text-slate-800 text-sm tracking-tight flex items-center gap-2">
                  <Moon className="w-4 h-4 text-primary-500" />
                  <T k="theme">Theme</T>
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {theme === 'dark' ? t_func_ctx('darkMode', 'Dark Mode') : t_func_ctx('lightMode', 'Light Mode')}
                </p>
              </div>
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`w-14 h-8 rounded-full p-1 transition-all duration-500 ${theme === 'dark' ? 'bg-primary-600' : 'bg-slate-200'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md transform transition-transform duration-500 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-primary-600" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                </div>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
              <div>
                <p className="font-black text-slate-800 text-sm tracking-tight flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <T k="autoSmsAccess">Automatic SOS</T>
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Direct alerts to contacts</p>
              </div>
              <button 
                onClick={() => {
                  if (authUser) {
                    const updated = { ...authUser, autoSosEnabled: !authUser.autoSosEnabled };
                    setAuthUser(updated);
                    localStorage.setItem('aashalink_user', JSON.stringify(updated));
                  }
                }}
                className={`w-14 h-8 rounded-full p-1 transition-all duration-500 ${authUser?.autoSosEnabled ? 'bg-rose-500' : 'bg-slate-200'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md transform transition-transform duration-500 ${authUser?.autoSosEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${authUser?.autoSosEnabled ? 'bg-rose-500' : 'bg-slate-300'}`} />
                </div>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-stone-100 p-6 shadow-sm opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-slate-800 text-sm tracking-tight flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    Notifications
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Push Alerts</p>
                </div>
                <div className="w-14 h-8 bg-emerald-500/20 rounded-full p-1">
                  <div className="w-6 h-6 bg-white rounded-full shadow-sm translate-x-6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : currentScreen === 'language' ? (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-extrabold text-stone-800 mb-6">{t_func_ctx('selectLanguage', "Select Language")}</h2>
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
                <span className="font-bold text-stone-700 flex-1">{t_func_ctx('helpSupport', "Help & Support")}</span>
              </button>
              <button onClick={() => setShowLogoutConfirm(true)} className="w-full bg-rose-50 rounded-2xl border border-rose-100 p-4 shadow-sm flex items-center gap-4 hover:border-rose-200 transition-colors text-left mt-4">
                <LogOut className="w-6 h-6 text-rose-500" />
                <span className="font-bold text-rose-600 flex-1">{t_func_ctx('logout', "Logout")}</span>
              </button>
            </div>
          </div>
        ) : null}
              </motion.div>
            </AnimatePresence>
          </main>

      {/* Bottom Navigation */}
      {currentScreen !== 'login' && (
        <nav className="h-20 bg-white border-t border-stone-100 flex items-center justify-around px-4 pb-2 relative z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <NavItem icon={Home} label={t_func_ctx('home', "Home")} active={currentScreen === 'home'} onClick={() => setCurrentScreen('home')} />
          <NavItem icon={ClipboardList} label={t_func_ctx('records', "Records")} active={currentScreen === 'patient-records'} onClick={() => setCurrentScreen('patient-records')} />
          <NavItem icon={Mic} label={t_func_ctx('voice', "Voice")} active={currentScreen === 'voice-diary'} onClick={() => setCurrentScreen('voice-diary')} />
          <NavItem icon={User} label={t_func_ctx('profile', "Profile")} active={currentScreen === 'profile'} onClick={() => setCurrentScreen('profile')} />
        </nav>
      )}

      {/* Floating Medi Assistant Sneak-Peek Icon */}
      {currentScreen === 'home' && (
        <motion.div
          initial={{ x: 100 }}
          animate={{ 
            x: 65,
            transition: { type: 'spring', damping: 20, stiffness: 100 }
          }}
          whileHover={{ 
            x: 0,
            transition: { type: 'spring', damping: 15, stiffness: 150 }
          }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] group cursor-pointer"
          onClick={() => setCurrentScreen('med-assistant')}
        >
          <div className="relative flex items-center">
            {/* Sneaking Tooltip */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              whileHover={{ opacity: 1, scale: 1, x: 0 }}
              className="absolute right-20 bg-slate-800 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl pointer-events-none"
            >
              Need help, Sister? 🤖
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
            </motion.div>

            <div className="bg-white/90 backdrop-blur-md border-y border-l border-stone-200 shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.1)] rounded-l-[40px] p-2 pl-6 pr-4 flex items-center gap-4 transition-all group-hover:bg-emerald-50 border-r-0 overflow-hidden">
              <div className="text-right group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Medi AI</p>
                <p className="text-xs font-black text-slate-800">Assistant</p>
              </div>
              
              <motion.div 
                animate={{ 
                  y: [0, -4, 0],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="w-16 h-16 rounded-3xl overflow-hidden shadow-2xl border-2 border-white bg-white group-hover:border-emerald-400 transition-all relative z-10"
              >
                <img src="/src/assets/medi_assistant.png" alt="Medi AI" className="w-full h-full object-cover" />
                {/* Glowing Eye Effect overlay */}
                <div className="absolute inset-0 bg-emerald-400/5 mix-blend-overlay group-hover:bg-transparent transition-colors" />
              </motion.div>
            </div>

            {/* Indicator "Pulse" for sneaking robot */}
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute right-2 w-3 h-3 bg-emerald-500 rounded-full group-hover:hidden"
            />
          </div>
        </motion.div>
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
                    <h2 className="text-lg font-extrabold text-stone-800">{t_func_ctx('ashaLink', "AashaLink")}</h2>
                    <p className="text-xs text-stone-500 font-medium">vishvcode@gmail.com</p>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto py-4">
                <DrawerItem icon={Activity} label={t_func_ctx('medAssistant', "Medi Assistant")} onClick={() => { setCurrentScreen('med-assistant'); setIsDrawerOpen(false); }} />
                <DrawerItem icon={Download} label={t_func_ctx('shareRecords', "Share Records PDF")} onClick={() => { setShowShareDialog(true); setIsDrawerOpen(false); }} />
                <DrawerItem icon={Settings} label={t_func_ctx('settings', "Settings")} onClick={() => { setCurrentScreen('settings'); setIsDrawerOpen(false); }} />
                <DrawerItem icon={Globe} label={t_func_ctx('selectLanguage', "Select Language")} onClick={() => { setCurrentScreen('language'); setIsDrawerOpen(false); }} />
                <DrawerItem icon={HelpCircle} label={t_func_ctx('helpSupport', "Help & Support")} onClick={() => { setShowHelpDialog(true); setIsDrawerOpen(false); }} />
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-stone-100">
                <DrawerItem icon={LogOut} label={t_func_ctx('logout', "Logout")} isRed onClick={() => { setShowLogoutConfirm(true); setIsDrawerOpen(false); }} />
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
              <h2 className="text-xl font-extrabold text-stone-800 mb-4">{t_func_ctx('helpSupport', "Help & Support")}</h2>
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
              <h2 className="text-xl font-extrabold text-stone-800 mb-2">{t_func_ctx('logout', "Logout")}</h2>
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
      <AnimatePresence>
        {showShareDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShareDialog(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-white rounded-[40px] p-8 w-full max-w-sm relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-bl-[100px] -mr-8 -mt-8" />
              
              <h2 className="text-2xl font-black text-stone-800 mb-2 relative z-10">Share Records</h2>
              <p className="text-stone-500 text-sm font-medium mb-8 relative z-10">Select the time range for the report to share with your supervisor.</p>
              
              <div className="space-y-3 relative z-10">
                {[
                  { label: 'Today Only', val: 1, icon: Calendar },
                  { label: 'Last 7 Days', val: 7, icon: RefreshCw },
                  { label: 'Last 30 Days', val: 30, icon: LucideHistory as any },
                  { label: 'All Records', val: 'all', icon: FileText }
                ].map((range) => (
                  <motion.button
                    key={range.label}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      handleExportPDF(range.val as any);
                      setShowShareDialog(false);
                    }}
                    className="w-full flex items-center gap-4 p-5 bg-stone-50 hover:bg-primary-50 rounded-3xl border border-stone-100 hover:border-primary-200 transition-all text-left"
                  >
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <range.icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-black text-stone-800 text-sm">{range.label}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Generate PDF</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              
              <button 
                onClick={() => setShowShareDialog(false)} 
                className="w-full py-4 text-stone-400 font-bold text-sm mt-4 hover:text-stone-600 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </TranslationContext.Provider>
  </ErrorBoundary>
);
}

