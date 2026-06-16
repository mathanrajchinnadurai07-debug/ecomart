import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "AIzaSyA-9DbYjV_GDJFXk8tJJAr2SNzPVqf_fZA",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "curfee-88c3c.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "curfee-88c3c",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "curfee-88c3c.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "504634958195",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:504634958195:web:93cf3eee20977684e5a506",
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     || "G-7CVW3R3JXZ"
};

const app        = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db         = getFirestore(app);
const auth       = getAuth(app);
const storage    = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, storage, googleProvider };
