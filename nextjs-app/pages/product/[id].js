import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../../data/products';
import ProductCard from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';

export default function ProductDetail({ initialProduct }) {
  const router = useRouter();
  const { id: slug } = router.query;
  const { addToCart, toggleWishlist, isInWishlist, addToast } = useCart();
  const { language, t } = useLanguage();

  const [product, setProduct] = useState(initialProduct);
  const [selectedWeight, setSelectedWeight] = useState(initialProduct?.weights?.[0]?.label || '250g');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [mainImage, setMainImage] = useState(initialProduct?.images?.[0] || initialProduct?.image || '');
  const [localReviews, setLocalReviews] = useState(initialProduct?.reviews || []);
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(!initialProduct);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Sync state if initialProduct prop or slug changes
  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      if (initialProduct.weights && initialProduct.weights.length > 0) {
        setSelectedWeight(initialProduct.weights[0].label);
      } else {
        setSelectedWeight('250g');
      }
      setMainImage(initialProduct.images?.[0] || initialProduct.image || '');
      setLocalReviews(initialProduct.reviews || []);
      setLoading(false);
    } else if (slug) {
      setLoading(true);
      const fetchProduct = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products/slug/${slug}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              setProduct(data.data);
              if (data.data.weights && data.data.weights.length > 0) {
                setSelectedWeight(data.data.weights[0].label);
              } else {
                setSelectedWeight('250g');
              }
              setMainImage(data.data.images?.[0] || data.data.image || '');
              setLocalReviews(data.data.reviews || []);
            } else {
              setProduct(null);
            }
          } else {
            setProduct(null);
          }
        } catch (e) {
          console.error(e);
          setProduct(null);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    } else if (router.isReady && !slug) {
      // Router is ready, but no slug parameter exists (loading fallback handler)
      setProduct(null);
      setLoading(false);
    }
  }, [initialProduct, slug, router.isReady]);

  // Fetch related products dynamically from backend and filter by SAME seller
  useEffect(() => {
    if (product && product.category) {
      const fetchRelated = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products?category=${encodeURIComponent(product.category)}&limit=20`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              const currentId = product.id || product._id;
              // Try to find products from the SAME seller first
              let filtered = data.data
                .filter(p => p.seller_id === product.seller_id && p.slug !== product.slug && (p.id || p._id) !== currentId);
              
              // Fallback to general category products if same seller has no other items
              if (filtered.length === 0) {
                filtered = data.data
                  .filter(p => p.slug !== product.slug && (p.id || p._id) !== currentId);
              }
              setRelatedProducts(filtered.slice(0, 4));
            }
          }
        } catch (e) {
          console.error('Failed to fetch related products:', e);
          const fallback = ALL_PRODUCTS
            .filter(p => p.category === product.category && p.slug !== product.slug)
            .slice(0, 4);
          setRelatedProducts(fallback);
        }
      };
      fetchRelated();
    }
  }, [product]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', background: '#faf8f4', minHeight: '100vh' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '16px' }}></i>
        <h2 style={{ fontFamily: 'var(--font-heading)' }}>{language === 'en' ? 'Loading Product Details...' : 'விவரங்கள் ஏற்றப்படுகிறது...'}</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'Inter, sans-serif', background: '#faf8f4', minHeight: '100vh' }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#e53935', marginBottom: '16px' }}></i>
        <h2>{t('product_not_found')}</h2>
        <p style={{ color: '#64748b', marginTop: '8px' }}>{t('product_not_found_desc')}</p>
        <Link href="/products" className="btn" style={{
          marginTop: '20px',
          display: 'inline-block',
          background: 'var(--primary)',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: '8px',
          fontWeight: '700',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(26,92,56,0.15)'
        }}>
          {t('back_to_shop')}
        </Link>
      </div>
    );
  }

  const pid = product._id || product.id || product.slug;
  const isWishlisted = isInWishlist(pid);

  // Price calculations based on weight option selection
  const selectedWeightObj = product.weights?.find(w => w.label === selectedWeight);
  const showPrice = selectedWeightObj 
    ? (selectedWeightObj.discountPrice || selectedWeightObj.price) 
    : (product.discountPrice || product.price);
  const showOriginal = selectedWeightObj 
    ? selectedWeightObj.price 
    : (product.originalPrice || product.original_price || product.price);
  const discount = showOriginal > showPrice 
    ? Math.round(((showOriginal - showPrice) / showOriginal) * 100) 
    : 0;

  const stockVal = product.stock !== undefined ? product.stock : 100;
  const outOfStock = stockVal <= 0;

  const handleQtyChange = (delta) => {
    setQuantity(prev => Math.max(1, Math.min(10, prev + delta)));
  };

  const handleAddToCartClick = () => {
    if (outOfStock) return;
    addToCart(product, selectedWeight, quantity);
    addToast(language === 'en' ? `${product.name} (${selectedWeight}) added to cart 🌿` : `${product.name} (${selectedWeight}) கூடையில் சேர்க்கப்பட்டது 🌿`, 'success');
  };

  const handleBuyNowClick = () => {
    if (outOfStock) return;
    addToCart(product, selectedWeight, quantity);
    router.push('/cart');
  };

  const submitReview = async () => {
    if (!reviewComment.trim()) {
      addToast(language === 'en' ? 'Please enter a comment' : 'கருத்துரையை உள்ளிடவும்', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const { auth } = await import('../../firebase/config');
      if (!auth.currentUser) {
        addToast(language === 'en' ? 'Please log in to submit a review' : 'மதிப்புரை எழுத உள்நுழையவும்', 'error');
        setSubmittingReview(false);
        router.push('/login?redirect=' + router.asPath);
        return;
      }
      
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: product.id || product._id, rating: reviewRating, comment: reviewComment })
      });

      if (res.ok) {
        addToast(language === 'en' ? 'Review submitted successfully!' : 'மதிப்புரை சமர்ப்பிக்கப்பட்டது!', 'success');
        setShowReviewForm(false);
        setReviewComment('');
        window.location.reload();
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to submit review', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('An error occurred', 'error');
    }
    setSubmittingReview(false);
  };

  const formattedDate = new Date(new Date().getTime() - 24*60*60*1000).toLocaleDateString(language === 'en' ? 'en-US' : 'ta-IN', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="pd-pg">
      {/* Product Detail Top Header */}
      <div className="pd-top-header" style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: '#fff', borderBottom: '1px solid var(--border)',
        padding: '13px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <button onClick={() => router.back()} style={{
          background: '#faf8f4', border: 'none', borderRadius: '50%',
          width: '36px', height: '36px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', color: '#333'
        }} aria-label="Go back">
          <i className="fas fa-arrow-left"></i>
        </button>
        <span style={{
          fontSize: '1rem', fontWeight: '800', color: 'var(--text)',
          fontFamily: 'var(--font-heading)', flex: 1, margin: '0 10px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textAlign: 'left'
        }}>
          {product.name}
        </span>
        <Link href="/cart" style={{
          background: '#faf8f4', border: 'none', borderRadius: '10px',
          width: '36px', height: '36px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#333', textDecoration: 'none'
        }} aria-label="View Cart">
          <i className="fas fa-shopping-cart"></i>
        </Link>
      </div>

      <style>{`
        .pd-pg { background: #faf8f4; min-height: 100vh; padding-bottom: 90px; font-family: 'Inter', sans-serif; }
        .pd-breadcrumbs { padding: 16px 12px 8px; font-size: 0.8rem; color: var(--text-light); font-weight: 500; }
        .pd-breadcrumbs a { color: var(--primary); text-decoration: none; font-weight: 600; }
        .pd-breadcrumbs span { color: #cbd5e1; margin: 0 6px; }

        .pd-container { max-width: 960px; margin: 0 auto; padding: 0 12px; }
        .pd-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 32px; }
        @media(min-width: 768px) {
          .pd-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
        }

        /* Image Gallery */
        .pd-gallery { display: flex; flex-direction: column; gap: 12px; }
        .pd-main-img-box {
          background: #fff; border-radius: 16px; border: 1px solid var(--border);
          box-shadow: 0 4px 16px rgba(0,0,0,0.02); height: 350px;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }
        .pd-main-img-box img { width: 100%; height: 100%; object-fit: contain; padding: 20px; }
        
        .pd-wishlist-btn {
          position: absolute; top: 16px; right: 16px; width: 40px; height: 40px;
          border-radius: 50%; background: #fff; border: 1px solid var(--border); cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.04); display: flex;
          align-items: center; justify-content: center; font-size: 1.2rem;
          transition: all 0.2s; z-index: 10;
        }
        .pd-wishlist-btn:active { transform: scale(0.9); }
        .pd-wishlist-btn.active i { color: #ef4444; }
        
        .pd-rating-tag {
          position: absolute; bottom: 16px; left: 16px; background: rgba(255,255,255,0.92);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          padding: 6px 12px; border-radius: 20px; font-size: 0.75rem;
          font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03); z-index: 10;
        }

        .pd-thumb-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
        .pd-thumb {
          width: 64px; height: 64px; border-radius: 8px; background: #fff;
          border: 1px solid var(--border); display: flex; align-items: center;
          justify-content: center; cursor: pointer; overflow: hidden;
          transition: all 0.2s; flex-shrink: 0;
        }
        .pd-thumb.active { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(26,92,56,0.1); }
        .pd-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }

        /* Product details info styling */
        .pd-info { display: flex; flex-direction: column; }
        .pd-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .pd-badge {
          background: rgba(26, 92, 56, 0.08); color: var(--primary); padding: 4px 10px;
          border-radius: 6px; font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pd-badge.sale { background: #ffece6; color: var(--accent); }
        .pd-badge.out { background: #fee2e2; color: #ef4444; }

        .pd-title { font-size: 1.5rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading); margin-bottom: 8px; line-height: 1.25; }
        .pd-desc { font-size: 0.88rem; color: var(--text-light); line-height: 1.55; margin-bottom: 18px; }

        /* Price block */
        .pd-price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
        .pd-price { font-size: 1.7rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading); }
        .pd-price-original { font-size: 1.05rem; text-decoration: line-through; color: var(--text-light); }
        .pd-discount-percent { font-size: 0.85rem; font-weight: 700; color: var(--accent); }

        /* Weight Switcher options */
        .pd-section-label { font-size: 0.72rem; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: block; }
        .pd-weight-options { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .pd-weight-option {
          background: #fff; border: 1px solid var(--border); border-radius: 20px;
          padding: 6px 14px; font-size: 0.8rem; font-weight: 600; color: var(--text);
          cursor: pointer; transition: all 0.2s;
        }
        .pd-weight-option.active {
          border-color: var(--primary); color: var(--primary); background: rgba(26, 92, 56, 0.08);
          font-weight: 700;
        }

        /* Qty Counter controls */
        .pd-qty-stock-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .pd-qty-ctrl { display: flex; align-items: center; background: #fff; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; max-width: fit-content; }
        .pd-qty-btn { background: none; border: none; padding: 6px 14px; font-size: 1.1rem; font-weight: 700; color: var(--primary); cursor: pointer; }
        .pd-qty-num { width: 30px; text-align: center; font-size: 0.88rem; font-weight: 700; color: #111; outline: none; border: none; }
        
        .pd-stock-tag { font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
        .pd-stock-tag.in { color: #15803d; }
        .pd-stock-tag.out { color: #b91c1c; }

        /* Action Buttons */
        .pd-actions { display: flex; gap: 12px; margin-bottom: 20px; }
        .pd-btn {
          flex: 1; padding: 14px; border-radius: 8px; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s; border: none; font-family: var(--font-heading);
        }
        .pd-btn.outline { background: #fff; border: 1.5px solid var(--primary); color: var(--primary); }
        .pd-btn.outline:active { background: rgba(26,92,56,0.05); }
        .pd-btn.primary { background: var(--primary); color: #fff; }
        .pd-btn.primary:active { transform: scale(0.98); }
        .pd-btn.buy { background: var(--accent); color: #fff; }
        .pd-btn.buy:active { transform: scale(0.98); }

        /* Trust Badges Strip */
        .pd-trust-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
          background: #fff; padding: 16px; border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 20px;
          border: 1px solid var(--border);
        }
        .pd-trust-item { display: flex; align-items: center; gap: 8px; font-size: 0.74rem; font-weight: 600; color: var(--text-light); }
        .pd-trust-item i { color: var(--primary); font-size: 0.9rem; }

        /* Tab Switcher rules */
        .pd-tabs-container { margin-bottom: 32px; }
        .pd-tabs-list {
          display: flex; gap: 8px; border-bottom: 1.5px solid var(--border);
          margin-bottom: 20px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none;
        }
        .pd-tabs-list::-webkit-scrollbar { display: none; }
        .pd-tab-btn {
          background: none; border: none; padding: 8px 16px; font-size: 0.82rem;
          font-weight: 700; color: var(--text-light); cursor: pointer; transition: all 0.2s;
          white-space: nowrap; border-bottom: 2.5px solid transparent;
          margin-bottom: -7.5px; font-family: var(--font-heading);
        }
        .pd-tab-btn.active { color: var(--primary); border-color: var(--primary); }

        .pd-tab-content { background: #fff; border-radius: 12px; padding: 18px; border: 1px solid var(--border); }

        /* Nutrition details */
        .pd-nutrition-table { width: 100%; border-collapse: collapse; max-width: 480px; }
        .pd-nutrition-table tr { border-bottom: 1px dashed var(--border); }
        .pd-nutrition-table tr:last-child { border-bottom: none; }
        .pd-nutrition-table td { padding: 10px 8px; font-size: 0.85rem; color: var(--text); }
        .pd-nutrition-table td strong { color: var(--primary); }

        /* Related Products details */
        .pd-related-sec-title { font-size: 1.1rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading); margin-bottom: 16px; padding-left: 4px; }
        
        /* Sticky Mobile Purchase Bar */
        .sticky-purchase-bar {
          position: fixed; bottom: 0; left: 0; right: 0; background: #fff;
          border-top: 1px solid var(--border); padding: 10px 16px; z-index: 500;
          display: none; align-items: center; justify-content: space-between;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.06);
        }
        @media (max-width: 768px) {
          .sticky-purchase-bar { display: flex; }
        }
      `}</style>

      {/* Breadcrumbs */}
      <div className="pd-breadcrumbs">
        <div className="pd-container">
          <Link href="/">{t('home')}</Link>
          <span>/</span>
          <Link href="/products">{language === 'en' ? 'Products' : 'தயாரிப்புகள்'}</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-light)' }}>{product.name}</span>
        </div>
      </div>

      <div className="pd-container">
        
        {/* Product Detail Grid Layout */}
        <div className="pd-grid">
          
          {/* Photo Gallery Column */}
          <div className="pd-gallery">
            <div className="pd-main-img-box">
              <button 
                className={`pd-wishlist-btn focus-visible-ring ${isWishlisted ? 'active' : ''}`} 
                onClick={() => toggleWishlist(pid)}
                title={language === 'en' ? 'Add to Wishlist' : 'விருப்பப்பட்டியலில் சேர்க்கவும்'}
                aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              >
                <i className="fas fa-heart"></i>
              </button>

              {mainImage ? (
                <img src={mainImage} alt={product.name} />
              ) : (
                <div style={{ fontSize: '8rem' }}>🌿</div>
              )}

              <div className="pd-rating-tag">
                {product.rating} <i className="fas fa-star" style={{ color: '#f59e0b' }}></i> 
                <span style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span> 
                {product.numReviews || product.reviews_count || 0} {language === 'en' ? 'reviews' : 'மதிப்புரைகள்'}
              </div>
            </div>

            {/* Gallery Thumbnails List */}
            {product.images && product.images.length > 1 && (
              <div className="pd-thumb-list">
                {product.images.map((img, i) => (
                  <div 
                    key={i}
                    className={`pd-thumb ${mainImage === img ? 'active' : ''}`} 
                    onClick={() => setMainImage(img)}
                  >
                    <img src={img} alt={`${product.name} view ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Detail Info Column */}
          <div className="pd-info">
            <div className="pd-badges">
              <span className="pd-badge">{product.category}</span>
              {discount > 0 && <span className="pd-badge sale">{discount}% OFF</span>}
              {outOfStock && <span className="pd-badge out">{t('out_of_stock')}</span>}
            </div>

            <h1 className="pd-title">{product.name}</h1>
            
            {/* Seller transparency label */}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '8px' }}>
              {t('by')}: <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{product.seller_name || 'Curify Central Store'}</span>
            </div>

            {/* Harvest Stamp Signature Motif */}
            <div className="harvest-stamp" style={{ alignSelf: 'flex-start', margin: '4px 0 14px 0' }}>
              <span>🌾 {t('harvest_stamp')}: {formattedDate} ({product.seller_location})</span>
            </div>
            
            <p className="pd-desc">
              {product.description || 'Premium organic food product sourced directly from certified sustainable farms.'}
            </p>

            <div className="pd-price-row">
              <span className="pd-price">₹{showPrice}</span>
              {discount > 0 && (
                <>
                  <span className="pd-price-original">₹{showOriginal}</span>
                  <span className="pd-discount-percent">({discount}% off)</span>
                </>
              )}
            </div>

            {/* FSSAI Registry Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-light)', marginBottom: '18px' }}>
              <span style={{ fontSize: '1rem' }}>🛡️</span>
              <span><strong>FSSAI Lic. No.</strong> 10021032001234 (Verified)</span>
            </div>

            {/* Weight Switcher options */}
            {product.weights && product.weights.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <span className="pd-section-label">{language === 'en' ? 'Weight / Pack Size' : 'அளவு / எடை'}</span>
                <div className="pd-weight-options">
                  {product.weights.map((w) => (
                    <span 
                      key={w.label}
                      className={`pd-weight-option ${selectedWeight === w.label ? 'active' : ''}`} 
                      onClick={() => setSelectedWeight(w.label)}
                    >
                      {w.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector and Stock Status */}
            <div className="pd-qty-stock-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="pd-section-label" style={{ marginBottom: 0 }}>{language === 'en' ? 'Qty' : 'எண்ணிக்கை'}</span>
                <div className="pd-qty-ctrl">
                  <button className="pd-qty-btn focus-visible-ring" onClick={() => handleQtyChange(-1)}>−</button>
                  <input 
                    type="number" 
                    className="pd-qty-num"
                    value={quantity} 
                    readOnly
                  />
                  <button className="pd-qty-btn focus-visible-ring" onClick={() => handleQtyChange(1)}>+</button>
                </div>
              </div>
              <span className={`pd-stock-tag ${outOfStock ? 'out' : 'in'}`}>
                <i className={`fas ${outOfStock ? 'fa-times-circle' : 'fa-check-circle'}`}></i> {outOfStock ? t('out_of_stock') : t('in_stock')}
              </span>
            </div>

            {/* Detail action buttons */}
            <div className="pd-actions">
              {outOfStock ? (
                <button className="pd-btn" disabled style={{ background: '#cbd5e1', color: '#64748b', cursor: 'not-allowed', width: '100%' }}>
                  {t('out_of_stock')}
                </button>
              ) : (
                <>
                  <button className="pd-btn outline focus-visible-ring" onClick={handleAddToCartClick}>
                    <i className="fas fa-shopping-cart"></i> {t('add_to_cart')}
                  </button>
                  <button className="pd-btn buy cta-btn-accent focus-visible-ring" onClick={handleBuyNowClick}>
                    <i className="fas fa-bolt"></i> {t('buy_now')}
                  </button>
                </>
              )}
            </div>

            {/* Risk Reversal / Food Safety Return Badge */}
            <div style={{ background: '#fff9f6', border: '1.5px solid #ffece6', borderRadius: '12px', padding: '14px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.3rem' }}>↩️</span>
              <div>
                <strong style={{ fontSize: '0.82rem', color: 'var(--accent)', display: 'block', fontFamily: 'var(--font-heading)' }}>
                  {t('return_policy_tag')}
                </strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-light)', lineHeight: '1.4' }}>
                  {t('return_policy_desc')}
                </p>
              </div>
            </div>

            {/* Trust Strip Badges */}
            <div className="pd-trust-grid">
              <span className="pd-trust-item"><i className="fas fa-truck"></i> {language === 'en' ? 'Free Shipping above ₹499' : '₹499க்கு மேல் இலவச டெலிவரி'}</span>
              <span className="pd-trust-item"><i className="fas fa-undo"></i> {language === 'en' ? '24-Hour Return Window' : '24 மணிநேர மாற்று விண்டோ'}</span>
              <span className="pd-trust-item"><i className="fas fa-money-bill-wave"></i> {language === 'en' ? 'Cash on Delivery Available' : 'கேஷ் ஆன் டெலிவரி வசதி'}</span>
              <span className="pd-trust-item"><i className="fas fa-leaf"></i> {language === 'en' ? 'PGS-India Certified Organic' : 'பி.ஜி.எஸ்-இந்தியா சான்றளிக்கப்பட்டது'}</span>
            </div>
          </div>
        </div>

        {/* Informative Tabs Section */}
        <div className="pd-tabs-container">
          <div className="pd-tabs-list">
            <button className={`pd-tab-btn focus-visible-ring ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>
              {language === 'en' ? 'Description' : 'விளக்கம்'}
            </button>
            <button className={`pd-tab-btn focus-visible-ring ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>
              {language === 'en' ? 'Nutritional Info' : 'ஊட்டச்சத்து விவரம்'}
            </button>
            <button className={`pd-tab-btn focus-visible-ring ${activeTab === 'farm' ? 'active' : ''}`} onClick={() => setActiveTab('farm')}>
              {language === 'en' ? 'Farm Source' : 'விவசாயப் பண்ணை'}
            </button>
            <button className={`pd-tab-btn focus-visible-ring ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')}>
              {language === 'en' ? 'Delivery & Returns' : 'டெலிவரி & திரும்ப்பபறுதல்'}
            </button>
            <button className={`pd-tab-btn focus-visible-ring ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
              {language === 'en' ? 'Reviews' : 'மதிப்புரைகள்'}
            </button>
            <button className={`pd-tab-btn focus-visible-ring ${activeTab === 'certifications' ? 'active' : ''}`} onClick={() => setActiveTab('certifications')}>
              {language === 'en' ? 'Certifications' : 'சான்றிதழ்கள்'}
            </button>
          </div>

          <div className="pd-tab-content">
            {/* Description Content */}
            {activeTab === 'description' && (
              <div style={{ lineHeight: '1.7', color: 'var(--text)', fontSize: '0.88rem' }}>
                <p style={{ marginBottom: '16px' }}>{product.description || 'Premium organic food product sourced directly from certified sustainable farms.'}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginTop: '18px' }}>
                  <div style={{ background: 'rgba(26, 92, 56, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(26, 92, 56, 0.1)' }}>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '8px', fontWeight: '700', fontSize: '0.88rem', fontFamily: 'var(--font-heading)' }}>
                      🌿 {language === 'en' ? 'Why Curify Organic?' : 'நமது தரம் ஏன் சிறந்தது?'}
                    </h4>
                    <ul style={{ fontSize: '0.82rem', color: 'var(--text-light)', lineHeight: '1.7', paddingLeft: '16px', listStyleType: 'disc' }}>
                      {language === 'en' ? (
                        <>
                          <li>Cultivated without synthetic pesticides, weedicides, or chemical fertilizers.</li>
                          <li>Strict Non-GMO sourcing standards.</li>
                          <li>Farmed using regenerative, eco-friendly soil practices.</li>
                          <li>Preserves natural nutrients, minerals, and rich wholesome flavors.</li>
                        </>
                      ) : (
                        <>
                          <li>செயற்கை பூச்சிக்கொல்லிகள், இரசாயன உரங்கள் இன்றி விளைவிக்கப்பட்டது.</li>
                          <li>மரபணு மாற்றம் செய்யப்படாத பாரம்பரிய விதைகள்.</li>
                          <li>மண்ணின் இயற்கை வளத்தை காக்கும் பன்முக பயிர் சாகுபடி முறை.</li>
                          <li>அசலான ஊட்டச்சத்து மற்றும் இயற்கையான சுவையைத் தக்கவைக்கிறது.</li>
                        </>
                      )}
                    </ul>
                  </div>
                  <div style={{ background: '#fff9f6', padding: '16px', borderRadius: '12px', border: '1px solid #ffece6' }}>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '8px', fontWeight: '700', fontSize: '0.88rem', fontFamily: 'var(--font-heading)' }}>
                      💡 {language === 'en' ? 'Usage & Preparation' : 'பயன்படுத்தும் முறை'}
                    </h4>
                    <ul style={{ fontSize: '0.82rem', color: 'var(--text-light)', lineHeight: '1.7', paddingLeft: '16px', listStyleType: 'disc' }}>
                      {language === 'en' ? (
                        <>
                          <li>Wash produce thoroughly under running clean water prior to cooking or eating.</li>
                          <li>Store in dry, clean, aerated containers or refrigerate fresh perishables.</li>
                          <li>For best taste and maximum freshness, consume fresh produce within 3-5 days.</li>
                          <li>Refer to the packing labels for batch numbers and packaging dates.</li>
                        </>
                      ) : (
                        <>
                          <li>சமைப்பதற்கு முன்பு காய்கறிகளை சுத்தமான தண்ணீரில் நன்கு கழுவவும்.</li>
                          <li>ஈரப்பதம் இல்லாத, காற்றோட்டமான கொள்கலனில் சேமிக்கவும் அல்லது குளிர்சாதன பெட்டியில் வைக்கவும்.</li>
                          <li>அதிகபட்ச புத்துணர்ச்சிக்கு 3-5 நாட்களுக்குள் பயன்படுத்தவும்.</li>
                          <li>பேக்கேஜிங் தேதி மற்றும் தொகுதி எண்களுக்கு லேபிளைப் பார்க்கவும்.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Nutritional Info Content */}
            {activeTab === 'nutrition' && (
              <div>
                {product.category === 'herbal' ? (
                  <div style={{ lineHeight: '1.7', color: 'var(--text-light)', fontSize: '0.88rem' }}>
                    <h4 style={{ marginBottom: '8px', fontWeight: '700', color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
                      🌿 {language === 'en' ? 'Herbal Ingredients & Safety' : 'மூலிகை பொருட்கள் & பாதுகாப்பு வழிகாட்டி'}
                    </h4>
                    <p style={{ marginBottom: '10px' }}>
                      {language === 'en' 
                        ? 'This is a wellness/cosmetic herbal product. Please refer to the back packaging for the complete botanical ingredients list.'
                        : 'இது ஒரு மூலிகை தயாரிப்பாகும். முழுமையான மூலப்பொருள் பட்டியலுக்கு பேக்கேஜிங்கின் பின்புறத்தை பார்க்கவும்.'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '600' }}>
                      * {language === 'en' ? 'Perform a small patch test before first topical use.' : 'முதல் பயன்பாட்டிற்கு முன் தோலில் சிறிதளவு தடவி பரிசோதிக்கவும்.'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <table className="pd-nutrition-table">
                      <thead>
                        <tr style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.82rem' }}>
                          <td style={{ padding: '8px 12px', fontWeight: '700', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                            {language === 'en' ? 'Nutrient Type' : 'ஊட்டச்சத்து வகை'}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: '700', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                            {language === 'en' ? 'Value Per 100g' : 'அளவு (100 கிராமிற்கு)'}
                          </td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>🔥 <strong>{language === 'en' ? 'Energy / Calories' : 'ஆற்றல் / கலோரி'}</strong></td>
                          <td>{product.nutritionalInfo?.calories || '120 kcal'}</td>
                        </tr>
                        <tr>
                          <td>💪 <strong>{language === 'en' ? 'Protein' : 'புரதம்'}</strong></td>
                          <td>{product.nutritionalInfo?.protein || '2.4 g'}</td>
                        </tr>
                        <tr>
                          <td>🌾 <strong>{language === 'en' ? 'Total Carbohydrates' : 'கார்போஹைட்ரேட்'}</strong></td>
                          <td>{product.nutritionalInfo?.carbs || '18.5 g'}</td>
                        </tr>
                        <tr>
                          <td>🥑 <strong>{language === 'en' ? 'Healthy Fats' : 'கொழுப்புச்சத்து'}</strong></td>
                          <td>{product.nutritionalInfo?.fat || '0.3 g'}</td>
                        </tr>
                        <tr>
                          <td>🌿 <strong>{language === 'en' ? 'Dietary Fiber' : 'நார்ச்சத்து'}</strong></td>
                          <td>{product.nutritionalInfo?.fiber || '3.2 g'}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p style={{ marginTop: '10px', fontSize: '0.74rem', color: 'var(--text-light)' }}>
                      * {language === 'en' ? 'Values are approximate. Natural organic produce may vary slightly between agricultural harvests.' : 'இயற்கை தயாரிப்பு என்பதால் அறுவடைக்கு ஏற்ப ஊட்டச்சத்து மதிப்புகள் சிறிது மாறுபடலாம்.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Farm Source Content */}
            {activeTab === 'farm' && (
              <div style={{ background: '#fafdfb', padding: '18px', borderRadius: '12px', border: '1px solid rgba(26, 92, 56, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '1.5rem', color: '#fff' }}>🏡</div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: '800', color: 'var(--primary)', fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
                      {product.seller_name || 'Organic Farm Partner'}
                    </h3>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.78rem', margin: '2px 0 0', fontWeight: '500' }}>
                      <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }}></i> {product.seller_location || 'Tamil Nadu, India'}
                    </p>
                  </div>
                </div>
                <p style={{ lineHeight: '1.7', color: 'var(--text-light)', fontSize: '0.88rem', marginBottom: '14px' }}>
                  {language === 'en' 
                    ? 'Our trusted farm network operates certified pesticide-free cultivation, utilizing nutrient-rich soil and standard rain-fed systems to bring you the highest quality organic harvest.'
                    : 'பூச்சிக்கொல்லி இல்லாத இயற்கை முறையில், இயற்கை வளங்கள் நிறைந்த மண்ணில் விளைவிக்கப்பட்ட தரமான தயாரிப்புகள்.'}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#fff', padding: '5px 12px', borderRadius: '16px', fontSize: '0.76rem', border: '1px solid var(--border)', fontWeight: '600', color: 'var(--primary)' }}><i className="fas fa-certificate"></i> PGS-India Organic</span>
                  <span style={{ background: '#fff', padding: '5px 12px', borderRadius: '16px', fontSize: '0.76rem', border: '1px solid var(--border)', fontWeight: '600', color: 'var(--primary)' }}><i className="fas fa-leaf"></i> 100% Pesticide Free</span>
                </div>
              </div>
            )}

            {/* Delivery & Returns Content */}
            {activeTab === 'delivery' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#f0faf5', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #15803d' }}>
                  <h4 style={{ margin: '0 0 6px', color: '#15803d', fontWeight: '800', fontSize: '0.88rem', fontFamily: 'var(--font-heading)' }}>
                    <i className="fas fa-truck" style={{ marginRight: '6px' }}></i> {language === 'en' ? 'Delivery Scheduling' : 'விநியோக விபரம்'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.6' }}>
                    {language === 'en' 
                      ? 'Standard shipment arrives at your doorstep in 2-4 business days. Free home delivery above ₹499.'
                      : 'பொருட்கள் 2-4 வணிக நாட்களில் உங்கள் முகவரிக்கு வந்து சேரும். ₹499க்கு மேல் ஆர்டர் செய்தால் இலவச டெலிவரி.'}
                  </p>
                </div>
                <div style={{ background: '#fff9f6', padding: '16px', borderRadius: '10px', borderLeft: '4px solid var(--accent)' }}>
                  <h4 style={{ margin: '0 0 6px', color: 'var(--accent)', fontWeight: '800', fontSize: '0.88rem', fontFamily: 'var(--font-heading)' }}>
                    <i className="fas fa-undo" style={{ marginRight: '6px' }}></i> {t('return_policy_tag')}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.6' }}>
                    {t('return_policy_desc')}
                  </p>
                </div>
              </div>
            )}

            {/* Reviews Content */}
            {activeTab === 'reviews' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0, color: 'var(--primary)', fontWeight: '800', fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
                    {language === 'en' ? 'Customer Reviews' : 'வாடிக்கையாளர் மதிப்புரைகள்'}
                  </h4>
                  <button 
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="focus-visible-ring"
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
                  >
                    {showReviewForm ? (language === 'en' ? 'Cancel' : 'ரத்துசெய்') : (language === 'en' ? 'Write a Review' : 'மதிப்புரை எழுது')}
                  </button>
                </div>

                {showReviewForm && (
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border)' }}>
                    <h5 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: '700' }}>
                      {language === 'en' ? 'Rate & Review this product' : 'மதிப்பீடு & மதிப்புரை எழுதவும்'}
                    </h5>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '8px' }}>
                        {language === 'en' ? 'Your Rating' : 'உங்கள் மதிப்பீடு'}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[1,2,3,4,5].map(star => (
                          <i 
                            key={star} 
                            className="fas fa-star" 
                            style={{ color: star <= reviewRating ? '#f59e0b' : '#cbd5e1', cursor: 'pointer', fontSize: '1.5rem' }}
                            onClick={() => setReviewRating(star)}
                          ></i>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'block', marginBottom: '8px' }}>
                        {language === 'en' ? 'Your Comment' : 'உங்கள் கருத்துரை'}
                      </span>
                      <textarea 
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder={language === 'en' ? "What do you think about this product?" : "இந்த தயாரிப்பைப் பற்றி என்ன நினைக்கிறீர்கள்?"}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', minHeight: '80px', fontFamily: 'inherit', fontSize: '0.88rem' }}
                      />
                    </div>

                    <button 
                      onClick={submitReview}
                      disabled={submittingReview}
                      style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: submittingReview ? 'not-allowed' : 'pointer', fontWeight: '700', opacity: submittingReview ? 0.7 : 1, fontSize: '0.85rem' }}
                    >
                      {submittingReview ? '...' : (language === 'en' ? 'Submit Review' : 'மதிப்புரையைச் சமர்ப்பி')}
                    </button>
                  </div>
                )}

                {localReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 20px', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <i className="fas fa-comment-dots" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '10px' }}></i>
                    <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '0.82rem' }}>
                      {language === 'en' ? 'No reviews yet. Be the first to review!' : 'மதிப்புரைகள் எதுவும் இல்லை. முதல் நபராக மதிப்புரை எழுதுங்கள்!'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {localReviews.map((rev, idx) => (
                      <div key={rev.id || idx} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {(rev.user_name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text)' }}>{rev.user_name || 'Verified Buyer'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ display: 'flex' }}>
                                {[...Array(5)].map((_, i) => (
                                  <i key={i} className="fas fa-star" style={{ color: i < rev.rating ? '#f59e0b' : '#cbd5e1', fontSize: '0.75rem' }}></i>
                                ))}
                              </div>
                              {rev.created_at && <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>• {new Date(rev.created_at).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                        <p style={{ margin: '8px 0 0', color: 'var(--text)', fontSize: '0.85rem', lineHeight: '1.5' }}>{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Certifications Tab */}
            {activeTab === 'certifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(26,92,56,0.05), rgba(26,92,56,0.01))', padding: '18px', borderRadius: '12px', border: '1px solid rgba(26,92,56,0.1)' }}>
                  <h4 style={{ marginBottom: '14px', color: 'var(--primary)', fontWeight: '800', fontSize: '0.9rem', fontFamily: 'var(--font-heading)' }}>
                    🏅 {language === 'en' ? 'Quality Certifications' : 'தர சான்றிதழ்கள்'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {[
                      { icon: '🌿', label: 'FSSAI Certified', sub: 'Lic. 10021032001234 — Standard Food Safety Compliance' },
                      { icon: '🌱', label: 'PGS-India Organic', sub: 'Verified Participatory Guarantee System for India' },
                      { icon: '✅', label: 'Non-GMO Verified', sub: 'Produced without genetic modification bio-engineering' },
                    ].map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                        <div>
                          <strong style={{ fontSize: '0.82rem', color: 'var(--primary)', display: 'block', fontFamily: 'var(--font-heading)' }}>{c.label}</strong>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', margin: '1px 0 0' }}>{c.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section style={{ marginTop: '36px' }}>
            <h2 className="pd-related-sec-title">
              {language === 'en' ? 'Other Fresh Harvest from Same Farmer' : 'அதே விவசாயியின் பிற தயாரிப்புகள்'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {relatedProducts.map(p => (
                <ProductCard key={p.id || p.slug || p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Mobile Purchase Bar */}
      <div className="sticky-purchase-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {mainImage ? (
            <img src={mainImage} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', background: 'var(--bg)' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>🌿</div>
          )}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
              {product.name}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary)' }}>
              ₹{showPrice}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '6px' }}>
          {outOfStock ? (
            <button disabled style={{ background: '#cbd5e1', color: '#64748b', fontSize: '0.72rem', fontWeight: '700', padding: '10px 14px', border: 'none', borderRadius: '8px' }}>
              {t('out_of_stock')}
            </button>
          ) : (
            <>
              <button 
                onClick={handleAddToCartClick}
                className="focus-visible-ring"
                style={{ background: '#fff', border: '1.5px solid var(--primary)', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: '700', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer' }}
                aria-label={language === 'en' ? `Add ${product.name} to cart` : `${product.name} கூடையில் சேர்க்க`}
              >
                {language === 'en' ? 'Add' : 'சேர்'}
              </button>
              <button 
                onClick={handleBuyNowClick}
                className="focus-visible-ring"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: '700', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                {t('buy_now')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  try {
    const res = await fetch(`${apiUrl}/api/products/slug/${id}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          props: {
            initialProduct: json.data,
            error: null
          }
        };
      }
    }
  } catch (e) {
    console.error('Error fetching product in getServerSideProps:', e);
  }
  
  // Fallback to static list for local dev resilience
  const found = ALL_PRODUCTS.find(p => p.slug === id || p._id === id);
  if (found) {
    return {
      props: {
        initialProduct: found,
        error: null
      }
    };
  }
  
  return {
    notFound: true
  };
}
