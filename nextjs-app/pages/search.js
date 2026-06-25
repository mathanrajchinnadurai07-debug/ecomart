import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_TRENDING = [
  { emoji: '🍗', label: 'Country Chicken', labelTa: 'நாட்டு கோழி', q: 'chicken' },
  { emoji: '🍯', label: 'Pure Cow Ghee', labelTa: 'சுத்தமான பசு நெய்', q: 'ghee' },
  { emoji: '🐝', label: 'Forest Honey', labelTa: 'காட்டு தேன்', q: 'honey' },
  { emoji: '🥜', label: 'Whole Cashews', labelTa: 'முந்திரி பருப்பு', q: 'cashew' },
  { emoji: '🥭', label: 'Alphonso Mango', labelTa: 'அல்போன்சா மாம்பழம்', q: 'mango' },
  { emoji: '🍄', label: 'Oyster Mushroom', labelTa: 'சிப்பி காளான்', q: 'mushroom' },
];

const CATEGORIES = [
  { emoji: '🥬', label: 'Vegetables', labelTa: 'காய்கறிகள்', cat: 'vegetables' },
  { emoji: '🍎', label: 'Fruits', labelTa: 'பழங்கள்', cat: 'fruits' },
  { emoji: '🏪', label: 'Grocery', labelTa: 'மளிகை பொருட்கள்', cat: 'grocery' },
  { emoji: '🥜', label: 'Snacks', labelTa: 'நொறுக்குத்தீனிகள்', cat: 'snacks' },
  { emoji: '🍄', label: 'Mushroom', labelTa: 'காளான்', cat: 'mushroom' },
  { emoji: '🍗', label: 'Chicken', labelTa: 'கோழி இறைச்சி', cat: 'chicken' },
  { emoji: '☕', label: 'Beverages', labelTa: 'பானங்கள்', cat: 'beverages' },
  { emoji: '🍪', label: 'Biscuits', labelTa: 'பிஸ்கட்', cat: 'biscuits' },
];

export default function Search() {
  const router = useRouter();
  const { language } = useLanguage();
  const isTa = language === 'ta';

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input on load
    setTimeout(() => inputRef.current?.focus(), 300);
    
    // Load recent searches from localStorage
    const saved = localStorage.getItem('curify_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    const matches = ALL_PRODUCTS
      .filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 8);
    setSuggestions(matches);
  }, [query]);

  const saveSearch = (q) => {
    if (!q || !q.trim()) return;
    const cleanQ = q.trim();
    const updated = [cleanQ, ...recentSearches.filter(item => item.toLowerCase() !== cleanQ.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    localStorage.setItem('curify_recent_searches', JSON.stringify(updated));
  };

  const go = (q) => {
    saveSearch(q);
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  const goCat = (cat) => {
    router.push(`/products?category=${cat}`);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('curify_recent_searches');
  };

  return (
    <>
      <div 
        className="srch-pg"
        style={{
          background: '#fcfdfd',
          minHeight: '100vh',
          paddingBottom: '80px',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {/* Sticky Search Header */}
        <div 
          className="srch-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 200,
            background: '#fff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1.5px solid #edf1ef',
            boxShadow: '0 2px 16px rgba(26, 92, 56, 0.05)'
          }}
        >
          <button 
            className="srch-back focus-visible-ring" 
            onClick={() => router.back()}
            aria-label="Go back"
            style={{
              background: '#f0f4f2',
              border: 'none',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--primary-dark)',
              fontSize: '0.95rem',
              flexShrink: 0
            }}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          
          <div 
            className="srch-input-wrap"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: '#f0f4f2',
              borderRadius: '14px',
              padding: '0 14px',
              border: '2px solid transparent',
              transition: 'border 0.2s, background 0.2s'
            }}
          >
            <i className="fas fa-search srch-input-icon" style={{ color: 'var(--primary)', marginRight: '10px' }}></i>
            <input
              ref={inputRef}
              className="srch-input"
              type="text"
              placeholder={isTa ? "50+ இயற்கை தயாரிப்புகளைத் தேடுங்கள்..." : "Search 50+ organic products..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && query.trim() && go(query.trim())}
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                flex: 1,
                fontSize: '0.95rem',
                color: 'var(--text)',
                padding: '11px 0',
                fontFamily: 'Inter, sans-serif'
              }}
            />
            {query && (
              <button 
                className="srch-clear" 
                onClick={() => setQuery('')}
                aria-label="Clear input"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '4px'
                }}
              >
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>
        </div>

        {/* Live Suggestions (Autocomplete list) */}
        {query.trim().length >= 2 && suggestions.length > 0 && (
          <div className="srch-suggestions" style={{ background: '#fff' }}>
            {suggestions.map(p => (
              <div 
                key={p._id} 
                className="srch-suggestion-item" 
                onClick={() => {
                  saveSearch(p.name);
                  router.push(`/product/${p.slug || p._id}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f5f4',
                  transition: 'background 0.15s'
                }}
              >
                <div 
                  className="srch-sugg-img"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#f0f4f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    overflow: 'hidden'
                  }}
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '🌿'
                  )}
                </div>
                <div>
                  <div className="srch-sugg-name" style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text)' }}>
                    {p.name}
                  </div>
                  <div className="srch-sugg-cat" style={{ fontSize: '0.73rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'capitalize' }}>
                    {p.category}
                  </div>
                </div>
                <div className="srch-sugg-price" style={{ marginLeft: 'auto', fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary-dark)', fontFamily: 'Poppins, sans-serif' }}>
                  ₹{p.discountPrice || p.price}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Helpful Empty State (When no suggestions found) */}
        {query.trim().length >= 2 && suggestions.length === 0 && (
          <div 
            className="srch-empty-state"
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              background: '#fff',
              borderBottom: '1px solid #f0f3f1'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🍃</div>
            <h3 style={{ fontSize: '1.05rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', color: '#4e3d30', marginBottom: '6px' }}>
              {isTa ? "முடிவுகள் எதுவும் கிடைக்கவில்லை" : "No matches found"}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', maxWidth: '280px', margin: '0 auto 20px', fontFamily: 'Inter, sans-serif' }}>
              {isTa 
                ? `"${query}" க்கான தயாரிப்புகள் எதுவும் இல்லை. எழுத்துப்பிழைகளை சரிபார்க்கவும்.` 
                : `We couldn't find any products matching "${query}". Check your spelling or try browsing categories.`}
            </p>
          </div>
        )}

        {/* Non-empty search context features */}
        {(!query || suggestions.length === 0) && (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <>
                <div 
                  className="srch-sec-title"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    padding: '24px 16px 10px',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  <span>{isTa ? "சமீபத்திய தேடல்கள்" : "Recent Searches"}</span>
                  <button 
                    onClick={clearRecent}
                    className="focus-visible-ring"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    {isTa ? "அழி" : "Clear"}
                  </button>
                </div>
                <div 
                  className="recent-pills"
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    padding: '0 16px'
                  }}
                >
                  {recentSearches.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(r);
                        go(r);
                      }}
                      className="focus-visible-ring"
                      style={{
                        padding: '6px 12px',
                        background: '#fff',
                        border: '1.5px solid var(--border)',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'border 0.2s'
                      }}
                    >
                      <i className="fas fa-history" style={{ color: '#cbd5e1', fontSize: '0.7rem' }}></i>
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Browse Categories */}
            <div 
              className="srch-sec-title"
              style={{
                fontSize: '0.78rem',
                fontWeight: '800',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '24px 16px 10px',
                fontFamily: 'Poppins, sans-serif'
              }}
            >
              {isTa ? "பிரிவுகளை உலாவுக" : "Browse Categories"}
            </div>
            <div 
              className="cat-pills-row"
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                padding: '0 16px 4px',
                scrollbarWidth: 'none'
              }}
            >
              {CATEGORIES.map((c, i) => (
                <div 
                  key={i} 
                  className="cat-pill focus-visible-ring" 
                  onClick={() => goCat(c.cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: '#fff',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    border: '1.5px solid var(--border)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{c.emoji}</span>
                  {isTa ? c.labelTa : c.label}
                </div>
              ))}
            </div>

            {/* Trending Now */}
            <div 
              className="srch-sec-title"
              style={{
                fontSize: '0.78rem',
                fontWeight: '800',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '24px 16px 10px',
                fontFamily: 'Poppins, sans-serif'
              }}
            >
              {isTa ? "பிரபலமான தேடல்கள் 🔥" : "Trending Now 🔥"}
            </div>
            <div 
              className="trending-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                padding: '0 16px'
              }}
            >
              {DEFAULT_TRENDING.map((t, i) => (
                <div 
                  key={i} 
                  className="trending-card focus-visible-ring" 
                  onClick={() => {
                    const searchQ = isTa ? t.labelTa : t.label;
                    setQuery(searchQ);
                    go(t.q);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    background: '#fff',
                    border: '1.5px solid var(--border)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                  }}
                >
                  <span className="trending-emoji" style={{ fontSize: '1.5rem' }}>{t.emoji}</span>
                  <span className="trending-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                    {isTa ? t.labelTa : t.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Popular Featured Products */}
            <div 
              className="srch-sec-title"
              style={{
                fontSize: '0.78rem',
                fontWeight: '800',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '24px 16px 10px',
                fontFamily: 'Poppins, sans-serif'
              }}
            >
              {isTa ? "பிரபலமான தயாரிப்புகள் ⭐" : "Popular Products ⭐"}
            </div>
            <div 
              className="pop-scroll"
              style={{
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                padding: '0 16px 8px',
                scrollbarWidth: 'none'
              }}
            >
              {ALL_PRODUCTS.filter(p => p.isFeatured).slice(0, 8).map(p => (
                <Link 
                  key={p._id} 
                  href={`/product/${p.slug || p._id}`} 
                  className="pop-card focus-visible-ring" 
                  style={{ 
                    textDecoration: 'none',
                    flexShrink: 0,
                    width: '128px',
                    background: '#fff',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    border: '1.5px solid var(--border)'
                  }}
                >
                  <div 
                    className="pop-card-img"
                    style={{
                      width: '100%',
                      height: '100px',
                      background: '#f4f6f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.2rem',
                      overflow: 'hidden'
                    }}
                  >
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '🌿'
                    )}
                  </div>
                  <div className="pop-card-body" style={{ padding: '8px 8px 10px' }}>
                    <div className="pop-card-name" style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div className="pop-card-price" style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--primary-dark)', fontFamily: 'Poppins, sans-serif' }}>
                      ₹{p.discountPrice || p.price}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
