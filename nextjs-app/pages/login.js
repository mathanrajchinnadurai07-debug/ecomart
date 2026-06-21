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

  // Which view is active: 'main' | 'phone' | 'email' | 'register'
  const [view, setView] = useState('main');

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
  const [rememberMe, setRememberMe] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirect = router.query.redirect || '/';
      router.push(redirect);
    }
  }, [user]);

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
      }
    };
  }, []);

  const checkPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: 'Empty', color: '#cbd5e1' };
    if (pwd.length < 8) return { score: 1, text: 'Too short (min 8 chars)', color: '#ef4444' };
    let score = 0;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
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
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: regName,
        email: regEmail,
        phone: regPhone,
        address: { line1: '', line2: '', city: '', pincode: '', state: '' },
        createdAt: serverTimestamp()
      });
      await sendEmailVerification(cred.user);
      addToast('Verification email sent! Please check your inbox. ✉️', 'info');
    } catch (err) {
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
        callback: () => {},
        'expired-callback': () => addToast('Recaptcha expired. Please try again.', 'warning')
      });
    } catch (error) {
      console.error('Recaptcha setup error:', error);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNum || phoneNum.length < 10) {
      addToast('Please enter a valid 10-digit phone number', 'error');
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
      addToast('OTP sent to ' + formattedPhone + ' 💬', 'success');
    } catch (err) {
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
      addToast('Invalid verification code. Please try again.', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      await setDoc(doc(db, 'users', u.uid), {
        name: u.displayName || 'User',
        email: u.email || '',
        phone: u.phoneNumber || '',
        createdAt: serverTimestamp()
      }, { merge: true });
      addToast(`Welcome, ${u.displayName || 'User'}! 🌿`, 'success');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        addToast('Google login failed', 'error');
      }
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          background: #f8f8f8;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Hero */
        .login-hero {
          width: 100%;
          max-width: 480px;
          height: 240px;
          position: relative;
          overflow: hidden;
          border-radius: 0 0 32px 32px;
          flex-shrink: 0;
        }
        .login-hero img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .login-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(26,92,56,0.35) 0%, rgba(26,92,56,0.7) 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 24px;
        }
        .login-hero-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          margin-bottom: 8px;
        }
        .login-hero-logo .leaf { font-size: 2rem; }
        .login-hero-logo .brand-name {
          font-family: 'Poppins', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
        }
        .login-hero-tagline {
          font-family: 'Poppins', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: rgba(255,255,255,0.92);
          text-align: center;
          line-height: 1.4;
        }

        /* Card */
        .login-card {
          width: 100%;
          max-width: 480px;
          background: #fff;
          border-radius: 24px 24px 0 0;
          padding: 28px 24px 40px;
          flex: 1;
          position: relative;
          margin-top: -16px;
          box-shadow: 0 -4px 30px rgba(0,0,0,0.08);
        }

        .login-section-title {
          font-size: 0.78rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
          text-align: center;
        }

        /* Phone input row */
        .phone-row {
          display: flex;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          transition: border-color 0.2s;
        }
        .phone-row:focus-within {
          border-color: #1a5c38;
          box-shadow: 0 0 0 3px rgba(26,92,56,0.1);
        }
        .phone-flag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 14px 14px;
          border-right: 1.5px solid #e5e7eb;
          background: #f9fafb;
          font-size: 0.88rem;
          color: #374151;
          font-weight: 600;
          white-space: nowrap;
          cursor: default;
        }
        .phone-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 14px 14px;
          font-size: 1rem;
          font-family: 'Inter', sans-serif;
          color: #111827;
          background: transparent;
        }
        .phone-input::placeholder { color: #9ca3af; }

        /* Remember me */
        .remember-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 14px 0 20px;
          cursor: pointer;
        }
        .remember-checkbox {
          width: 20px;
          height: 20px;
          border-radius: 5px;
          border: 2px solid #1a5c38;
          background: #1a5c38;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .remember-checkbox.unchecked {
          background: #fff;
          border-color: #d1d5db;
        }
        .remember-text {
          font-size: 0.88rem;
          color: #374151;
          font-weight: 500;
        }

        /* Buttons */
        .btn-continue {
          width: 100%;
          padding: 15px;
          background: #1a5c38;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          letter-spacing: 0.3px;
        }
        .btn-continue:hover { background: #155030; }
        .btn-continue:active { transform: scale(0.99); }
        .btn-continue:disabled { background: #86b89a; cursor: not-allowed; }

        .btn-google {
          width: 100%;
          padding: 13px;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .btn-google:hover { background: #f9fafb; border-color: #d1d5db; }

        .btn-email {
          width: 100%;
          padding: 13px;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .btn-email:hover { background: #f9fafb; border-color: #d1d5db; }

        /* Divider */
        .or-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          color: #9ca3af;
          font-size: 0.82rem;
          font-weight: 500;
        }
        .or-divider::before, .or-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        /* Form inputs */
        .form-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }
        .form-input {
          width: 100%;
          padding: 13px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.95rem;
          font-family: 'Inter', sans-serif;
          color: #111827;
          background: #fff;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 14px;
        }
        .form-input:focus {
          border-color: #1a5c38;
          box-shadow: 0 0 0 3px rgba(26,92,56,0.1);
        }

        /* Back button */
        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          color: #374151;
          padding: 0;
          margin-bottom: 20px;
          font-family: 'Inter', sans-serif;
        }
        .back-btn:hover { color: #1a5c38; }

        /* OTP boxes */
        .otp-input {
          width: 100%;
          padding: 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 14px;
          text-align: center;
          outline: none;
          font-family: 'Poppins', sans-serif;
          color: #1a5c38;
          margin-bottom: 20px;
          transition: border-color 0.2s;
        }
        .otp-input:focus {
          border-color: #1a5c38;
          box-shadow: 0 0 0 3px rgba(26,92,56,0.1);
        }

        /* Password strength */
        .strength-bar {
          display: flex;
          gap: 4px;
          height: 4px;
          margin: 4px 0 6px;
          border-radius: 2px;
          overflow: hidden;
        }
        .strength-segment { flex: 1; background: #e5e7eb; border-radius: 2px; transition: background 0.3s; }

        /* Terms */
        .terms-text {
          text-align: center;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 20px;
          line-height: 1.6;
        }
        .terms-text a { color: #1a5c38; text-decoration: none; font-weight: 600; }
        .terms-text a:hover { text-decoration: underline; }

        /* Switch link */
        .switch-text {
          text-align: center;
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 16px;
        }
        .switch-text button {
          background: none;
          border: none;
          color: #1a5c38;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.85rem;
          font-family: 'Inter', sans-serif;
          padding: 0;
        }
        .switch-text button:hover { text-decoration: underline; }

        .section-heading {
          font-family: 'Poppins', sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .section-sub {
          font-size: 0.85rem;
          color: #6b7280;
          margin-bottom: 22px;
          line-height: 1.5;
        }
      `}</style>

      <div className="login-page">
        {/* Hero Section */}
        <div className="login-hero">
          <img src="/images/login-hero.jpg" alt="Fresh organic produce" onError={(e) => { e.target.style.display='none'; e.target.parentNode.style.background='linear-gradient(135deg, #1a5c38 0%, #2d6a4f 50%, #40916c 100%)'; }} />
          <div className="login-hero-overlay">
            <Link href="/" className="login-hero-logo">
              <span className="leaf">🌿</span>
              <span className="brand-name">Curify</span>
            </Link>
            <p className="login-hero-tagline">India's #1 Organic Grocery App</p>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">

          {/* ─── MAIN VIEW ─── */}
          {view === 'main' && (
            <>
              <p className="login-section-title">Log in or sign up</p>

              {/* Phone number login */}
              <div className="phone-row">
                <div className="phone-flag">🇮🇳 +91</div>
                <input
                  id="phone-login-input"
                  className="phone-input"
                  type="tel"
                  maxLength={10}
                  placeholder="Enter Mobile Number"
                  value={phoneNum}
                  onChange={(e) => setPhoneNum(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>

              <label className="remember-row" htmlFor="rememberMe" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`remember-checkbox ${rememberMe ? '' : 'unchecked'}`}>
                  {rememberMe && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="remember-text">Remember my login for faster sign-in</span>
              </label>

              <button
                id="phone-continue-btn"
                className="btn-continue"
                onClick={() => {
                  if (!phoneNum || phoneNum.length < 10) {
                    addToast('Please enter a valid 10-digit mobile number', 'error');
                    return;
                  }
                  setView('phone');
                  handleSendOtp({ preventDefault: () => {} });
                }}
              >
                Continue
              </button>

              <div className="or-divider">or</div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button id="google-login-btn" className="btn-google" onClick={handleGoogleLogin} style={{ flex: 1 }}>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google" />
                </button>
                <button id="email-login-btn" className="btn-email" onClick={() => setView('email')} style={{ flex: 1 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </button>
              </div>

              <p className="terms-text">
                By continuing, you agree to our{' '}
                <a href="#">Terms of Service</a>{' '}
                <a href="#">Privacy Policy</a>{' '}
                <a href="#">Content Policy</a>
              </p>

              <div id="recaptcha-container"></div>
            </>
          )}

          {/* ─── PHONE OTP VIEW ─── */}
          {view === 'phone' && (
            <>
              <button className="back-btn" onClick={() => { setView('main'); setOtpSent(false); setOtpCode(''); }}>
                ← Back
              </button>

              {!otpSent ? (
                <>
                  <p className="section-heading">Verify your number</p>
                  <p className="section-sub">Sending OTP to +91 {phoneNum}...</p>
                  <button className="btn-continue" disabled style={{ opacity: 0.7 }}>Sending OTP...</button>
                </>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <p className="section-heading">Enter OTP</p>
                  <p className="section-sub">We sent a 6-digit code to +91 {phoneNum}</p>

                  <input
                    id="otp-input"
                    className="otp-input"
                    type="text"
                    maxLength={6}
                    placeholder="——————"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    autoFocus
                  />

                  <button id="verify-otp-btn" type="submit" className="btn-continue" disabled={verifyingOtp}>
                    {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <div className="switch-text" style={{ marginTop: '16px' }}>
                    Didn't receive OTP?{' '}
                    <button type="button" onClick={() => { setOtpSent(false); handleSendOtp({ preventDefault: () => {} }); }}>
                      Resend
                    </button>
                  </div>
                </form>
              )}
              <div id="recaptcha-container"></div>
            </>
          )}

          {/* ─── EMAIL LOGIN VIEW ─── */}
          {view === 'email' && (
            <>
              <button className="back-btn" onClick={() => setView('main')}>← Back</button>
              <p className="section-heading">Log in with email</p>
              <p className="section-sub">Enter your email and password to continue</p>

              <form onSubmit={handleLoginSubmit}>
                <label className="form-label">Email Address</label>
                <input
                  id="login-email"
                  className="form-input"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <label className="form-label">Password</label>
                <input
                  id="login-password"
                  className="form-input"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button id="email-login-submit" type="submit" className="btn-continue">
                  Log In
                </button>
              </form>

              <div className="or-divider">or</div>
              <button id="google-login-btn-2" className="btn-google" onClick={handleGoogleLogin}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google" />
                Continue with Google
              </button>

              <div className="switch-text">
                New to Curify?{' '}
                <button onClick={() => setView('register')}>Create Account</button>
              </div>
            </>
          )}

          {/* ─── REGISTER VIEW ─── */}
          {view === 'register' && (
            <>
              <button className="back-btn" onClick={() => setView('email')}>← Back</button>
              <p className="section-heading">Create Account</p>
              <p className="section-sub">Join Curify and start shopping fresh organics</p>

              <form onSubmit={handleRegisterSubmit}>
                <label className="form-label">Full Name</label>
                <input
                  id="reg-name"
                  className="form-input"
                  type="text"
                  required
                  placeholder="Your full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />

                <label className="form-label">Email Address</label>
                <input
                  id="reg-email"
                  className="form-input"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />

                <label className="form-label">Phone (Optional)</label>
                <input
                  id="reg-phone"
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />

                <label className="form-label">Create Password</label>
                <input
                  id="reg-password"
                  className="form-input"
                  type="password"
                  required
                  placeholder="Min 8 chars with number & capital"
                  value={regPassword}
                  onChange={handlePasswordChange}
                  style={{ marginBottom: '6px' }}
                />

                {regPassword && (
                  <div style={{ marginBottom: '14px' }}>
                    <div className="strength-bar">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="strength-segment" style={{ background: passwordStrength.score >= i ? passwordStrength.color : '#e5e7eb' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: passwordStrength.color, fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Strength: {passwordStrength.text}</span>
                      {passwordStrength.score < 3 && <span style={{ color: '#ef4444' }}>Needs stronger password</span>}
                    </div>
                  </div>
                )}

                <button id="register-submit" type="submit" className="btn-continue">
                  Create Account
                </button>
              </form>

              <div className="switch-text">
                Already have an account?{' '}
                <button onClick={() => setView('email')}>Log In</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
