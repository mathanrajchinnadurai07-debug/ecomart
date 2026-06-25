import React from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ALL_PRODUCTS } from '../data/products';

const LOCAL_T = {
  en: {
    wishlistTitle: "🌿 My Wishlist",
    wishlistSubtitle: "Products you've saved for later",
    emptyWishlist: "Your wishlist is empty",
    emptyWishlistDesc: "Save fresh organic produce, healthy snacks, and pantry essentials as you shop.",
    browseProducts: "Browse Products",
    backToShop: "Back to Shop",
    lowStock: "⚠️ Only {count} left in stock!",
    outOfStock: "🚫 Out of Stock",
    addToCart: "Add to Cart",
    removeFromWishlist: "Remove",
    inStock: "✅ In Stock",
    loginPrompt: "Please login to view and sync your wishlist across devices.",
    loginBtn: "Login / Sign Up"
  },
  ta: {
    wishlistTitle: "🌿 எனது விருப்பப்பட்டியல்",
    wishlistSubtitle: "நீங்கள் சேமித்து வைத்துள்ள தயாரிப்புகள்",
    emptyWishlist: "உங்கள் விருப்பப்பட்டியல் காலியாக உள்ளது",
    emptyWishlistDesc: "நீங்கள் ஷாப்பிங் செய்யும்போது புதிய காய்கறிகள், சிற்றுண்டிகள் மற்றும் மளிகை பொருட்களை சேமிக்கவும்.",
    browseProducts: "தயாரிப்புகளை உலாவுக",
    backToShop: "கடைக்குத் திரும்புக",
    lowStock: "⚠️ இருப்பில் {count} மட்டுமே உள்ளது!",
    outOfStock: "🚫 இருப்பில் இல்லை",
    addToCart: "கூடையில் சேர்க்க",
    removeFromWishlist: "நீக்கு",
    inStock: "✅ இருப்பில் உள்ளது",
    loginPrompt: "உங்கள் சாதனங்களில் விருப்பப்பட்டியலை ஒத்திசைக்க தயவுசெய்து உள்நுழையவும்.",
    loginBtn: "உள்நுழைய / பதிவுசெய்ய"
  }
};

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, addToCart, addToast, user } = useCart();
  const { language } = useLanguage();
  const currentT = LOCAL_T[language] || LOCAL_T.en;

  // Resolve full product data from IDs in wishlist
  const wishlistProducts = wishlist
    .map(id => ALL_PRODUCTS.find(p => p._id === id || p.slug === id))
    .filter(Boolean);

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    addToast(`${product.name} added to cart!`, 'success');
  };

  return (
    <>
      <div 
        className="wishlist-pg"
        style={{
          background: '#fdfdfd',
          minHeight: '100vh',
          paddingBottom: '80px',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {/* Page Header */}
        <div 
          className="wishlist-header"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: '#fff',
            padding: '40px 16px 64px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Watermark leaf */}
          <div style={{
            position: 'absolute',
            left: '-20px',
            bottom: '-25px',
            opacity: 0.1,
            fontSize: '8rem',
            transform: 'rotate(15deg)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}>🌿</div>

          <h1 style={{ fontSize: '1.6rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', marginBottom: '6px' }}>
            {currentT.wishlistTitle}
          </h1>
          <p style={{ fontSize: '0.88rem', opacity: '0.9', fontFamily: 'Inter, sans-serif' }}>
            {currentT.wishlistSubtitle}
          </p>
        </div>

        {/* Content Container */}
        <div 
          className="container"
          style={{
            maxWidth: '640px',
            margin: '-32px auto 0',
            padding: '0 16px',
            position: 'relative',
            zIndex: 2
          }}
        >
          {/* Logged in warning / helper */}
          {!user && (
            <div 
              style={{
                background: '#fff3e0',
                border: '1px solid #ffe0b2',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(255, 152, 0, 0.05)'
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#e65100', fontWeight: '500' }}>
                💡 {currentT.loginPrompt}
              </div>
              <Link 
                href="/login" 
                className="focus-visible-ring"
                style={{
                  background: '#e65100',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  textDecoration: 'none',
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                {currentT.loginBtn}
              </Link>
            </div>
          )}

          {/* Empty State */}
          {wishlistProducts.length === 0 ? (
            <div 
              className="card"
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                padding: '48px 24px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>❤️</div>
              <h2 style={{ fontSize: '1.2rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', color: '#4e3d30', marginBottom: '8px' }}>
                {currentT.emptyWishlist}
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', maxWidth: '340px', margin: '0 auto 24px', lineHeight: '1.5' }}>
                {currentT.emptyWishlistDesc}
              </p>
              <Link 
                href="/products"
                className="focus-visible-ring"
                style={{
                  display: 'inline-block',
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 4px 12px rgba(26, 92, 56, 0.15)'
                }}
              >
                {currentT.browseProducts}
              </Link>
            </div>
          ) : (
            /* Wishlist Products Grid */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {wishlistProducts.map(product => {
                const isOutOfStock = product.stock === 0;
                const isLowStock = product.stock > 0 && product.stock <= 10;
                
                return (
                  <div 
                    key={product._id}
                    className="card focus-visible-ring"
                    style={{
                      background: '#fff',
                      borderRadius: '16px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Product Image Thumbnail */}
                    <div 
                      style={{
                        width: '72px',
                        height: '72px',
                        background: '#f4f6f5',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        '🌿'
                      )}
                    </div>

                    {/* Product details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link 
                        href={`/product/${product.slug || product._id}`}
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <h3 
                          style={{ 
                            fontSize: '0.92rem', 
                            fontFamily: 'Poppins, sans-serif', 
                            fontWeight: '700', 
                            color: '#4e3d30', 
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {product.name}
                        </h3>
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--primary-dark)', fontFamily: 'Poppins, sans-serif' }}>
                          ₹{product.discountPrice || product.price}
                        </span>
                        {product.discountPrice && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                            ₹{product.price}
                          </span>
                        )}
                      </div>
                      
                      {/* Stock indicator badge */}
                      <div style={{ marginTop: '6px' }}>
                        {isOutOfStock ? (
                          <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: '700' }}>
                            {currentT.outOfStock}
                          </span>
                        ) : isLowStock ? (
                          <span style={{ color: '#d8a436', fontSize: '0.7rem', fontWeight: '700' }}>
                            {currentT.lowStock.replace('{count}', product.stock)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '700' }}>
                            {currentT.inStock}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                        className="focus-visible-ring"
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          fontFamily: 'Poppins, sans-serif',
                          opacity: isOutOfStock ? 0.5 : 1,
                          boxShadow: '0 2px 4px rgba(26,92,56,0.1)'
                        }}
                      >
                        {currentT.addToCart}
                      </button>
                      <button
                        onClick={() => {
                          removeFromWishlist(product._id || product.slug);
                          addToast(`${product.name} removed from wishlist`, 'info');
                        }}
                        className="focus-visible-ring"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontFamily: 'Poppins, sans-serif'
                        }}
                      >
                        {currentT.removeFromWishlist}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Back to Shop link */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link 
              href="/products"
              className="focus-visible-ring"
              style={{
                fontSize: '0.88rem',
                color: 'var(--primary-dark)',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-arrow-left" style={{ fontSize: '0.8rem' }}></i> {currentT.backToShop}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
