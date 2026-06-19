import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function DriverPortal() {
  const [email, setEmail] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  useEffect(() => {
    const savedEmail = localStorage.getItem('curify_driver_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setLoggedIn(true);
      fetchJobs(savedEmail);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    localStorage.setItem('curify_driver_email', email.trim());
    setLoggedIn(true);
    setError('');
    fetchJobs(email.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('curify_driver_email');
    setLoggedIn(false);
    setJobs([]);
    setEmail('');
  };

  const fetchJobs = async (driverEmail) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/jobs/${driverEmail}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      } else {
        setError('Failed to load jobs');
      }
    } catch (err) {
      setError('Network error loading jobs');
    }
    setLoading(false);
  };

  const updateStatus = async (jobId, currentStatus, newStatus) => {
    try {
      // Optimistic update
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/delivery/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        fetchJobs(email);
        alert('Failed to update status');
      }
    } catch (err) {
      fetchJobs(email);
      alert('Error updating status');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#f59e0b';
      case 'picked_up': return '#3b82f6';
      case 'in_transit': return '#8b5cf6';
      case 'delivered': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (!loggedIn) {
    return (
      <div className="driver-login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px' }}>
        <Head>
          <title>Driver Login | Curify</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>
        <div style={{ background: '#fff', padding: '40px 30px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#1a5c38', fontSize: '1.8rem', margin: '0 0 10px 0', fontFamily: 'Poppins, sans-serif' }}>🛵 Driver Portal</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Log in to view your assigned deliveries</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Driver Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="driver@example.com"
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                required
              />
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
            <button type="submit" style={{ width: '100%', background: '#1a5c38', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px rgba(26,92,56,0.2)' }}>
              Log In to Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingCount = jobs.filter(j => j.status !== 'delivered').length;

  return (
    <div className="driver-portal" style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>Driver Deliveries | Curify</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header style={{ background: '#1a5c38', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🛵</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', fontFamily: 'Poppins, sans-serif' }}>Deliveries</h1>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{email}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
          Log Out
        </button>
      </header>

      <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#111827' }}>Your Route ({pendingCount})</h2>
          <button onClick={() => fetchJobs(email)} style={{ background: 'transparent', border: 'none', color: '#1a5c38', fontSize: '1.2rem', cursor: 'pointer' }}>
            🔄
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading deliveries...</div>}

        {!loading && jobs.length === 0 && (
          <div style={{ textAlign: 'center', background: '#fff', padding: '40px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#111827' }}>No Active Jobs!</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>You don't have any pending deliveries assigned to you.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {jobs.map(job => {
            const address = typeof job.order_address === 'string' ? JSON.parse(job.order_address) : (job.order_address || {});
            
            return (
              <div key={job.id} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1px solid ${job.status === 'delivered' ? '#e5e7eb' : '#dcfce7'}` }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order #{job.order_id}</span>
                      <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', color: '#111827' }}>{address.name || 'Customer'}</h3>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '4px', background: getStatusColor(job.status) + '20', color: getStatusColor(job.status) }}>
                      {job.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ color: '#ef4444', marginTop: '2px' }}>📍</div>
                    <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.4 }}>
                      {address.line1}<br/>
                      {address.line2 && <>{address.line2}<br/></>}
                      {address.city}, {address.pincode}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: '#3b82f6' }}>📞</div>
                    <a href={`tel:${address.phone}`} style={{ fontSize: '0.9rem', color: '#111827', fontWeight: '600', textDecoration: 'none' }}>
                      {address.phone || 'No Phone Number'}
                    </a>
                  </div>
                </div>

                {job.status !== 'delivered' && (
                  <div style={{ padding: '16px', background: '#f8fafc', display: 'flex', gap: '10px' }}>
                    {job.status === 'pending' && (
                      <button 
                        onClick={() => updateStatus(job.id, job.status, 'picked_up')}
                        style={{ flex: 1, padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        Confirm Pick Up
                      </button>
                    )}
                    {job.status === 'picked_up' && (
                      <button 
                        onClick={() => updateStatus(job.id, job.status, 'in_transit')}
                        style={{ flex: 1, padding: '12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        Start Trip
                      </button>
                    )}
                    {job.status === 'in_transit' && (
                      <button 
                        onClick={() => updateStatus(job.id, job.status, 'delivered')}
                        style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
