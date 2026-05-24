import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { ALL_PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const { user, userProfile, logout, wishlist, saveAddress, addToast } = useCart();

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
    <>
      {/* Top Header info */}
      <div className="fk-user-card" style={{ padding: '24px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div className="fk-user-info">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
            {userProfile?.name || 'Guest User'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{userProfile?.email}</span>
        </div>
        <div className="fk-coins" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#c59b27' }}>
          <i className="fas fa-coins"></i> <span>25 GreenCoins</span>
        </div>
      </div>

      <div className="fk-membership" style={{ background: '#e8f5ee', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
        <span className="fk-membership-badge" style={{ background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>ORGANIC</span>
        <Link href="/green-member" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between', marginLeft: '10px' }}>
          <span>Explore <strong>Green Member</strong> benefits</span>
          <i className="fas fa-chevron-right" style={{ color: 'var(--primary)' }}></i>
        </Link>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="fk-quick-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '16px' }}>
        <div className={`fk-quick-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <i className="fas fa-box" style={{ fontSize: '1.2rem', marginBottom: '4px', display: 'block' }}></i> Orders
        </div>
        <div className={`fk-quick-btn ${activeTab === 'wishlist' ? 'active' : ''}`} onClick={() => setActiveTab('wishlist')} style={{ cursor: 'pointer', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <i className="fas fa-heart" style={{ fontSize: '1.2rem', marginBottom: '4px', display: 'block', color: '#e53935' }}></i> Wishlist
        </div>
        <div className={`fk-quick-btn ${activeTab === 'coupons' ? 'active' : ''}`} onClick={() => setActiveTab('coupons')} style={{ cursor: 'pointer', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <i className="fas fa-ticket-alt" style={{ fontSize: '1.2rem', marginBottom: '4px', display: 'block', color: '#ff9800' }}></i> Coupons
        </div>
        <Link href="/support" className="fk-quick-btn" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <i className="fas fa-headset" style={{ fontSize: '1.2rem', marginBottom: '4px', display: 'block', color: '#1565c0' }}></i> Support
        </Link>
      </div>

      {/* Dynamic Tab Body Contents */}
      <div className="container" style={{ padding: '0 16px' }}>
        
        {/* Orders Panel */}
        {activeTab === 'orders' && (
          <div className="fk-section">
            <h3 className="fk-section-title" style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>
              <i className="fas fa-box" style={{ marginRight: '6px' }}></i> My Orders
            </h3>
            {loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <i className="fas fa-spinner fa-spin" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}></i>
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
                      className="fk-order-card" 
                      style={{ 
                        background: '#fff', 
                        border: '1px solid var(--border)', 
                        borderRadius: '10px', 
                        padding: '16px',
                        opacity: isCancelled ? 0.6 : 1
                      }}
                    >
                      <div className="fk-order-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="fk-order-num" style={{ fontWeight: '700' }}>#{o.orderId}</span>
                        <span className={`status-badge status-${o.status || 'placed'}`}>
                          {o.status?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '8px' }}>
                        {o.items?.map(i => `${i.name} × ${i.quantity}`).join(', ')}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span>Total Paid: ₹{o.total}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link href={`/order-tracking?orderId=${o.orderId}`} style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: '600' }}>
                            Track
                          </Link>
                          {canCancel && (
                            <button 
                              onClick={() => handleOpenCancelModal(o)} 
                              style={{ border: '1px solid #e53935', color: '#e53935', background: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                      {isCancelled && o.cancelReason && (
                        <div style={{ fontSize: '0.75rem', color: '#e53935', marginTop: '6px' }}>Reason: {o.cancelReason}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', background: '#fff', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
                <p style={{ color: '#888', marginBottom: '16px' }}>No orders yet</p>
                <Link href="/products" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                  Start Shopping →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Wishlist Panel */}
        {activeTab === 'wishlist' && (
          <div className="fk-section">
            <h3 className="fk-section-title" style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>
              <i className="fas fa-heart" style={{ color: '#e53935', marginRight: '6px' }}></i> My Wishlist
            </h3>
            {wishlistProducts.length > 0 ? (
              <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {wishlistProducts.map(p => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', background: '#fff', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>❤️</div>
                <p style={{ color: '#888' }}>Your wishlist is empty</p>
              </div>
            )}
          </div>
        )}

        {/* Coupons Panel */}
        {activeTab === 'coupons' && (
          <div className="fk-section">
            <h3 className="fk-section-title" style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>
              <i className="fas fa-ticket-alt" style={{ color: '#ff9800', marginRight: '6px' }}></i> Available Coupons
            </h3>
            <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎫</div>
              <p style={{ color: '#888', marginBottom: '16px' }}>Apply coupon codes at checkout for deals:</p>
              <div style={{ background: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)', padding: '16px', borderRadius: '8px', border: '2px dashed #2d6a4f', marginBottom: '12px' }}>
                <strong style={{ fontSize: '1.1rem', color: '#2d6a4f' }}>Curify499</strong>
                <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '4px' }}>Free delivery on order above ₹499</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#fff3e0,#ffe0b2)', padding: '16px', borderRadius: '8px', border: '2px dashed #ff9800' }}>
                <strong style={{ fontSize: '1.1rem', color: '#e65100' }}>ORGANIC20</strong>
                <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '4px' }}>20% off on your first purchase</div>
              </div>
            </div>
          </div>
        )}

        {/* Refer Panel */}
        {activeTab === 'refer' && (
          <div className="fk-section">
            <h3 className="fk-section-title" style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>
              <i className="fas fa-gift" style={{ color: '#ff9800', marginRight: '6px' }}></i> Refer & Earn
            </h3>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '12px' }}>🎁</div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>Earn ₹100 for every friend!</h2>
              <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '20px', lineH: '1.5' }}>
                Share your referral code with friends. When they place their first order, you both get ₹100 in GreenCoins!
              </p>
              <div style={{ background: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)', padding: '20px', borderRadius: '10px', border: '2px dashed var(--primary)', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Referral Code</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '2px' }}>{referCode}</div>
              </div>
              <button 
                onClick={handleCopyReferCode}
                style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fas fa-copy"></i> Copy Referral Code
              </button>
              <button 
                onClick={handleShareRefer}
                style={{ width: '100%', padding: '14px', background: '#25d366', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fab fa-whatsapp"></i> Share on WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Profile Settings Tab */}
        {activeTab === 'profile' && (
          <div className="fk-section">
            <h3 className="fk-section-title" style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>
              <i className="fas fa-user-cog" style={{ marginRight: '6px' }}></i> Profile Settings
            </h3>
            
            <form onSubmit={handleProfileSubmit} style={{ background: '#fff', border: '1px solid var(--border)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Full Name</label>
                <input 
                  type="text" 
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Email Address</label>
                <input 
                  type="email" 
                  disabled
                  value={profileData.email}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', background: '#f8fafc', color: 'var(--text-light)' }} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} 
                />
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Save Profile Changes
              </button>
            </form>

            <h3 className="fk-section-title" style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: '6px' }}></i> Address Book
            </h3>
            
            <form onSubmit={handleAddressSubmit} style={{ background: '#fff', border: '1px solid var(--border)', padding: '20px', borderRadius: '10px' }}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Address Line 1</label>
                <input 
                  type="text" 
                  value={address.line1}
                  onChange={(e) => setAddress(prev => ({ ...prev, line1: e.target.value }))}
                  placeholder="Flat / House No., Building Name"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Address Line 2</label>
                <input 
                  type="text" 
                  value={address.line2}
                  onChange={(e) => setAddress(prev => ({ ...prev, line2: e.target.value }))}
                  placeholder="Area / Colony / Street"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>City</label>
                  <input 
                    type="text" 
                    value={address.city}
                    onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600' }}>Pincode</label>
                  <input 
                    type="text" 
                    value={address.pincode}
                    maxLength="6"
                    onChange={(e) => setAddress(prev => ({ ...prev, pincode: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }} 
                  />
                </div>
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Save Address Details
              </button>
            </form>
          </div>
        )}

        {/* Savings & Offers list links */}
        <div className="fk-section" style={{ marginTop: '24px' }}>
          <h3 className="fk-section-title" style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px' }}>💰 Savings & Offers</h3>
          <div className="fk-list-item" onClick={() => setActiveTab('coupons')} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', marginBottom: '10px', cursor: 'pointer' }}>
            <div className="fk-list-icon" style={{ fontSize: '1.5rem', marginRight: '12px' }}>🎫</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.88rem', display: 'block' }}>Curify Coupons</strong>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>Free delivery & discounts on organic products</span>
            </div>
            <i className="fas fa-chevron-right fk-list-arrow" style={{ color: '#cbd5e1' }}></i>
          </div>
          <div className="fk-list-item" onClick={() => setActiveTab('refer')} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', marginBottom: '10px', cursor: 'pointer' }}>
            <div className="fk-list-icon" style={{ fontSize: '1.5rem', marginRight: '12px' }}>🏷️</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.88rem', display: 'block' }}>Refer & Earn ₹100</strong>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>Invite friends, earn organic rewards</span>
            </div>
            <i className="fas fa-chevron-right fk-list-arrow" style={{ color: '#cbd5e1' }}></i>
          </div>
          <Link href="/green-member" className="fk-list-item" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <div className="fk-list-icon" style={{ fontSize: '1.5rem', marginRight: '12px' }}>🌱</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.88rem', display: 'block' }}>Green Member Benefits</strong>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>Extra 5% off on all organic products</span>
            </div>
            <i className="fas fa-chevron-right fk-list-arrow" style={{ color: '#cbd5e1' }}></i>
          </Link>
        </div>

        {/* Settings Links */}
        <div className="fk-settings-list" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="fk-settings-item" onClick={() => setActiveTab('profile')} style={{ display: 'flex', alignItems: 'center', justify: 'space-between', padding: '12px 16px', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}>
            <span><i className="fas fa-user-cog" style={{ marginRight: '10px', color: 'var(--primary)' }}></i> Edit Profile</span>
            <i className="fas fa-chevron-right" style={{ color: '#cbd5e1' }}></i>
          </div>
          <Link href="/support" className="fk-settings-item" style={{ display: 'flex', alignItems: 'center', justify: 'space-between', padding: '12px 16px', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <span><i className="fas fa-question-circle" style={{ marginRight: '10px', color: 'var(--primary)' }}></i> FAQ & Help</span>
            <i className="fas fa-chevron-right" style={{ color: '#cbd5e1' }}></i>
          </Link>
        </div>

        <button 
          onClick={logout} 
          className="fk-logout-btn" 
          style={{ width: '100%', margin: '24px 0', padding: '14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '10px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <i className="fas fa-sign-out-alt"></i> Log Out
        </button>
      </div>

      {/* Cancellation Modal Backdrop */}
      {cancelModalOpen && orderToCancel && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '90%', maxWidth: '400px', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#212121', fontWeight: '700' }}>Cancel Order</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#888' }}>Order: #{orderToCancel.orderId}</p>
            <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px', color: '#333' }}>Why do you want to cancel?</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {['Changed my mind', 'Found better price elsewhere', 'Ordered by mistake', 'Delivery taking too long', 'Other'].map(reason => (
                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="cancelReason" 
                    value={reason} 
                    checked={cancelReason === reason} 
                    onChange={() => setCancelReason(reason)} 
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
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.88rem', resize: 'none', marginBottom: '16px' }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setCancelModalOpen(false)} 
                style={{ padding: '10px 18px', border: 'none', background: '#f1f3f6', color: '#444', borderRadius: '8px', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Keep Order
              </button>
              <button 
                onClick={handleConfirmCancelOrder} 
                style={{ padding: '10px 18px', border: 'none', background: '#e53935', color: '#fff', borderRadius: '8px', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ height: '70px' }}></div>
    </>
  );
}
