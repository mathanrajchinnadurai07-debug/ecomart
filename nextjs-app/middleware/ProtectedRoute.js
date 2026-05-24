import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { user, loading } = useCart();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=' + encodeURIComponent(router.asPath));
    }
  }, [user, loading, router]);

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

  return <>{children}</>;
}
