import React, { useState, useEffect } from 'react';
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
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
};
type BloodBank = { name: string; address: string; phone: string; lat: number; lng: number; groups: string[]; distance: number };
type VoiceDiaryEntry = { id: string; patientName: string; date: string; duration: string; transcript: string };

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
      case 'syncing': return 'Syncing...';
      case 'synced': return 'All data synced';
      case 'error': return 'Sync failed';
      case 'offline': return 'Offline mode';
      default: return 'Cloud ready';
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
    <span className="text-sm font-bold text-stone-700">{label}</span>
  </motion.button>
);

const NavItem = ({ icon: Icon, label, active = false, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 ${active ? 'text-primary-600' : 'text-stone-400 hover:text-stone-600'} transition-colors`}>
    <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

const DrawerItem = ({ icon: Icon, label, isRed = false, onClick }: { icon: any; label: string; isRed?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors ${isRed ? 'text-rose-600' : 'text-stone-700'}`}>
    <Icon className="w-6 h-6" />
    <span className="font-semibold">{label}</span>
  </button>
);

// --- Main App ---

export default function App() {
  const [network, setNetwork] = useState<NetworkStatus>('Good');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteDiaryConfirm, setShowDeleteDiaryConfirm] = useState(false);
  const [isSosActive, setIsSosActive] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const emergencyServices = [
    { name: 'City Hospital (Emergency)', type: 'Hospital', lat: 34.0522, lng: -118.2437, phone: '108' },
    { name: 'Central Police Station', type: 'Police', lat: 34.0550, lng: -118.2450, phone: '100' },
    { name: 'Fire Station 10', type: 'Fire', lat: 34.0500, lng: -118.2400, phone: '101' },
  ];

  // --- Network Detection Logic ---
  const syncOfflineDataToFirebase = () => {
    const pending = localStorage.getItem('aashalink_pending_sync');
    if (!pending || pending === '[]') {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }

    setSyncStatus('syncing');
    console.log("Syncing offline data to Firebase...");
    
    // Simulate sync delay
    setTimeout(() => {
      try {
        localStorage.setItem('aashalink_pending_sync', '[]');
        setSyncStatus('synced');
        // Reset to idle after a few seconds
        setTimeout(() => setSyncStatus('idle'), 5000);
      } catch (e) {
        setSyncStatus('error');
      }
    }, 2000);
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
    const saved = localStorage.getItem('aashalink_patients');
    if (saved) return JSON.parse(saved);
    return [
      { name: 'John Doe', age: '45', disease: 'Diabetes', loc: 'Ward A', date: '2023-10-01', bloodGroup: 'A+', dob: '1978-05-12', contact: '9876543210', emergencyContact: '9876543211', address: '123 Main St, Springfield' },
      { name: 'Jane Smith', age: '32', disease: 'Hypertension', loc: 'Ward B', date: '2023-10-05', bloodGroup: 'O-', dob: '1991-08-24', contact: '9876543212', emergencyContact: '9876543213', address: '456 Oak Ave, Metropolis' },
      { name: 'Robert Wilson', age: '58', disease: 'Post-Op', loc: 'ICU-2', date: '2023-10-15', bloodGroup: 'B+', dob: '1965-11-30', contact: '9876543214', emergencyContact: '9876543215', address: '789 Pine Rd, Gotham' },
    ];
  });
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
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.disease.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.loc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = patientDateFilter ? p.date === patientDateFilter : true;
    const matchesBloodGroup = patientBloodGroupFilter ? p.bloodGroup === patientBloodGroupFilter : true;
    return matchesSearch && matchesDate && matchesBloodGroup;
  });

  const handleAddPatient = () => {
    if (!newPatient.name || !newPatient.age || !newPatient.loc || !newPatient.disease) return;
    setPatients([...patients, newPatient]);
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
      pending.push({ type: 'ADD_PATIENT', data: newPatient });
      localStorage.setItem('aashalink_pending_sync', JSON.stringify(pending));
    } else {
      // Sync immediately
      // TODO: Firebase call
    }
  };

  // --- Blood Bank State ---
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string | null>(null);
  const [bbSearchQuery, setBbSearchQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState<number>(50); // Default 50km
  const [bbViewMode, setBbViewMode] = useState<'list' | 'map'>('list');

  const bloodBanksData: BloodBank[] = [
    { name: 'City Central Blood Bank', address: '123 Health Ave, Downtown', phone: '9876543210', lat: 34.05, lng: -118.24, groups: ['A+', 'A-', 'O+', 'O-'], distance: 5 },
    { name: 'Red Cross Rural Center', address: '45 Village Road, Outskirts', phone: '9876543211', lat: 34.06, lng: -118.25, groups: ['B+', 'B-', 'AB+', 'O+'], distance: 15 },
    { name: 'LifeLine Hospital', address: '789 Medical Blvd', phone: '9876543212', lat: 34.07, lng: -118.26, groups: ['A+', 'B+', 'AB+', 'AB-', 'O+'], distance: 8 },
    { name: 'Hope Donation Camp', address: 'Community Hall, Sector 4', phone: '9876543213', lat: 34.08, lng: -118.27, groups: ['A-', 'B-', 'O-'], distance: 25 },
    { name: 'Metro Care Blood Bank', address: 'Station Road, East Wing', phone: '9876543214', lat: 34.09, lng: -118.28, groups: ['A+', 'AB+', 'O+', 'O-'], distance: 12 },
  ];

  const filteredBloodBanks = bloodBanksData.filter(bb => {
    if (selectedBloodGroup) {
      const isSpecific = selectedBloodGroup.includes('+') || selectedBloodGroup.includes('-');
      if (isSpecific) {
        if (!bb.groups.includes(selectedBloodGroup)) return false;
      } else {
        if (!bb.groups.some(g => g.startsWith(selectedBloodGroup))) return false;
      }
    }
    if (bbSearchQuery && !bb.name.toLowerCase().includes(bbSearchQuery.toLowerCase())) return false;
    if (bb.distance > maxDistance) return false;
    return true;
  }).sort((a, b) => a.distance - b.distance);

  // --- Voice Diary State ---
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recognition, setRecognition] = useState<any>(null);
  const [voiceDiaries, setVoiceDiaries] = useState<VoiceDiaryEntry[]>([
    { id: '1', patientName: 'Ramesh Kumar', date: '2026-04-10', duration: '01:24', transcript: 'Patient is showing signs of improvement. Fever has subsided.' },
    { id: '2', patientName: 'Sita Devi', date: '2026-04-09', duration: '00:45', transcript: 'Complaining of mild headaches in the morning. Advised to drink more water.' }
  ]);
  const [diarySearchQuery, setDiarySearchQuery] = useState('');
  const [diaryDateFilter, setDiaryDateFilter] = useState('');
  const [diaryTab, setDiaryTab] = useState<'record' | 'list'>('record');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [diaryToDelete, setDiaryToDelete] = useState<VoiceDiaryEntry | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript(prev => {
          const newText = prev + (prev && finalTranscript ? ' ' : '') + finalTranscript;
          return newText;
        });
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

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

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      setRecordingTime(0);
      recognition?.start();
      setIsRecording(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveDiary = () => {
    if (!transcript.trim()) return;
    const newEntry: VoiceDiaryEntry = {
      id: Date.now().toString(),
      patientName: activePatient?.name || 'Unknown Patient',
      date: new Date().toISOString().split('T')[0],
      duration: formatTime(recordingTime),
      transcript: transcript
    };
    setVoiceDiaries([newEntry, ...voiceDiaries]);
    setTranscript('');
    setRecordingTime(0);
    setDiaryTab('list');
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

  const medicalDataset: MedicalRecord[] = [
    {
      "id": 1,
      "disease": "Malaria",
      "keywords": ["fever","chills","headache","sweating","shivering"],
      "medicines": "Chloroquine 500mg - twice daily - 3 days\nParacetamol 500mg - for fever",
      "precautions": "Use mosquito net\nAvoid standing water nearby\nComplete full course of medicine",
      "red_flags": "Refer to doctor if: unconscious, seizures, very high fever >104F, vomiting medicine",
      "remedies": "Tulsi + ginger tea\nCold compress on forehead",
      "duration_warning": "If no improvement in 2 days, refer to PHC"
    },
    {
      "id": 2,
      "disease": "Typhoid",
      "keywords": ["fever","stomach pain","weakness","loss of appetite","constipation","diarrhea"],
      "medicines": "Azithromycin 500mg - once daily - 7 days\nORS for hydration",
      "precautions": "Boil drinking water\nEat only soft cooked food\nComplete antibiotic course",
      "red_flags": "Refer if: bleeding, severe stomach pain, unconscious, rash appears",
      "remedies": "Banana + curd\nCoconut water\nLight khichdi",
      "duration_warning": "If fever continues beyond 5 days, refer immediately"
    },
    {
      "id": 3,
      "disease": "Common Cold & Flu",
      "keywords": ["cough","cold","runny nose","sneezing","sore throat","body ache"],
      "medicines": "Cetrizine 10mg - at night\nParacetamol 500mg - if fever\nVitamin C tablet - daily",
      "precautions": "Rest at home\nDrink warm fluids\nCover mouth while coughing",
      "red_flags": "Refer if: breathing difficulty, chest pain, fever >103F for 3+ days",
      "remedies": "Steam inhalation twice daily\nHoney + ginger + tulsi decoction",
      "duration_warning": "Normal cold resolves in 5-7 days"
    },
    {
      "id": 4,
      "disease": "Gastritis / Acidity",
      "keywords": ["stomach","pain","burning","acidity","nausea","vomiting","gas","bloating"],
      "medicines": "Omeprazole 20mg - before breakfast\nAntacid syrup - after meals\nDomperidone - if vomiting",
      "precautions": "Avoid spicy oily food\nEat small meals frequently\nDo not skip meals",
      "red_flags": "Refer if: blood in vomit, severe pain, black stool",
      "remedies": "Cold milk\nCoconut water\nBanana",
      "duration_warning": "If pain is severe or persistent, refer to doctor"
    },
    {
      "id": 5,
      "disease": "Diarrhea / Dehydration",
      "keywords": ["diarrhea","loose motion","dehydration","weakness","watery stool","frequent toilet"],
      "medicines": "ORS - after every loose motion\nZinc 20mg - daily 14 days (children)\nLoperamide - adults only",
      "precautions": "Drink boiled water only\nWash hands with soap\nAvoid outside food",
      "red_flags": "Refer if: blood in stool, >10 motions/day, child not drinking, sunken eyes",
      "remedies": "Homemade ORS: 1L water + 6 tsp sugar + 1 tsp salt\nCurd rice",
      "duration_warning": "If not improving in 2 days, refer to PHC"
    },
    {
      "id": 6,
      "disease": "Anemia",
      "keywords": ["weakness","fatigue","pale","dizziness","breathless","tired","pale skin","pale eyes"],
      "medicines": "Iron + Folic Acid tablet - daily after food\nVitamin C tablet - helps iron absorption",
      "precautions": "Eat iron-rich foods: spinach, jaggery, dates\nDo not take iron with tea/coffee",
      "red_flags": "Refer if: pregnant woman with severe anemia, Hb <7, fainting, chest pain",
      "remedies": "Jaggery + sesame seeds\nSpinach soup\nPomegranate juice",
      "duration_warning": "Iron tablets need 3 months for full effect"
    },
    {
      "id": 7,
      "disease": "Hypertension (High BP)",
      "keywords": ["high bp","blood pressure","headache","dizziness","chest","blurred vision","hypertension"],
      "medicines": "Continue prescribed BP medicine (do not stop)\nAmlodipine if newly diagnosed - refer for prescription",
      "precautions": "Reduce salt intake\nNo smoking/alcohol\nDaily 30 min walk\nCheck BP regularly",
      "red_flags": "Refer IMMEDIATELY if: BP >180/110, chest pain, vision loss, slurred speech",
      "remedies": "Garlic in morning\nCoconut water\nReduce stress",
      "duration_warning": "BP medicine must not be stopped without doctor advice"
    },
    {
      "id": 8,
      "disease": "Diabetes (High Blood Sugar)",
      "keywords": ["diabetes","sugar","thirst","frequent urination","slow healing","weight loss","glucose"],
      "medicines": "Continue prescribed diabetes medicine\nMetformin if newly suspected - refer for diagnosis",
      "precautions": "Avoid sugar, rice, maida\nCheck blood sugar regularly\nTake medicine on time",
      "red_flags": "Refer if: unconscious, blood sugar >300, wound not healing, numbness in feet",
      "remedies": "Bitter gourd juice (karela)\nFenugreek seeds water\nWalking daily",
      "duration_warning": "Diabetes needs lifelong management - refer to CHC"
    },
    {
      "id": 9,
      "disease": "Skin Allergy / Rash",
      "keywords": ["rash","itching","allergy","skin","hives","red skin","swelling","eczema"],
      "medicines": "Cetrizine 10mg - at night\nCalamine lotion - apply on rash\nHydrocortisone cream - mild cases",
      "precautions": "Identify and avoid allergen\nDo not scratch\nWear loose cotton clothes",
      "red_flags": "Refer if: swelling of face/throat, breathing difficulty, spreading rapidly",
      "remedies": "Aloe vera gel on affected area\nCold compress\nNeem water bath",
      "duration_warning": "If rash spreads or worsens in 2 days, refer"
    },
    {
      "id": 10,
      "disease": "Respiratory Infection / Pneumonia",
      "keywords": ["breathing","chest","cough","breathless","pneumonia","wheeze","respiratory","difficulty breathing"],
      "medicines": "Amoxicillin 500mg - 3 times daily - 5 days\nSalbutamol inhaler if wheezing\nParacetamol for fever",
      "precautions": "Complete antibiotic course\nNo smoking near patient\nKeep warm",
      "red_flags": "Refer IMMEDIATELY if: fast breathing, chest indrawing, blue lips, child not eating",
      "remedies": "Steam inhalation\nTulsi + honey + ginger tea\nWarm water gargles",
      "duration_warning": "If no improvement in 48 hours, refer to hospital"
    },
    {
      "id": 11,
      "disease": "Conjunctivitis (Eye Infection)",
      "keywords": ["eye","red eye","itching eye","watery eye","eye discharge","conjunctivitis","pink eye"],
      "medicines": "Chloramphenicol eye drops - 4 times daily\nTobramycin eye drops - alternative",
      "precautions": "Do not touch or rub eyes\nSeparate towel and pillow\nWash hands frequently",
      "red_flags": "Refer if: vision blurred, severe pain, no improvement in 3 days",
      "remedies": "Clean with clean cotton dipped in boiled water\nRose water drops",
      "duration_warning": "Usually resolves in 5-7 days with drops"
    },
    {
      "id": 12,
      "disease": "Pregnancy Related Symptoms",
      "keywords": ["pregnant","pregnancy","morning sickness","nausea pregnancy","vomiting pregnancy","swelling feet"],
      "medicines": "Folic Acid 5mg - daily\nIron + Folic Acid tablet - daily\nCalcium tablet - daily",
      "precautions": "Regular ANC checkups\nEat iron-rich foods\nRest adequately\nDo not take any other medicine without doctor",
      "red_flags": "Refer IMMEDIATELY if: bleeding, severe headache, blurred vision, reduced fetal movement, fits",
      "remedies": "Ginger tea for nausea\nSmall frequent meals\nElevate feet for swelling",
      "duration_warning": "All pregnant women must be registered at PHC/ANM"
    },
    {
      "id": 13,
      "disease": "Dengue Fever",
      "keywords": ["fever", "joint pain", "bone pain", "eye pain", "rash", "dengue", "bleeding gums"],
      "medicines": "Paracetamol 500mg - for fever\nORS for hydration\nDO NOT USE Aspirin or Ibuprofen",
      "precautions": "Use mosquito nets\nWear full sleeves\nDrink plenty of fluids (coconut water, ORS)",
      "red_flags": "Refer IMMEDIATELY if: bleeding from nose/gums, severe stomach pain, persistent vomiting, extreme weakness",
      "remedies": "Papaya leaf extract\nCoconut water\nAdequate rest",
      "duration_warning": "Critical phase is 24-48 hours after fever drops. Monitor closely."
    },
    {
      "id": 14,
      "disease": "Urinary Tract Infection (UTI)",
      "keywords": ["urine", "burning", "frequent urination", "pain lower abdomen", "uti", "blood in urine"],
      "medicines": "Norfloxacin 400mg - twice daily - 3 days\nParacetamol - for pain/fever\nAlkalizer syrup (Citalka) - 2 tsp in water",
      "precautions": "Drink 3-4 liters of water daily\nMaintain personal hygiene\nDo not hold urine",
      "red_flags": "Refer if: fever with chills, back pain, blood in urine, pregnant woman",
      "remedies": "Cranberry juice\nBarley water\nCoconut water",
      "duration_warning": "If symptoms persist after 3 days of antibiotics, refer for urine culture."
    }
  ];

  const handleAnalyze = () => {
    if (!medInput.symptoms) return;
    setMedStatus('loading');
    
    const performAnalysis = () => {
      const inputWords = `${medInput.disease} ${medInput.symptoms} ${medInput.time} ${medInput.existing}`.toLowerCase().split(/\W+/);
      const combinedInput = `${medInput.disease} ${medInput.symptoms} ${medInput.time} ${medInput.existing}`.toLowerCase();
      
      let bestMatch: MedicalRecord | null = null;
      let highestScore = 0;

      for (const record of medicalDataset) {
        let score = 0;
        for (const keyword of record.keywords) {
          const kwLower = keyword.toLowerCase();
          if (combinedInput.includes(kwLower)) {
            score += 2; // Exact phrase match gets higher score
          } else if (inputWords.some(word => word.includes(kwLower) || kwLower.includes(word))) {
            score += 1; // Partial word match
          }
        }
        if (score > highestScore) {
          highestScore = score;
          bestMatch = record;
        }
      }

      if (highestScore > 0 && bestMatch) {
        setMedResult(bestMatch);
        setMedStatus('success');
      } else {
        setMedStatus('error');
      }
    };

    if (network !== 'Good') {
      // Offline mode: Process immediately using local dataset
      performAnalysis();
    } else {
      // Simulate network delay for online mode
      setTimeout(performAnalysis, 1500);
    }
  };

  return (
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
            {currentScreen === 'home' && 'AashaLink'}
            {currentScreen === 'patient-records' && 'Patient Records'}
            {currentScreen === 'blood-bank' && (selectedBloodGroup ? `Blood: ${selectedBloodGroup}` : 'Blood Bank')}
            {currentScreen === 'bed-availability' && 'Bed Availability'}
            {currentScreen === 'med-assistant' && 'Medi Assistant'}
            {currentScreen === 'voice-diary' && 'Voice Diary'}
            {currentScreen === 'settings' && 'Settings'}
            {currentScreen === 'language' && 'Language Switch'}
            {currentScreen === 'login' && 'Login'}
            {currentScreen === 'profile' && 'Profile'}
          </h1>
          {activePatient && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full mt-0.5">
              Active: {activePatient.name}
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
                            <button 
                              onClick={() => window.open(`tel:${service.phone}`)}
                              className="w-full bg-rose-500 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                            >
                              <Phone className="w-3 h-3" /> CALL {service.phone}
                            </button>
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
                  <FeatureCard icon={Mic} label="Voice Diary" onClick={() => setCurrentScreen('voice-diary')} />
                  <FeatureCard icon={FileText} label="Patient Records" onClick={() => setCurrentScreen('patient-records')} />
                  <FeatureCard icon={Bed} label="Bed Availability" onClick={() => setCurrentScreen('bed-availability')} />
                  <FeatureCard icon={Droplet} label="Blood Bank" onClick={() => { setCurrentScreen('blood-bank'); setSelectedBloodGroup(null); }} />
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
                      
                      // Get location
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setUserLocation({
                              lat: position.coords.latitude,
                              lng: position.coords.longitude
                            });
                            setIsSosActive(true);
                          },
                          (error) => {
                            console.error("Error getting location", error);
                            // Fallback to a default location for demo purposes if geolocation fails
                            setUserLocation({ lat: 34.0522, lng: -118.2437 });
                            setIsSosActive(true);
                          }
                        );
                      } else {
                        alert('SOS Alert Triggered! Emergency contacts have been notified. (Geolocation not supported)');
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
                    <span className="text-4xl font-black tracking-tighter">SOS</span>
                  </motion.button>
                </div>

                {/* Med Assistant Card */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentScreen('med-assistant')}
                  className="w-full bg-white border-2 border-primary-100 p-5 rounded-3xl flex items-center gap-5 shadow-sm hover:border-primary-200 hover:shadow-md transition-all group"
                >
                  <div className="p-4 bg-primary-600 rounded-2xl shadow-inner shadow-primary-700/50 group-hover:bg-primary-500 transition-colors">
                    <PlusSquare className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-extrabold text-stone-800">Medi Assistant</h3>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">AI-powered medical support</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <Activity className="w-5 h-5 text-primary-600" />
                  </div>
                </motion.button>
              </>
            )}
          </>
        ) : currentScreen === 'patient-records' ? (
          <div className="pb-24">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients..." 
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
              />
            </div>
            
            {/* Advanced Filters */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex-shrink-0 flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Date</span>
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
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Blood</span>
                <select 
                  value={patientBloodGroupFilter}
                  onChange={(e) => setPatientBloodGroupFilter(e.target.value)}
                  className="text-sm font-medium text-stone-700 bg-transparent focus:outline-none appearance-none pr-4"
                >
                  <option value="">All</option>
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
                <p className="text-center text-stone-500 mt-8 font-medium">No patients found.</p>
              ) : (
                filteredPatients.map((p, i) => (
                  <div key={i} className={`bg-white p-5 rounded-2xl border ${activePatient?.name === p.name ? 'border-primary-400 ring-1 ring-primary-400 bg-primary-50/30' : 'border-stone-100'} shadow-sm flex justify-between items-start transition-all`}>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-extrabold text-stone-800 text-lg">{p.name}</h3>
                          <p className="text-sm text-stone-500 mt-0.5 font-medium">Age: {p.age} • Loc: {p.loc}</p>
                          <p className="text-xs text-stone-400 mt-0.5 font-medium">DOB: {p.dob} • Blood: {p.bloodGroup}</p>
                          <p className="text-xs text-stone-400 mt-0.5 font-medium">Contact: {p.contact}</p>
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
                          {activePatient?.name === p.name ? 'Selected' : 'Select Patient'}
                        </button>
                        <span className="bg-primary-50 text-primary-700 border border-primary-100 text-xs font-bold px-3 py-1.5 rounded-full">
                          {p.disease}
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
                      <h2 className="text-xl font-extrabold text-stone-800">Add New Patient</h2>
                      <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-stone-50 rounded-full"><X className="w-5 h-5 text-stone-500" /></button>
                    </div>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Basic Info</label>
                        <input type="text" placeholder="Full Name" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" placeholder="Age" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
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
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Medical Info</label>
                        <input type="text" placeholder="Location / Ward" value={newPatient.loc} onChange={e => setNewPatient({...newPatient, loc: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <input type="text" placeholder="Disease / Condition" value={newPatient.disease} onChange={e => setNewPatient({...newPatient, disease: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Personal Details</label>
                        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5">
                          <span className="text-xs font-bold text-stone-400 uppercase">DOB</span>
                          <input type="date" value={newPatient.dob} onChange={e => setNewPatient({...newPatient, dob: e.target.value})} className="flex-1 bg-transparent focus:outline-none font-medium text-stone-700" />
                        </div>
                        <input type="tel" placeholder="Contact Number" value={newPatient.contact} onChange={e => setNewPatient({...newPatient, contact: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <input type="tel" placeholder="Emergency Contact" value={newPatient.emergencyContact} onChange={e => setNewPatient({...newPatient, emergencyContact: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                        <textarea placeholder="Address" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium min-h-[80px]" />
                      </div>

                      <button onClick={handleAddPatient} className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl mt-2 hover:bg-primary-700 transition-colors shadow-md shadow-primary-200 sticky bottom-0">
                        Save Patient
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
                    <h2 className="text-xl font-extrabold text-stone-800 mb-2">Delete Patient Record</h2>
                    <p className="text-stone-600 font-medium mb-6">Are you sure you want to delete the record for <span className="text-stone-900 font-bold">{patientToDelete.name}</span>? This action cannot be undone.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setPatientToDelete(null)} className="flex-1 bg-stone-100 text-stone-800 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">
                        Cancel
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
                        Delete
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
                    <p className="text-sm text-stone-600 font-medium">Finding blood for:</p>
                    <p className="font-extrabold text-stone-800 text-lg">{activePatient.name} | {activePatient.age} | {activePatient.bloodGroup}</p>
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

            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={bbSearchQuery}
                  onChange={(e) => setBbSearchQuery(e.target.value)}
                  placeholder="Search blood banks..." 
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <select 
                    value={selectedBloodGroup || ''}
                    onChange={(e) => setSelectedBloodGroup(e.target.value || null)}
                    className="w-full pl-4 pr-10 py-3.5 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm appearance-none font-bold text-stone-700 text-sm"
                  >
                    <option value="">All Groups</option>
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
                    <option value={5}>Within 5km</option>
                    <option value={10}>Within 10km</option>
                    <option value={20}>Within 20km</option>
                    <option value={50}>Within 50km</option>
                    <option value={100}>Within 100km</option>
                  </select>
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex bg-stone-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setBbViewMode('list')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${bbViewMode === 'list' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                List View
              </button>
              <button 
                onClick={() => setBbViewMode('map')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${bbViewMode === 'map' ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Map View
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
                          <p className="text-xs font-bold text-rose-600 mb-3">{bb.distance} km away</p>
                          <button 
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${bb.lat},${bb.lng}`, '_blank')}
                            className="w-full bg-rose-50 text-rose-600 py-2 rounded-lg font-bold text-xs hover:bg-rose-100 transition-colors"
                          >
                            Get Directions
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
                    <p className="text-stone-500 font-bold">No blood banks found</p>
                    <p className="text-xs text-stone-400 mt-1">Try adjusting your filters</p>
                    <button 
                      onClick={() => { setSelectedBloodGroup(null); setMaxDistance(50); setBbSearchQuery(''); }}
                      className="mt-6 text-sm font-bold text-rose-600 hover:underline"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  filteredBloodBanks.map((bb, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-stone-800 text-lg">{bb.name}</h3>
                        <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-lg">{bb.distance} km</span>
                      </div>
                      <p className="text-sm text-stone-500 mt-1 mb-3 font-medium">{bb.address}</p>
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {bb.groups.map(g => (
                          <span key={g} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedBloodGroup === g ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                            {g}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${bb.lat},${bb.lng}`, '_blank')}
                          className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-700 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors border border-stone-200"
                        >
                          <MapPin className="w-4 h-4" /> Location
                        </button>
                        <button className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors border border-rose-100">
                          <Phone className="w-4 h-4" /> Call
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
                    <p className="text-sm text-stone-600 font-medium">Finding bed for:</p>
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
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                <h3 className="font-extrabold text-stone-800 text-lg">General Ward</h3>
                <p className="text-sm text-stone-500 mt-1 mb-5 font-medium">City Hospital</p>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600 font-bold">12 Beds Available</span>
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors shadow-md shadow-primary-200">
                    Request Book
                  </button>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                <h3 className="font-extrabold text-stone-800 text-lg">ICU</h3>
                <p className="text-sm text-stone-500 mt-1 mb-5 font-medium">Metro Care</p>
                <div className="flex justify-between items-center">
                  <span className="text-rose-600 font-bold">2 Beds Available</span>
                  <button className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors shadow-md shadow-primary-200">
                    Request Book
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : currentScreen === 'voice-diary' ? (
          <div className="pb-24 flex flex-col h-full">
            {/* Tabs */}
            <div className="flex bg-stone-100 p-1 rounded-2xl mb-6 shrink-0">
              <button onClick={() => setDiaryTab('record')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${diaryTab === 'record' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Record New</button>
              <button onClick={() => setDiaryTab('list')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${diaryTab === 'list' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Saved Entries</button>
            </div>

            {diaryTab === 'record' ? (
              <>
                {activePatient && (
                  <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-100 p-3 rounded-full"><User className="w-6 h-6 text-primary-600"/></div>
                      <div>
                        <p className="text-sm text-stone-600 font-medium">Recording for:</p>
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
                
                <div className="flex-1 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col mb-6 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="font-extrabold text-stone-800 text-lg">Transcript</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${isRecording ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-stone-100 text-stone-500 border border-stone-200'}`}>
                      {isRecording && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                      {formatTime(recordingTime)}
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {transcript ? (
                      <p className="text-stone-700 font-medium leading-relaxed text-lg">{transcript}</p>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-3">
                        <Mic className="w-12 h-12 opacity-20" />
                        <p className="text-center font-medium">Tap the microphone below<br/>to start recording</p>
                      </div>
                    )}
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
                      className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Filter by Date</span>
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
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-4">
                  {voiceDiaries.filter(d => {
                    const matchesSearch = d.patientName.toLowerCase().includes(diarySearchQuery.toLowerCase()) || d.transcript.toLowerCase().includes(diarySearchQuery.toLowerCase());
                    const matchesDate = diaryDateFilter ? d.date === diaryDateFilter : true;
                    return matchesSearch && matchesDate;
                  }).length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-stone-100">
                      <Mic className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                      <p className="text-stone-500 font-bold">No entries found</p>
                      <p className="text-xs text-stone-400 mt-1">Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    voiceDiaries.filter(d => {
                      const matchesSearch = d.patientName.toLowerCase().includes(diarySearchQuery.toLowerCase()) || d.transcript.toLowerCase().includes(diarySearchQuery.toLowerCase());
                      const matchesDate = diaryDateFilter ? d.date === diaryDateFilter : true;
                      return matchesSearch && matchesDate;
                    }).map(diary => (
                      <div key={diary.id} className="bg-white border border-stone-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-extrabold text-stone-800 text-lg">{diary.patientName}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-bold text-stone-400">{diary.date}</span>
                              <span className="w-1 h-1 rounded-full bg-stone-300" />
                              <span className="text-xs font-bold text-primary-600">{diary.duration}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => playDiary(diary.id, diary.transcript)}
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
                        <p className="text-sm text-stone-600 leading-relaxed line-clamp-3 bg-stone-50/50 p-3 rounded-xl border border-stone-50">
                          {diary.transcript}
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
                <textarea placeholder="Enter symptoms (e.g. fever, headache, vomiting)" rows={3} value={medInput.symptoms} onChange={e => setMedInput({...medInput, symptoms: e.target.value})} className="w-full p-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium shadow-sm resize-none" />
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
                  <span className="text-rose-600 font-bold text-sm tracking-wide">Offline Mode - Local Dataset</span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Possible Disease</h4>
                  <p className="text-xl font-black text-stone-800">{medResult.disease}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">Medicines</h4>
                  <p className="text-stone-700 font-medium whitespace-pre-line leading-relaxed">{medResult.medicines}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">Precautions</h4>
                  <p className="text-stone-700 font-medium whitespace-pre-line leading-relaxed">{medResult.precautions}</p>
                </div>

                <div className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-200">
                  <h4 className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Refer to Doctor If
                  </h4>
                  <p className="text-rose-800 font-bold whitespace-pre-line leading-relaxed">{medResult.red_flags}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">Home Remedies</h4>
                  <p className="text-stone-700 font-medium whitespace-pre-line leading-relaxed">{medResult.remedies}</p>
                </div>

                <div className="pt-6 space-y-3">
                  <button 
                    onClick={handleSaveReport}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                  >
                    Save Report to Records
                  </button>
                  <button 
                    onClick={() => { setMedStatus('idle'); setMedInput({ name: '', disease: '', symptoms: '', time: '', existing: '' }); }}
                    className="w-full bg-stone-100 text-stone-700 font-bold py-4 rounded-2xl hover:bg-stone-200 transition-colors"
                  >
                    New Patient
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : currentScreen === 'login' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-6">
              <User className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-stone-800 mb-2">Welcome Back</h2>
            <p className="text-stone-500 mb-8 text-center">Login to your AashaLink account</p>
            <button onClick={() => setCurrentScreen('home')} className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200">
              Login as Asha Worker
            </button>
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
            <h2 className="text-xl font-extrabold text-stone-800 mb-6">Select Language</h2>
            {['English', 'हिंदी (Hindi)', 'मराठी (Marathi)', 'தமிழ் (Tamil)', 'ಕನ್ನಡ (Kannada)'].map((lang, i) => (
              <button key={i} onClick={() => setCurrentScreen('home')} className="w-full bg-white rounded-2xl border border-stone-100 p-5 shadow-sm flex items-center justify-between hover:border-primary-200 transition-colors">
                <span className="font-bold text-stone-700">{lang}</span>
                {i === 0 && <div className="w-4 h-4 rounded-full bg-primary-600 border-4 border-primary-100"></div>}
                {i !== 0 && <div className="w-4 h-4 rounded-full border-2 border-stone-300"></div>}
              </button>
            ))}
          </div>
        ) : currentScreen === 'profile' ? (
          <div className="p-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
              <User className="w-12 h-12 text-primary-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-stone-800">AashaLink Worker</h2>
            <p className="text-stone-500 font-medium mb-8">vishvcode@gmail.com</p>
            
            <div className="w-full space-y-3">
              <button onClick={() => setCurrentScreen('settings')} className="w-full bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex items-center gap-4 hover:border-primary-200 transition-colors text-left">
                <Settings className="w-6 h-6 text-stone-400" />
                <span className="font-bold text-stone-700 flex-1">Settings</span>
              </button>
              <button onClick={() => setCurrentScreen('language')} className="w-full bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex items-center gap-4 hover:border-primary-200 transition-colors text-left">
                <Globe className="w-6 h-6 text-stone-400" />
                <span className="font-bold text-stone-700 flex-1">Language</span>
              </button>
              <button onClick={() => setShowHelpDialog(true)} className="w-full bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex items-center gap-4 hover:border-primary-200 transition-colors text-left">
                <HelpCircle className="w-6 h-6 text-stone-400" />
                <span className="font-bold text-stone-700 flex-1">Help & Support</span>
              </button>
              <button onClick={() => setShowLogoutConfirm(true)} className="w-full bg-rose-50 rounded-2xl border border-rose-100 p-4 shadow-sm flex items-center gap-4 hover:border-rose-200 transition-colors text-left mt-4">
                <LogOut className="w-6 h-6 text-rose-500" />
                <span className="font-bold text-rose-600 flex-1">Logout</span>
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Bottom Navigation */}
      {currentScreen !== 'login' && (
        <nav className="h-20 bg-white border-t border-stone-100 flex items-center justify-around px-4 pb-2 relative z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <NavItem icon={Home} label="Home" active={currentScreen === 'home'} onClick={() => setCurrentScreen('home')} />
          <NavItem icon={ClipboardList} label="Records" active={currentScreen === 'patient-records'} onClick={() => setCurrentScreen('patient-records')} />
          <NavItem icon={Mic} label="Voice" active={currentScreen === 'voice-diary'} onClick={() => setCurrentScreen('voice-diary')} />
          <NavItem icon={User} label="Profile" active={currentScreen === 'profile'} onClick={() => setCurrentScreen('profile')} />
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
                    <h2 className="text-lg font-extrabold text-stone-800">AashaLink</h2>
                    <p className="text-xs text-stone-500 font-medium">vishvcode@gmail.com</p>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto py-4">
                <DrawerItem icon={Settings} label="Settings" onClick={() => { setCurrentScreen('settings'); setIsDrawerOpen(false); }} />
                <DrawerItem icon={Globe} label="Language Switch" onClick={() => { setCurrentScreen('language'); setIsDrawerOpen(false); }} />
                <DrawerItem icon={HelpCircle} label="Help & Support" onClick={() => { setShowHelpDialog(true); setIsDrawerOpen(false); }} />
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-stone-100">
                <DrawerItem icon={LogOut} label="Logout" isRed onClick={() => { setShowLogoutConfirm(true); setIsDrawerOpen(false); }} />
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
              <h2 className="text-xl font-extrabold text-stone-800 mb-4">Help & Support</h2>
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
              <h2 className="text-xl font-extrabold text-stone-800 mb-2">Logout</h2>
              <p className="text-stone-600 font-medium mb-6">Are you sure you want to logout?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-stone-100 text-stone-800 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">
                  Cancel
                </button>
                <button onClick={() => { setShowLogoutConfirm(false); setCurrentScreen('login'); }} className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-md shadow-rose-200">
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
  );
}
