import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { auth, googleProvider, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: 'Too short', color: '#64748b' });

  // Phone OTP form state
  const [phoneNum, setPhoneNum] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
      // Allow redirecting to trigger verification flow in ProtectedRoute
      const redirect = router.query.redirect || '/';
      router.push(redirect);
    } else if (user) {
      const redirect = router.query.redirect || '/';
      router.push(redirect);
    }
  }, [user]);

  // Clean up recaptcha container on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  const checkPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: 'Empty', color: '#cbd5e1' };
    if (pwd.length < 8) return { score: 1, text: 'Too short (Min 8 chars)', color: '#ef4444' };
    
    let score = 0;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 2, text: 'Weak', color: '#f59e0b' };
    if (score <= 3) return { score: 3, text: 'Medium', color: '#3b82f6' };
    return { score: 4, text: 'Strong 🌿', color: '#10b981' };
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setRegPassword(val);
    setPasswordStrength(checkPasswordStrength(val));
  };

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
    const strength = checkPasswordStrength(regPassword);
    if (strength.score < 3) {
      addToast('Please use a stronger password (Medium or Strong).', 'error');
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

      // Send Verification Email
      await sendEmailVerification(cred.user);
      addToast('Verification email sent! Please check your inbox. ✉️', 'info');
    } catch (err) {
      console.error(err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'Email already registered. Try logging in.';
      addToast(msg, 'error');
    }
  };

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) return;
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('Recaptcha resolved');
        },
        'expired-callback': () => {
          addToast('Recaptcha expired. Please try again.', 'warning');
        }
      });
    } catch (error) {
      console.error('Recaptcha setup error:', error);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNum || phoneNum.length < 10) {
      addToast('Please enter a valid phone number with country code (e.g. +91...)', 'error');
      return;
    }

    setSendingOtp(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = phoneNum.startsWith('+') ? phoneNum : `+91${phoneNum}`;
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      addToast('SMS OTP sent successfully! 💬', 'success');
    } catch (err) {
      console.error('OTP send failed:', err);
      addToast('Failed to send OTP: ' + (err.message || 'Error occurred'), 'error');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      addToast('Please enter a 6-digit verification code.', 'error');
      return;
    }

    setVerifyingOtp(true);
    try {
      const result = await confirmationResult.confirm(otpCode);
      const u = result.user;
      
      // Check if firestore user exists
      const userRef = doc(db, 'users', u.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: 'Organic User',
          email: u.email || '',
          phone: u.phoneNumber || '',
          address: { line1: '', line2: '', city: '', pincode: '', state: '' },
          createdAt: serverTimestamp()
        });
      }

      addToast('Logged in successfully! 🌿', 'success');
    } catch (err) {
      console.error('OTP Verification failed:', err);
      addToast('Invalid verification code. Please try again.', 'error');
    } finally {
      setVerifyingOtp(false);
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
    <div className="auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '40px 16px', fontFamily: "'Inter', sans-serif" }}>
      <div className="auth-card" style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px', border: '1px solid rgba(0,0,0,0.02)' }}>
        <div className="auth-logo" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Link href="/" className="logo" style={{ justifyContent: 'center', display: 'flex', textDecoration: 'none', alignItems: 'center', gap: '6px' }}>
            <div className="logo-icon" style={{ fontSize: '1.8rem' }}>🌿</div> 
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1a5c38', fontFamily: "'Poppins', sans-serif" }}>Curify</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '400', color: '#1a1a2e', fontFamily: "'Poppins', sans-serif" }}>Organic</span>
          </Link>
        </div>

        <h2 style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: '6px', fontWeight: '800', color: '#1a1a2e', fontFamily: "'Poppins', sans-serif" }}>
          {activeTab === 'login' ? 'Welcome Back' : activeTab === 'register' ? 'Join Curify' : 'Secure OTP Login'}
        </h2>
        <p className="auth-subtitle" style={{ textAlign: 'center', color: '#718096', fontSize: '0.82rem', marginBottom: '20px' }}>
          Protecting your session with advanced security standards.
        </p>

        {/* Tab Switchers */}
        <div className="auth-tabs" style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <button 
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('login'); setOtpSent(false); }}
            style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'login' ? '2.5px solid #1a5c38' : 'none', fontWeight: activeTab === 'login' ? '700' : '500', color: activeTab === 'login' ? '#1a5c38' : '#718096', fontSize: '0.85rem' }}
          >
            Login
          </button>
          <button 
            className={`auth-tab ${activeTab === 'phone' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('phone'); setOtpSent(false); }}
            style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'phone' ? '2.5px solid #1a5c38' : 'none', fontWeight: activeTab === 'phone' ? '700' : '500', color: activeTab === 'phone' ? '#1a5c38' : '#718096', fontSize: '0.85rem' }}
          >
            Phone OTP
          </button>
          <button 
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`} 
            onClick={() => { setActiveTab('register'); setOtpSent(false); }}
            style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === 'register' ? '2.5px solid #1a5c38' : 'none', fontWeight: activeTab === 'register' ? '700' : '500', color: activeTab === 'register' ? '#1a5c38' : '#718096', fontSize: '0.85rem' }}
          >
            Register
          </button>
        </div>

        {/* Google sign-in */}
        {activeTab !== 'phone' && (
          <div className="social-login" style={{ marginBottom: '18px' }}>
            <button 
              className="social-btn" 
              onClick={handleGoogleLogin}
              style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '600', fontSize: '0.85rem', color: '#334155', transition: 'background-color 0.2s' }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="G" /> 
              Continue with Google
            </button>
          </div>
        )}

        {activeTab !== 'phone' && (
          <div className="auth-divider" style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', margin: '14px 0', position: 'relative' }}>
            <span style={{ background: '#fff', padding: '0 10px', position: 'relative', zIndex: 1, fontWeight: '500' }}>or use secure credentials</span>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e2e8f0', zIndex: 0 }}></div>
          </div>
        )}

        {/* Invisible ReCAPTCHA Container */}
        <div id="recaptcha-container"></div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '5px', fontWeight: '700', color: '#475569' }}>EMAIL ADDRESS</label>
              <input 
                type="email" 
                required 
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '5px', fontWeight: '700', color: '#475569' }}>PASSWORD</label>
              <input 
                type="password" 
                required 
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1a5c38, #2d6a4f)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(26,92,56,0.18)' }}
            >
              Verify & Log In <i className="fas fa-shield-alt"></i>
            </button>
          </form>
        )}

        {/* Phone OTP Form */}
        {activeTab === 'phone' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '5px', fontWeight: '700', color: '#475569' }}>MOBILE PHONE NUMBER</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="+91 9876543210"
                    value={phoneNum}
                    onChange={(e) => setPhoneNum(e.target.value)}
                    style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>Enter country code prefix (e.g. +91 for India).</small>
                </div>
                <button 
                  type="submit" 
                  disabled={sendingOtp}
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1a5c38, #2d6a4f)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: sendingOtp ? 0.8 : 1 }}
                >
                  {sendingOtp ? 'Verifying Recaptcha...' : 'Send Verification SMS'} 
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '5px', fontWeight: '700', color: '#475569' }}>6-DIGIT VERIFICATION CODE</label>
                  <input 
                    type="text" 
                    required 
                    maxLength="6"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '1.1rem', letterSpacing: '8px', textAlign: 'center', outline: 'none' }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={verifyingOtp}
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #e05a2b, #f77f00)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: verifyingOtp ? 0.8 : 1 }}
                >
                  {verifyingOtp ? 'Verifying Code...' : 'Submit OTP Code'} 
                  <i className="fas fa-check-circle"></i>
                </button>
                <button 
                  type="button" 
                  onClick={() => setOtpSent(false)}
                  style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}
                >
                  Change Phone Number
                </button>
              </form>
            )}
          </div>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px', fontWeight: '700', color: '#475569' }}>FULL NAME</label>
              <input 
                type="text" 
                required 
                placeholder="John Doe"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px', fontWeight: '700', color: '#475569' }}>EMAIL ADDRESS</label>
              <input 
                type="email" 
                required 
                placeholder="you@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px', fontWeight: '700', color: '#475569' }}>PHONE (OPTIONAL)</label>
              <input 
                type="tel" 
                placeholder="9876543210"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '4px', fontWeight: '700', color: '#475569' }}>CREATE PASSWORD</label>
              <input 
                type="password" 
                required 
                placeholder="Min 8 characters, capital, number, symbol"
                value={regPassword}
                onChange={handlePasswordChange}
                style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>

            {/* Password strength meter */}
            {regPassword && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '4px', height: '4px', marginTop: '6px', borderRadius: '2px', overflow: 'hidden', background: '#e2e8f0' }}>
                  <div style={{ flex: 1, background: passwordStrength.score >= 1 ? passwordStrength.color : '#e2e8f0' }}></div>
                  <div style={{ flex: 1, background: passwordStrength.score >= 2 ? passwordStrength.color : '#e2e8f0' }}></div>
                  <div style={{ flex: 1, background: passwordStrength.score >= 3 ? passwordStrength.color : '#e2e8f0' }}></div>
                  <div style={{ flex: 1, background: passwordStrength.score >= 4 ? passwordStrength.color : '#e2e8f0' }}></div>
                </div>
                <div style={{ fontSize: '0.72rem', color: passwordStrength.color, marginTop: '4px', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Security Strength: {passwordStrength.text}</span>
                  {passwordStrength.score < 3 && <span style={{ color: '#ef4444' }}>Must be Medium or Strong</span>}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1a5c38, #2d6a4f)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', boxShadow: '0 4px 12px rgba(26,92,56,0.18)' }}
            >
              Secure Register & Verify <i className="fas fa-user-plus"></i>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
