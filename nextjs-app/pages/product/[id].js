import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../../data/products';
import ProductCard from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';

export default function ProductDetail() {
  const router = useRouter();
  const { id: slug } = router.query;
  const { addToCart, toggleWishlist, isInWishlist, addToast } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedWeight, setSelectedWeight] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [mainImage, setMainImage] = useState('');
  const [localReviews, setLocalReviews] = useState([]);

  // Fetch product from data
  useEffect(() => {
    if (!slug) return;

    // Search in ALL_PRODUCTS
    let found = ALL_PRODUCTS.find(p => p.slug === slug || p._id === slug);

    if (!found) {
      // Create fallback product if not found
      const IMG = '/assets/images/products/';
      const imgMap = {
        'organic-tomato': IMG + 'tomato.png',
        'organic-millet-cookies': IMG + 'millet_cookies.png',
        'organic-neem-soap': IMG + 'trail_mix.png',
        'organic-onion': IMG + 'onion.png',
        'organic-potato': IMG + 'potato.png',
        'organic-carrot': IMG + 'carrot.png',
        'organic-spinach': IMG + 'spinach.png',
        'organic-broccoli': IMG + 'broccoli.png',
        'organic-banana': IMG + 'banana.png',
        'organic-mango': IMG + 'mango.png',
        'organic-apple': IMG + 'apple.png',
        'organic-strawberry': IMG + 'strawberry.png',
        'organic-trail-mix': IMG + 'trail_mix.png'
      };
      found = {
        _id: slug,
        slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        category: 'grocery',
        price: 50,
        discountPrice: 40,
        rating: 4.3,
        numReviews: 50,
        stock: 100,
        description: 'Premium certified organic product from verified farms.',
        images: imgMap[slug] ? [imgMap[slug]] : [],
        weights: [
          { label: '250g', price: 15, discountPrice: 12 },
          { label: '500g', price: 28, discountPrice: 22 },
          { label: '1kg', price: 50, discountPrice: 40 }
        ],
        nutritionalInfo: { calories: 'Varies', protein: 'Varies', carbs: 'Varies', fat: 'Varies', fiber: 'Varies' },
        farmSource: { farmName: 'Organic Farm Partner', location: 'India', description: 'Certified organic farm.' },
        deliveryInfo: 'Delivered within 2-4 business days. Free delivery above ₹499.',
        returnPolicy: '7-day return policy with full refund or replacement.',
        reviews: [],
        videoUrl: ''
      };
    }

    setProduct(found);
    if (found.weights && found.weights.length > 0) {
      setSelectedWeight(found.weights[0].label);
    } else {
      setSelectedWeight('250g');
    }
    setMainImage(found.images?.[0] || found.image || '');

    // Load any reviews saved in local storage for this product
    const saved = JSON.parse(localStorage.getItem('curify_reviews') || '[]');
    const filtered = saved.filter(r => r.productSlug === slug);
    setLocalReviews(filtered);

  }, [slug]);

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '16px' }}></i>
        <h2>Loading Product Details...</h2>
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
    : (product.originalPrice || product.price);
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
  };

  const handleBuyNowClick = () => {
    if (outOfStock) return;
    addToCart(product, selectedWeight, quantity);
    router.push('/cart');
  };

  // Get related products (same category, up to 4, excluding current product)
  const relatedProducts = ALL_PRODUCTS
    .filter(p => p.category === product.category && p.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="pd-pg">
      <style>{`
        .pd-pg { background: #f4f6f0; min-height: 100vh; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        
        /* Breadcrumbs */
        .pd-breadcrumbs { padding: 16px 12px 8px; font-size: 0.8rem; color: #64748b; font-weight: 500; }
        .pd-breadcrumbs a { color: #1a5c38; text-decoration: none; font-weight: 600; }
        .pd-breadcrumbs span { color: #94a3b8; margin: 0 4px; }

        /* Main detail layout */
        .pd-container { max-width: 960px; margin: 0 auto; padding: 0 12px; }
        .pd-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 32px; }
        @media(min-width: 768px) {
          .pd-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
        }

        /* Image Gallery */
        .pd-gallery { display: flex; flex-direction: column; gap: 12px; }
        .pd-main-img-box {
          background: #fff; border-radius: 20px; border: 1px solid rgba(0,0,0,0.02);
          box-shadow: 0 4px 16px rgba(0,0,0,0.03); height: 350px;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }
        .pd-main-img-box img { width: 100%; height: 100%; object-fit: contain; padding: 24px; }
        
        .pd-wishlist-btn {
          position: absolute; top: 16px; right: 16px; width: 42px; height: 42px;
          border-radius: 50%; background: #fff; border: none; cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08); display: flex;
          align-items: center; justify-content: center; font-size: 1.25rem;
          transition: all 0.2s; z-index: 10;
        }
        .pd-wishlist-btn:active { transform: scale(0.9); }
        .pd-wishlist-btn.active i { color: #ef4444; }
        
        .pd-rating-tag {
          position: absolute; bottom: 16px; left: 16px; background: rgba(255,255,255,0.92);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          padding: 6px 12px; border-radius: 20px; font-size: 0.76rem;
          font-weight: 700; color: #1a5c38; display: flex; align-items: center; gap: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05); z-index: 10;
        }

        .pd-thumb-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
        .pd-thumb {
          width: 64px; height: 64px; border-radius: 10px; background: #fff;
          border: 1.5px solid #cbd5e1; display: flex; align-items: center;
          justify-content: center; cursor: pointer; overflow: hidden;
          transition: all 0.2s; flex-shrink: 0;
        }
        .pd-thumb.active { border-color: #1a5c38; box-shadow: 0 0 0 3px rgba(26,92,56,0.1); }
        .pd-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }

        /* Product details info styling */
        .pd-info { display: flex; flex-direction: column; }
        .pd-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .pd-badge {
          background: #e8f5ee; color: #1a5c38; padding: 4px 10px;
          border-radius: 6px; font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pd-badge.sale { background: #ffece6; color: #e05a2b; }
        .pd-badge.out { background: #fee2e2; color: #ef4444; }

        .pd-title { font-size: 1.6rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; margin-bottom: 8px; line-height: 1.25; }
        .pd-desc { font-size: 0.88rem; color: #475569; line-height: 1.55; margin-bottom: 18px; }

        /* Price block */
        .pd-price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 20px; }
        .pd-price { font-size: 1.8rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }
        .pd-price-original { font-size: 1.1rem; text-decoration: line-through; color: #94a3b8; }
        .pd-discount-percent { font-size: 0.85rem; font-weight: 700; color: #e05a2b; }

        /* Weight Switcher options */
        .pd-section-label { font-size: 0.74rem; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: block; }
        .pd-weight-options { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
        .pd-weight-option {
          background: #fff; border: 1.5px solid #cbd5e1; border-radius: 20px;
          padding: 8px 16px; font-size: 0.82rem; font-weight: 700; color: #475569;
          cursor: pointer; transition: all 0.2s;
        }
        .pd-weight-option.active {
          border-color: #1a5c38; color: #1a5c38; background: #e8f5ee;
          box-shadow: 0 2px 6px rgba(26,92,56,0.1);
        }

        /* Qty Counter controls */
        .pd-qty-stock-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .pd-qty-ctrl { display: flex; align-items: center; background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; max-width: fit-content; }
        .pd-qty-btn { background: none; border: none; padding: 6px 14px; font-size: 1.1rem; font-weight: 700; color: #1a5c38; cursor: pointer; }
        .pd-qty-num { width: 30px; text-align: center; font-size: 0.88rem; font-weight: 700; color: #111; outline: none; border: none; }
        
        .pd-stock-tag { font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
        .pd-stock-tag.in { color: #15803d; }
        .pd-stock-tag.out { color: #b91c1c; }

        /* Action Buttons */
        .pd-actions { display: flex; gap: 12px; margin-bottom: 24px; }
        .pd-btn {
          flex: 1; padding: 14px; border-radius: 12px; font-size: 0.95rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s; border: none;
        }
        .pd-btn.outline { background: #fff; border: 1.5px solid #1a5c38; color: #1a5c38; }
        .pd-btn.outline:active { background: #f0faf5; }
        .pd-btn.primary { background: linear-gradient(135deg, #1a5c38, #2d6a4f); color: #fff; box-shadow: 0 4px 12px rgba(26,92,56,0.2); }
        .pd-btn.primary:active { transform: scale(0.98); }
        .pd-btn.buy { background: linear-gradient(135deg, #e05a2b, #f77f00); color: #fff; box-shadow: 0 4px 12px rgba(224,90,43,0.2); }
        .pd-btn.buy:active { transform: scale(0.98); }

        /* Trust Badges Strip */
        .pd-trust-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
          background: #fff; padding: 16px; border-radius: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 28px;
          border: 1px solid rgba(0,0,0,0.01);
        }
        .pd-trust-item { display: flex; align-items: center; gap: 8px; font-size: 0.74rem; font-weight: 600; color: #475569; }
        .pd-trust-item i { color: #1a5c38; font-size: 0.9rem; }

        /* Tab Switcher rules */
        .pd-tabs-container { margin-bottom: 32px; }
        .pd-tabs-list {
          display: flex; gap: 8px; border-bottom: 1.5px solid #cbd5e1;
          margin-bottom: 20px; overflow-x: auto; padding-bottom: 6px;
        }
        .pd-tab-btn {
          background: none; border: none; padding: 8px 16px; font-size: 0.85rem;
          font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s;
          white-space: nowrap; border-bottom: 2.5px solid transparent;
          margin-bottom: -7.5px; font-family: 'Poppins', sans-serif;
        }
        .pd-tab-btn.active { color: #1a5c38; border-color: #1a5c38; }

        .pd-tab-content { background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.01); }

        /* Nutrition details */
        .pd-nutrition-table { width: 100%; border-collapse: collapse; max-width: 480px; }
        .pd-nutrition-table tr { border-bottom: 1px dashed #e2e8f0; }
        .pd-nutrition-table tr:last-child { border-bottom: none; }
        .pd-nutrition-table td { padding: 10px 8px; font-size: 0.85rem; color: #475569; }
        .pd-nutrition-table td strong { color: #1a5c38; }

        /* Related Products details */
        .pd-related-sec-title { font-size: 1.15rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; margin-bottom: 16px; padding-left: 4px; }
      `}</style>

      {/* Breadcrumbs */}
      <div className="pd-breadcrumbs">
        <div className="pd-container">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/products">Products</Link>
          <span>/</span>
          <span style={{ color: '#475569' }}>{product.name}</span>
        </div>
      </div>

      <div className="pd-container">
        
        {/* Product Detail Grid Layout */}
        <div className="pd-grid">
          
          {/* Photo Gallery Column */}
          <div className="pd-gallery">
            <div className="pd-main-img-box">
              <button 
                className={`pd-wishlist-btn ${isWishlisted ? 'active' : ''}`} 
                onClick={() => toggleWishlist(pid)}
                title="Add to Wishlist"
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
                {product.numReviews + localReviews.length} reviews
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
              {outOfStock && <span className="pd-badge out">Out of Stock</span>}
            </div>

            <h1 className="pd-title">{product.name}</h1>
            
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

            {/* Weight Switcher options */}
            {product.weights && product.weights.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <span className="pd-section-label">Weight / Pack Size</span>
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
                <span className="pd-section-label" style={{ marginBottom: 0 }}>Qty</span>
                <div className="pd-qty-ctrl">
                  <button className="pd-qty-btn" onClick={() => handleQtyChange(-1)}>−</button>
                  <input 
                    type="number" 
                    className="pd-qty-num"
                    value={quantity} 
                    readOnly
                  />
                  <button className="pd-qty-btn" onClick={() => handleQtyChange(1)}>+</button>
                </div>
              </div>
              <span className={`pd-stock-tag ${outOfStock ? 'out' : 'in'}`}>
                <i className={`fas ${outOfStock ? 'fa-times-circle' : 'fa-check-circle'}`}></i> {outOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
            </div>

            {/* Detail action buttons */}
            <div className="pd-actions">
              {outOfStock ? (
                <button className="pd-btn" disabled style={{ background: '#cbd5e1', color: '#64748b', cursor: 'not-allowed', width: '100%' }}>
                  Out of Stock
                </button>
              ) : (
                <>
                  <button className="pd-btn outline" onClick={handleAddToCartClick}>
                    <i className="fas fa-shopping-cart"></i> Add to Cart
                  </button>
                  <button className="pd-btn buy" onClick={handleBuyNowClick}>
                    <i className="fas fa-bolt"></i> Buy Now
                  </button>
                </>
              )}
            </div>

            {/* Trust Strip Badges */}
            <div className="pd-trust-grid">
              <span className="pd-trust-item"><i className="fas fa-truck"></i> Free Delivery above ₹499</span>
              <span className="pd-trust-item"><i className="fas fa-undo"></i> 7 Days Return Policy</span>
              <span className="pd-trust-item"><i className="fas fa-money-bill-wave"></i> Cash on Delivery</span>
              <span className="pd-trust-item"><i className="fas fa-leaf"></i> 100% Certified Organic</span>
            </div>
          </div>
        </div>

        {/* Informative Tabs Section */}
        <div className="pd-tabs-container">
          <div className="pd-tabs-list">
            <button className={`pd-tab-btn ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
            <button className={`pd-tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>Nutritional Info</button>
            <button className={`pd-tab-btn ${activeTab === 'farm' ? 'active' : ''}`} onClick={() => setActiveTab('farm')}>Farm Source</button>
            <button className={`pd-tab-btn ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')}>Delivery & Returns</button>
            <button className={`pd-tab-btn ${activeTab === 'certifications' ? 'active' : ''}`} onClick={() => setActiveTab('certifications')}>Certifications</button>
          </div>

          <div className="pd-tab-content">
            {/* Description Content */}
            {activeTab === 'description' && (
              <div style={{ lineHeight: '1.7', color: '#334155', fontSize: '0.9rem' }}>
                <p style={{ marginBottom: '16px' }}>{product.description || 'Premium organic food product sourced directly from certified sustainable farms.'}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginTop: '18px' }}>
                  <div style={{ background: '#f0faf5', padding: '16px', borderRadius: '12px', border: '1px solid #e8f5ee' }}>
                    <h4 style={{ color: '#1a5c38', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem', fontFamily: 'Poppins' }}>🌿 Why Curify Organic?</h4>
                    <ul style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.7', paddingLeft: '16px', listStyleType: 'disc' }}>
                      <li>Cultivated without synthetic pesticides, weedicides, or chemical fertilizers.</li>
                      <li>Strict Non-GMO sourcing standards.</li>
                      <li>Farmed using regenerative, eco-friendly soil practices.</li>
                      <li>Preserves natural nutrients, minerals, and rich wholesome flavors.</li>
                    </ul>
                  </div>
                  <div style={{ background: '#fff9f6', padding: '16px', borderRadius: '12px', border: '1px solid #ffece6' }}>
                    <h4 style={{ color: '#e05a2b', marginBottom: '8px', fontWeight: '700', fontSize: '0.9rem', fontFamily: 'Poppins' }}>💡 Usage Instructions</h4>
                    <ul style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.7', paddingLeft: '16px', listStyleType: 'disc' }}>
                      <li>Wash produce thoroughly under running clean water prior to cooking or eating.</li>
                      <li>Store in dry, clean, aerated containers or refrigerate fresh perishables.</li>
                      <li>For best taste and maximum freshness, consume fresh produce within 3-5 days.</li>
                      <li>Refer to the packing labels for batch numbers and packaging dates.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Nutritional Info Content */}
            {activeTab === 'nutrition' && (
              <div>
                {product.category === 'herbal' ? (
                  <div style={{ lineHeight: '1.7', color: '#475569', fontSize: '0.88rem' }}>
                    <h4 style={{ marginBottom: '8px', fontWeight: '700', color: '#1a5c38', fontFamily: 'Poppins' }}>🌿 Herbal Ingredients & Safety Guide</h4>
                    <p style={{ marginBottom: '10px' }}>
                      This is an external-use or cosmetic herbal product. Nutritional values are not applicable. Please refer to the back packaging for the complete botanical ingredients list.
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#e05a2b', fontWeight: '600' }}>
                      * Perform a small patch test before first topical use. Discontinue if redness or irritation occurs. External use only.
                    </p>
                  </div>
                ) : (
                  <div>
                    <table className="pd-nutrition-table">
                      <thead>
                        <tr style={{ background: '#1a5c38', color: '#fff', fontSize: '0.82rem' }}>
                          <td style={{ padding: '8px 12px', fontWeight: '700', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>Nutrient Type</td>
                          <td style={{ padding: '8px 12px', fontWeight: '700', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>Value Per 100g</td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>🔥 <strong>Energy / Calories</strong></td>
                          <td>{product.nutritionalInfo?.calories || '120 kcal'}</td>
                        </tr>
                        <tr>
                          <td>💪 <strong>Protein</strong></td>
                          <td>{product.nutritionalInfo?.protein || '2.4 g'}</td>
                        </tr>
                        <tr>
                          <td>🌾 <strong>Total Carbohydrates</strong></td>
                          <td>{product.nutritionalInfo?.carbs || '18.5 g'}</td>
                        </tr>
                        <tr>
                          <td>🥑 <strong>Healthy Fats</strong></td>
                          <td>{product.nutritionalInfo?.fat || '0.3 g'}</td>
                        </tr>
                        <tr>
                          <td>🌿 <strong>Dietary Fiber</strong></td>
                          <td>{product.nutritionalInfo?.fiber || '3.2 g'}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p style={{ marginTop: '10px', fontSize: '0.74rem', color: '#888' }}>
                      * Values are approximate. Natural organic produce may vary slightly between agricultural harvests.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Farm Source Content */}
            {activeTab === 'farm' && (
              <div style={{ background: '#fafdfb', padding: '18px', borderRadius: '12px', border: '1px solid #e8f5ee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a5c38', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '1.5rem', color: '#fff' }}>🏡</div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: '800', color: '#1a5c38', fontSize: '1rem', fontFamily: 'Poppins' }}>
                      {product.farmSource?.farmName || 'Organic Farm Partner'}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '2px 0 0', fontWeight: '500' }}>
                      <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }}></i> {product.farmSource?.location || 'Western Ghats, India'}
                    </p>
                  </div>
                </div>
                <p style={{ lineHeight: '1.7', color: '#475569', fontSize: '0.88rem', marginBottom: '14px' }}>
                  {product.farmSource?.description || 'Our trusted farm network operates certified pesticide-free cultivation, utilizing nutrient-rich soil and standard rain-fed systems to bring you the highest quality organic harvest.'}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#fff', padding: '5px 12px', borderRadius: '16px', fontSize: '0.76rem', border: '1px solid #cbd5e1', fontWeight: '600', color: '#1a5c38' }}><i className="fas fa-certificate"></i> NPOP Certified</span>
                  <span style={{ background: '#fff', padding: '5px 12px', borderRadius: '16px', fontSize: '0.76rem', border: '1px solid #cbd5e1', fontWeight: '600', color: '#1a5c38' }}><i className="fas fa-leaf"></i> 100% Organic</span>
                  <span style={{ background: '#fff', padding: '5px 12px', borderRadius: '16px', fontSize: '0.76rem', border: '1px solid #cbd5e1', fontWeight: '600', color: '#1a5c38' }}><i className="fas fa-check-circle"></i> FSSAI Compliant</span>
                </div>
              </div>
            )}

            {/* Delivery & Returns Content */}
            {activeTab === 'delivery' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#f0faf5', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #15803d' }}>
                  <h4 style={{ margin: '0 0 6px', color: '#15803d', fontWeight: '800', fontSize: '0.88rem', fontFamily: 'Poppins' }}>
                    <i className="fas fa-truck" style={{ marginRight: '6px' }}></i> Delivery Scheduling
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.6' }}>
                    {product.deliveryInfo || 'Standard shipment arrives at your doorstep in 2-4 business days. Free home delivery threshold is ₹499. Metros have express next-day delivery.'}
                  </p>
                </div>
                <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #0284c7' }}>
                  <h4 style={{ margin: '0 0 6px', color: '#0284c7', fontWeight: '800', fontSize: '0.88rem', fontFamily: 'Poppins' }}>
                    <i className="fas fa-undo" style={{ marginRight: '6px' }}></i> Returns Policy
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.6' }}>
                    {product.returnPolicy || 'We offer a 7-day hassle-free return window for fresh goods. Get a full replacement or refund in case of transit damages or quality shortfalls.'}
                  </p>
                </div>
              </div>
            )}

            {/* Certifications Tab */}
            {activeTab === 'certifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(26,92,56,0.05), rgba(26,92,56,0.01))', padding: '18px', borderRadius: '14px', border: '1px solid rgba(26,92,56,0.1)' }}>
                  <h4 style={{ marginBottom: '14px', color: '#1a5c38', fontWeight: '800', fontSize: '0.9rem', fontFamily: 'Poppins' }}>🏅 Quality Certifications</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {[
                      { icon: '🌿', label: 'FSSAI Certified', sub: 'Lic. 10021032001234 — Standard Food Safety Compliance' },
                      { icon: '🌱', label: 'NPOP Organic India', sub: 'Certified zero synthetic inputs & chemical residues' },
                      { icon: '✅', label: 'Non-GMO Verified', sub: 'Produced without genetic modification bio-engineering' },
                      { icon: '🏭', label: 'ISO 22000:2018', sub: 'International Standard Food Safety Management System' },
                    ].map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                        <div>
                          <strong style={{ fontSize: '0.84rem', color: '#1a5c38', display: 'block', fontFamily: 'Poppins' }}>{c.label}</strong>
                          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '1px 0 0' }}>{c.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(224,90,43,0.05), rgba(224,90,43,0.01))', padding: '18px', borderRadius: '14px', border: '1px solid rgba(224,90,43,0.1)' }}>
                  <h4 style={{ marginBottom: '14px', color: '#e05a2b', fontWeight: '800', fontSize: '0.9rem', fontFamily: 'Poppins' }}>🔒 Trust Badges & Safety</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['♻️ Eco-Friendly Packaging', '❄️ Fresh Cold-Chain Transit', '↩️ 7-Day Replacement Guarantee', '💳 Secure SSL Gateway Payments', '🚫 No Artificial Preservatives', '🌾 Standard Farm-to-Fork Traceability'].map((b, i) => (
                      <span key={i} style={{ background: '#fff', padding: '6px 12px', borderRadius: '16px', fontSize: '0.76rem', border: '1px solid #cbd5e1', fontWeight: '600', color: '#475569' }}>{b}</span>
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
            <h2 className="pd-related-sec-title">Related Products</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {relatedProducts.map(p => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
