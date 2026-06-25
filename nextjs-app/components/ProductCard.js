import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const { language, t } = useLanguage();
  
  // Set default weight if available
  const initialWeight = product.weights && product.weights.length > 0 
    ? product.weights[0].label 
    : '250g';
  const [selectedWeight, setSelectedWeight] = useState(initialWeight);

  const pid = product._id || product.id || product.slug;
  const isWishlisted = isInWishlist(pid);

  // Calculate prices based on weight selection
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
  
  const stockLabel = stockVal > 20 
    ? t('in_stock') 
    : stockVal > 0 
      ? t('low_stock', { count: stockVal }) 
      : t('out_of_stock');

  const stockClass = stockVal > 20 ? 'in-stock' : stockVal > 0 ? 'low-stock' : 'out-of-stock';

  const organicCategories = ['vegetables', 'fruits', 'mushroom', 'grocery', 'flour', 'spreads', 'superfoods', 'beverages', 'readytocook'];
  const isOrganic = organicCategories.includes(product.category);

  const formattedDate = new Date(new Date().getTime() - 24*60*60*1000).toLocaleDateString(language === 'en' ? 'en-US' : 'ta-IN', {
    month: 'short',
    day: 'numeric'
  });

  const categoryEmojis = {
    vegetables: '🥬',
    fruits: '🍎',
    biscuits: '🍪',
    snacks: '🥜',
    mushroom: '🍄',
    chicken: '🍗',
    mutton: '🍖',
    grocery: '🏪',
    herbal: '🌿',
    dryfruits: '🥣',
    flour: '🌾',
    beverages: '☕',
    spreads: '🍯',
    pickles: '🥒',
    superfoods: '🧬',
    readytocook: '🍲'
  };
  
  const catEmoji = categoryEmojis[product.category] || '🛒';
  const imgSrc = product.images?.[0] || product.image || '';

  const handleWeightChange = (e, weightLabel) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedWeight(weightLabel);
  };

  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!outOfStock) {
      addToCart(product, selectedWeight);
    }
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(pid);
  };

  return (
    <div className={`product-card ${outOfStock ? 'out-of-stock-card' : ''}`} style={{ border: '1px solid var(--border)', background: '#fff', boxShadow: 'none' }}>
      <div className="product-badges">
        {discount > 0 && <span className="badge badge-sale">{discount}% OFF</span>}
      </div>
      <button 
        className={`wishlist-btn focus-visible-ring ${isWishlisted ? 'active' : ''}`} 
        onClick={handleWishlistClick}
        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      >
        <i className={`${isWishlisted ? 'fas' : 'far'} fa-heart`}></i>
      </button>
      <Link href={`/product/${product.slug}`} className="product-image focus-visible-ring" aria-label={`View details of ${product.name}`}>
        {imgSrc ? (
          <img 
            src={imgSrc} 
            alt={product.name} 
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0' }} 
          />
        ) : (
          <div className="placeholder-icon" style={{ fontSize: '3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px' }}>
            {catEmoji}
          </div>
        )}
      </Link>
      <div className="product-info">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
          <span className="product-category" style={{ margin: 0 }}>{product.category || ''}</span>
          {isOrganic && (
            <span className="badge-cert" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>PGS-India</span>
          )}
        </div>
        <h3 className="product-name" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: '700', marginBottom: '2px' }}>
          <Link href={`/product/${product.slug}`} className="focus-visible-ring">{product.name}</Link>
        </h3>
        
        {/* Seller transparency label */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '6px' }}>
          {t('by')}: <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{product.seller_name || 'Curify Central Store'}</span>
        </div>

        {/* Harvest Stamp Signature Motif */}
        <div className="harvest-stamp" style={{ margin: '6px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <span>🌾 {t('harvest_stamp')}: {formattedDate} ({product.seller_location})</span>
        </div>

        <div className="product-price" style={{ margin: '8px 0 4px 0' }}>
          <span className="price-current" style={{ fontFamily: 'var(--font)', fontWeight: '800' }}>₹{showPrice}</span>
          {discount > 0 && (
            <>
              <span className="price-original" style={{ textDecoration: 'line-through', color: 'var(--text-light)', marginLeft: '6px', fontSize: '0.8rem' }}>₹{showOriginal}</span>
              <span className="price-discount" style={{ color: 'var(--accent)', marginLeft: '6px', fontSize: '0.8rem', fontWeight: '700' }}>{discount}% off</span>
            </>
          )}
        </div>

        {/* Weights selection list if multiple weights are defined */}
        {product.weights && product.weights.length > 1 ? (
          <div className="product-weights-selector" style={{ display: 'flex', gap: '6px', margin: '8px 0', flexWrap: 'wrap', height: '26px' }}>
            {product.weights.map((w) => (
              <span 
                key={w.label}
                className={`weight-option ${selectedWeight === w.label ? 'active' : ''}`}
                onClick={(e) => handleWeightChange(e, w.label)}
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selectedWeight === w.label ? 'var(--primary)' : '#fff',
                  color: selectedWeight === w.label ? '#fff' : 'inherit',
                  fontWeight: selectedWeight === w.label ? '600' : '400'
                }}
              >
                {w.label}
              </span>
            ))}
          </div>
        ) : (
          <div className="product-weights-selector-placeholder" style={{ height: '26px', margin: '8px 0' }}></div>
        )}

        {product.unit && !product.weights && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', height: '26px' }}>{product.unit}</div>
        )}

        <div className={`product-stock ${stockClass}`} style={{ margin: '4px 0 8px 0' }}>
          <i className="fas fa-circle" style={{ fontSize: '0.5rem', marginRight: '4px' }}></i> {stockLabel}
        </div>
        <button 
          className="add-to-cart-btn cta-btn-accent focus-visible-ring" 
          disabled={outOfStock}
          style={outOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          onClick={handleAddClick}
          aria-label={outOfStock ? `${product.name} is Out of stock` : `Add ${product.name} (${selectedWeight}) to cart`}
        >
          <i className={`fas fa-${outOfStock ? 'ban' : 'cart-plus'}`}></i> {outOfStock ? t('out_of_stock') : t('add_to_cart')}
        </button>
      </div>
    </div>
  );
}
