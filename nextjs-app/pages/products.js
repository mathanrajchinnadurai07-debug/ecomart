import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';

const ALL_CATS = [
  { key: 'vegetables', emoji: '🥬', label: 'Vegetables', labelTa: 'காய்கறிகள்' },
  { key: 'fruits', emoji: '🍎', label: 'Fruits', labelTa: 'பழங்கள்' },
  { key: 'biscuits', emoji: '🍪', label: 'Biscuits', labelTa: 'பிஸ்கட்' },
  { key: 'snacks', emoji: '🥜', label: 'Snacks', labelTa: 'நொறுக்குத்தீனிகள்' },
  { key: 'mushroom', emoji: '🍄', label: 'Mushroom', labelTa: 'காளான்' },
  { key: 'chicken', emoji: '🍗', label: 'Chicken', labelTa: 'கோழி இறைச்சி' },
  { key: 'mutton', emoji: '🍖', label: 'Mutton', labelTa: 'ஆட்டு இறைச்சி' },
  { key: 'grocery', emoji: '🏪', label: 'Grocery', labelTa: 'மளிகை' },
  { key: 'herbal', emoji: '🌿', label: 'Herbal', labelTa: 'மூலிகை' },
  { key: 'dryfruits', emoji: '🥣', label: 'Dry Fruits', labelTa: 'உலர் பழங்கள்' },
  { key: 'flour', emoji: '🌾', label: 'Flour', labelTa: 'தானிய மாவுகள்' },
  { key: 'beverages', emoji: '☕', label: 'Beverages', labelTa: 'பானங்கள்' },
  { key: 'spreads', emoji: '🍯', label: 'Spreads', labelTa: 'தேன் & நெய்' },
  { key: 'pickles', emoji: '🥒', label: 'Pickles', labelTa: 'ஊறுகாய்' },
  { key: 'superfoods', emoji: '🧬', label: 'Superfoods', labelTa: 'சூப்பர்ஃபுட்ஸ்' },
  { key: 'readytocook', emoji: '🍲', label: 'Ready to Cook', labelTa: 'சமைக்க தயாரானவை' },
];

const SkeletonCard = () => (
  <div className="product-card" style={{ border: '1px solid var(--border)', background: '#fff', boxShadow: 'none' }}>
    <div className="skeleton skeleton-image" style={{ width: '100%', height: '140px', borderRadius: 'calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0' }}></div>
    <div className="product-info" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="skeleton" style={{ height: '12px', width: '45%' }}></div>
      <div className="skeleton" style={{ height: '16px', width: '85%' }}></div>
      <div className="skeleton" style={{ height: '12px', width: '60%' }}></div>
      <div className="skeleton" style={{ height: '18px', width: '50%', marginTop: '6px' }}></div>
      <div className="skeleton" style={{ height: '36px', width: '100%', marginTop: 'auto' }}></div>
    </div>
  </div>
);

export default function Products() {
  const router = useRouter();
  const { addToCart, addToast } = useCart();
  const { language, t } = useLanguage();
  const [products, setProducts] = useState(ALL_PRODUCTS);
  const [loading, setLoading] = useState(true);
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
  const [viewMode, setViewMode] = useState('grid');
  const [lastQuery, setLastQuery] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products?limit=1000`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setProducts(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch products from backend:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

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

  let filtered = [...products];
  if (router.query.search) {
    const q = router.query.search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }
  if (selectedCategories.length > 0) filtered = filtered.filter(p => selectedCategories.includes(p.category));
  if (minPrice !== '') filtered = filtered.filter(p => (p.discountPrice || p.price) >= parseFloat(minPrice));
  if (maxPrice !== '') filtered = filtered.filter(p => (p.discountPrice || p.price) <= parseFloat(maxPrice));
  if (minRating !== '') filtered = filtered.filter(p => p.rating >= parseFloat(minRating));
  if (inStockOnly) filtered = filtered.filter(p => (p.stock ?? 100) > 0);
  if (featuredOnly) filtered = filtered.filter(p => p.isFeatured || p.is_featured);
  
  if (sortBy === 'price_low') filtered.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
  else if (sortBy === 'price_high') filtered.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
  else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);

  const activeFilterCount = selectedCategories.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (minRating ? 1 : 0) + (featuredOnly ? 1 : 0);

  const pageTitle = router.query.search
    ? `"${router.query.search}"`
    : selectedCategories.length === 1
    ? (language === 'en' 
        ? ALL_CATS.find(c => c.key === selectedCategories[0])?.label 
        : ALL_CATS.find(c => c.key === selectedCategories[0])?.labelTa) || t('all_products')
    : t('all_products');

  return (
    <>
      <style>{`
        .prods-pg { background: #faf8f4; min-height: 100vh; padding-bottom: 120px; font-family: 'Inter', sans-serif; }

        /* Sticky header */
        .prods-header {
          position: sticky; top: 0; z-index: 200;
          background: #fff; border-bottom: 1px solid var(--border);
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
        .prods-header-top { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; }
        .prods-back { background: #faf8f4; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #333; font-size: 0.9rem; }
        .prods-title { font-size: 1rem; font-weight: 800; color: var(--text); font-family: 'Poppins', sans-serif; flex: 1; margin: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prods-header-actions { display: flex; gap: 10px; }
        .prods-action-btn { background: #faf8f4; border: none; border-radius: 10px; padding: 8px 10px; font-size: 0.85rem; color: #333; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; position: relative; }
        .prods-action-btn .filter-badge { position: absolute; top: -4px; right: -4px; background: var(--accent); color: #fff; width: 16px; height: 16px; border-radius: 50%; font-size: 0.6rem; display: flex; align-items: center; justify-content: center; font-weight: 700; }

        /* Category scroll bar */
        .prods-cat-bar { display: flex; gap: 8px; overflow-x: auto; padding: 8px 16px; scrollbar-width: none; border-bottom: 1px solid var(--border); }
        .prods-cat-bar::-webkit-scrollbar { display: none; }
        .prods-cat-pill { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; cursor: pointer; flex-shrink: 0; transition: all 0.18s; border: 1px solid var(--border); background: #fff; color: #555; }
        .prods-cat-pill.active { background: var(--primary); color: #fff; border-color: var(--primary); }
        .prods-cat-pill:active { transform: scale(0.94); }

        /* Result bar */
        .prods-result-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #fff; border-bottom: 1px solid var(--border); }
        .prods-result-count { font-size: 0.8rem; color: #888; font-weight: 600; }
        .prods-view-toggle { display: flex; gap: 4px; }
        .view-btn { background: none; border: 1px solid var(--border); border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #888; font-size: 0.85rem; transition: all 0.15s; }
        .view-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; }

        /* Products Grid */
        .prods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px 12px; }
        .prods-list { display: flex; flex-direction: column; gap: 10px; padding: 10px 12px; }

        /* Product Card (List View Option) */
        .prd-card-l {
          background: #fff; border-radius: 12px; display: flex; gap: 12px;
          padding: 12px; box-shadow: none;
          border: 1px solid var(--border); position: relative;
          transition: transform 0.15s; overflow: hidden;
        }
        .prd-card-l:active { transform: scale(0.98); }
        .prd-img-l { width: 90px; min-width: 90px; height: 90px; border-radius: 8px; background: var(--bg); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; overflow: hidden; }
        .prd-img-l img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
        .prd-body-l { flex: 1; display: flex; flex-direction: column; }
        .prd-name-l { font-size: 0.85rem; font-weight: 700; color: var(--text); line-height: 1.3; margin-bottom: 3px; font-family: 'Poppins', sans-serif; }
        .prd-meta-l { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .prd-price-l { font-size: 0.95rem; font-weight: 800; color: var(--primary); }
        .prd-orig-l { font-size: 0.72rem; color: var(--text-light); text-decoration: line-through; }
        .prd-badge-l { background: var(--accent); color: #fff; font-size: 0.6rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
        .prd-atc-l { margin-top: auto; background: #fff; border: 1.5px solid var(--accent); color: var(--accent); border-radius: 8px; padding: 6px 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; }

        /* Sort / Filter bar */
        .mob-sort-filter-bar {
          position: fixed; bottom: 60px; left: 0; right: 0; z-index: 150;
          display: flex; background: #fff; border-top: 1px solid var(--border);
          box-shadow: 0 -3px 14px rgba(0,0,0,0.04);
        }
        .sf-btn { flex: 1; padding: 13px; display: flex; align-items: center; justify-content: center; gap: 7px; border: none; background: none; font-size: 0.85rem; font-weight: 700; color: var(--text); cursor: pointer; font-family: 'Poppins', sans-serif; }
        .sf-btn:first-child { border-right: 1px solid var(--border); }
        .sf-btn .badge { background: var(--accent); color: #fff; border-radius: 10px; padding: 0 6px; font-size: 0.65rem; font-weight: 800; }

        /* Filter drawer */
        .filter-drawer { position: fixed; inset: 0; z-index: 1000; display: flex; pointer-events: none; }
        .filter-drawer.open { pointer-events: auto; }
        .filter-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); opacity: 0; transition: opacity 0.3s; }
        .filter-drawer.open .filter-overlay { opacity: 1; }
        .filter-panel { position: absolute; top: 0; left: 0; bottom: 0; width: 90%; max-width: 380px; background: #fff; transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; }
        .filter-drawer.open .filter-panel { transform: translateX(0); }
        .filter-panel-head { padding: 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .filter-panel-head h2 { flex: 1; font-size: 1rem; font-weight: 800; margin: 0; color: var(--text); font-family: 'Poppins', sans-serif; }
        .filter-clear-btn { color: var(--accent); font-weight: 700; font-size: 0.8rem; background: none; border: none; cursor: pointer; }
        .filter-body { display: flex; flex: 1; overflow: hidden; }
        .filter-sidebar { width: 110px; background: var(--bg); border-right: 1px solid var(--border); overflow-y: auto; }
        .filter-sidebar-btn { width: 100%; padding: 14px 10px; border: none; background: none; font-size: 0.78rem; font-weight: 600; color: var(--text-light); text-align: left; cursor: pointer; border-left: 3px solid transparent; font-family: 'Poppins', sans-serif; }
        .filter-sidebar-btn.active { background: #fff; color: var(--primary); border-left-color: var(--primary); font-weight: 700; }
        .filter-content { flex: 1; overflow-y: auto; padding: 16px; }
        .filter-check-label { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #fafafa; font-size: 0.82rem; color: var(--text); cursor: pointer; }
        .filter-check { width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer; }
        .filter-footer { padding: 14px 16px; border-top: 1px solid var(--border); display: flex; gap: 10px; flex-shrink: 0; }
        .filter-apply-btn { flex: 1; background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 13px; font-size: 0.88rem; font-weight: 700; cursor: pointer; font-family: 'Poppins', sans-serif; transition: var(--transition); }
        .filter-apply-btn:hover { background: var(--primary-dark); }

        /* Sort sheet */
        .sort-sheet { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: flex-end; pointer-events: none; }
        .sort-sheet.open { pointer-events: auto; }
        .sort-sheet-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); opacity: 0; transition: opacity 0.3s; }
        .sort-sheet.open .sort-sheet-overlay { opacity: 1; }
        .sort-sheet-panel { position: relative; width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 8px 0 20px; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .sort-sheet.open .sort-sheet-panel { transform: translateY(0); }
        .sort-sheet-handle { width: 36px; height: 4px; background: #e0e0e0; border-radius: 4px; margin: 10px auto 16px; }
        .sort-sheet-title { padding: 0 16px 12px; font-size: 0.95rem; font-weight: 800; color: var(--text); border-bottom: 1px solid var(--border); margin-bottom: 8px; font-family: 'Poppins', sans-serif; }
        .sort-option { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; border-bottom: 1px solid #fafafa; font-size: 0.88rem; color: var(--text); }
        .sort-option.selected { color: var(--primary); font-weight: 700; }
        .sort-option .checkmark { color: var(--primary); font-size: 1rem; }

        /* Empty state */
        .prods-empty { text-align: center; padding: 60px 24px; }
        .prods-empty-icon { font-size: 4rem; margin-bottom: 16px; }
        .prods-empty-title { font-size: 1.15rem; font-weight: 800; color: var(--text); margin-bottom: 8px; font-family: 'Poppins', sans-serif; }
        .prods-empty-sub { font-size: 0.85rem; color: var(--text-light); margin-bottom: 24px; }
        .prods-reset-btn { background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 12px 28px; font-size: 0.88rem; font-weight: 700; cursor: pointer; font-family: 'Poppins', sans-serif; transition: var(--transition); }
        .prods-reset-btn:hover { background: var(--primary-dark); }
      `}</style>

      <div className="prods-pg">
        {/* Header */}
        <div className="prods-header">
          <div className="prods-header-top">
            <button className="prods-back" onClick={() => router.back()} aria-label="Go back"><i className="fas fa-arrow-left"></i></button>
            <span className="prods-title">{pageTitle}</span>
            <div className="prods-header-actions">
              <Link href="/search" className="prods-action-btn" aria-label="Search items" style={{ textDecoration: 'none' }}><i className="fas fa-search"></i></Link>
              <button className="prods-action-btn" onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} aria-label={viewMode === 'grid' ? "Switch to list view" : "Switch to grid view"}>
                <i className={`fas fa-${viewMode === 'grid' ? 'list' : 'th'}`}></i>
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="prods-cat-bar">
            <div className={`prods-cat-pill ${selectedCategories.length === 0 ? 'active' : ''}`} onClick={() => setSelectedCategories([])}>
              {language === 'en' ? 'All' : 'அனைத்தும்'}
            </div>
            {ALL_CATS.map(c => (
              <div key={c.key} className={`prods-cat-pill ${selectedCategories.includes(c.key) ? 'active' : ''}`} onClick={() => handleCategoryChange(c.key)}>
                {c.emoji} {language === 'en' ? c.label : c.labelTa}
              </div>
            ))}
          </div>
        </div>

        {/* Result bar */}
        <div className="prods-result-bar">
          <span className="prods-result-count">
            {loading 
              ? (language === 'en' ? 'Searching products...' : 'தயாரிப்புகளைத் தேடுகிறது...') 
              : language === 'en' 
                ? `${filtered.length} products found` 
                : `${filtered.length} தயாரிப்புகள் உள்ளன`}
          </span>
          <div className="prods-view-toggle">
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} aria-label="Grid View"><i className="fas fa-th"></i></button>
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} aria-label="List View"><i className="fas fa-list"></i></button>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="product-grid" style={{ padding: '10px 12px' }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="product-grid" style={{ padding: '10px 12px' }}>
              {filtered.map(p => (
                <ProductCard key={p.id || p.slug || p._id} product={p} />
              ))}
            </div>
          ) : (
            <div className="prods-list">
              {filtered.map(p => {
                const price = p.discountPrice || p.price;
                const original = p.originalPrice || p.original_price || p.price;
                const discount = original > price ? Math.round(((original - price) / original) * 100) : 0;
                const emoji = ALL_CATS.find(c => c.key === p.category)?.emoji || '🌿';
                const catInfo = ALL_CATS.find(c => c.key === p.category);
                
                return (
                  <div key={p.id || p.slug || p._id} className="prd-card-l">
                    <Link href={`/product/${p.slug}`} style={{ textDecoration: 'none' }}>
                      <div className="prd-img-l">
                        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span>{emoji}</span>}
                      </div>
                    </Link>
                    <div className="prd-body-l">
                      <h3 className="prd-name-l">{p.name}</h3>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '700', marginBottom: '4px' }}>
                        {language === 'en' ? catInfo?.label : catInfo?.labelTa} · <span style={{ color: 'var(--text-light)', textTransform: 'none' }}>by {p.seller_name || 'Curify Central Store'}</span>
                      </div>
                      <div className="prd-meta-l">
                        <span className="prd-price-l">₹{price}</span>
                        {original > price && <span className="prd-orig-l">₹{original}</span>}
                        {discount > 0 && <span className="prd-badge-l">{discount}% OFF</span>}
                      </div>
                      <div className="prd-rating-row" style={{ marginTop: '2px' }}>
                        <span className="prd-stars">{'★'.repeat(Math.floor(p.rating))}</span>
                        <span style={{ fontSize: '0.68rem', color: '#888' }}>({p.rating})</span>
                      </div>
                      <button className="prd-atc-l focus-visible-ring" onClick={() => { addToCart(p, '', 1); addToast(language === 'en' ? `${p.name} added 🌿` : `${p.name} கூடையில் சேர்க்கப்பட்டது 🌿`, 'success'); }}>
                        <i className="fas fa-cart-plus"></i> {t('add_to_cart')}
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
            <div className="prods-empty-title">
              {language === 'en' ? 'No products found' : 'தயாரிப்புகள் எதுவும் கிடைக்கவில்லை'}
            </div>
            <p className="prods-empty-sub">
              {language === 'en' ? 'Try clearing filters or explore our popular farm collections below.' : 'வடிகட்டிகளை நீக்கிவிட்டு அல்லது கீழே உள்ள எங்களது பிரபல தயாரிப்புகளை பாருங்கள்.'}
            </p>
            <button className="prods-reset-btn" onClick={handleClearFilters}>
              {language === 'en' ? 'Reset Filters' : 'வடிகட்டிகளை மீட்டமை'}
            </button>

            {/* Farm suggestions grid */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginTop: '30px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>
                {language === 'en' ? 'Popular farm collections:' : 'பிரபலமான பண்ணைத் தயாரிப்புகள்:'}
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Link href="/products?category=vegetables" className="focus-visible-ring" style={{ fontSize: '0.75rem', fontWeight: '600', padding: '6px 12px', background: 'rgba(26, 92, 56, 0.08)', color: 'var(--primary)', borderRadius: '20px', border: '1px solid rgba(26, 92, 56, 0.15)', textDecoration: 'none' }}>
                  🥬 {language === 'en' ? 'Fresh Vegetables' : 'காய்கறிகள்'}
                </Link>
                <Link href="/products?category=biscuits" className="focus-visible-ring" style={{ fontSize: '0.75rem', fontWeight: '600', padding: '6px 12px', background: 'rgba(26, 92, 56, 0.08)', color: 'var(--primary)', borderRadius: '20px', border: '1px solid rgba(26, 92, 56, 0.15)', textDecoration: 'none' }}>
                  🍪 {language === 'en' ? 'Biscuits & Cookies' : 'பிஸ்கட் & குக்கீஸ்'}
                </Link>
                <Link href="/products?category=mushroom" className="focus-visible-ring" style={{ fontSize: '0.75rem', fontWeight: '600', padding: '6px 12px', background: 'rgba(26, 92, 56, 0.08)', color: 'var(--primary)', borderRadius: '20px', border: '1px solid rgba(26, 92, 56, 0.15)', textDecoration: 'none' }}>
                  🍄 {language === 'en' ? 'Mushroom Products' : 'காளான்'}
                </Link>
                <Link href="/products?category=grocery" className="focus-visible-ring" style={{ fontSize: '0.75rem', fontWeight: '600', padding: '6px 12px', background: 'rgba(26, 92, 56, 0.08)', color: 'var(--primary)', borderRadius: '20px', border: '1px solid rgba(26, 92, 56, 0.15)', textDecoration: 'none' }}>
                  🏪 {language === 'en' ? 'Grocery Essentials' : 'மளிகை'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Sort & Filter Bar (Mobile Fixed Bottom) */}
        <div className="mob-sort-filter-bar">
          <button className="sf-btn focus-visible-ring" onClick={() => setMobSortOpen(true)}>
            <i className="fas fa-sort-amount-down"></i> {language === 'en' ? 'Sort' : 'வரிசைப்படுத்து'}
            {sortBy && <span className="badge">1</span>}
          </button>
          <button className="sf-btn focus-visible-ring" onClick={() => setMobFilterOpen(true)}>
            <i className="fas fa-sliders-h"></i> {language === 'en' ? 'Filter' : 'வடிகட்டி'}
            {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Filter Drawer */}
        <div className={`filter-drawer ${mobFilterOpen ? 'open' : ''}`}>
          <div className="filter-overlay" onClick={() => setMobFilterOpen(false)}></div>
          <div className="filter-panel">
            <div className="filter-panel-head">
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '1.1rem' }} onClick={() => setMobFilterOpen(false)} aria-label="Close filters"><i className="fas fa-times"></i></button>
              <h2>{language === 'en' ? 'Filters' : 'வடிகட்டிகள்'}</h2>
              <button className="filter-clear-btn" onClick={handleClearFilters}>{language === 'en' ? 'Clear All' : 'அனைத்தும் நீக்கு'}</button>
            </div>
            <div className="filter-body">
              <div className="filter-sidebar">
                {[
                  { key: 'category', label: 'Category', labelTa: 'பிரிவு' },
                  { key: 'price', label: 'Price', labelTa: 'விலை' },
                  { key: 'rating', label: 'Rating', labelTa: 'மதிப்பீடு' },
                  { key: 'availability', label: 'Availability', labelTa: 'இருப்பு' }
                ].map(t => (
                  <button key={t.key} className={`filter-sidebar-btn ${mobActiveTab === t.key ? 'active' : ''}`} onClick={() => setMobActiveTab(t.key)}>
                    {language === 'en' ? t.label : t.labelTa}
                  </button>
                ))}
              </div>
              <div className="filter-content">
                {mobActiveTab === 'category' && ALL_CATS.map(cat => (
                  <label key={cat.key} className="filter-check-label">
                    <input className="filter-check" type="checkbox" checked={selectedCategories.includes(cat.key)} onChange={() => handleCategoryChange(cat.key)} />
                    {cat.emoji} {language === 'en' ? cat.label : cat.labelTa}
                  </label>
                ))}
                {mobActiveTab === 'price' && (
                  <>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--text)' }}>
                        {language === 'en' ? 'Min Price (₹)' : 'குறைந்தபட்ச விலை (₹)'}
                      </label>
                      <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--text)' }}>
                        {language === 'en' ? 'Max Price (₹)' : 'அதிகபட்ச விலை (₹)'}
                      </label>
                      <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ width: '100%', padding: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }} />
                    </div>
                  </>
                )}
                {mobActiveTab === 'rating' && ['4','3'].map(r => (
                  <label key={r} className="filter-check-label">
                    <input className="filter-check" type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} />
                    {'★'.repeat(parseInt(r))}{'☆'.repeat(5 - parseInt(r))} {language === 'en' ? '& up' : 'மற்றும் அதற்கு மேல்'}
                  </label>
                ))}
                {mobActiveTab === 'availability' && (
                  <>
                    <label className="filter-check-label">
                      <input className="filter-check" type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} /> 
                      {language === 'en' ? 'In Stock Only' : 'இருப்பில் உள்ளவை மட்டும்'}
                    </label>
                    <label className="filter-check-label">
                      <input className="filter-check" type="checkbox" checked={featuredOnly} onChange={e => setFeaturedOnly(e.target.checked)} /> 
                      {language === 'en' ? 'Featured Only' : 'சிறப்பு தயாரிப்புகள் மட்டும்'}
                    </label>
                  </>
                )}
              </div>
            </div>
            <div className="filter-footer">
              <button className="filter-apply-btn" onClick={() => setMobFilterOpen(false)}>
                {language === 'en' ? `Show ${filtered.length} Products` : `${filtered.length} தயாரிப்புகளைக் காட்டு`}
              </button>
            </div>
          </div>
        </div>

        {/* Sort Sheet */}
        <div className={`sort-sheet ${mobSortOpen ? 'open' : ''}`}>
          <div className="sort-sheet-overlay" onClick={() => setMobSortOpen(false)}></div>
          <div className="sort-sheet-panel">
            <div className="sort-sheet-handle"></div>
            <div className="sort-sheet-title">{language === 'en' ? 'Sort By' : 'வரிசைப்படுத்து'}</div>
            {[
              { v: '', l: language === 'en' ? 'Relevance' : 'பொருத்தம்' }, 
              { v: 'price_low', l: language === 'en' ? 'Price: Low to High' : 'விலை: குறைந்ததிலிருந்து அதிகம்' }, 
              { v: 'price_high', l: language === 'en' ? 'Price: High to Low' : 'விலை: அதிகத்திலிருந்து குறைவு' }, 
              { v: 'rating', l: language === 'en' ? 'Highest Rated ⭐' : 'சிறந்த மதிப்பீடு ⭐' }
            ].map(opt => (
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
