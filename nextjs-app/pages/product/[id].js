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
  
  // No review states — brand policy: trust badges only

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
        deliveryInfo: 'Delivered within 2-4 business days. Free delivery above ₹500.',
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
    const saved = JSON.parse(localStorage.getItem('curfee_reviews') || '[]');
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
    <>
      <div className="topbar">
        <div className="container">
          <div>
            <i className="fas fa-phone-alt"></i> +91 78457 44038 | <Link href="/support">Help</Link>
          </div>
          <div>
            <Link href="/products?bestseller=true"><i className="fas fa-percent"></i> Special Offers</Link>
          </div>
        </div>
      </div>

      <div className="container product-detail">
        {/* Breadcrumbs */}
        <div style={{ padding: '16px 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
          <Link href="/" style={{ color: 'var(--primary)' }}>Home</Link> /{' '}
          <Link href="/products" style={{ color: 'var(--primary)' }}>Products</Link> /{' '}
          <span>{product.name}</span>
        </div>

        {/* Product Detail Grid Layout */}
        <div className="product-detail-grid" id="detailContent" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
          
          {/* Photo Gallery Column */}
          <div className="product-gallery" style={{ position: 'relative' }}>
            <div className="main-image" style={{ background: '#f8fafc', position: 'relative', height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid var(--border)' }}>
              
              <button 
                className={`btn-icon ${isWishlisted ? 'active' : ''}`} 
                onClick={() => toggleWishlist(pid)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '50%', width: '40px', height: '40px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
              >
                <i className="fas fa-heart" style={{ color: isWishlisted ? 'var(--danger)' : '#a0aec0' }}></i>
              </button>

              {mainImage ? (
                <img 
                  id="mainDetailImage" 
                  src={mainImage} 
                  alt={product.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '20px' }} 
                />
              ) : (
                <div style={{ fontSize: '8rem' }}>🌿</div>
              )}

              <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: '#fff', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>
                {product.rating} <i className="fas fa-star" style={{ color: 'var(--success)' }}></i> 
                <span style={{ color: '#d1d5db', margin: '0 6px' }}>|</span> 
                {product.numReviews + localReviews.length} reviews
              </div>
            </div>

            {/* Gallery Thumbnails List */}
            {product.images && product.images.length > 1 && (
              <div className="thumb-list" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                {product.images.map((img, i) => (
                  <div 
                    key={i}
                    className={`thumb ${mainImage === img ? 'active' : ''}`} 
                    onClick={() => setMainImage(img)}
                    style={{
                      width: '60px',
                      height: '60px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fff',
                      border: mainImage === img ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="thumb" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Detail Info Column */}
          <div className="detail-info">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'var(--primary)', color: '#fff' }}>{product.category}</span>
              {discount > 0 && <span className="badge badge-sale">{discount}% OFF</span>}
              {outOfStock && <span className="badge" style={{ background: 'var(--danger)', color: '#fff' }}>Out of Stock</span>}
            </div>

            <h1 className="detail-title" style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px', lineHeight: 1.3 }}>
              {product.name}
            </h1>
            
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '16px', lineHeight: 1.6 }}>
              {product.description || 'Premium organic product from certified farms.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
              <span className="detail-price" style={{ fontSize: '1.6rem', fontWeight: '800' }}>₹{showPrice}</span>
              {discount > 0 && (
                <>
                  <span className="detail-original" style={{ textDecoration: 'line-through', color: 'var(--text-light)', fontSize: '1rem' }}>₹{showOriginal}</span>
                  <span className="detail-discount" style={{ color: 'var(--success)', fontWeight: '700', fontSize: '0.85rem' }}>{discount}% off</span>
                </>
              )}
            </div>

            {/* Weight Switcher options */}
            {product.weights && product.weights.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Weight / Pack Size:</label>
                <div className="weight-options" id="detailWeights">
                  {product.weights.map((w) => (
                    <span 
                      key={w.label}
                      className={`weight-option ${selectedWeight === w.label ? 'active' : ''}`} 
                      onClick={() => setSelectedWeight(w.label)}
                    >
                      {w.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Counter control */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Qty:</label>
                <div className="quantity-control" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <button onClick={() => handleQtyChange(-1)} style={{ border: 'none', background: 'none', padding: '5px 12px', fontWeight: '700' }}>−</button>
                  <input 
                    type="number" 
                    value={quantity} 
                    readOnly
                    style={{ background: 'transparent', width: '30px', fontSize: '0.9rem', textAlign: 'center', border: 'none', outline: 'none' }} 
                  />
                  <button onClick={() => handleQtyChange(1)} style={{ border: 'none', background: 'none', padding: '5px 12px', fontWeight: '700' }}>+</button>
                </div>
              </div>
              <span className={`product-stock ${outOfStock ? 'out-of-stock' : 'in-stock'}`} style={{ fontWeight: '600', fontSize: '0.8rem' }}>
                <i className={`fas ${outOfStock ? 'fa-times-circle' : 'fa-check-circle'}`}></i> {outOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
            </div>

            {/* Detail action buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {outOfStock ? (
                <button className="btn btn-lg" disabled style={{ flex: 1, opacity: 0.5, background: 'var(--text-light)', color: '#fff', border: 'none', textAlign: 'center', width: '100%' }}>
                  Out of Stock
                </button>
              ) : (
                <>
                  <button className="btn btn-outline btn-lg" onClick={handleAddToCartClick} style={{ flex: 1, fontWeight: '700', border: '1px solid #e2e8f0', background: '#fff', color: 'var(--text)' }}>
                    Add to Cart
                  </button>
                  <button className="btn btn-lg" onClick={handleBuyNowClick} style={{ flex: 1, fontWeight: '700', background: 'var(--primary)', color: '#fff', border: 'none' }}>
                    Buy Now
                  </button>
                </>
              )}
            </div>

            {/* Quick trust badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.75rem', color: 'var(--text-light)', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
              <span style={{ display: 'flex', alignHTML: 'center', gap: '6px' }}><i className="fas fa-truck text-gray"></i> Free Delivery above ₹499</span>
              <span style={{ display: 'flex', alignHTML: 'center', gap: '6px' }}><i className="fas fa-undo text-gray"></i> 7 Days Replacement</span>
              <span style={{ display: 'flex', alignHTML: 'center', gap: '6px' }}><i className="fas fa-money-bill-wave text-gray"></i> Cash on Delivery</span>
              <span style={{ display: 'flex', alignHTML: 'center', gap: '6px' }}><i className="fas fa-leaf text-gray"></i> 100% Organic</span>
            </div>
          </div>
        </div>

        {/* Informative Tabs Section */}
        <div id="tabsSection" style={{ marginBottom: '40px' }}>
          <div className="tabs" style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
            <button className={`tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
            <button className={`tab ${activeTab === 'nutrition' ? 'active' : ''}`} onClick={() => setActiveTab('nutrition')}>Nutritional Info</button>
            <button className={`tab ${activeTab === 'farm' ? 'active' : ''}`} onClick={() => setActiveTab('farm')}>Farm Source</button>
            <button className={`tab ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')}>Delivery & Returns</button>
            <button className={`tab ${activeTab === 'certifications' ? 'active' : ''}`} onClick={() => setActiveTab('certifications')}>Certifications</button>
          </div>

          {/* Description Content */}
          {activeTab === 'description' && (
            <div className="tab-content active" id="tab-description">
              <div style={{ lineH: '2', color: 'var(--text)', fontSize: '0.95rem' }}>
                <p>{product.description || 'Premium organic product from certified farms.'}</p>
                <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'rgba(45,106,79,0.05)', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '8px', fontWeight: '600' }}>🌿 Why Organic?</h4>
                    <ul style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineH: '2', paddingLeft: '16px', listStyleType: 'disc' }}>
                      <li>No synthetic pesticides or chemicals</li>
                      <li>Non-GMO verified</li>
                      <li>Sustainably farmed</li>
                      <li>Better for your health & the environment</li>
                    </ul>
                  </div>
                  <div style={{ background: 'rgba(247,127,0,0.05)', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--accent)', marginBottom: '8px', fontWeight: '600' }}>💡 How to Use</h4>
                    <ul style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineH: '2', paddingLeft: '16px', listStyleType: 'disc' }}>
                      <li>Wash thoroughly before use</li>
                      <li>Store in a cool, dry place</li>
                      <li>Best consumed within 3-5 days</li>
                      <li>Check individual product label for specific instructions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nutritional Info Content */}
          {activeTab === 'nutrition' && (
            <div className="tab-content active" id="tab-nutrition">
              {product.category === 'herbal' ? (
                <div style={{ padding: '20px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <h3 style={{ marginBottom: '12px', fontWeight: '600' }}>🌿 Ingredients & Properties</h3>
                  <p style={{ lineH: '1.8', color: 'var(--text-light)' }}>
                    This is an external-use herbal product. Nutritional values are not applicable. Please refer to the product packaging for full ingredient list, usage instructions, and allergen information.
                  </p>
                  <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                    <strong>Safety note:</strong> Perform a patch test before first use. Discontinue if irritation occurs. For external use only. Keep away from eyes. Consult a dermatologist if you have sensitive skin.
                  </p>
                </div>
              ) : (
                <div style={{ maxWidth: '500px' }}>
                  <table className="cart-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ background: 'var(--primary)', color: '#fff', padding: '10px', textAlign: 'left' }}>Nutrient</th>
                        <th style={{ background: 'var(--primary)', color: '#fff', padding: '10px', textAlign: 'left' }}>Per 100g/ml</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px' }}>🔥 <strong>Calories</strong></td>
                        <td style={{ padding: '10px' }}>{product.nutritionalInfo?.calories || '120 kcal'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px' }}>💪 <strong>Protein</strong></td>
                        <td style={{ padding: '10px' }}>{product.nutritionalInfo?.protein || '2.4g'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px' }}>🌾 <strong>Carbohydrates</strong></td>
                        <td style={{ padding: '10px' }}>{product.nutritionalInfo?.carbs || '18.5g'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px' }}>🥑 <strong>Fat</strong></td>
                        <td style={{ padding: '10px' }}>{product.nutritionalInfo?.fat || '0.3g'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px' }}>🌿 <strong>Dietary Fibre</strong></td>
                        <td style={{ padding: '10px' }}>{product.nutritionalInfo?.fiber || '3.2g'}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    * Approximate values. Actual nutritional content may vary slightly between batches.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Farm Source Content */}
          {activeTab === 'farm' && (
            <div className="tab-content active" id="tab-farm">
              <div style={{ background: 'linear-gradient(135deg,rgba(45,106,79,0.05),rgba(45,106,79,0.02))', padding: '24px', borderRadius: '12px', border: '1px solid rgba(45,106,79,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#fff' }}>🏡</div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: '700' }}>{product.farmSource?.farmName || 'Organic Farm Partner'}</h3>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                      <i className="fas fa-map-marker-alt"></i> {product.farmSource?.location || 'Western Ghats, India'}
                    </p>
                  </div>
                </div>
                <p style={{ lineH: '1.8', color: 'var(--text)', marginBottom: '16px' }}>
                  {product.farmSource?.description || 'Our trusted organic farm partner runs zero-pesticide, biodynamic operations to grow rich, wholesome, and completely organic foods.'}
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--border)' }}><i className="fas fa-certificate" style={{ color: 'var(--primary)' }}></i> NPOP Certified</span>
                  <span style={{ background: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--border)' }}><i className="fas fa-leaf" style={{ color: 'var(--success)' }}></i> 100% Organic</span>
                  <span style={{ background: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--border)' }}><i className="fas fa-check-circle" style={{ color: 'var(--primary)' }}></i> FSSAI Approved</span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery & Returns Content */}
          {activeTab === 'delivery' && (
            <div className="tab-content active" id="tab-delivery">
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ background: 'rgba(46,204,113,0.05)', padding: '20px', borderRadius: '8px', borderLeft: '4px solid var(--success)' }}>
                  <h3 style={{ marginBottom: '8px', color: 'var(--success)', fontWeight: '600' }}><i className="fas fa-truck"></i> Delivery Information</h3>
                  <p style={{ lineH: '1.8', color: 'var(--text)' }}>
                    {product.deliveryInfo || 'Standard delivery within 2-4 business days. Free delivery on orders above ₹499. Same day or express options available in metros.'}
                  </p>
                </div>
                <div style={{ background: 'rgba(52,152,219,0.05)', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3498db' }}>
                  <h3 style={{ marginBottom: '8px', color: '#3498db', fontWeight: '600' }}><i className="fas fa-undo"></i> Return & Refund Policy</h3>
                  <p style={{ lineH: '1.8', color: 'var(--text)' }}>
                    {product.returnPolicy || '7-day easy return policy for fresh products. Full refund or replacement if quality standards are not met.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Certifications & Quality Assurance Tab */}
          {activeTab === 'certifications' && (
            <div className="tab-content active" id="tab-certifications">
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(26,92,56,0.06),rgba(26,92,56,0.02))', padding: '20px', borderRadius: '12px', border: '1px solid rgba(26,92,56,0.12)' }}>
                  <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontWeight: '700' }}>🏅 Quality Certifications</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { icon: '🌿', label: 'FSSAI Certified', sub: 'Lic. 10021032001234' },
                      { icon: '🌱', label: 'Organic India', sub: 'Zero synthetic pesticides' },
                      { icon: '✅', label: 'Non-GMO Verified', sub: 'Genetically unmodified' },
                      { icon: '🏭', label: 'ISO 22000:2018', sub: 'Food safety management' },
                    ].map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '1.6rem' }}>{c.icon}</span>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{c.label}</strong>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: '2px 0 0' }}>{c.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg,rgba(224,90,43,0.06),rgba(224,90,43,0.02))', padding: '20px', borderRadius: '12px', border: '1px solid rgba(224,90,43,0.12)' }}>
                  <h3 style={{ marginBottom: '16px', color: 'var(--accent)', fontWeight: '700' }}>🔒 Trust & Safety</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {['♻️ Eco-Friendly Packaging', '❄️ Cold-Chain Delivery', '↩️ 7-Day Easy Returns', '💳 Secure Razorpay Checkout', '🚫 No Artificial Colours', '🌾 Farm-to-Door'].map((b, i) => (
                      <span key={i} style={{ background: '#fff', padding: '8px 14px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--border)', fontWeight: '500', color: 'var(--text)' }}>{b}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="section">
            <h2 className="section-title" style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px' }}>Related Products</h2>
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {relatedProducts.map(p => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
