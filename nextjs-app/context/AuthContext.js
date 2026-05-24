import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Create or fetch user profile from Firestore
  const fetchOrCreateProfile = async (user) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({ uid: user.uid, ...data });
        return data;
      } else {
        const newProfile = {
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: user.phoneNumber || '',
          addresses: [],
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile({ uid: user.uid, ...newProfile });
        return newProfile;
      }
    } catch (error) {
      console.error('Error fetching/creating profile:', error);
      // Fallback to auth data
      const fallback = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email || ''
      };
      setUserProfile(fallback);
      return fallback;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        await fetchOrCreateProfile(user);
        localStorage.setItem('curfee_token', 'firebase_' + user.uid);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        localStorage.removeItem('curfee_token');
        localStorage.removeItem('curfee_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Register with email/password
  const register = async (email, password, name) => {
    setAuthError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Update display name
      await updateProfile(result.user, { displayName: name });
      // Create Firestore profile
      const userDocRef = doc(db, 'users', result.user.uid);
      await setDoc(userDocRef, {
        name: name,
        email: email,
        phone: '',
        addresses: [],
        createdAt: serverTimestamp()
      });
      setUserProfile({ uid: result.user.uid, name, email, phone: '', addresses: [] });
      return result.user;
    } catch (error) {
      const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please login.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.'
      };
      setAuthError(errorMessages[error.code] || error.message);
      throw error;
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      const errorMessages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-email': 'Please enter a valid email address.'
      };
      setAuthError(errorMessages[error.code] || error.message);
      throw error;
    }
  };

  // Google OAuth Login
  const googleLogin = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError('Google sign-in failed. Please try again.');
      }
      throw error;
    }
  };

  // Logout
  const logoutUser = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem('curfee_token');
      localStorage.removeItem('curfee_user');
      localStorage.removeItem('curfee_cart');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const clearError = () => setAuthError(null);

  const value = {
    currentUser,
    userProfile,
    loading,
    authError,
    register,
    login,
    googleLogin,
    logout: logoutUser,
    clearError,
    setUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
