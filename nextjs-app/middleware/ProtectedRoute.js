import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import { auth } from '../firebase/config';
import { sendEmailVerification } from 'firebase/auth';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { user, loading, addToast } = useCart();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=' + encodeURIComponent(router.asPath));
    }
  }, [user, loading, router]);

  const handleResendEmail = async () => {
    if (!auth.currentUser) return;
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      addToast('Verification email sent! Check your inbox. 🌿', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error sending email: ' + err.message, 'error');
    }
    setResending(false);
  };

  const handleRefresh = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        addToast('Email verified successfully! Welcome. 🎉', 'success');
        window.location.reload();
      } else {
        addToast('Email is still not verified. Please check your spam folder.', 'warning');
      }
    } catch (err) {
      console.error(err);
      addToast('Check failed. Please try again.', 'error');
    }
    setChecking(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="m-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#2d6a4f',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
        <p style={{ color: '#718096', fontSize: '0.9rem' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check email verification for password provider
  const isPasswordUser = user.providerData.some(p => p.providerId === 'password');
  if (isPasswordUser && !user.emailVerified) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '24px',
        textAlign: 'center',
        background: '#f4f6f0',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          background: '#fff',
          padding: '40px 24px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          maxWidth: '450px',
          width: '100%'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>✉️</div>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.4rem', fontWeight: '800', color: '#1a5c38', marginBottom: '10px' }}>Verify Your Email</h2>
          <p style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.6', marginBottom: '24px' }}>
            We've sent a verification link to <strong>{user.email}</strong>.<br />
            Please check your inbox (and spam folder) and verify your account to continue.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={handleRefresh}
              disabled={checking}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #1a5c38, #2d6a4f)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(26,92,56,0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {checking ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
              I Have Verified My Email
            </button>

            <button 
              onClick={handleResendEmail}
              disabled={resending}
              style={{
                width: '100%',
                padding: '12px',
                background: '#fff',
                color: '#1a5c38',
                border: '1.5px solid #1a5c38',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {resending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
