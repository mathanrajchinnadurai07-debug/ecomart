import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { ALL_PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import { db, auth } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { maskEmail, maskPhone, maskPincode, maskAddressLine } from '../middleware/sanitize';

export default function Dashboard() {
  const router = useRouter();
  const { 
    user, 
    userProfile, 
    logout, 
    wishlist, 
    saveAddress, 
    addToast,
    mfaEnabled,
    mfaPassed,
    toggleMfa,
    revokeOtherSessions
  } = useCart();

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '' });

  // Address fields
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: 'Tamil Nadu', pincode: '' });

  // Cancel order modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [cancelOtherReason, setCancelOtherReason] = useState('');

  // Referral code
  const [referCode, setReferCode] = useState('Curify100');

  // Security tab states
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [maskDataEnabled, setMaskDataEnabled] = useState(true);

  // Initialize data masking setting
  useEffect(() => {
    const storedMask = localStorage.getItem('Curify_mask_data');
    if (storedMask !== null) {
      setMaskDataEnabled(storedMask === 'true');
    }
  }, []);

  const handleToggleMaskData = (enabled) => {
    setMaskDataEnabled(enabled);
    localStorage.setItem('Curify_mask_data', enabled ? 'true' : 'false');
    addToast(enabled ? 'Sensitive data masking enabled 🛡️' : 'Sensitive data masking disabled ⚠️', enabled ? 'success' : 'warning');
  };

  // Load login history and active sessions when security tab is opened
  useEffect(() => {
    if (user && activeTab === 'security') {
      fetchSecurityLogs();
    }
  }, [user, activeTab]);

  const fetchSecurityLogs = async () => {
    setLoadingSecurity(true);
    try {
      // Fetch login history (last 10)
      const historyRef = collection(db, 'users', user.uid, 'login_history');
      const historySnap = await getDocs(historyRef);
      const historyList = historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      historyList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLoginHistory(historyList.slice(0, 10));

      // Fetch active sessions
      const sessionsRef = collection(db, 'users', user.uid, 'active_sessions');
      const sessionsSnap = await getDocs(sessionsRef);
      const currentSessionId = sessionStorage.getItem('Curify_session_id');
      const sessionsList = sessionsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        isCurrent: doc.id === currentSessionId
      }));
      setActiveSessions(sessionsList);
    } catch (err) {
      console.error('Failed to load security logs:', err);
    }
    setLoadingSecurity(false);
  };

  const handleRevokeOtherSessions = async () => {
    await revokeOtherSessions();
    // Refresh security logs
    setTimeout(() => {
      fetchSecurityLogs();
    }, 1000);
  };

  const handleResendEmailVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        addToast('Verification email resent! Please check your inbox. 📧', 'success');
      } catch (err) {
        console.error(err);
        addToast('Failed to resend verification email.', 'error');
      }
    }
  };

  useEffect(() => {
    // Redirect if guest
    if (!user && typeof window !== 'undefined' && localStorage.getItem('Curify_user') === null) {
      router.push('/login?redirect=/dashboard');
    }
  }, [user]);

  // Load orders & address
  useEffect(() => {
    if (user) {
      fetchOrders();
      setProfileData({
        name: userProfile?.name || user.displayName || '',
        email: userProfile?.email || user.email || '',
        phone: userProfile?.phone || ''
      });
      if (userProfile?.address) {
        setAddress(userProfile.address);
      }

      // Generate refer code
      const namePart = (userProfile?.name || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      const randNum = Math.floor(100 + Math.random() * 900);
      setReferCode(`Curify${namePart}${randNum}`);
    }
  }, [user, userProfile]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const ordersRef = collection(db, 'users', user.uid, 'orders');
      const snap = await getDocs(ordersRef);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side by date descending
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(list);
    } catch (e) {
      console.error('Failed to load orders', e);
    }
    setLoadingOrders(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: profileData.name,
        phone: profileData.phone
      });
      addToast('Profile updated! 🌿', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update profile settings', 'error');
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    await saveAddress(address);
  };

  const handleOpenCancelModal = (orderItem) => {
    setOrderToCancel(orderItem);
    setCancelReason('Changed my mind');
    setCancelOtherReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    const finalReason = cancelReason === 'Other' ? (cancelOtherReason || 'Other') : cancelReason;

    try {
      const timestamp = new Date().toISOString();
      const cancelEntry = { status: 'cancelled', timestamp };

      // Update global document
      const globalOrderRef = doc(db, 'orders', orderToCancel.orderId);
      await updateDoc(globalOrderRef, {
        status: 'cancelled',
        statusHistory: arrayUnion(cancelEntry),
        cancelReason: finalReason
      });

      // Update user document
      const userOrderRef = doc(db, 'users', user.uid, 'orders', orderToCancel.orderId);
      await updateDoc(userOrderRef, {
        status: 'cancelled',
        statusHistory: arrayUnion(cancelEntry),
        cancelReason: finalReason
      });

      setCancelModalOpen(false);
      addToast('Order cancelled successfully', 'success');
      fetchOrders();
    } catch (e) {
      console.error(e);
      addToast('Failed to cancel order', 'error');
    }
  };

  const handleOpenReturnModal = (orderItem) => {
    setOrderToCancel(orderItem);
    setCancelReason('Damaged Product');
    setCancelOtherReason('');
    setCancelModalOpen(true); // Using same modal for simplicity
  };

  const handleConfirmReturnOrder = async () => {
    if (!orderToCancel) return;
    const finalReason = cancelReason === 'Other' ? (cancelOtherReason || 'Other') : cancelReason;

    try {
      let token = 'firebase_guest';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      // Hit the new backend endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${orderToCancel.orderId}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: finalReason })
      });

      if (!response.ok) {
        throw new Error('Failed to request return');
      }

      setCancelModalOpen(false);
      addToast('Return requested successfully', 'success');
      fetchOrders();
    } catch (e) {
      console.error(e);
      addToast('Failed to request return', 'error');
    }
  };

  const handleCopyReferCode = () => {
    navigator.clipboard.writeText(referCode).then(() => {
      addToast('Referral code copied! 🎉', 'success');
    });
  };

  const handleShareRefer = () => {
    const msg = encodeURIComponent(`🌿 Shop organic with Curify! Use my referral code ${referCode} and get ₹100 off your first order! 🛒\n\n${window.location.origin}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Get Wishlist items
  const wishlistProducts = wishlist.map(id => {
    return ALL_PRODUCTS.find(p => p._id === id || p.slug === id);
  }).filter(Boolean);

  return (
    <div className="dash-pg">
      <style>{`
        .dash-pg { background: #f4f6f0; min-height: 100vh; padding-bottom: 100px; font-family: 'Inter', sans-serif; }
        
        /* Premium Header Block */
        .dash-header {
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          padding: 24px 16px 40px;
          color: #fff;
          border-bottom-left-radius: 24px;
          border-bottom-right-radius: 24px;
          box-shadow: 0 4px 20px rgba(26,92,56,0.18);
          position: relative;
        }
        .dash-header-title {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 18px;
        }
        .dash-header-title h1 { font-family: 'Poppins', sans-serif; font-size: 1.25rem; font-weight: 700; margin: 0; }
        
        .dash-user-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 16px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .dash-user-info h2 { font-family: 'Poppins', sans-serif; font-size: 1.1rem; font-weight: 700; margin: 0 0 3px; color: #fff; }
        .dash-user-info span { font-size: 0.78rem; color: rgba(255, 255, 255, 0.75); }
        .dash-coins {
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px 12px;
          border-radius: 20px;
          display: flex; align-items: center; gap: 6px;
          font-size: 0.82rem; font-weight: 700; color: #f59e0b;
        }

        /* Membership Badge bar */
        .dash-membership {
          background: #fff;
          margin: -20px 16px 16px;
          padding: 12px 16px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 4px 12px rgba(26,92,56,0.06);
          position: relative; z-index: 10;
          border: 1px solid rgba(26,92,56,0.05);
        }
        .dash-membership-badge {
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          color: #fff; padding: 2px 8px; border-radius: 6px;
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px;
        }
        .dash-membership-link {
          text-decoration: none; color: #2d6a4f; font-size: 0.82rem;
          display: flex; align-items: center; justify-content: space-between;
          flex: 1; margin-left: 10px; font-weight: 600;
        }

        /* Quick Grid Switcher */
        .dash-quick-grid {
          display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
          padding: 0 12px 16px;
        }
        .dash-quick-btn {
          background: #fff; text-align: center; padding: 12px 6px;
          border-radius: 12px; border: 1px solid rgba(0,0,0,0.02);
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
          font-size: 0.72rem; font-weight: 700; color: #555;
          transition: all 0.2s ease; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .dash-quick-btn i { font-size: 1.15rem; color: #1a5c38; transition: transform 0.2s; }
        .dash-quick-btn:active i { transform: scale(1.1); }
        .dash-quick-btn.active {
          background: linear-gradient(135deg, #1a5c38, #2d6a4f); color: #fff;
          box-shadow: 0 4px 12px rgba(26,92,56,0.2);
          border-color: #1a5c38;
        }
        .dash-quick-btn.active i { color: #fff; }

        /* Panels layout */
        .dash-section {
          background: #fff; border-radius: 16px; padding: 18px;
          margin: 0 16px 16px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.01);
        }
        .dash-section-title {
          font-size: 0.95rem; font-weight: 700; color: #1a5c38;
          font-family: 'Poppins', sans-serif; margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
          border-bottom: 1px dashed #e8f5e9; padding-bottom: 10px;
        }

        /* Order Cards */
        .dash-order-card {
          border: 1px solid #f0faf4; background: #fafdfb;
          border-radius: 12px; padding: 14px; margin-bottom: 12px;
          transition: all 0.2s;
        }
        .dash-order-card:last-child { margin-bottom: 0; }
        .dash-order-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px; border-bottom: 1px dashed #e8f5e9;
          padding-bottom: 8px;
        }
        .dash-order-num { font-size: 0.85rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }
        
        .status-badge {
          font-size: 0.65rem; font-weight: 800; padding: 3px 8px;
          border-radius: 6px; text-transform: uppercase; letter-spacing: 0.3px;
        }
        .status-placed { background: #e0f2fe; color: #0369a1; }
        .status-processing { background: #fef3c7; color: #d97706; }
        .status-shipped { background: #e0e7ff; color: #4338ca; }
        .status-delivered { background: #dcfce7; color: #15803d; }
        .status-cancelled { background: #fee2e2; color: #b91c1c; }

        .dash-order-items { font-size: 0.82rem; color: #555; margin-bottom: 12px; line-height: 1.45; }
        .dash-order-foot {
          display: flex; justify-content: space-between; align-items: center;
        }
        .dash-order-total { font-size: 0.88rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }
        .dash-order-actions { display: flex; gap: 8px; }

        .btn-track {
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          color: #fff; border: none; padding: 7px 14px;
          border-radius: 8px; font-size: 0.72rem; font-weight: 700;
          text-decoration: none; display: inline-flex; align-items: center; gap: 4px;
          box-shadow: 0 3px 8px rgba(26,92,56,0.18);
          transition: all 0.2s;
        }
        .btn-track:active { transform: scale(0.96); }
        .btn-cancel {
          border: 1px solid #ef4444; color: #ef4444;
          background: #fff; padding: 6px 13px; border-radius: 8px;
          font-size: 0.72rem; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel:active { background: #fee2e2; transform: scale(0.96); }

        /* Coupons view */
        .coupon-card {
          background: linear-gradient(135deg, #f4faf6, #e8f5ee);
          border: 2px dashed #1a5c38; border-radius: 12px;
          padding: 16px; margin-bottom: 12px; display: flex;
          align-items: center; justify-content: space-between;
          position: relative; overflow: hidden;
        }
        .coupon-card::before, .coupon-card::after {
          content: ''; position: absolute; width: 12px; height: 12px; background: #fff;
          border-radius: 50%; top: 50%; transform: translateY(-50%);
        }
        .coupon-card::before { left: -6px; border-right: 1px solid #1a5c38; }
        .coupon-card::after { right: -6px; border-left: 1px solid #1a5c38; }
        
        .coupon-card.orange {
          background: linear-gradient(135deg, #fffaf6, #ffece6);
          border-color: #e05a2b;
        }
        .coupon-card.orange::before { border-right: 1px solid #e05a2b; }
        .coupon-card.orange::after { border-left: 1px solid #e05a2b; }

        .coupon-code {
          font-size: 1.1rem; font-weight: 800; color: #1a5c38;
          font-family: 'Poppins', sans-serif; letter-spacing: 1px;
        }
        .coupon-card.orange .coupon-code { color: #e05a2b; }
        .coupon-desc { font-size: 0.75rem; color: #666; margin-top: 4px; font-weight: 500; }

        /* Referral Card styling */
        .refer-card {
          text-align: center; padding: 8px 0;
        }
        .refer-box {
          background: linear-gradient(135deg, #f4faf6, #e8f5ee);
          padding: 18px; border-radius: 12px; border: 2px dashed #1a5c38;
          margin: 18px 0;
        }
        .refer-label { font-size: 0.72rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600; }
        .refer-code-val { font-size: 1.4rem; font-weight: 800; color: #1a5c38; letter-spacing: 1.5px; font-family: 'Poppins', sans-serif; }
        
        .btn-copy-code {
          width: 100%; padding: 14px; background: #1a5c38; color: #fff;
          border: none; border-radius: 12px; font-weight: 700; font-size: 0.88rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 12px rgba(26,92,56,0.25); transition: all 0.2s;
        }
        .btn-copy-code:active { transform: scale(0.98); }
        .btn-wa-share {
          width: 100%; padding: 14px; background: #25d366; color: #fff;
          border: none; border-radius: 12px; font-weight: 700; font-size: 0.88rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 10px; box-shadow: 0 4px 12px rgba(37,211,102,0.2); transition: all 0.2s;
        }
        .btn-wa-share:active { transform: scale(0.98); }

        /* Form Inputs */
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { margin-bottom: 14px; }
        .form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: #4a5568; margin-bottom: 5px; }
        .form-input {
          width: 100%; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px;
          font-size: 0.88rem; outline: none; transition: all 0.2s; font-family: 'Inter', sans-serif;
        }
        .form-input:focus { border-color: #1a5c38; box-shadow: 0 0 0 3px rgba(26,92,56,0.1); }
        .form-input:disabled { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }

        /* Savings list links */
        .dash-list-title-sec { font-size: 0.78rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 16px 10px; }
        .dash-list-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; background: #fff; border-radius: 12px;
          margin: 0 16px 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);
          cursor: pointer; transition: background 0.2s; border: 1px solid rgba(0,0,0,0.01);
        }
        .dash-list-item:active { background: #f8fafc; }
        .dash-list-icon { font-size: 1.4rem; margin-right: 12px; }
        .dash-list-content { flex: 1; }
        .dash-list-name { font-size: 0.88rem; font-weight: 700; color: #333; display: block; font-family: 'Poppins', sans-serif; }
        .dash-list-desc { font-size: 0.73rem; color: #777; margin-top: 2px; }
        .dash-list-arrow { color: #cbd5e1; font-size: 0.85rem; }

        /* Settings settings links */
        .dash-settings-group { margin: 16px; display: flex; flex-direction: column; gap: 8px; }
        .dash-settings-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; background: #fff; border-radius: 10px;
          cursor: pointer; border: 1px solid rgba(0,0,0,0.02);
          font-size: 0.88rem; font-weight: 600; color: #333;
          box-shadow: 0 2px 6px rgba(0,0,0,0.01);
        }
        .dash-settings-item:active { background: #f8fafc; }
        .dash-settings-item span { display: flex; align-items: center; gap: 10px; }
        .dash-settings-item i.fa-chevron-right { color: #cbd5e1; font-size: 0.8rem; }

        /* Log out btn */
        .dash-logout-wrap { padding: 8px 16px 24px; }
        .btn-logout {
          width: 100%; padding: 14px; background: #fee2e2; color: #991b1b;
          border: 1px solid #fecaca; border-radius: 12px; font-weight: 700;
          font-size: 0.9rem; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px; transition: all 0.2s;
        }
        .btn-logout:active { background: #fca5a5; }

        /* Modal styling */
        .modal-backdrop {
          display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        }
        .modal-box {
          background: #fff; width: 90%; max-width: 400px; padding: 24px;
          border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.25);
          animation: mSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes mSlideUp {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Top Header Section */}
      <div className="dash-header">
        <div className="dash-header-title" style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
          <h1>🌿 My Account</h1>
          <div className="dash-coins">
            <i className="fas fa-coins"></i>
            <span>25 GreenCoins</span>
          </div>
        </div>
      </div>

      {/* Green Member Benefits Banner */}
      <div className="dash-membership">
        <span className="dash-membership-badge">ORGANIC</span>
        <Link href="/green-member" className="dash-membership-link">
          <span>Explore <strong>Green Member</strong> benefits</span>
          <i className="fas fa-chevron-right" style={{ color: 'var(--primary)', fontSize: '0.8rem' }}></i>
        </Link>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="dash-quick-grid">
        <div className={`dash-quick-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          <i className="fas fa-box"></i>
          <span>Orders</span>
        </div>
        <div className={`dash-quick-btn ${activeTab === 'wishlist' ? 'active' : ''}`} onClick={() => setActiveTab('wishlist')}>
          <i className="fas fa-heart" style={{ color: activeTab === 'wishlist' ? '#fff' : '#e53935' }}></i>
          <span>Wishlist</span>
        </div>
        <div className={`dash-quick-btn ${activeTab === 'coupons' ? 'active' : ''}`} onClick={() => setActiveTab('coupons')}>
          <i className="fas fa-ticket-alt" style={{ color: activeTab === 'coupons' ? '#fff' : '#ff9800' }}></i>
          <span>Coupons</span>
        </div>
        <div className={`dash-quick-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          <i className="fas fa-shield-alt" style={{ color: activeTab === 'security' ? '#fff' : '#2e7d32' }}></i>
          <span>Security</span>
        </div>
        <Link href="/support" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="dash-quick-btn" style={{ width: '100%' }}>
            <i className="fas fa-headset" style={{ color: '#1565c0' }}></i>
            <span>Support</span>
          </div>
        </Link>
      </div>

      {/* Dynamic Tab Body Contents */}
      {activeTab === 'orders' && (
        <div className="dash-section">
          <h3 className="dash-section-title">
            <i className="fas fa-box"></i> My Orders
          </h3>
          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <i className="fas fa-spinner fa-spin" style={{ color: 'var(--primary)', fontSize: '1.8rem' }}></i>
            </div>
          ) : orders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map((o) => {
                const isCancelled = o.status === 'cancelled';
                const isDelivered = o.status === 'delivered';
                const canCancel = !isCancelled && !isDelivered;
                return (
                  <div 
                    key={o.orderId} 
                    className="dash-order-card" 
                    style={{ opacity: isCancelled ? 0.6 : 1 }}
                  >
                    <div className="dash-order-head">
                      <span className="dash-order-num">Order #{o.orderId}</span>
                      <span className={`status-badge status-${o.status || 'placed'}`}>
                        {(o.status === 'return_requested') ? 'RETURN REQUESTED' : (o.status || 'placed')}
                      </span>
                    </div>
                    <div className="dash-order-items">
                      {o.items?.map(i => `${i.name} × ${i.quantity}`).join(', ')}
                    </div>
                    <div className="dash-order-foot">
                      <span className="dash-order-total">Total Paid: ₹{o.total}</span>
                      <div className="dash-order-actions">
                        <Link href={`/order-tracking?orderId=${o.orderId}`} className="btn-track">
                          <i className="fas fa-map-marker-alt"></i> Track
                        </Link>
                        {canCancel && (
                          <button onClick={() => handleOpenCancelModal(o)} className="btn-cancel">
                            Cancel
                          </button>
                        )}
                        {isDelivered && (
                          <button onClick={() => handleOpenReturnModal(o)} className="btn-cancel" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                            Return
                          </button>
                        )}
                      </div>
                    </div>
                    {isCancelled && o.cancelReason && (
                      <div style={{ fontSize: '0.73rem', color: '#e53935', marginTop: '8px', fontWeight: '500' }}>
                        Reason: {o.cancelReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
              <p style={{ color: '#666', marginBottom: '16px', fontSize: '0.9rem', fontWeight: '500' }}>No orders placed yet</p>
              <Link href="/products" style={{ color: '#1a5c38', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem' }}>
                Start Shopping →
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div className="dash-section">
          <h3 className="dash-section-title">
            <i className="fas fa-heart" style={{ color: '#e53935' }}></i> My Wishlist
          </h3>
          {wishlistProducts.length > 0 ? (
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {wishlistProducts.map(p => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>❤️</div>
              <p style={{ color: '#666', fontSize: '0.9rem', fontWeight: '500' }}>Your wishlist is empty</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="dash-section">
          <h3 className="dash-section-title">
            <i className="fas fa-ticket-alt" style={{ color: '#ff9800' }}></i> Curify Coupons
          </h3>
          <div className="coupon-card">
            <div>
              <span className="coupon-code">CURIFY499</span>
              <div className="coupon-desc">Free delivery on orders above ₹499</div>
            </div>
            <i className="fas fa-gift" style={{ fontSize: '1.4rem', color: '#1a5c38', opacity: 0.7 }}></i>
          </div>
          <div className="coupon-card orange">
            <div>
              <span className="coupon-code">ORGANIC20</span>
              <div className="coupon-desc">20% off on your first purchase</div>
            </div>
            <i className="fas fa-sparkles" style={{ fontSize: '1.4rem', color: '#e05a2b', opacity: 0.7 }}></i>
          </div>
        </div>
      )}

      {activeTab === 'refer' && (
        <div className="dash-section">
          <h3 className="dash-section-title">
            <i className="fas fa-gift" style={{ color: '#e05a2b' }}></i> Refer & Earn
          </h3>
          <div className="refer-card">
            <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🎁</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1a5c38', margin: '0 0 6px', fontFamily: 'Poppins, sans-serif' }}>
              Earn ₹100 for every friend!
            </h2>
            <p style={{ color: '#555', fontSize: '0.8rem', marginBottom: '12px', lineHeight: '1.5', padding: '0 10px' }}>
              Share your referral code with friends. When they place their first order, you both get ₹100 in GreenCoins!
            </p>
            
            <div className="refer-box">
              <div className="refer-label">Your Referral Code</div>
              <div className="refer-code-val">{referCode}</div>
            </div>

            <button onClick={handleCopyReferCode} className="btn-copy-code">
              <i className="fas fa-copy"></i> Copy Referral Code
            </button>
            
            <button onClick={handleShareRefer} className="btn-wa-share">
              <i className="fab fa-whatsapp"></i> Share on WhatsApp
            </button>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="dash-section">
          <h3 className="dash-section-title">
            <i className="fas fa-user-cog"></i> Profile Settings
          </h3>
          
          <form onSubmit={handleProfileSubmit} style={{ marginBottom: '24px' }}>
            <div className="form-group">
              <label>FULL NAME</label>
              <input 
                type="text" 
                className="form-input"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>EMAIL ADDRESS (READ-ONLY)</label>
              <input 
                type="email" 
                className="form-input"
                disabled
                value={profileData.email}
              />
            </div>
            <div className="form-group">
              <label>PHONE NUMBER</label>
              <input 
                type="tel" 
                className="form-input"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="10-digit mobile number"
              />
            </div>
            <button type="submit" className="btn-save">
              Save Profile Changes
            </button>
          </form>

          <h3 className="dash-section-title" style={{ marginTop: '24px' }}>
            <i className="fas fa-map-marker-alt"></i> Address Book
          </h3>
          
          <form onSubmit={handleAddressSubmit}>
            <div className="form-group">
              <label>ADDRESS LINE 1 *</label>
              <input 
                type="text" 
                className="form-input"
                value={address.line1}
                onChange={(e) => setAddress(prev => ({ ...prev, line1: e.target.value }))}
                placeholder="Flat / House No., Building Name"
                required
              />
            </div>
            <div className="form-group">
              <label>ADDRESS LINE 2</label>
              <input 
                type="text" 
                className="form-input"
                value={address.line2}
                onChange={(e) => setAddress(prev => ({ ...prev, line2: e.target.value }))}
                placeholder="Area / Colony / Street"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>CITY *</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={address.city}
                  onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>PINCODE *</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={address.pincode}
                  maxLength="6"
                  onChange={(e) => setAddress(prev => ({ ...prev, pincode: e.target.value }))}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-save">
              Save Address Details
            </button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="dash-section">
          <h3 className="dash-section-title">
            <i className="fas fa-shield-alt"></i> Security Center
          </h3>

          {loadingSecurity ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <i className="fas fa-spinner fa-spin" style={{ color: 'var(--primary)', fontSize: '1.8rem' }}></i>
            </div>
          ) : (
            <>
              {/* Email Verification Card */}
              <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#1e293b' }}>Email Verification</span>
                  {auth.currentUser?.emailVerified ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fas fa-check-circle"></i> Verified
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', background: '#ffedd5', color: '#c2410c', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fas fa-exclamation-triangle"></i> Pending
                    </span>
                  )}
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#64748b' }}>
                  {auth.currentUser?.emailVerified 
                    ? 'Your email address has been verified. You have access to all marketplace features.' 
                    : 'Your email address is not verified. Please verify your email to unlock all account capabilities.'}
                </p>
                {!auth.currentUser?.emailVerified && (
                  <button 
                    onClick={handleResendEmailVerification}
                    style={{
                      padding: '8px 12px',
                      background: '#1a5c38',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      alignSelf: 'flex-start'
                    }}
                  >
                    Resend Verification Email
                  </button>
                )}
              </div>

              {/* MFA Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', color: '#1e293b', fontWeight: '700' }}>Multi-Factor Authentication (MFA)</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Secure your logins with a two-step validation.</p>
                </div>
                <div 
                  onClick={() => toggleMfa(!mfaEnabled)} 
                  style={{
                    width: '50px',
                    height: '26px',
                    background: mfaEnabled ? '#1a5c38' : '#cbd5e1',
                    borderRadius: '13px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    background: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '3px',
                    left: mfaEnabled ? '27px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                  }} />
                </div>
              </div>

              {/* Data Masking Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', color: '#1e293b', fontWeight: '700' }}>Mask Sensitive Data</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Hide phone, email, and address info on checkout and dashboard screens.</p>
                </div>
                <div 
                  onClick={() => handleToggleMaskData(!maskDataEnabled)} 
                  style={{
                    width: '50px',
                    height: '26px',
                    background: maskDataEnabled ? '#1a5c38' : '#cbd5e1',
                    borderRadius: '13px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    background: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '3px',
                    left: maskDataEnabled ? '27px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                  }} />
                </div>
              </div>

              {/* Active Sessions list */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-desktop" style={{ color: '#1a5c38' }}></i> Active Device Sessions
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {activeSessions.map((sess) => (
                  <div key={sess.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#334155' }}>{sess.os} • {sess.browser}</span>
                        {sess.isCurrent && (
                          <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '1px 6px', background: '#dcfce7', color: '#166534', borderRadius: '4px' }}>This Device</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Last active: {new Date(sess.lastActive).toLocaleString()}</span>
                    </div>
                    {!sess.isCurrent && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Remote</span>
                    )}
                  </div>
                ))}
                {activeSessions.length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', margin: '10px 0' }}>No active sessions recorded.</p>
                )}
              </div>
              {activeSessions.length > 1 && (
                <button 
                  onClick={handleRevokeOtherSessions}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 10px rgba(239,68,68,0.15)',
                    marginBottom: '24px'
                  }}
                >
                  <i className="fas fa-user-shield"></i> Log Out of Other Devices
                </button>
              )}

              {/* Login Audit History */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                <i className="fas fa-history" style={{ color: '#1a5c38' }}></i> Login Audit Trail (Last 10)
              </h4>
              <div style={{ overflowX: 'auto', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 10px', fontWeight: '700', color: '#475569' }}>Date & Time</th>
                      <th style={{ padding: '8px 10px', fontWeight: '700', color: '#475569' }}>Device</th>
                      <th style={{ padding: '8px 10px', fontWeight: '700', color: '#475569' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px', color: '#334155', fontWeight: '500' }}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{log.os} ({log.browser})</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            color: log.status === 'Success' ? '#166534' : '#991b1b',
                            fontWeight: '700',
                            padding: '2px 6px',
                            background: log.status === 'Success' ? '#dcfce7' : '#fee2e2',
                            borderRadius: '4px',
                            fontSize: '0.7rem'
                          }}>{log.status}</span>
                        </td>
                      </tr>
                    ))}
                    {loginHistory.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No audit history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Savings & Offers list links */}
      <h4 className="dash-list-title-sec">💰 Savings & Offers</h4>
      
      <div className="dash-list-item" onClick={() => { setActiveTab('coupons'); window.scrollTo({top: 150, behavior: 'smooth'}); }}>
        <div className="dash-list-icon">🎫</div>
        <div className="dash-list-content">
          <strong className="dash-list-name">Curify Coupons</strong>
          <span className="dash-list-desc">Free delivery & discounts on organic products</span>
        </div>
        <i className="fas fa-chevron-right dash-list-arrow"></i>
      </div>
      
      <div className="dash-list-item" onClick={() => { setActiveTab('refer'); window.scrollTo({top: 150, behavior: 'smooth'}); }}>
        <div className="dash-list-icon">🏷️</div>
        <div className="dash-list-content">
          <strong className="dash-list-name">Refer & Earn ₹100</strong>
          <span className="dash-list-desc">Invite friends, earn organic rewards</span>
        </div>
        <i className="fas fa-chevron-right dash-list-arrow"></i>
      </div>
      
      <Link href="/green-member" style={{ textDecoration: 'none' }}>
        <div className="dash-list-item">
          <div className="dash-list-icon">🌱</div>
          <div className="dash-list-content">
            <strong className="dash-list-name">Green Member Benefits</strong>
            <span className="dash-list-desc">Extra 5% off on all organic products</span>
          </div>
          <i className="fas fa-chevron-right dash-list-arrow"></i>
        </div>
      </Link>

      {/* Settings Links */}
      <div className="dash-settings-group">
        {user?.email === 'mathanrajchinnadurai07@gmail.com' && (
          <Link href="/admin-upload" style={{ textDecoration: 'none' }}>
            <div className="dash-settings-item" style={{ borderLeft: '3px solid #1a5c38' }}>
              <span><i className="fas fa-user-shield" style={{ color: '#1a5c38' }}></i> Curify Admin Panel</span>
              <i className="fas fa-chevron-right"></i>
            </div>
          </Link>
        )}
        <div className="dash-settings-item" onClick={() => { setActiveTab('profile'); window.scrollTo({top: 150, behavior: 'smooth'}); }}>
          <span><i className="fas fa-user-cog" style={{ color: '#1a5c38' }}></i> Edit Profile & Address</span>
          <i className="fas fa-chevron-right"></i>
        </div>
        <Link href="/support" style={{ textDecoration: 'none' }}>
          <div className="dash-settings-item">
            <span><i className="fas fa-question-circle" style={{ color: '#1a5c38' }}></i> FAQ & Help Support</span>
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
      </div>

      {/* Logout Button */}
      <div className="dash-logout-wrap">
        <button onClick={logout} className="btn-logout">
          <i className="fas fa-sign-out-alt"></i> Log Out
        </button>
      </div>

      {/* Cancellation/Return Modal */}
      {cancelModalOpen && orderToCancel && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: orderToCancel.status === 'delivered' ? '#f59e0b' : '#1a5c38', fontWeight: '800', fontFamily: 'Poppins, sans-serif' }}>
              {orderToCancel.status === 'delivered' ? 'Return Order' : 'Cancel Order'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#888', fontWeight: '500' }}>Order ID: #{orderToCancel.orderId}</p>
            <p style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '12px', color: '#333' }}>
              {orderToCancel.status === 'delivered' ? 'Why do you want to return this?' : 'Why do you want to cancel?'}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {(orderToCancel.status === 'delivered' ? 
                ['Damaged Product', 'Defective Item', 'Wrong Item Received', 'Missing Accessories', 'Other'] : 
                ['Changed my mind', 'Found better price elsewhere', 'Ordered by mistake', 'Delivery taking too long', 'Other']
              ).map(reason => (
                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', cursor: 'pointer', fontWeight: '500', color: '#444' }}>
                  <input 
                    type="radio" 
                    name="cancelReason" 
                    value={reason} 
                    checked={cancelReason === reason} 
                    onChange={() => setCancelReason(reason)}
                    style={{ accentColor: '#1a5c38' }}
                  /> {reason}
                </label>
              ))}
            </div>

            {cancelReason === 'Other' && (
              <textarea 
                placeholder="Tell us more (optional)..." 
                rows="2" 
                value={cancelOtherReason}
                onChange={(e) => setCancelOtherReason(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'none', marginBottom: '16px', outline: 'none' }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setCancelModalOpen(false)} 
                style={{ padding: '10px 16px', border: 'none', background: '#f1f5f9', color: '#475569', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Keep Order
              </button>
              <button 
                onClick={orderToCancel.status === 'delivered' ? handleConfirmReturnOrder : handleConfirmCancelOrder} 
                style={{ padding: '10px 16px', border: 'none', background: orderToCancel.status === 'delivered' ? '#f59e0b' : '#ef4444', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', boxShadow: orderToCancel.status === 'delivered' ? '0 4px 10px rgba(245,158,11,0.2)' : '0 4px 10px rgba(239,68,68,0.2)' }}
              >
                {orderToCancel.status === 'delivered' ? 'Confirm Return' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to avoid bottom bar overlap */}
      <div style={{ height: '80px' }}></div>
    </div>
  );
}
