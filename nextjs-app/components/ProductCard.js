import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  
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
  const stockLabel = stockVal > 20 ? 'In Stock' : stockVal > 0 ? `Only ${stockVal} left` : 'Out of Stock';
  const stockClass = stockVal > 20 ? 'in-stock' : stockVal > 0 ? 'low-stock' : 'out-of-stock';

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
    <div className={`product-card ${outOfStock ? 'out-of-stock-card' : ''}`}>
      <div className="product-badges">
        {discount > 0 && <span className="badge badge-sale">{discount}% OFF</span>}
      </div>
      <button 
        className={`wishlist-btn ${isWishlisted ? 'active' : ''}`} 
        onClick={handleWishlistClick}
      >
        <i className={`${isWishlisted ? 'fas' : 'far'} fa-heart`}></i>
      </button>
      <Link href={`/product/${product.slug}`} className="product-image">
        {imgSrc ? (
          <img 
            src={imgSrc} 
            alt={product.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0' }} 
          />
        ) : (
          <div className="placeholder-icon" style={{ fontSize: '3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px' }}>
            {catEmoji}
          </div>
        )}
      </Link>
      <div className="product-info">
        <div className="product-category">{product.category || ''}</div>
        <h3 className="product-name">
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-price">
          <span className="price-current">₹{showPrice}</span>
          {discount > 0 && (
            <>
              <span className="price-original">₹{showOriginal}</span>
              <span className="price-discount">{discount}% off</span>
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
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{product.unit}</div>
        )}

        <div className={`product-stock ${stockClass}`}>
          <i className="fas fa-circle" style={{ fontSize: '0.5rem', marginRight: '4px' }}></i> {stockLabel}
        </div>
        <button 
          className="add-to-cart-btn" 
          disabled={outOfStock}
          style={outOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          onClick={handleAddClick}
        >
          <i className={`fas fa-${outOfStock ? 'ban' : 'cart-plus'}`}></i> {outOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
