import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';

const RECENT = [
  { emoji: '🍅', label: 'Organic\nTomatoes', q: 'tomato' },
  { emoji: '🍵', label: 'Green\nTea', q: 'tea' },
  { emoji: '🧼', label: 'Herbal\nSoap', q: 'soap' },
  { emoji: '🌰', label: 'Premium\nAlmond', q: 'almond' },
  { emoji: '🌱', label: 'Chia\nSeeds', q: 'seeds' },
];
const TRENDING = [
  { emoji: '🍗', label: 'Country Chicken', bg: '#fff0ee', q: 'chicken' },
  { emoji: '🍯', label: 'Pure Cow Ghee', bg: '#fef8e7', q: 'ghee' },
  { emoji: '🐝', label: 'Forest Honey', bg: '#fff3e0', q: 'honey' },
  { emoji: '🥜', label: 'Whole Cashews', bg: '#e8f4fd', q: 'cashew' },
  { emoji: '🥭', label: 'Alphonso Mango', bg: '#fffde7', q: 'mango' },
  { emoji: '🍄', label: 'Oyster Mushroom', bg: '#f3f4f6', q: 'mushroom' },
];
const CATEGORIES = [
  { emoji: '🥬', label: 'Vegetables', cat: 'vegetables' },
  { emoji: '🍎', label: 'Fruits', cat: 'fruits' },
  { emoji: '🍪', label: 'Biscuits', cat: 'biscuits' },
  { emoji: '🥜', label: 'Snacks', cat: 'snacks' },
  { emoji: '🍄', label: 'Mushroom', cat: 'mushroom' },
  { emoji: '🍗', label: 'Chicken', cat: 'chicken' },
  { emoji: '🏪', label: 'Grocery', cat: 'grocery' },
  { emoji: '☕', label: 'Beverages', cat: 'beverages' },
];

export default function Search() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    const matches = ALL_PRODUCTS
      .filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 6);
    setSuggestions(matches);
  }, [query]);

  const go = (q) => router.push(`/products?search=${encodeURIComponent(q)}`);
  const goCat = (cat) => router.push(`/products?category=${cat}`);

  return (
    <>
      <style>{`
        .srch-pg { background: #fff; min-height: 100vh; padding-bottom: 80px; font-family: 'Inter', sans-serif; }

        /* Header */
        .srch-header {
          position: sticky; top: 0; z-index: 200; background: #fff;
          padding: 12px 16px; display: flex; align-items: center; gap: 12px;
          border-bottom: 1.5px solid #f0f0f0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .srch-back { background: #f4f6f0; border: none; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #333; font-size: 0.95rem; flex-shrink: 0; }
        .srch-input-wrap { flex: 1; display: flex; align-items: center; background: #f4f6f0; border-radius: 14px; padding: 0 14px; border: 2px solid transparent; transition: border 0.2s; }
        .srch-input-wrap:focus-within { border-color: #1a5c38; background: #fff; }
        .srch-input-icon { color: #1a5c38; font-size: 0.9rem; margin-right: 10px; }
        .srch-input { border: none; background: none; outline: none; flex: 1; font-size: 0.95rem; color: #1a1a2e; padding: 11px 0; font-family: 'Inter', sans-serif; }
        .srch-input::placeholder { color: #aaa; }
        .srch-clear { background: none; border: none; color: #aaa; cursor: pointer; font-size: 1rem; padding: 4px; }

        /* Suggestions dropdown */
        .srch-suggestions { background: #fff; border-bottom: 1px solid #f0f0f0; }
        .srch-suggestion-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f8f8f8; transition: background 0.15s; }
        .srch-suggestion-item:active { background: #f4f6f0; }
        .srch-sugg-img { width: 42px; height: 42px; border-radius: 10px; background: #f4f6f0; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .srch-sugg-name { font-size: 0.87rem; font-weight: 600; color: #1a1a2e; }
        .srch-sugg-cat { font-size: 0.73rem; color: #1a5c38; font-weight: 500; text-transform: capitalize; }
        .srch-sugg-price { margin-left: auto; font-size: 0.85rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }

        /* Section title */
        .srch-sec-title { font-size: 0.78rem; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 0.8px; padding: 20px 16px 10px; }

        /* Recent bubbles */
        .recent-row { display: flex; gap: 12px; overflow-x: auto; padding: 0 16px 4px; scrollbar-width: none; }
        .recent-row::-webkit-scrollbar { display: none; }
        .recent-bubble { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; flex-shrink: 0; }
        .recent-bubble-img { width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #e8f5e9, #f0faf5); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; border: 2px solid #c8e6c9; transition: transform 0.2s; }
        .recent-bubble:active .recent-bubble-img { transform: scale(0.92); }
        .recent-bubble-label { font-size: 0.65rem; color: #555; text-align: center; font-weight: 600; white-space: pre-line; line-height: 1.2; }

        /* Category pills */
        .cat-pills-row { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px 4px; scrollbar-width: none; }
        .cat-pills-row::-webkit-scrollbar { display: none; }
        .cat-pill { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #f4f6f0; border-radius: 20px; font-size: 0.78rem; font-weight: 600; color: #333; cursor: pointer; flex-shrink: 0; white-space: nowrap; transition: all 0.2s; border: 1.5px solid transparent; }
        .cat-pill:active { background: #e8f5e9; border-color: #1a5c38; color: #1a5c38; transform: scale(0.95); }
        .cat-pill span { font-size: 1rem; }

        /* Trending grid */
        .trending-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 16px; }
        .trending-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; border: 1.5px solid transparent; }
        .trending-card:active { transform: scale(0.96); box-shadow: 0 4px 14px rgba(0,0,0,0.1); }
        .trending-emoji { font-size: 1.8rem; }
        .trending-label { font-size: 0.8rem; font-weight: 700; color: #1a1a2e; line-height: 1.3; }

        /* Popular products row */
        .pop-scroll { display: flex; gap: 12px; overflow-x: auto; padding: 0 16px 8px; scrollbar-width: none; }
        .pop-scroll::-webkit-scrollbar { display: none; }
        .pop-card { flex-shrink: 0; width: 120px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.07); border: 1.5px solid #f0f0f0; }
        .pop-card-img { width: 100%; height: 100px; background: linear-gradient(135deg,#e8f5e9,#f0faf5); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
        .pop-card-body { padding: 8px 8px 10px; }
        .pop-card-name { font-size: 0.72rem; font-weight: 700; color: #1a1a2e; line-height: 1.2; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pop-card-price { font-size: 0.78rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }
      `}</style>

      <div className="srch-pg">
        {/* Sticky Search Header */}
        <div className="srch-header">
          <button className="srch-back" onClick={() => router.back()}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="srch-input-wrap">
            <i className="fas fa-search srch-input-icon"></i>
            <input
              ref={inputRef}
              className="srch-input"
              type="text"
              placeholder="Search 175+ organic products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && query.trim() && go(query.trim())}
            />
            {query && (
              <button className="srch-clear" onClick={() => setQuery('')}>
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>
        </div>

        {/* Live Suggestions */}
        {suggestions.length > 0 && (
          <div className="srch-suggestions">
            {suggestions.map(p => (
              <div key={p._id} className="srch-suggestion-item" onClick={() => router.push(`/product/${p.slug}`)}>
                <div className="srch-sugg-img">{p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} /> : '🌿'}</div>
                <div>
                  <div className="srch-sugg-name">{p.name}</div>
                  <div className="srch-sugg-cat">{p.category}</div>
                </div>
                <div className="srch-sugg-price">₹{p.discountPrice || p.price}</div>
              </div>
            ))}
          </div>
        )}

        {!query && (
          <>
            {/* Recent Searches */}
            <div className="srch-sec-title">Recent Searches</div>
            <div className="recent-row">
              {RECENT.map((r, i) => (
                <div key={i} className="recent-bubble" onClick={() => go(r.q)}>
                  <div className="recent-bubble-img">{r.emoji}</div>
                  <span className="recent-bubble-label">{r.label}</span>
                </div>
              ))}
            </div>

            {/* Browse Categories */}
            <div className="srch-sec-title">Browse Categories</div>
            <div className="cat-pills-row">
              {CATEGORIES.map((c, i) => (
                <div key={i} className="cat-pill" onClick={() => goCat(c.cat)}>
                  <span>{c.emoji}</span>{c.label}
                </div>
              ))}
            </div>

            {/* Trending */}
            <div className="srch-sec-title">Trending Now 🔥</div>
            <div className="trending-grid">
              {TRENDING.map((t, i) => (
                <div key={i} className="trending-card" style={{ background: t.bg }} onClick={() => go(t.q)}>
                  <span className="trending-emoji">{t.emoji}</span>
                  <span className="trending-label">{t.label}</span>
                </div>
              ))}
            </div>

            {/* Popular Products */}
            <div className="srch-sec-title">Popular Products ⭐</div>
            <div className="pop-scroll">
              {ALL_PRODUCTS.filter(p => p.isFeatured).slice(0, 8).map(p => (
                <Link key={p._id} href={`/product/${p.slug}`} className="pop-card" style={{ textDecoration: 'none' }}>
                  <div className="pop-card-img">{p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🌿'}</div>
                  <div className="pop-card-body">
                    <div className="pop-card-name">{p.name}</div>
                    <div className="pop-card-price">₹{p.discountPrice || p.price}</div>
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
