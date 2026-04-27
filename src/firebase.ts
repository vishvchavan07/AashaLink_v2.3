import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For actual use, configure these variables in your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock_api_key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock_project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock_project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock_project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock_sender_id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock_app_id"
};

// Initialize Firebase gracefully
let app;
let db: any = {};
let auth: any = {};

// Use the user-provided debug token for phone verification/app check testing
if (typeof window !== 'undefined') {
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "AdrTqXG_MDs-SsxVvoFJ4L1VbiHwhH0f7QsMiw3uF09ryU8h3a4c-AEfftJioEZidX1EKfbRBTKgU8bs6wMzd3pinnTi-D14QKsd69ZE70cbBOPPFHuC-GaHse9EvC-WE5g0orSE1dvwCk_uhWBGCUM_jA";
}

try {
  if (firebaseConfig.apiKey === "mock_api_key") {
    console.warn("Using mock Firebase configuration.");
  } else {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    auth.settings.appVerificationDisabledForTesting = true; // Make local testing easier
  }
} catch (error) {
  console.warn("Firebase initialization failed. Using mock services. Ensure .env has valid keys.");
}

export { db, auth };

// Helper functions for easy frontend access
export const getCollectionData = async (collectionName: string) => {
  if (Object.keys(db).length === 0) return [];
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
};

export const addCollectionData = async (collectionName: string, data: any) => {
  if (Object.keys(db).length === 0) {
    console.warn(`Mock mode: simulated adding to ${collectionName}`);
    return "mock_id_" + Date.now();
  }
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding to ${collectionName}:`, error);
    throw error;
  }
};
