import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { auth, googleProvider, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useCart } from '../context/CartContext';

export default function Login() {
  const router = useRouter();
  const { user, addToast } = useCart();
  
  const [activeTab, setActiveTab] = useState('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirect = router.query.redirect || '/';
      router.push(redirect);
    }
  }, [user]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      addToast('Welcome back! 🌿', 'success');
    } catch (err) {
      console.error(err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email';
      else if (err.code === 'auth/wrong-password') msg = 'Incorrect password';
      else if (err.code === 'auth/invalid-email') msg = 'Invalid email format';
      addToast(msg, 'error');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (regPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      await updateProfile(cred.user, { displayName: regName });
      
      // Save profile in Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: regName,
        email: regEmail,
        phone: regPhone,
        address: { line1: '', line2: '', city: '', pincode: '', state: '' },
        createdAt: serverTimestamp()
      });

      addToast('Account created! Welcome to Curfee 🌿', 'success');
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'Email already registered. Try logging in.';
      addToast(msg, 'error');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      
      // Create user document if doesn't exist
      await setDoc(doc(db, 'users', u.uid), {
        name: u.displayName || 'User',
        email: u.email || '',
        phone: u.phoneNumber || '',
        createdAt: serverTimestamp()
      }, { merge: true });

      addToast(`Welcome, ${u.displayName || 'User'}! 🌿`, 'success');
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        addToast('Google login failed', 'error');
      }
    }
  };

  return (
    <div className="auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '40px 16px' }}>
      <div className="auth-card" style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px' }}>
        <div className="auth-logo" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Link href="/" className="logo" style={{ justifyContent: 'center', display: 'flex', textDecoration: 'none' }}>
            <div className="logo-icon">🌿</div> 
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>Curfee</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '400', color: 'var(--text)' }}>Organic</span>
          </Link>
        </div>

        <h2 style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: '6px', fontWeight: '700' }}>Welcome Back</h2>
        <p className="auth-subtitle" style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Login to access your organic marketplace
        </p>

        {/* Tab Switchers */}
        <div className="auth-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
          <button 
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} 
            onClick={() => setActiveTab('login')}
            style={{ flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'login' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'login' ? '700' : '400' }}
          >
            Login
          </button>
          <button 
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`} 
            onClick={() => setActiveTab('register')}
            style={{ flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'register' ? '2px solid var(--primary)' : 'none', fontWeight: activeTab === 'register' ? '700' : '400' }}
          >
            Register
          </button>
        </div>

        {/* Google sign-in */}
        <div className="social-login" style={{ marginBottom: '20px' }}>
          <button 
            className="social-btn" 
            onClick={handleGoogleLogin}
            style={{ width: '100%', padding: '10px', border: '1.5px solid var(--border)', borderRadius: '8px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '600', fontSize: '0.85rem' }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="G" /> 
            Continue with Google
          </button>
        </div>

        <div className="auth-divider" style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.8rem', margin: '16px 0', position: 'relative' }}>
          <span style={{ background: '#fff', padding: '0 10px', position: 'relative', zIndex: 1 }}>or</span>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border)', zIndex: 0 }}></div>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Email</label>
              <input 
                type="email" 
                required 
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Password</label>
              <input 
                type="password" 
                required 
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%' }}>
              Login <i className="fas fa-arrow-right" style={{ marginLeft: '6px' }}></i>
            </button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Full Name</label>
              <input 
                type="text" 
                required 
                placeholder="John Doe"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Email</label>
              <input 
                type="email" 
                required 
                placeholder="you@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Phone</label>
              <input 
                type="tel" 
                placeholder="9876543210"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Password</label>
              <input 
                type="password" 
                required 
                placeholder="Min 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%' }}>
              Create Account <i className="fas fa-user-plus" style={{ marginLeft: '6px' }}></i>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
