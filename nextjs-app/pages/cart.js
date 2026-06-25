import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function Cart() {
  const router = useRouter();
  const { cart, removeFromCart, updateCartQuantity, addToast } = useCart();
  const { language, t } = useLanguage();
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const originalSubtotal = cart.reduce((sum, item) => sum + ((item.originalPrice || item.price) * item.quantity), 0);
  const totalItemSavings = originalSubtotal - subtotal;
  const delivery = subtotal >= 499 || subtotal === 0 ? 0 : 49;
  const finalTotal = Math.max(0, subtotal + delivery - discountAmount);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'CURIFY499') {
      const disc = Math.round(subtotal * 0.1);
      setDiscountAmount(disc);
      setCouponApplied(true);
      addToast(language === 'en' ? '🎉 Coupon applied! 10% off' : '🎉 குறியீடு பயன்படுத்தப்பட்டது! 10% தள்ளுபடி', 'success');
    } else {
      addToast(language === 'en' ? 'Invalid coupon code' : 'தவறான விளம்பரக் குறியீடு', 'error');
    }
  };

  // Group items by seller
  const groupedCart = cart.reduce((groups, item) => {
    const sId = item.seller_id || 2;
    const sName = item.seller_name || 'Curify Central Store';
    const sLoc = item.seller_location || 'Tamil Nadu';
    if (!groups[sId]) {
      groups[sId] = {
        sellerId: sId,
        sellerName: sName,
        sellerLocation: sLoc,
        items: []
      };
    }
    groups[sId].items.push(item);
    return groups;
  }, {});

  const groupsList = Object.values(groupedCart);

  // Delivery estimate translator helper
  const getDeliveryEstimate = (location) => {
    const locLower = location.toLowerCase();
    if (locLower.includes('perambalur')) {
      return {
        en: 'Estimated delivery: Tomorrow morning (within 18 hours)',
        ta: 'மதிப்பிடப்பட்ட விநியோகம்: நாளை காலை (18 மணிநேரத்திற்குள்)'
      };
    } else if (locLower.includes('trichy')) {
      return {
        en: 'Estimated delivery: Tomorrow afternoon (within 24 hours)',
        ta: 'மதிப்பிடப்பட்ட விநியோகம்: நாளை மதியம் (24 மணிநேரத்திற்குள்)'
      };
    } else if (locLower.includes('pollachi')) {
      return {
        en: 'Estimated delivery: Tomorrow evening (within 30 hours)',
        ta: 'மதிப்பிடப்பட்ட விநியோகம்: நாளை மாலை (30 மணிநேரத்திற்குள்)'
      };
    } else {
      return {
        en: 'Estimated delivery: 2-3 business days',
        ta: 'மதிப்பிடப்பட்ட விநியோகம்: 2-3 வேலை நாட்களில்'
      };
    }
  };

  return (
    <>
      <style>{`
        .cart-pg { background: #faf8f4; min-height: 100vh; padding-bottom: 120px; font-family: 'Inter', sans-serif; }

        /* Sticky Header */
        .cart-top-header {
          position: sticky; top: 0; z-index: 200;
          background: #fff; border-bottom: 1px solid var(--border);
          padding: 14px 16px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
        .cart-top-header h1 { color: var(--text); font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; font-family: 'Poppins', sans-serif; }
        .cart-back-btn { background: #faf8f4; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #333; cursor: pointer; font-size: 1rem; }
        .cart-count-chip { background: var(--accent); color: #fff; border-radius: 12px; padding: 2px 10px; font-size: 0.72rem; font-weight: 700; }

        /* Free Delivery Banner */
        .cart-free-banner {
          background: rgba(26, 92, 56, 0.08);
          padding: 10px 16px; display: flex; align-items: center; gap: 8px;
          font-size: 0.8rem; color: var(--primary); font-weight: 600;
        }
        .cart-free-progress { flex: 1; height: 4px; background: rgba(26, 92, 56, 0.15); border-radius: 4px; overflow: hidden; }
        .cart-free-progress-fill { height: 100%; background: var(--primary); border-radius: 4px; transition: width 0.5s ease; }

        /* Group Block */
        .cart-group-block {
          background: #fff; border-radius: 16px; margin: 14px 12px;
          border: 1px solid var(--border); overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .cart-group-header {
          background: var(--bg); padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }
        .cart-group-farmer { font-size: 0.85rem; font-weight: 700; color: var(--primary); font-family: 'Poppins', sans-serif; }
        .cart-group-delivery { font-size: 0.72rem; color: var(--text-light); margin-top: 2px; font-weight: 500; }

        /* Cart Item Card */
        .cart-item-card {
          padding: 14px; display: flex; gap: 12px; align-items: flex-start;
          border-bottom: 1px solid #f8f8f8; position: relative;
        }
        .cart-item-card:last-child { border-bottom: none; }
        .cart-item-img {
          width: 72px; height: 72px; min-width: 72px; border-radius: 8px;
          background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; overflow: hidden;
        }
        .cart-item-img img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
        .cart-item-info { flex: 1; }
        .cart-item-name { font-size: 0.9rem; font-weight: 700; color: var(--text); line-height: 1.3; margin-bottom: 3px; padding-right: 28px; font-family: 'Poppins', sans-serif; }
        .cart-item-weight { font-size: 0.73rem; color: var(--text-light); margin-bottom: 10px; }
        .cart-item-price-row { display: flex; align-items: center; justify-content: space-between; }
        .cart-price-main { font-size: 1.05rem; font-weight: 800; color: var(--primary); font-family: 'Poppins', sans-serif; }
        .cart-price-original { font-size: 0.72rem; color: var(--text-light); text-decoration: line-through; margin-left: 5px; font-weight: 400; }
        .cart-savings-tag { font-size: 0.65rem; color: #fff; background: var(--accent); padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 4px; }

        /* Qty control */
        .qty-ctrl { display: flex; align-items: center; background: var(--bg); border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
        .qty-btn { background: none; border: none; padding: 6px 12px; font-size: 1rem; font-weight: 700; color: var(--primary); cursor: pointer; transition: background 0.2s; }
        .qty-btn:active { background: rgba(26, 92, 56, 0.08); }
        .qty-num { min-width: 24px; text-align: center; font-size: 0.85rem; font-weight: 700; color: var(--text); }

        /* Delete btn */
        .cart-del-btn { position: absolute; top: 14px; right: 14px; background: #fff0ee; border: none; border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; color: var(--accent); cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
        .cart-del-btn:active { background: #ffe0d6; transform: scale(0.9); }

        /* Summary Card */
        .cart-summary-card {
          margin: 0 12px 16px; background: #fff; border-radius: 16px;
          overflow: hidden; border: 1px solid var(--border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .cart-summary-head {
          background: var(--bg); border-bottom: 1px solid var(--border);
          padding: 14px 16px; color: var(--text);
          font-size: 0.95rem; font-weight: 700; font-family: 'Poppins', sans-serif;
          display: flex; align-items: center; gap: 8px;
        }
        .cart-summary-body { padding: 16px; }
        .summary-line { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #f0f0f0; font-size: 0.88rem; color: var(--text); }
        .summary-line:last-child { border-bottom: none; }
        .summary-line.total-line { font-size: 1.1rem; font-weight: 800; color: var(--primary); font-family: 'Poppins', sans-serif; border-bottom: none; padding-top: 12px; border-top: 1.5px solid var(--border); }
        .summary-savings-line { font-size: 0.82rem; color: #27ae60; font-weight: 600; }
        .summary-free-tag { color: #27ae60; font-weight: 700; font-size: 0.85rem; }

        /* Coupon */
        .coupon-section { margin: 0 12px 16px; background: #fff; border-radius: 16px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); border: 1px solid var(--border); }
        .coupon-head { font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .coupon-form { display: flex; gap: 8px; }
        .coupon-input { flex: 1; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 0.85rem; outline: none; font-family: 'Inter', sans-serif; }
        .coupon-input:focus { border-color: var(--primary); }
        .coupon-btn { background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 0.82rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .coupon-applied { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #27ae60; font-weight: 600; margin-top: 6px; }

        /* Checkout CTA (sticky bottom) */
        .cart-checkout-bar {
          position: fixed; bottom: 60px; left: 0; right: 0; z-index: 150;
          padding: 12px 16px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-top: 1px solid var(--border);
          box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
        }
        .checkout-cta-btn {
          width: 100%; background: var(--accent);
          color: #fff; border: none; border-radius: 10px;
          padding: 16px; font-size: 0.95rem; font-weight: 700;
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; font-family: 'Poppins', sans-serif;
          transition: all 0.2s;
        }
        .checkout-cta-btn:active { transform: scale(0.97); }
        .cta-amount { font-size: 1.05rem; font-weight: 800; }

        /* Section label */
        .cart-section-label { font-size: 0.75rem; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; padding: 16px 16px 4px; }

        /* Trust strip */
        .cart-trust-strip { display: flex; gap: 20px; justify-content: center; padding: 12px 16px; background: #fff; margin: 0 12px 16px; border-radius: 12px; border: 1px solid var(--border); }
        .trust-item { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--text-light); font-weight: 600; text-align: center; }
        .trust-icon { font-size: 1.3rem; }

        /* Empty cart */
        .empty-cart-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding: 40px 24px; text-align: center; }
        .empty-cart-icon { width: 120px; height: 120px; background: rgba(26, 92, 56, 0.08); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; margin-bottom: 24px; }
        .empty-cart-title { font-size: 1.25rem; font-weight: 800; color: var(--text); margin-bottom: 8px; font-family: 'Poppins', sans-serif; }
        .empty-cart-sub { font-size: 0.88rem; color: var(--text-light); line-height: 1.6; margin-bottom: 28px; }
        .empty-shop-btn { background: var(--accent); color: #fff; padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; text-decoration: none; font-family: 'Poppins', sans-serif; }
      `}</style>

      <div className="cart-pg">
        {/* Header */}
        <div className="cart-top-header">
          <button className="cart-back-btn focus-visible-ring" onClick={() => router.back()} aria-label="Go back">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1><i className="fas fa-shopping-cart"></i> {language === 'en' ? 'My Cart' : 'எனது கூடை'}</h1>
          <span className="cart-count-chip">{cart.length}</span>
        </div>

        {cart.length > 0 ? (
          <>
            {/* Free Delivery Progress */}
            {subtotal < 499 && (
              <div className="cart-free-banner">
                <span>🚚</span>
                <span>
                  {language === 'en' 
                    ? `Add ₹${499 - subtotal} more for ` 
                    : `இன்னும் ₹${499 - subtotal} மதிப்புள்ள பொருட்களைச் சேர்த்தால் `}
                  <strong>{language === 'en' ? 'FREE delivery' : 'இலவச விநியோகம்'}</strong>
                </span>
                <div className="cart-free-progress">
                  <div className="cart-free-progress-fill" style={{ width: `${Math.min(100, (subtotal / 499) * 100)}%` }}></div>
                </div>
              </div>
            )}
            {subtotal >= 499 && (
              <div className="cart-free-banner" style={{ background: 'rgba(26, 92, 56, 0.08)', color: 'var(--primary)' }}>
                <span>🎉</span>
                <strong>{language === 'en' ? "You've unlocked FREE delivery!" : 'இலவச டெலிவரி சலுகையைப் பெற்றுவிட்டீர்கள்!'}</strong>
              </div>
            )}

            {/* Grouped Cart Items by Farmer */}
            <div className="cart-section-label">{t('cart_grouped_by')}</div>
            {groupsList.map((group) => {
              const deliveryEstimate = getDeliveryEstimate(group.sellerLocation);
              
              return (
                <div key={group.sellerId} className="cart-group-block">
                  <div className="cart-group-header">
                    <div className="cart-group-farmer">
                      🌾 {group.sellerName} ({language === 'en' ? group.sellerLocation : 'தமிழ்நாடு'})
                    </div>
                    <div className="cart-group-delivery">
                      🚚 {language === 'en' ? deliveryEstimate.en : deliveryEstimate.ta}
                    </div>
                  </div>

                  <div className="cart-group-items">
                    {group.items.map((item) => {
                      const imgSrc = item.imageUrl || item.image || '';
                      const pid = item.productId || item.id;
                      const original = item.originalPrice || item.price;
                      const savingsPerItem = original > item.price ? Math.round(((original - item.price) / original) * 100) : 0;
                      
                      return (
                        <div key={`${pid}-${item.weight}`} className="cart-item-card">
                          <button className="cart-del-btn focus-visible-ring" onClick={() => removeFromCart(pid, item.weight)} aria-label={`Remove ${item.name} from cart`}>
                            <i className="fas fa-trash-alt"></i>
                          </button>
                          <div className="cart-item-img">
                            {imgSrc ? (
                              <img src={imgSrc} alt={item.name} />
                            ) : (
                              <span>🌿</span>
                            )}
                          </div>
                          <div className="cart-item-info">
                            <div className="cart-item-name">{item.name}</div>
                            <div className="cart-item-weight">{item.weight || '250g'} · PGS-India Organic</div>
                            <div className="cart-item-price-row">
                              <div>
                                <span className="cart-price-main">₹{item.price}</span>
                                {original > item.price && (
                                  <span className="cart-price-original">₹{original}</span>
                                )}
                                {savingsPerItem > 0 && (
                                  <span className="cart-savings-tag">{savingsPerItem}% OFF</span>
                                )}
                              </div>
                              <div className="qty-ctrl">
                                <button className="qty-btn focus-visible-ring" onClick={() => updateCartQuantity(pid, item.weight, item.quantity - 1)}>−</button>
                                <span className="qty-num">{item.quantity}</span>
                                <button className="qty-btn focus-visible-ring" onClick={() => updateCartQuantity(pid, item.weight, item.quantity + 1)}>+</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Coupon Section */}
            <div className="coupon-section">
              <div className="coupon-head">
                <i className="fas fa-tag" style={{ color: 'var(--accent)' }}></i> 
                {language === 'en' ? 'Apply Coupon' : 'விளம்பரக் குறியீடு'}
              </div>
              {couponApplied ? (
                <div className="coupon-applied">
                  <i className="fas fa-check-circle"></i> CURIFY499 {language === 'en' ? 'applied — 10% discount!' : 'பயன்படுத்தப்பட்டது — 10% தள்ளுபடி!'}
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="coupon-form">
                  <input 
                    className="coupon-input" 
                    type="text" 
                    placeholder={language === 'en' ? "Enter coupon code (e.g. CURIFY499)" : "விளம்பரக் குறியீட்டை உள்ளிடவும்"} 
                    value={couponCode} 
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())} 
                  />
                  <button className="coupon-btn focus-visible-ring" type="submit">
                    {language === 'en' ? 'Apply' : 'பயன்படுத்து'}
                  </button>
                </form>
              )}
            </div>

            {/* Trust Strip */}
            <div className="cart-trust-strip">
              <div className="trust-item"><span className="trust-icon">🔒</span>{language === 'en' ? 'Secure Payment' : 'பாதுகாப்பான கட்டணம்'}</div>
              <div className="trust-item"><span className="trust-icon">🌿</span>{language === 'en' ? 'PGS-India Organic' : 'இயற்கை சான்றிதழ்'}</div>
              <div className="trust-item"><span className="trust-icon">🚚</span>{language === 'en' ? 'Direct Farm Transit' : 'பண்ணை நேரடி விநியோகம்'}</div>
              <div className="trust-item"><span className="trust-icon">↩️</span>{language === 'en' ? '24h Food Safety Window' : '24ம பாதுகாப்பு காலம்'}</div>
            </div>

            {/* Order Summary */}
            <div className="cart-summary-card">
              <div className="cart-summary-head"><i className="fas fa-receipt"></i> {language === 'en' ? 'Order Summary' : 'ஆர்டர் விவரம்'}</div>
              <div className="cart-summary-body">
                <div className="summary-line">
                  <span>{language === 'en' ? `Subtotal (${cart.reduce((s, i) => s + i.quantity, 0)} items)` : `துணைத் தொகை (${cart.reduce((s, i) => s + i.quantity, 0)} பொருட்கள்)`}</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="summary-line">
                  <span>{t('delivery_estimate')}</span>
                  <span className={delivery === 0 ? 'summary-free-tag' : ''}>
                    {delivery === 0 ? '✓ FREE' : `₹${delivery}`}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="summary-line summary-savings-line">
                    <span>🎉 {language === 'en' ? 'Coupon Discount' : 'தள்ளுபடி'}</span>
                    <span>−₹{discountAmount}</span>
                  </div>
                )}
                {totalItemSavings > 0 && (
                  <div className="summary-line summary-savings-line">
                    <span>{language === 'en' ? 'Total Savings' : 'சேமிப்பு'}</span>
                    <span>−₹{totalItemSavings}</span>
                  </div>
                )}
                <div className="summary-line total-line">
                  <span>{language === 'en' ? 'Total' : 'மொத்தத் தொகை'}</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>
            </div>
            
            <div style={{ height: '120px' }}></div>

            {/* Sticky Checkout CTA */}
            <div className="cart-checkout-bar">
              <button className="checkout-cta-btn cta-btn-accent focus-visible-ring" onClick={() => router.push('/checkout')}>
                <span>{language === 'en' ? 'Proceed to Checkout' : 'செக்அவுட் செய்ய தொடரவும்'}</span>
                <span className="cta-amount">₹{finalTotal} <i className="fas fa-arrow-right" style={{ marginLeft: '6px' }}></i></span>
              </button>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="empty-cart-wrap">
            <div className="empty-cart-icon">🛒</div>
            <div className="empty-cart-title">{language === 'en' ? 'Your cart is empty!' : 'உங்கள் கூடை காலியாக உள்ளது!'}</div>
            <p className="empty-cart-sub">
              {language === 'en' 
                ? "Looks like you haven't added anything yet. Explore traditional ragi cookies, wood-pressed coconut oils, and country spinach!" 
                : "கூடையில் இன்னும் பொருட்கள் சேர்க்கப்படவில்லை. பாரம்பரிய கேழ்வரகு பிஸ்கட்டுகள் மற்றும் நாட்டுக்கீரைகளை பாருங்கள்!"}
            </p>
            <Link href="/products" className="empty-shop-btn cta-btn-accent focus-visible-ring">
              {language === 'en' ? 'Browse Products' : 'தயாரிப்புகளைக் காண்க'} →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
