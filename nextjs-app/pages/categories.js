import React, { useState } from 'react';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';

const CAT_META = {
  foryou:      { title: 'For You',              sub: 'Curated picks for you', emoji: '🏠', color: '#e8f5e9' },
  vegetables:  { title: 'Vegetables',           sub: 'Farm-fresh, pesticide-free', emoji: '🥬', color: '#e8f5e9' },
  fruits:      { title: 'Fruits',               sub: 'Naturally grown seasonal fruits', emoji: '🍎', color: '#fff3e0' },
  biscuits:    { title: 'Biscuits & Cookies',   sub: 'Millet, ragi, jaggery — zero sugar', emoji: '🍪', color: '#fdf3e7' },
  snacks:      { title: 'Snacks & Chips',       sub: 'Banana chips, quinoa, makhana', emoji: '🥜', color: '#fef9e7' },
  mushroom:    { title: 'Mushroom',             sub: 'Dried, powder, soup mix', emoji: '🍄', color: '#efebe9' },
  chicken:     { title: 'Organic Chicken',      sub: 'Antibiotic-free, vacuum sealed', emoji: '🍗', color: '#fce8e8' },
  mutton:      { title: 'Organic Mutton',       sub: 'Premium goat — curry cut, kebab', emoji: '🍖', color: '#fce8e8' },
  grocery:     { title: 'Grocery',              sub: 'Honey, oils, dal, rice, spices', emoji: '🏪', color: '#e8f5e9' },
  dryfruits:   { title: 'Dry Fruits & Nuts',   sub: 'Almonds, cashews, walnuts', emoji: '🥣', color: '#fdf3e7' },
  herbal:      { title: 'Herbal & Care',        sub: 'Soaps, oils, face care', emoji: '🌿', color: '#e8f5e9' },
  flour:       { title: 'Flour & Grains',       sub: 'Wheat, ragi, bajra, quinoa', emoji: '🌾', color: '#fef9e7' },
  beverages:   { title: 'Tea & Coffee',         sub: 'Green tea, chai, filter coffee', emoji: '☕', color: '#fff3e0' },
  spreads:     { title: 'Honey & Spreads',      sub: 'Raw honey, peanut butter', emoji: '🍯', color: '#fff8e1' },
  pickles:     { title: 'Pickles & Chutneys',  sub: 'Mango, lemon, garlic pickle', emoji: '🥒', color: '#e8f5e9' },
  superfoods:  { title: 'Superfoods',           sub: 'Chia, moringa, spirulina', emoji: '🧬', color: '#e8eaf6' },
  readytocook: { title: 'Ready to Cook',        sub: 'Dosa, idli, khichdi mixes', emoji: '🍲', color: '#fce8e8' },
};

export default function Categories() {
  const [selectedCat, setSelectedCat] = useState('foryou');
  const meta = CAT_META[selectedCat] || CAT_META.foryou;

  const catProducts = selectedCat === 'foryou'
    ? ALL_PRODUCTS.filter(p => p.isFeatured).slice(0, 12)
    : ALL_PRODUCTS.filter(p => p.category === selectedCat).slice(0, 12);

  const popular = selectedCat === 'foryou'
    ? [...ALL_PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 6)
    : [];

  const getEmoji = (cat) => CAT_META[cat]?.emoji || '🌿';

  const ProdCard = ({ p }) => {
    return <ProductCard product={p} />;
  };

  return (
    <>
      <style>{`
        .categories-pg { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: #f8faf6; font-family: 'Inter', sans-serif; }

        /* Sticky header */
        .cat-pg-header {
          position: sticky; top: 0; z-index: 200; background: #fff;
          padding: 13px 16px; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1.5px solid #f0f0f0; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          flex-shrink: 0;
        }
        .cat-pg-title { font-size: 1.1rem; font-weight: 800; color: #1a1a2e; font-family: 'Poppins', sans-serif; }
        .cat-pg-actions { display: flex; gap: 16px; }
        .cat-pg-action-btn { background: #f4f6f0; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #333; font-size: 0.95rem; cursor: pointer; }

        /* Split layout */
        .cat-split { display: flex; flex: 1; overflow: hidden; }

        /* Sidebar */
        .cat-sidebar {
          width: 78px; min-width: 78px; background: #fff;
          overflow-y: auto; border-right: 1.5px solid #f0f0f0;
          scrollbar-width: none;
        }
        .cat-sidebar::-webkit-scrollbar { display: none; }
        .cat-sb-item {
          display: flex; flex-direction: column; align-items: center;
          padding: 13px 4px 10px; gap: 5px; cursor: pointer;
          border-left: 3px solid transparent;
          transition: all 0.18s;
        }
        .cat-sb-item.active { background: #f0faf5; border-left-color: #1a5c38; }
        .cat-sb-emoji-wrap {
          width: 46px; height: 46px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; transition: all 0.18s;
          background: #f4f6f0;
        }
        .cat-sb-item.active .cat-sb-emoji-wrap { background: linear-gradient(135deg,#1a5c38,#2d6a4f); }
        .cat-sb-label { font-size: 0.58rem; font-weight: 700; color: #888; text-align: center; line-height: 1.2; }
        .cat-sb-item.active .cat-sb-label { color: #1a5c38; }

        /* Content panel */
        .cat-content { flex: 1; overflow-y: auto; padding-bottom: 80px; }
        .cat-content::-webkit-scrollbar { display: none; }

        /* Content hero */
        .cat-content-hero {
          margin: 12px 12px 4px; border-radius: 18px; overflow: hidden;
          padding: 18px 16px; position: relative;
        }
        .cat-content-hero h2 { font-size: 1.1rem; font-weight: 800; color: #1a1a2e; margin: 0 0 3px; font-family: 'Poppins', sans-serif; }
        .cat-content-hero p { font-size: 0.75rem; color: #555; margin: 0 0 12px; }
        .cat-view-all-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: #1a5c38; color: #fff; padding: 7px 16px; border-radius: 20px;
          font-size: 0.75rem; font-weight: 700; text-decoration: none;
          box-shadow: 0 3px 10px rgba(26,92,56,0.3);
        }
        .cat-hero-emoji { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 3.5rem; opacity: 0.25; }

        /* Section label */
        .cat-sec-label { padding: 14px 14px 8px; font-size: 0.8rem; font-weight: 800; color: #1a1a2e; font-family: 'Poppins', sans-serif; }

        /* Product card grid */
        .cp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 12px; }
        .cp-card {
          background: #fff; border-radius: 14px; overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06); position: relative;
          transition: transform 0.15s; border: 1.5px solid #f0f0f0;
        }
        .cp-card:active { transform: scale(0.96); }
        .cp-badge {
          position: absolute; top: 6px; left: 6px;
          background: #e05a2b; color: #fff; font-size: 0.6rem; font-weight: 800;
          padding: 2px 6px; border-radius: 8px; z-index: 2;
        }
        .cp-badge::after { content: '% OFF'; }
        .cp-img {
          width: 100%; aspect-ratio: 1; background: #f4f6f0;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .cp-name { font-size: 0.68rem; font-weight: 600; color: #1a1a2e; padding: 6px 7px 2px; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 28px; }
        .cp-price { font-size: 0.78rem; font-weight: 800; color: #1a5c38; padding: 2px 7px 8px; font-family: 'Poppins', sans-serif; }

        /* "For You" banner */
        .foryou-banner {
          margin: 12px; border-radius: 18px; overflow: hidden;
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          padding: 18px 16px; position: relative;
        }
        .foryou-banner h3 { color: #fff; font-size: 1rem; font-weight: 800; margin: 0 0 4px; font-family: 'Poppins', sans-serif; }
        .foryou-banner p { color: rgba(255,255,255,0.75); font-size: 0.75rem; margin: 0 0 12px; }
        .foryou-shop-btn { display: inline-flex; align-items: center; gap: 6px; background: #fff; color: #1a5c38; padding: 8px 18px; border-radius: 20px; font-size: 0.78rem; font-weight: 800; text-decoration: none; box-shadow: 0 3px 10px rgba(0,0,0,0.15); }
        .foryou-banner-emoji { position: absolute; right: 12px; bottom: 0; font-size: 4rem; opacity: 0.2; }

        /* No products */
        .cat-empty { padding: 40px 16px; text-align: center; color: #aaa; font-size: 0.9rem; }
      `}</style>

      <div className="categories-pg">
        {/* Header */}
        <div className="cat-pg-header">
          <span className="cat-pg-title">All Categories</span>
          <div className="cat-pg-actions">
            <Link href="/search" className="cat-pg-action-btn"><i className="fas fa-search"></i></Link>
            <Link href="/cart" className="cat-pg-action-btn"><i className="fas fa-shopping-cart"></i></Link>
          </div>
        </div>

        <div className="cat-split">
          {/* Sidebar */}
          <div className="cat-sidebar">
            {Object.entries(CAT_META).map(([key, val]) => (
              <div key={key} className={`cat-sb-item ${selectedCat === key ? 'active' : ''}`} onClick={() => setSelectedCat(key)}>
                <div className="cat-sb-emoji-wrap">{val.emoji}</div>
                <span className="cat-sb-label">{key === 'foryou' ? 'For You' : val.title.split(' ')[0]}</span>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="cat-content">
            {/* Hero */}
            {selectedCat === 'foryou' ? (
              <div className="foryou-banner">
                <h3>🌿 Curify Organic</h3>
                <p>175+ products across 16 categories</p>
                <Link href="/products" className="foryou-shop-btn">Shop All →</Link>
                <span className="foryou-banner-emoji">🌿</span>
              </div>
            ) : (
              <div className="cat-content-hero" style={{ background: meta.color }}>
                <h2>{meta.title}</h2>
                <p>{meta.sub}</p>
                <Link href={`/products?category=${selectedCat}`} className="cat-view-all-btn">View All →</Link>
                <span className="cat-hero-emoji">{meta.emoji}</span>
              </div>
            )}

            {/* Featured / Popular for "For You" */}
            {selectedCat === 'foryou' && (
              <>
                <div className="cat-sec-label">⭐ Featured Products</div>
                <div className="cp-grid">
                  {catProducts.map(p => <ProdCard key={p._id} p={p} />)}
                </div>
                <div className="cat-sec-label">🔥 Popular This Week</div>
                <div className="cp-grid">
                  {popular.map(p => <ProdCard key={p._id} p={p} />)}
                </div>
                <div className="cat-sec-label">📦 Browse by Category</div>
                <div className="cp-grid">
                  {Object.keys(CAT_META).filter(c => c !== 'foryou').map(c => (
                    <div key={c} className="cp-card" onClick={() => setSelectedCat(c)} style={{ cursor: 'pointer' }}>
                      <div className="cp-img" style={{ background: CAT_META[c].color }}><span style={{ fontSize: '2.2rem' }}>{CAT_META[c].emoji}</span></div>
                      <div className="cp-name">{CAT_META[c].title}</div>
                      <div className="cp-price" style={{ color: '#888', fontWeight: 600, fontSize: '0.65rem' }}>{ALL_PRODUCTS.filter(p => p.category === c).length} products</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Category Products */}
            {selectedCat !== 'foryou' && (
              <>
                {catProducts.length > 0 ? (
                  <>
                    <div className="cat-sec-label">{catProducts.length} Products in {meta.title}</div>
                    <div className="cp-grid">
                      {catProducts.map(p => <ProdCard key={p._id} p={p} />)}
                    </div>
                    <div style={{ padding: '16px 12px 8px' }}>
                      <Link href={`/products?category=${selectedCat}`} style={{ display: 'block', background: 'linear-gradient(135deg,#1a5c38,#2d6a4f)', color: '#fff', padding: '13px', borderRadius: '14px', textDecoration: 'none', textAlign: 'center', fontWeight: '700', fontSize: '0.87rem', fontFamily: 'Poppins,sans-serif' }}>
                        See All {ALL_PRODUCTS.filter(p => p.category === selectedCat).length} Products →
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="cat-empty">No products yet in this category.</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
