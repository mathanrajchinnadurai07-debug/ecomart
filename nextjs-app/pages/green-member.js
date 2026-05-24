import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

export default function GreenMember() {
  const router = useRouter();
  const { user, userProfile, addToast } = useCart();
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect to login if user profile does not exist in local storage or auth is not initialized
    const cachedUser = localStorage.getItem('Curify_user');
    if (!user && !cachedUser) {
      addToast('Please login to check your Green Member status!', 'info');
      router.push('/login?redirect=/green-member');
    }
  }, [user]);

  useEffect(() => {
    const fetchRealOrderCount = async () => {
      setLoading(true);
      try {
        if (user) {
          const ordersRef = collection(db, 'users', user.uid, 'orders');
          const snap = await getDocs(ordersRef);
          setOrderCount(snap.size);
        } else {
          // Fallback to local storage
          const localOrders = JSON.parse(localStorage.getItem('Curify_orders') || '[]');
          setOrderCount(localOrders.length);
        }
      } catch (error) {
        console.error('Error fetching orders count:', error);
        // Fallback to local storage on error
        const localOrders = JSON.parse(localStorage.getItem('Curify_orders') || '[]');
        setOrderCount(localOrders.length);
      } finally {
        setLoading(false);
      }
    };

    fetchRealOrderCount();
  }, [user]);

  // Compute tier progress variables
  const count = orderCount;
  const nextTier = count < 10 ? 'Green Leaf' : 'Green Tree';
  const targetOrders = count < 10 ? 10 : 20;
  const pct = Math.min(100, Math.round((count / 20) * 100));

  const getOrdersAwayText = () => {
    if (count < 10) {
      return (
        <>
          <strong>Green Leaf</strong> benefits are <strong style={{ color: '#2d6a4f' }}>{10 - count} orders</strong> away
        </>
      );
    } else if (count < 20) {
      return (
        <>
          <strong>Green Tree</strong> benefits are <strong style={{ color: '#c9a227' }}>{20 - count} orders</strong> away
        </>
      );
    } else {
      return (
        <>
          🌳 You are a <strong style={{ color: '#9e7c0c' }}>Green Tree</strong> member! Enjoy all premium benefits.
        </>
      );
    }
  };

  const userName = userProfile?.name || user?.displayName || 'User';

  return (
    <>
      <Head>
        <title>Green Member Loyalty Program — Curify</title>
        <meta name="description" content="Unlock exclusive discounts, priority delivery, and premium cashback by joining the Curify Green Member loyalty tier." />
      </Head>

      <div style={{ maxWidth: '600px', margin: '0 auto', background: '#f5f5f5', minHeight: 'calc(100vh - 120px)', paddingBottom: '30px' }}>
        {/* Header */}
        <div style={{ 
          background: '#fff', 
          padding: '14px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '14px', 
          borderBottom: '1px solid #eee', 
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)' 
        }}>
          <button 
            onClick={() => router.back()} 
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#333', cursor: 'pointer', padding: '4px' }}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Green Member Program</h1>
        </div>

        {/* Greeting */}
        <div style={{ padding: '24px 20px 16px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '300', margin: 0, color: '#1a1a1a' }}>
            Hello, <strong style={{ fontWeight: '700' }}>{userName}</strong>
          </h2>
        </div>

        {/* Progress Card */}
        <div style={{ background: '#fff', borderRadius: '16px', margin: '0 16px 20px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.88rem', color: '#666' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Checking loyalty status...
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.88rem', color: '#555', marginBottom: '18px' }}>
                {getOrdersAwayText()}
              </div>
              <div style={{ position: 'relative', height: '6px', background: '#e8e8e8', borderRadius: '3px', marginBottom: '10px' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #2d6a4f, #52b788)', 
                    borderRadius: '3px', 
                    width: `${pct}%`,
                    transition: 'width 0.8s ease'
                  }}
                ></div>
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: `${pct}%`,
                    width: '16px', 
                    height: '16px', 
                    background: '#52b788',
                    borderRadius: '50%', 
                    border: '3px solid #fff', 
                    transform: 'translate(-50%, -50%)', 
                    boxShadow: '0 0 6px rgba(0,0,0,0.15)' 
                  }}
                ></div>
                {/* 10 Orders Marker */}
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    width: '12px', 
                    height: '12px', 
                    background: count >= 10 ? '#52b788' : '#ccc',
                    borderRadius: '50%', 
                    border: '2px solid #fff', 
                    transform: 'translate(-50%, -50%)', 
                    boxShadow: '0 0 4px rgba(0,0,0,0.1)' 
                  }}
                ></div>
                {/* 20 Orders Marker */}
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '100%', 
                    width: '12px', 
                    height: '12px', 
                    background: count >= 20 ? '#c9a227' : 'linear-gradient(135deg, #ccc, #bbb)',
                    borderRadius: '50%', 
                    border: '2px solid #fff', 
                    transform: 'translate(-50%, -50%)', 
                    boxShadow: '0 0 4px rgba(0,0,0,0.1)' 
                  }}
                ></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#999', lineHeight: 1.4 }}>
                <div>You completed<br /><strong style={{ color: '#1a1a1a' }}>{count} orders</strong></div>
                <div style={{ color: count >= 10 ? '#2d6a4f' : '#999', fontWeight: count >= 10 ? '700' : '400' }}>
                  Green Leaf<br /><span>10 orders</span>
                </div>
                <div style={{ color: count >= 20 ? '#c9a227' : '#999', fontWeight: count >= 20 ? '700' : '400', textAlign: 'right' }}>
                  Green Tree<br /><span>20 orders</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 🌱 Green Seed (Current Tier) */}
        <div style={{ padding: '20px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.4rem' }}>🌱</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: count < 10 ? '700' : '400' }}>
              <strong>Green Seed</strong> Benefits
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: count < 10 ? '#2d6a4f' : '#999', fontWeight: count < 10 ? '600' : '400', margin: '0 0 14px 40px' }}>
            {count < 10 ? '✓ Your active tier' : '✓ Completed'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#2d6a4f', lineHeight: 1 }}>5%</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#2d6a4f', marginTop: '2px', lineHeight: 1.3 }}>Instant<br />discount</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>on all organic<br />products</div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2d6a4f' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>
            
            <div style={{ background: 'linear-gradient(135deg,#f1f8e9,#dcedc8)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#33691e', lineHeight: 1.3 }}>Free<br />Delivery</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>On orders<br />above ₹299</div>
              <div style={{ marginTop: '24px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#558b2f' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#fff8e1,#ffecb3)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f57f17', lineHeight: 1 }}>1%</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f57f17', marginTop: '2px', lineHeight: 1.3 }}>GreenCoins<br />cashback</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>up to <span style={{ color: '#f57f17', fontWeight: 700 }}>🪙25</span></div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f57f17' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#fce4ec,#f8bbd0)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#e53935,#ef5350)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <i className="fas fa-bolt" style={{ color: '#fff', fontSize: '1rem' }}></i>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#c62828', lineHeight: 1.3 }}>Priority<br />Support</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>24/7 priority chat</div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#c62828' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>
          </div>
        </div>

        {/* 🌿 Green Leaf */}
        <div style={{ padding: '20px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.4rem' }}>🌿</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: (count >= 10 && count < 20) ? '700' : '400' }}>
              <strong>Green Leaf</strong> Benefits
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: (count >= 10 && count < 20) ? '#2d6a4f' : '#999', fontWeight: (count >= 10 && count < 20) ? '600' : '400', margin: '0 0 14px 40px' }}>
            {(count >= 10 && count < 20) ? '✓ Your active tier' : (count >= 20 ? '✓ Completed' : 'with 10 orders in 12 months')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', opacity: count >= 10 ? 1 : 0.65 }}>
            <div style={{ background: 'linear-gradient(135deg,#e0f2f1,#b2dfdb)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#00695c', lineHeight: 1 }}>12%</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#00695c', marginTop: '2px', lineHeight: 1.3 }}>Instant<br />discount</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>during sale<br />early access</div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#00695c' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#fce4ec,#f8bbd0)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '1.02rem', fontWeight: '700', color: '#c62828', lineHeight: 1.2 }}>24 Hours<br />Early<br />Access</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>During main sales</div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#c62828' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#fff8e1,#ffecb3)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f57f17', lineHeight: 1 }}>1.5%</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f57f17', marginTop: '2px', lineHeight: 1.3 }}>GreenCoins<br />cashback</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>up to <span style={{ color: '#f57f17', fontWeight: 700 }}>🪙50</span></div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f57f17' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#e8eaf6,#c5cae9)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#3949ab,#5c6bc0)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <i className="fas fa-bolt" style={{ color: '#fff', fontSize: '1rem' }}></i>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#283593', lineHeight: 1.3 }}>Extra 5%<br />off with Coins</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>up to 🪙100 per transaction</div>
            </div>
          </div>
        </div>

        {/* 🌳 Green Tree */}
        <div style={{ margin: '0 16px 16px', background: 'linear-gradient(180deg, rgba(201,162,39,0.06), rgba(201,162,39,0.02))', borderRadius: '18px', padding: '20px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.4rem' }}>🌳</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: count >= 20 ? '700' : '400' }}>
              <strong style={{ color: '#9e7c0c' }}>Green Tree</strong> Benefits
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: count >= 20 ? '#9e7c0c' : '#999', fontWeight: count >= 20 ? '600' : '400', margin: '0 0 14px 40px' }}>
            {count >= 20 ? '✓ Your active tier' : 'with 20 orders in 12 months'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', opacity: count >= 20 ? 1 : 0.65 }}>
            <div style={{ background: 'linear-gradient(135deg,#fff8e1,#ffe082)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#9e7c0c', lineHeight: 1 }}>15%</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#9e7c0c', marginTop: '2px', lineHeight: 1.3 }}>Instant<br />discount</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>during sale<br />early access</div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#9e7c0c' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#fce4ec,#f8bbd0)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '1.02rem', fontWeight: '700', color: '#c62828', lineHeight: 1.2 }}>24 Hours<br />Early<br />Access</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>During all sales</div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#c62828' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#fff8e1,#ffecb3)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f57f17', lineHeight: 1 }}>2%</div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f57f17', marginTop: '2px', lineHeight: 1.3 }}>GreenCoins<br />cashback</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>up to <span style={{ color: '#f57f17', fontWeight: 700 }}>🪙100</span></div>
              <div style={{ marginTop: '10px', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f57f17' }}>
                <i className="fas fa-arrow-right" style={{ color: '#fff', fontSize: '0.75rem' }}></i>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#e8eaf6,#c5cae9)', borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#3949ab,#5c6bc0)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <i className="fas fa-bolt" style={{ color: '#fff', fontSize: '1rem' }}></i>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#283593', lineHeight: 1.3 }}>VIP Priority<br />Support</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', lineHeight: 1.4 }}>Dedicated helpline response</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
