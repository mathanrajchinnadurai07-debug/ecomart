import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';

export default function OrderTracking() {
  const router = useRouter();
  const { orderId } = router.query;
  const { user, addToast } = useCart();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [notFound, setNotFound] = useState(false);

  const STATUS_STEPS = [
    { key: 'placed', icon: '🛍️', name: 'Order Placed', desc: 'Your order has been received and confirmed.' },
    { key: 'processing', icon: '👨‍🍳', name: 'Being Prepared', desc: 'Our team is carefully packing your items.' },
    { key: 'shipped', icon: '🚚', name: 'Out for Delivery', desc: 'Your order is on the way to your address.' },
    { key: 'delivered', icon: '✅', name: 'Delivered', desc: 'Order delivered successfully. Enjoy!' }
  ];

  const STATUS_ORDER = ['placed', 'processing', 'shipped', 'delivered'];
  const STORE_WHATSAPP = '917845744038';

  useEffect(() => {
    if (!router.isReady) return;
    
    const id = orderId;
    if (id) {
      fetchOrder(id);
    }
  }, [router.isReady, orderId, user]);

  const fetchOrder = (id) => {
    setLoadingOrder(true);
    setNotFound(false);

    const orderDocRef = doc(db, 'orders', id);
    
    // Subscribe to live snapshot updates
    const unsubscribe = onSnapshot(orderDocRef, (snap) => {
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
      } else {
        // Try fallback user orders collection if global fails
        if (user) {
          const userOrderDocRef = doc(db, 'users', user.uid, 'orders', id);
          getDoc(userOrderDocRef).then((uSnap) => {
            if (uSnap.exists()) {
              setOrder({ id: uSnap.id, ...uSnap.data() });
            } else {
              setNotFound(true);
            }
          }).catch(() => setNotFound(true));
        } else {
          setNotFound(true);
        }
      }
      setLoadingOrder(false);
    }, (error) => {
      console.error('Error listening to order status:', error);
      setNotFound(true);
      setLoadingOrder(false);
    });

    return () => unsubscribe();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/order-tracking?orderId=${searchId.trim()}`);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !confirm('Cancel this order? This cannot be undone.')) return;
    
    try {
      const timestamp = new Date().toISOString();
      const cancelEntry = { status: 'cancelled', timestamp };

      // Update global order document
      const globalOrderRef = doc(db, 'orders', order.id);
      await updateDoc(globalOrderRef, {
        status: 'cancelled',
        statusHistory: arrayUnion(cancelEntry)
      });

      // Update user order document
      if (user) {
        const userOrderRef = doc(db, 'users', user.uid, 'orders', order.id);
        await updateDoc(userOrderRef, {
          status: 'cancelled',
          statusHistory: arrayUnion(cancelEntry)
        });
      }

      addToast('Order cancelled successfully.', 'success');
    } catch (e) {
      console.error(e);
      addToast('Could not cancel order. Please contact support.', 'error');
    }
  };

  const getStatusIndex = () => {
    if (!order) return 0;
    return STATUS_ORDER.indexOf(order.status || 'placed');
  };

  return (
    <>
      <div className="header" style={{ background: 'linear-gradient(135deg,#1a5c38,#40916c)', color: '#fff', padding: '20px 16px 60px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '6px' }}>🌿 Track Your Order</h1>
        <p style={{ fontSize: '0.85rem', opacity: '0.8' }}>Real-time order status updates</p>
        <div className="order-id-badge" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '5px 16px', fontSize: '0.8rem', fontWeight: '600', marginTop: '10px' }}>
          {orderId ? `📦 ${orderId}` : 'Enter Order ID'}
        </div>
      </div>

      <div className="container" style={{ maxWidth: '520px', margin: '-40px auto 0', padding: '0 16px 80px' }}>
        {/* Track Different Order form */}
        <div className="card show" style={{ background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid var(--border)', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '10px', color: 'var(--text-light)' }}>Track a different order</div>
          <form onSubmit={handleSearchSubmit} className="search-row" style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Enter Order ID (e.g. CF2026...)" 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              style={{ flex: 1, padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.9rem' }}
            />
            <button type="submit" style={{ padding: '10px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              Track
            </button>
          </form>
        </div>

        {/* Dynamic tracking panel */}
        <div id="mainContent">
          {loadingOrder && (
            <div className="loading" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '12px', display: 'block' }}></i>
              <div>Loading your order...</div>
            </div>
          )}

          {!orderId && !loadingOrder && (
            <div className="loading" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
              <i className="fas fa-search" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '12px', display: 'block' }}></i>
              <div>Enter your Order ID above to track</div>
            </div>
          )}

          {notFound && !loadingOrder && (
            <div className="card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
                <h3 style={{ marginBottom: '8px', fontWeight: '700' }}>Order not found</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.87rem', marginBottom: '20px' }}>We couldn't find order <strong>#{orderId}</strong>. Please check the order ID.</p>
                <Link href="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', margin: '0 auto', textDecoration: 'none', gap: '8px' }}>
                  <i className="fas fa-list"></i> View All Orders
                </Link>
              </div>
            </div>
          )}

          {order && !loadingOrder && (
            <>
              {/* Order Status Tracker Steps */}
              <div className="card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
                <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}><i className="fas fa-route" style={{ color: 'var(--primary)', marginRight: '6px' }}></i> Order Status</h2>
                  <span className={`status-badge status-${order.status || 'placed'}`}>
                    <span className="live-dot" style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor', marginRight: '6px' }}></span>
                    {(order.status || 'placed').charAt(0).toUpperCase() + (order.status || 'placed').slice(1)}
                  </span>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div className="tracker" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '8px 0' }}>
                    {STATUS_STEPS.map((step, i) => {
                      const statusIdx = getStatusIndex();
                      const cls = i < statusIdx ? 'done' : i === statusIdx ? 'active' : 'pending';
                      const timeEntry = (order.statusHistory || []).find(h => h.status === step.key);
                      const timeStr = timeEntry ? new Date(timeEntry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                      
                      return (
                        <div key={step.key} className={`tracker-step ${cls}`}>
                          <div className="step-dot" style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            flexShrink: 0,
                            position: 'relative',
                            zIndex: 1,
                            border: '2px solid var(--border)',
                            background: cls === 'done' ? 'var(--primary)' : '#fff',
                            color: cls === 'done' ? '#fff' : cls === 'active' ? 'var(--primary)' : '#cbd5e1'
                          }}>
                            {i < statusIdx ? <i className="fas fa-check"></i> : step.icon}
                          </div>
                          <div className="step-info" style={{ padding: '8px 0 24px', flex: 1 }}>
                            <div className="step-name" style={{ fontWeight: '700', fontSize: '0.9rem', color: cls === 'pending' ? '#cbd5e1' : 'var(--primary)' }}>{step.name}</div>
                            <div className="step-desc" style={{ fontSize: '0.78rem', color: cls === 'pending' ? '#e2e8f0' : 'var(--text-light)', marginTop: '3px' }}>{step.desc}</div>
                            {timeStr && <div className="step-time" style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fas fa-clock"></i> {timeStr}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {order.status === 'delivered' && (
                    <div style={{ background: '#d1fae5', borderRadius: '10px', padding: '14px', textAlign: 'center', marginTop: '8px' }}>
                      <div style={{ fontSize: '1.5rem' }}>🎉</div>
                      <div style={{ fontWeight: '700', color: '#065f46', marginTop: '4px' }}>Delivered Successfully!</div>
                      <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '2px' }}>Hope you enjoy your organic products!</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Ordered Card */}
              <div className="card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
                <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justify: 'space-between' }}>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}><i className="fas fa-box-open" style={{ color: 'var(--accent)', marginRight: '6px' }}></i> Items Ordered</h2>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{order.items?.length || 0} items</span>
                </div>
                <div className="card-body" style={{ padding: '14px 20px' }}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="order-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                      <div className="item-thumb" style={{ width: '44px', height: '44px', background: '#f1f5f2', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', overflow: 'hidden' }}>
                        {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} /> : '🌿'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="item-name" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{item.name}</div>
                        <div className="item-qty" style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Qty: {item.quantity}{item.unit ? ` · ${item.unit}` : ''}</div>
                      </div>
                      <div className="item-price" style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary)' }}>₹{item.price * item.quantity}</div>
                    </div>
                  ))}

                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <div className="sum-row" style={{ display: 'flex', justify: 'space-between', fontSize: '0.85rem', padding: '5px 0' }}>
                      <span>Subtotal</span>
                      <span>₹{order.subtotal || 0}</span>
                    </div>
                    <div className="sum-row" style={{ display: 'flex', justify: 'space-between', fontSize: '0.85rem', padding: '5px 0' }}>
                      <span>Delivery</span>
                      <span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="sum-row" style={{ display: 'flex', justify: 'space-between', fontSize: '0.85rem', padding: '5px 0' }}>
                        <span style={{ color: '#10b981' }}>Discount</span>
                        <span style={{ color: '#10b981' }}>-₹{order.discount}</span>
                      </div>
                    )}
                    {order.codFee > 0 && (
                      <div className="sum-row" style={{ display: 'flex', justify: 'space-between', fontSize: '0.85rem', padding: '5px 0' }}>
                        <span>COD Handling Fee</span>
                        <span>₹{order.codFee}</span>
                      </div>
                    )}
                    <div className="sum-row total" style={{ display: 'flex', justify: 'space-between', fontWeight: '800', fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '5px', color: 'var(--primary)' }}>
                      <span>Total Paid</span>
                      <span>₹{order.total || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Details Card */}
              <div className="card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
                <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}><i className="fas fa-map-marker-alt" style={{ color: '#ef4444', marginRight: '6px' }}></i> Delivery Details</h2>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div className="info-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <div className="info-icon" style={{ width: '32px', height: '32px', background: '#f0faf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--primary)', fontSize: '0.85rem' }}><i className="fas fa-user"></i></div>
                    <div>
                      <div className="info-label" style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: '600' }}>Customer</div>
                      <div className="info-value" style={{ fontSize: '0.87rem', fontWeight: '500' }}>{order.address?.name || '—'}</div>
                    </div>
                  </div>
                  <div className="info-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <div className="info-icon" style={{ width: '32px', height: '32px', background: '#f0faf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--primary)', fontSize: '0.85rem' }}><i className="fas fa-phone"></i></div>
                    <div>
                      <div className="info-label" style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: '600' }}>Phone</div>
                      <div className="info-value" style={{ fontSize: '0.87rem', fontWeight: '500' }}>{order.address?.phone || '—'}</div>
                    </div>
                  </div>
                  <div className="info-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <div className="info-icon" style={{ width: '32px', height: '32px', background: '#f0faf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--primary)', fontSize: '0.85rem' }}><i className="fas fa-home"></i></div>
                    <div>
                      <div className="info-label" style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: '600' }}>Address</div>
                      <div className="info-value" style={{ fontSize: '0.87rem', fontWeight: '500' }}>
                        {order.address?.line1}{order.address?.line2 ? `, ${order.address.line2}` : ''}, {order.address?.city} - {order.address?.pincode}, {order.address?.state}
                      </div>
                    </div>
                  </div>
                  <div className="info-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <div className="info-icon" style={{ width: '32px', height: '32px', background: '#f0faf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--primary)', fontSize: '0.85rem' }}><i className="fas fa-credit-card"></i></div>
                    <div>
                      <div className="info-label" style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: '600' }}>Payment</div>
                      <div className="info-value" style={{ fontSize: '0.87rem', fontWeight: '500' }}>
                        {order.payment?.method?.toUpperCase()} —{' '}
                        <span style={{ color: '#10b981', fontWeight: '600' }}>{order.payment?.status === 'paid' ? '✅ Paid' : '⏳ Pending'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action / Help options */}
              <div className="card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
                <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}><i className="fas fa-headset" style={{ color: '#25D366', marginRight: '6px' }}></i> Need Help?</h2>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div className="action-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a 
                      href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent('Hi Curfee! I need help with my order: ' + order.id)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '9px', background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      <i className="fab fa-whatsapp"></i> WhatsApp Support
                    </a>
                    <a 
                      href="tel:+917845744038" 
                      className="btn btn-outline"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '9px', background: '#fff', border: '1.5px solid var(--border)', color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      <i className="fas fa-phone"></i> Call Us
                    </a>
                    {order.status === 'placed' && (
                      <button 
                        className="btn btn-danger" 
                        onClick={handleCancelOrder}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '9px', background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fecaca', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        <i className="fas fa-times"></i> Cancel Order
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '12px' }}>
                    <i className="fas fa-info-circle"></i> Orders can only be cancelled before they are shipped.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
