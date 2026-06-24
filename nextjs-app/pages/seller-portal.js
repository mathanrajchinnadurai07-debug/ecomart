import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Head from 'next/head';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const STATUS_COLORS = {
  pending: { bg: '#fef9ec', color: '#92400e', label: 'Pending' },
  confirmed: { bg: '#eff6ff', color: '#1d4ed8', label: 'Confirmed' },
  processing: { bg: '#f0f9ff', color: '#0369a1', label: 'Processing' },
  shipped: { bg: '#f0fdf4', color: '#15803d', label: 'Shipped' },
  delivered: { bg: '#dcfce7', color: '#166534', label: 'Delivered' },
  cancelled: { bg: '#fef2f2', color: '#b91c1c', label: 'Cancelled' },
};

export default function SellerPortal() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [subOrders, setSubOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [labelLoading, setLabelLoading] = useState({});
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sellerName, setSellerName] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth guard: verify Firebase user with role: 'seller'
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login?redirect=/seller-portal');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const data = userDoc.data();
        if (!data || data.role !== 'seller') {
          setAccessDenied(true);
          setAuthLoading(false);
          return;
        }
        setUser(firebaseUser);
        setSellerName(data.name || firebaseUser.email);
      } catch (e) {
        console.error('Auth check failed:', e);
        setAccessDenied(true);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [router]);

  const fetchSubOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/sellers/sub-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch orders');
      }
      const data = await res.json();
      setSubOrders(data.data || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchSubOrders();
  }, [user, fetchSubOrders]);

  const handlePrintLabel = async (subOrderId) => {
    setLabelLoading(prev => ({ ...prev, [subOrderId]: true }));
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/sellers/sub-orders/${subOrderId}/label`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.label_url) throw new Error(data.error || 'Label not available');
      window.open(data.label_url, '_blank');
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLabelLoading(prev => ({ ...prev, [subOrderId]: false }));
  };

  const filtered = subOrders.filter(o => {
    const matchSearch = !search ||
      o.order_id?.toString().includes(search) ||
      o.address?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = subOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const deliveredCount = subOrders.filter(o => o.status === 'delivered').length;
  const pendingCount = subOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f6f0' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#1a5c38', marginBottom: '16px' }}></i>
          <p style={{ color: '#475569', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f6f0', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', maxWidth: '360px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: '#1e293b', fontFamily: 'Poppins, sans-serif', margin: '0 0 8px' }}>Access Denied</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>You do not have a seller account. Contact support if you believe this is an error.</p>
          <button onClick={() => router.push('/')} style={{ background: 'linear-gradient(135deg, #1a5c38, #2d6a4f)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Seller Portal — Curify Organic</title>
        <meta name="description" content="Manage your Curify seller sub-orders, track shipments and download Shiprocket labels." />
      </Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', sans-serif; background: #f4f6f0; }
        .sp-container { max-width: 1100px; margin: 0 auto; padding: 0 16px 80px; }
        .sp-header { background: linear-gradient(135deg, #1a5c38 0%, #2d6a4f 60%, #1a5c38 100%); padding: 28px 24px; color: #fff; }
        .sp-header-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .sp-header h1 { margin: 0; font-family: 'Poppins', sans-serif; font-size: 1.5rem; font-weight: 800; }
        .sp-header p { margin: 4px 0 0; font-size: 0.85rem; opacity: 0.8; }
        .sp-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
        .sp-stat-card { background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.04); }
        .sp-stat-label { font-size: 0.73rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .sp-stat-value { font-size: 1.5rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }
        .sp-controls { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .sp-search { flex: 1; min-width: 160px; padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-family: inherit; font-size: 0.88rem; outline: none; background: #fff; color: #1e293b; }
        .sp-search:focus { border-color: #1a5c38; }
        .sp-filter { padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-family: inherit; font-size: 0.88rem; outline: none; background: '#fff'; color: '#1e293b'; cursor: pointer; }
        .sp-refresh-btn { padding: 10px 16px; border: none; background: #1a5c38; color: #fff; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
        .sp-table-wrap { background: #fff; border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid rgba(0,0,0,0.04); }
        .sp-table { width: 100%; border-collapse: collapse; }
        .sp-table thead th { background: #f8fafc; padding: 12px 14px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
        .sp-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
        .sp-table tbody tr:last-child { border-bottom: none; }
        .sp-table tbody tr:hover { background: #f8fafb; }
        .sp-table td { padding: 12px 14px; font-size: 0.85rem; color: #334155; vertical-align: middle; }
        .sp-status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; text-transform: capitalize; }
        .sp-label-btn { padding: 6px 14px; border-radius: 8px; border: none; background: linear-gradient(135deg, #1a5c38, #2d6a4f); color: #fff; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: opacity 0.2s; }
        .sp-label-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sp-label-btn.no-awb { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
        .sp-item-pill { display: inline-block; background: #f0faf5; color: #1a5c38; font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 12px; margin: 1px; }
        .sp-empty { text-align: center; padding: 60px 20px; }
        .sp-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; z-index: 9999; animation: slideUp 0.3s ease; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @media (max-width: 768px) {
          .sp-stat-grid { grid-template-columns: 1fr 1fr; }
          .sp-table-wrap { overflow-x: auto; }
        }
      `}</style>

      {/* Page Header */}
      <div className="sp-header">
        <div className="sp-header-inner">
          <div>
            <h1>🌿 Seller Portal</h1>
            <p>Welcome back, {sellerName}</p>
          </div>
          <button onClick={fetchSubOrders} style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', backdropFilter: 'blur(8px)' }}>
            <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i> Refresh
          </button>
        </div>
      </div>

      <div className="sp-container">
        {/* Stats */}
        <div className="sp-stat-grid">
          <div className="sp-stat-card">
            <div className="sp-stat-label">Total Orders</div>
            <div className="sp-stat-value">{subOrders.length}</div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-label">Delivered</div>
            <div className="sp-stat-value" style={{ color: '#15803d' }}>{deliveredCount}</div>
          </div>
          <div className="sp-stat-card">
            <div className="sp-stat-label">Active</div>
            <div className="sp-stat-value" style={{ color: '#d97706' }}>{pendingCount}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="sp-controls">
          <input
            className="sp-search"
            placeholder="Search by Order ID or Customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="sp-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="sp-table-wrap">
          {loading ? (
            <div className="sp-empty">
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#1a5c38', marginBottom: '12px' }}></i>
              <p style={{ color: '#64748b', fontWeight: '600' }}>Loading your orders...</p>
            </div>
          ) : error ? (
            <div className="sp-empty">
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚠️</div>
              <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '16px' }}>{error}</p>
              <button onClick={fetchSubOrders} className="sp-refresh-btn" style={{ margin: '0 auto' }}>
                <i className="fas fa-redo"></i> Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="sp-empty">
              <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>📦</div>
              <p style={{ color: '#64748b', fontWeight: '600', fontSize: '1rem' }}>
                {subOrders.length === 0 ? 'No orders assigned to your account yet.' : 'No orders match your search.'}
              </p>
            </div>
          ) : (
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Shiprocket Label</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const statusInfo = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
                  const hasAwb = !!order.shiprocket_order_id;
                  const items = Array.isArray(order.order_items) ? order.order_items : [];
                  return (
                    <tr key={order.id}>
                      <td>
                        <span style={{ fontWeight: '700', color: '#1a5c38' }}>#{order.order_id}</span>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{order.address?.name || 'N/A'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{order.address?.city}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', maxWidth: '200px' }}>
                          {items.map((item, i) => (
                            <span key={i} className="sp-item-pill">{item.name} ×{item.quantity}</span>
                          ))}
                          {items.length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>₹{parseFloat(order.total_amount || 0).toFixed(2)}</span>
                      </td>
                      <td>
                        <span className="sp-status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        {hasAwb ? (
                          <button
                            className="sp-label-btn"
                            disabled={labelLoading[order.id]}
                            onClick={() => handlePrintLabel(order.id)}
                          >
                            {labelLoading[order.id]
                              ? <><i className="fas fa-spinner fa-spin"></i> Loading...</>
                              : <><i className="fas fa-print"></i> Print Label</>
                            }
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Awaiting pickup</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: '24px', padding: '16px', background: '#f0faf5', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
            Labels are generated by Shiprocket once the shipment is manifested. If a label is unavailable, the AWB may not yet be assigned. Contact support if issues persist.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="sp-toast" style={{ background: toast.type === 'error' ? '#ef4444' : '#1a5c38', color: '#fff' }}>
          <i className={`fas ${toast.type === 'error' ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ marginRight: '8px' }}></i>
          {toast.msg}
        </div>
      )}
    </>
  );
}
