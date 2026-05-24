import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Search() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus search input on mount
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="search-mode" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Search Header */}
      <header className="search-view-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #eee',
        gap: '12px'
      }}>
        <button 
          onClick={handleBack} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text)' }}
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '14px', color: 'var(--text-light)', fontSize: '0.95rem' }}></i>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search products..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              border: '1.5px solid var(--border)',
              borderRadius: '24px',
              fontSize: '0.9rem',
              outline: 'none',
              background: '#f8fafc'
            }}
          />
        </form>
      </header>

      {/* Recent Searches */}
      <section className="search-section" style={{ padding: '24px 16px' }}>
        <h2 className="search-section-title" style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
          Recent Searches
        </h2>
        <div className="recent-searches" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }}>
          <Link href="/products?search=tomato" className="recent-item">
            <div className="recent-img-wrap">🍅</div>
            <span className="recent-label">organic<br />tomatoes</span>
          </Link>
          <Link href="/products?search=tea" className="recent-item">
            <div className="recent-img-wrap">🍵</div>
            <span className="recent-label">green<br />tea</span>
          </Link>
          <Link href="/products?search=soap" className="recent-item">
            <div className="recent-icon-wrap"><i className="fas fa-history"></i></div>
            <span className="recent-label">herbal<br />soap</span>
          </Link>
          <Link href="/products?search=almond" className="recent-item">
            <div className="recent-img-wrap">🌰</div>
            <span className="recent-label">premium<br />almond</span>
          </Link>
          <Link href="/products?search=seeds" className="recent-item">
            <div className="recent-img-wrap">🌱</div>
            <span className="recent-label">chia<br />seeds</span>
          </Link>
        </div>
      </section>

      {/* Trending Searches Grid */}
      <section className="search-section" style={{ padding: '0 16px 24px' }}>
        <h2 className="search-section-title" style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
          Trending Searches
        </h2>
        <div className="trending-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Link href="/products?search=chicken" className="trending-item">
            <div className="trending-img" style={{ background: '#fce7f3' }}><span style={{ fontSize: '1.5rem' }}>🍗</span></div>
            <div className="trending-text">Country chicken cuts</div>
          </Link>
          <Link href="/products?search=ghee" className="trending-item">
            <div className="trending-img" style={{ background: '#fef3c7' }}><span style={{ fontSize: '1.5rem' }}>🍯</span></div>
            <div className="trending-text">Pure cow ghee</div>
          </Link>
          <Link href="/products?search=honey" className="trending-item">
            <div className="trending-img" style={{ background: '#fdedd3' }}><span style={{ fontSize: '1.5rem' }}>🐝</span></div>
            <div className="trending-text">Raw forest honey</div>
          </Link>
          <Link href="/products?search=cashew" className="trending-item">
            <div className="trending-img" style={{ background: '#e0f2fe' }}><span style={{ fontSize: '1.5rem' }}>🥜</span></div>
            <div className="trending-text">Whole cashews</div>
          </Link>
          <Link href="/products?search=mango" className="trending-item">
            <div className="trending-img" style={{ background: '#fef08a' }}><span style={{ fontSize: '1.5rem' }}>🥭</span></div>
            <div className="trending-text">Fresh alphonso mango</div>
          </Link>
          <Link href="/products?search=mushroom" className="trending-item">
            <div className="trending-img" style={{ background: '#f3f4f6' }}><span style={{ fontSize: '1.5rem' }}>🍄</span></div>
            <div className="trending-text">Oyster mushrooms</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
