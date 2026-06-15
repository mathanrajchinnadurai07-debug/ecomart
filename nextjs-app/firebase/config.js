import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "AIzaSyAMIVpTQsmo789gRpf9LzfPpGFJw9rVxxw",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "lunx-9a9b2.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "lunx-9a9b2",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "lunx-9a9b2.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "367858643423",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:367858643423:web:ce80e0e29de5186052d46a",
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     || "G-LB3SE2T5EX"
};

const app        = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db         = getFirestore(app);
const auth       = getAuth(app);
const storage    = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, storage, googleProvider };
