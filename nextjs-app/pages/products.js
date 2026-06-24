import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

const ALL_CATS = [
  { key: 'vegetables', emoji: '🥬', label: 'Vegetables' },
  { key: 'fruits', emoji: '🍎', label: 'Fruits' },
  { key: 'biscuits', emoji: '🍪', label: 'Biscuits' },
  { key: 'snacks', emoji: '🥜', label: 'Snacks' },
  { key: 'mushroom', emoji: '🍄', label: 'Mushroom' },
  { key: 'chicken', emoji: '🍗', label: 'Chicken' },
  { key: 'mutton', emoji: '🍖', label: 'Mutton' },
  { key: 'grocery', emoji: '🏪', label: 'Grocery' },
  { key: 'herbal', emoji: '🌿', label: 'Herbal' },
  { key: 'dryfruits', emoji: '🥣', label: 'Dry Fruits' },
  { key: 'flour', emoji: '🌾', label: 'Flour' },
  { key: 'beverages', emoji: '☕', label: 'Beverages' },
  { key: 'spreads', emoji: '🍯', label: 'Spreads' },
  { key: 'pickles', emoji: '🥒', label: 'Pickles' },
  { key: 'superfoods', emoji: '🧬', label: 'Superfoods' },
  { key: 'readytocook', emoji: '🍲', label: 'Ready to Cook' },
];

export default function Products() {
  const router = useRouter();
  const { addToCart, addToast } = useCart();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [mobFilterOpen, setMobFilterOpen] = useState(false);
  const [mobSortOpen, setMobSortOpen] = useState(false);
  const [mobActiveTab, setMobActiveTab] = useState('category');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [lastQuery, setLastQuery] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const queryStr = JSON.stringify(router.query);
    if (lastQuery === queryStr) return;
    
    const { category, featured, bestseller } = router.query;
    setSelectedCategories(category ? [category] : []);
    setFeaturedOnly(featured === 'true');
    if (bestseller === 'true') setSortBy('rating');
    
    setLastQuery(queryStr);
  }, [router.isReady, router.query, lastQuery]);

  const handleCategoryChange = (cat) =>
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const handleClearFilters = () => {
    setSelectedCategories([]); setMinPrice(''); setMaxPrice('');
    setMinRating(''); setInStockOnly(false); setFeaturedOnly(false); setSortBy('');
  };

  let filtered = [...ALL_PRODUCTS];
  if (router.query.search) {
    const q = router.query.search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }
  if (selectedCategories.length > 0) filtered = filtered.filter(p => selectedCategories.includes(p.category));
  if (minPrice !== '') filtered = filtered.filter(p => (p.discountPrice || p.price) >= parseFloat(minPrice));
  if (maxPrice !== '') filtered = filtered.filter(p => (p.discountPrice || p.price) <= parseFloat(maxPrice));
  if (minRating !== '') filtered = filtered.filter(p => p.rating >= parseFloat(minRating));
  if (inStockOnly) filtered = filtered.filter(p => (p.stock ?? 100) > 0);
  if (featuredOnly) filtered = filtered.filter(p => p.isFeatured);
  if (sortBy === 'price_low') filtered.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
  else if (sortBy === 'price_high') filtered.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
  else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);

  const activeFilterCount = selectedCategories.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (minRating ? 1 : 0) + (featuredOnly ? 1 : 0);

  const pageTitle = router.query.search
    ? `"${router.query.search}"`
    : selectedCategories.length === 1
    ? ALL_CATS.find(c => c.key === selectedCategories[0])?.label || 'All Products'
    : 'All Products';

  return (
    <>
      <style>{`
        .prods-pg { background: #f4f6f0; min-height: 100vh; padding-bottom: 120px; font-family: 'Inter', sans-serif; }

        /* Sticky header */
        .prods-header {
          position: sticky; top: 0; z-index: 200;
          background: #fff; border-bottom: 1.5px solid #f0f0f0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .prods-header-top { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; }
        .prods-back { background: #f4f6f0; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #333; font-size: 0.9rem; }
        .prods-title { font-size: 1rem; font-weight: 800; color: #1a1a2e; font-family: 'Poppins', sans-serif; flex: 1; margin: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prods-header-actions { display: flex; gap: 10px; }
        .prods-action-btn { background: #f4f6f0; border: none; border-radius: 10px; padding: 8px 10px; font-size: 0.85rem; color: #333; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; position: relative; }
        .prods-action-btn .filter-badge { position: absolute; top: -4px; right: -4px; background: #e05a2b; color: #fff; width: 16px; height: 16px; border-radius: 50%; font-size: 0.6rem; display: flex; align-items: center; justify-content: center; font-weight: 700; }

        /* Category scroll bar */
        .prods-cat-bar { display: flex; gap: 8px; overflow-x: auto; padding: 8px 16px; scrollbar-width: none; border-bottom: 1px solid #f0f0f0; }
        .prods-cat-bar::-webkit-scrollbar { display: none; }
        .prods-cat-pill { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; cursor: pointer; flex-shrink: 0; transition: all 0.18s; border: 2px solid transparent; background: #f4f6f0; color: #555; }
        .prods-cat-pill.active { background: #1a5c38; color: #fff; border-color: #1a5c38; }
        .prods-cat-pill:active { transform: scale(0.94); }

        /* Result bar */
        .prods-result-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #fff; margin-bottom: 1px; }
        .prods-result-count { font-size: 0.8rem; color: #888; font-weight: 600; }
        .prods-view-toggle { display: flex; gap: 4px; }
        .view-btn { background: none; border: 1.5px solid #e0e0e0; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #888; font-size: 0.85rem; transition: all 0.15s; }
        .view-btn.active { background: #1a5c38; border-color: #1a5c38; color: #fff; }

        /* Products Grid */
        .prods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px 12px; }
        .prods-list { display: flex; flex-direction: column; gap: 10px; padding: 10px 12px; }

        /* Product Card (Grid) */
        .prd-card-g {
          background: #fff; border-radius: 16px; overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07); position: relative;
          transition: transform 0.15s; border: 1.5px solid #f0f0f0;
        }
        .prd-card-g:active { transform: scale(0.97); }
        .prd-discount-badge { position: absolute; top: 8px; left: 8px; z-index: 2; background: #e05a2b; color: #fff; font-size: 0.6rem; font-weight: 800; padding: 3px 7px; border-radius: 10px; }
        .prd-wish-btn { position: absolute; top: 8px; right: 8px; z-index: 2; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.8rem; color: #ccc; }
        .prd-wish-btn.active { color: #e05a2b; }
        .prd-img-g { width: 100%; aspect-ratio: 1; background: linear-gradient(135deg,#e8f5e9,#f0faf5); display: flex; align-items: center; justify-content: center; font-size: 3rem; overflow: hidden; }
        .prd-img-g img { width: 100%; height: 100%; object-fit: cover; }
        .prd-body-g { padding: 10px 10px 12px; }
        .prd-cat-tag { font-size: 0.62rem; font-weight: 700; color: #e05a2b; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 3px; }
        .prd-name-g { font-size: 0.82rem; font-weight: 700; color: #1a1a2e; line-height: 1.3; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 34px; font-family: 'Poppins', sans-serif; }
        .prd-rating-row { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
        .prd-stars { color: #f7b731; font-size: 0.7rem; }
        .prd-rating-num { font-size: 0.68rem; color: #888; }
        .prd-price-row { display: flex; align-items: baseline; gap: 5px; margin-bottom: 10px; }
        .prd-price { font-size: 1rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }
        .prd-orig { font-size: 0.72rem; color: #bbb; text-decoration: line-through; }
        .prd-atc-btn { width: 100%; background: linear-gradient(135deg,#1a5c38,#2d6a4f); color: #fff; border: none; border-radius: 10px; padding: 9px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; font-family: 'Poppins', sans-serif; }
        .prd-atc-btn:active { transform: scale(0.96); background: linear-gradient(135deg,#0f3d26,#1a5c38); }

        /* Product Card (List) */
        .prd-card-l {
          background: #fff; border-radius: 16px; display: flex; gap: 12px;
          padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1.5px solid #f0f0f0; position: relative;
          transition: transform 0.15s; overflow: hidden;
        }
        .prd-card-l:active { transform: scale(0.98); }
        .prd-card-l::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,#1a5c38,#e05a2b); }
        .prd-img-l { width: 90px; min-width: 90px; height: 90px; border-radius: 12px; background: linear-gradient(135deg,#e8f5e9,#f0faf5); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; overflow: hidden; }
        .prd-img-l img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
        .prd-body-l { flex: 1; }
        .prd-name-l { font-size: 0.88rem; font-weight: 700; color: #1a1a2e; line-height: 1.3; margin-bottom: 3px; font-family: 'Poppins', sans-serif; }
        .prd-meta-l { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .prd-price-l { font-size: 0.95rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }
        .prd-orig-l { font-size: 0.72rem; color: #bbb; text-decoration: line-through; }
        .prd-badge-l { background: #e05a2b; color: #fff; font-size: 0.6rem; font-weight: 800; padding: 2px 6px; border-radius: 8px; }
        .prd-atc-l { margin-top: 8px; background: #f0faf5; border: 1.5px solid #1a5c38; color: #1a5c38; border-radius: 8px; padding: 7px 14px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }

        /* Sort / Filter bar */
        .mob-sort-filter-bar {
          position: fixed; bottom: 60px; left: 0; right: 0; z-index: 150;
          display: flex; background: #fff; border-top: 1.5px solid #e8e8e8;
          box-shadow: 0 -3px 14px rgba(0,0,0,0.08);
        }
        .sf-btn { flex: 1; padding: 13px; display: flex; align-items: center; justify-content: center; gap: 7px; border: none; background: none; font-size: 0.88rem; font-weight: 700; color: #333; cursor: pointer; font-family: 'Poppins', sans-serif; }
        .sf-btn:first-child { border-right: 1.5px solid #e8e8e8; }
        .sf-btn .badge { background: #e05a2b; color: #fff; border-radius: 10px; padding: 0 6px; font-size: 0.65rem; font-weight: 800; }

        /* Filter drawer */
        .filter-drawer { position: fixed; inset: 0; z-index: 1000; display: flex; pointer-events: none; }
        .filter-drawer.open { pointer-events: auto; }
        .filter-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); opacity: 0; transition: opacity 0.3s; }
        .filter-drawer.open .filter-overlay { opacity: 1; }
        .filter-panel { position: absolute; top: 0; left: 0; bottom: 0; width: 92%; max-width: 420px; background: #fff; transform: translateX(-100%); transition: transform 0.3s ease; display: flex; flex-direction: column; }
        .filter-drawer.open .filter-panel { transform: translateX(0); }
        .filter-panel-head { padding: 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1.5px solid #f0f0f0; flex-shrink: 0; }
        .filter-panel-head h2 { flex: 1; font-size: 1rem; font-weight: 800; margin: 0; color: #1a1a2e; font-family: 'Poppins', sans-serif; }
        .filter-clear-btn { color: #e05a2b; font-weight: 700; font-size: 0.8rem; background: none; border: none; cursor: pointer; }
        .filter-body { display: flex; flex: 1; overflow: hidden; }
        .filter-sidebar { width: 110px; background: #f8faf6; border-right: 1.5px solid #f0f0f0; overflow-y: auto; }
        .filter-sidebar-btn { width: 100%; padding: 14px 8px; border: none; background: none; font-size: 0.78rem; font-weight: 600; color: #666; text-align: left; cursor: pointer; border-left: 3px solid transparent; }
        .filter-sidebar-btn.active { background: #fff; color: #1a5c38; border-left-color: #1a5c38; font-weight: 800; }
        .filter-content { flex: 1; overflow-y: auto; padding: 16px; }
        .filter-check-label { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8f8f8; font-size: 0.85rem; color: #333; cursor: pointer; }
        .filter-check { width: 18px; height: 18px; accent-color: #1a5c38; }
        .filter-footer { padding: 14px 16px; border-top: 1.5px solid #f0f0f0; display: flex; gap: 10px; flex-shrink: 0; }
        .filter-apply-btn { flex: 1; background: linear-gradient(135deg,#1a5c38,#2d6a4f); color: #fff; border: none; border-radius: 12px; padding: 13px; font-size: 0.9rem; font-weight: 800; cursor: pointer; font-family: 'Poppins', sans-serif; }

        /* Sort sheet */
        .sort-sheet { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: flex-end; pointer-events: none; }
        .sort-sheet.open { pointer-events: auto; }
        .sort-sheet-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); opacity: 0; transition: opacity 0.3s; }
        .sort-sheet.open .sort-sheet-overlay { opacity: 1; }
        .sort-sheet-panel { position: relative; width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 8px 0 20px; transform: translateY(100%); transition: transform 0.3s ease; }
        .sort-sheet.open .sort-sheet-panel { transform: translateY(0); }
        .sort-sheet-handle { width: 36px; height: 4px; background: #e0e0e0; border-radius: 4px; margin: 10px auto 16px; }
        .sort-sheet-title { padding: 0 16px 12px; font-size: 1rem; font-weight: 800; color: #1a1a2e; border-bottom: 1px solid #f0f0f0; margin-bottom: 8px; font-family: 'Poppins', sans-serif; }
        .sort-option { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; border-bottom: 1px solid #f8f8f8; font-size: 0.9rem; color: #333; }
        .sort-option.selected { color: #1a5c38; font-weight: 700; }
        .sort-option .checkmark { color: #1a5c38; font-size: 1rem; }

        /* Empty state */
        .prods-empty { text-align: center; padding: 60px 24px; }
        .prods-empty-icon { font-size: 4rem; margin-bottom: 16px; }
        .prods-empty-title { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
        .prods-empty-sub { font-size: 0.85rem; color: #888; margin-bottom: 24px; }
        .prods-reset-btn { background: #1a5c38; color: #fff; border: none; border-radius: 12px; padding: 12px 28px; font-size: 0.9rem; font-weight: 700; cursor: pointer; }
      `}</style>

      <div className="prods-pg">
        {/* Header */}
        <div className="prods-header">
          <div className="prods-header-top">
            <button className="prods-back" onClick={() => router.back()}><i className="fas fa-arrow-left"></i></button>
            <span className="prods-title">{pageTitle}</span>
            <div className="prods-header-actions">
              <Link href="/search" className="prods-action-btn" style={{ textDecoration: 'none' }}><i className="fas fa-search"></i></Link>
              <button className="prods-action-btn" onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}>
                <i className={`fas fa-${viewMode === 'grid' ? 'list' : 'th'}`}></i>
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="prods-cat-bar">
            <div className={`prods-cat-pill ${selectedCategories.length === 0 ? 'active' : ''}`} onClick={() => setSelectedCategories([])}>All</div>
            {ALL_CATS.map(c => (
              <div key={c.key} className={`prods-cat-pill ${selectedCategories.includes(c.key) ? 'active' : ''}`} onClick={() => handleCategoryChange(c.key)}>
                {c.emoji} {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* Result bar */}
        <div className="prods-result-bar">
          <span className="prods-result-count">{filtered.length} products found</span>
          <div className="prods-view-toggle">
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><i className="fas fa-th"></i></button>
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><i className="fas fa-list"></i></button>
          </div>
        </div>

        {/* Products */}
        {filtered.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="product-grid" style={{ padding: '10px 12px' }}>
              {filtered.map(p => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <div className="prods-list">
              {filtered.map(p => {
                const price = p.discountPrice || p.price;
                const discount = p.originalPrice && p.originalPrice > price ? Math.round(((p.originalPrice - price) / p.originalPrice) * 100) : 0;
                const emoji = ALL_CATS.find(c => c.key === p.category)?.emoji || '🌿';
                return (
                  <div key={p._id} className="prd-card-l">
                    <Link href={`/product/${p.slug}`} style={{ textDecoration: 'none' }}>
                      <div className="prd-img-l">
                        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span>{emoji}</span>}
                      </div>
                    </Link>
                    <div className="prd-body-l">
                      <div className="prd-name-l">{p.name}</div>
                      <div className="prd-meta-l">
                        <span className="prd-price-l">₹{price}</span>
                        {p.originalPrice > price && <span className="prd-orig-l">₹{p.originalPrice}</span>}
                        {discount > 0 && <span className="prd-badge-l">{discount}%</span>}
                      </div>
                      <div className="prd-rating-row">
                        <span className="prd-stars" style={{ color: '#f7b731', fontSize: '0.72rem' }}>{'★'.repeat(Math.floor(p.rating))}</span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>({p.rating})</span>
                      </div>
                      <button className="prd-atc-l" onClick={() => { addToCart(p, '', 1); addToast(`${p.name} added 🌿`, 'success'); }}>
                        <i className="fas fa-cart-plus"></i> Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="prods-empty">
            <div className="prods-empty-icon">🔍</div>
            <div className="prods-empty-title">No products found</div>
            <p className="prods-empty-sub">Try clearing filters or searching something else</p>
            <button className="prods-reset-btn" onClick={handleClearFilters}>Reset Filters</button>
          </div>
        )}

        {/* Sort & Filter Bar */}
        <div className="mob-sort-filter-bar">
          <button className="sf-btn" onClick={() => setMobSortOpen(true)}>
            <i className="fas fa-sort-amount-down"></i> Sort
            {sortBy && <span className="badge">1</span>}
          </button>
          <button className="sf-btn" onClick={() => setMobFilterOpen(true)}>
            <i className="fas fa-sliders-h"></i> Filter
            {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Filter Drawer */}
        <div className={`filter-drawer ${mobFilterOpen ? 'open' : ''}`}>
          <div className="filter-overlay" onClick={() => setMobFilterOpen(false)}></div>
          <div className="filter-panel">
            <div className="filter-panel-head">
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333', fontSize: '1rem' }} onClick={() => setMobFilterOpen(false)}><i className="fas fa-times"></i></button>
              <h2>Filters</h2>
              <button className="filter-clear-btn" onClick={handleClearFilters}>Clear All</button>
            </div>
            <div className="filter-body">
              <div className="filter-sidebar">
                {['category','price','rating','availability'].map(t => (
                  <button key={t} className={`filter-sidebar-btn ${mobActiveTab === t ? 'active' : ''}`} onClick={() => setMobActiveTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div className="filter-content">
                {mobActiveTab === 'category' && ALL_CATS.map(cat => (
                  <label key={cat.key} className="filter-check-label">
                    <input className="filter-check" type="checkbox" checked={selectedCategories.includes(cat.key)} onChange={() => handleCategoryChange(cat.key)} />
                    {cat.emoji} {cat.label}
                  </label>
                ))}
                {mobActiveTab === 'price' && (
                  <>
                    <div style={{ marginBottom: '14px' }}><label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Min Price (₹)</label><input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #e0e0e0', borderRadius: '10px', fontSize: '0.9rem' }} /></div>
                    <div><label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Max Price (₹)</label><input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #e0e0e0', borderRadius: '10px', fontSize: '0.9rem' }} /></div>
                  </>
                )}
                {mobActiveTab === 'rating' && ['4','3'].map(r => (
                  <label key={r} className="filter-check-label">
                    <input className="filter-check" type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} />
                    {'★'.repeat(parseInt(r))}{'☆'.repeat(5 - parseInt(r))} & up
                  </label>
                ))}
                {mobActiveTab === 'availability' && (
                  <>
                    <label className="filter-check-label"><input className="filter-check" type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} /> In Stock Only</label>
                    <label className="filter-check-label"><input className="filter-check" type="checkbox" checked={featuredOnly} onChange={e => setFeaturedOnly(e.target.checked)} /> Featured Only</label>
                  </>
                )}
              </div>
            </div>
            <div className="filter-footer">
              <button className="filter-apply-btn" onClick={() => setMobFilterOpen(false)}>Show {filtered.length} Products</button>
            </div>
          </div>
        </div>

        {/* Sort Sheet */}
        <div className={`sort-sheet ${mobSortOpen ? 'open' : ''}`}>
          <div className="sort-sheet-overlay" onClick={() => setMobSortOpen(false)}></div>
          <div className="sort-sheet-panel">
            <div className="sort-sheet-handle"></div>
            <div className="sort-sheet-title">Sort By</div>
            {[{ v: '', l: 'Relevance' }, { v: 'price_low', l: 'Price: Low to High' }, { v: 'price_high', l: 'Price: High to Low' }, { v: 'rating', l: 'Highest Rated ⭐' }].map(opt => (
              <div key={opt.v} className={`sort-option ${sortBy === opt.v ? 'selected' : ''}`} onClick={() => { setSortBy(opt.v); setMobSortOpen(false); }}>
                <span>{opt.l}</span>
                {sortBy === opt.v && <span className="checkmark"><i className="fas fa-check"></i></span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
