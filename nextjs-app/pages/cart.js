import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const router = useRouter();
  const { cart, removeFromCart, updateCartQuantity, addToast } = useCart();
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
      addToast('🎉 Coupon applied! 10% off', 'success');
    } else {
      addToast('Invalid coupon code', 'error');
    }
  };

  return (
    <>
      <style>{`
        .cart-pg { background: #f4f6f0; min-height: 100vh; padding-bottom: 120px; }

        /* Sticky Header */
        .cart-top-header {
          position: sticky; top: 0; z-index: 200;
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          padding: 14px 16px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 2px 12px rgba(26,92,56,0.3);
        }
        .cart-top-header h1 { color: #fff; font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; font-family: 'Poppins', sans-serif; }
        .cart-back-btn { background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; font-size: 1rem; }
        .cart-count-chip { background: #e05a2b; color: #fff; border-radius: 12px; padding: 2px 10px; font-size: 0.72rem; font-weight: 700; }

        /* Free Delivery Banner */
        .cart-free-banner {
          background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
          padding: 10px 16px; display: flex; align-items: center; gap: 8px;
          font-size: 0.8rem; color: #1a5c38; font-weight: 600;
        }
        .cart-free-progress { flex: 1; height: 4px; background: #a5d6a7; border-radius: 4px; overflow: hidden; }
        .cart-free-progress-fill { height: 100%; background: #1a5c38; border-radius: 4px; transition: width 0.5s ease; }

        /* Cart Item Card */
        .cart-item-card {
          background: #fff; border-radius: 16px; margin: 0 12px 12px;
          padding: 14px; display: flex; gap: 12px; align-items: flex-start;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          position: relative; overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cart-item-card:active { transform: scale(0.98); }
        .cart-item-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #1a5c38, #e05a2b);
        }
        .cart-item-img {
          width: 72px; height: 72px; min-width: 72px; border-radius: 12px;
          background: linear-gradient(135deg, #e8f5e9, #f0faf5);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; overflow: hidden;
        }
        .cart-item-img img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
        .cart-item-info { flex: 1; }
        .cart-item-name { font-size: 0.92rem; font-weight: 700; color: #1a1a2e; line-height: 1.3; margin-bottom: 3px; padding-right: 28px; font-family: 'Poppins', sans-serif; }
        .cart-item-weight { font-size: 0.73rem; color: #888; margin-bottom: 10px; }
        .cart-item-price-row { display: flex; align-items: center; justify-content: space-between; }
        .cart-price-main { font-size: 1.05rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }
        .cart-price-original { font-size: 0.72rem; color: #bbb; text-decoration: line-through; margin-left: 5px; font-weight: 400; }
        .cart-savings-tag { font-size: 0.65rem; color: #fff; background: #e05a2b; padding: 2px 6px; border-radius: 8px; font-weight: 700; margin-left: 4px; }

        /* Qty control */
        .qty-ctrl { display: flex; align-items: center; background: #f4f6f0; border-radius: 10px; overflow: hidden; }
        .qty-btn { background: none; border: none; padding: 6px 12px; font-size: 1.1rem; font-weight: 700; color: #1a5c38; cursor: pointer; transition: background 0.2s; }
        .qty-btn:active { background: #c8e6c9; }
        .qty-num { min-width: 28px; text-align: center; font-size: 0.9rem; font-weight: 700; color: #1a1a2e; }

        /* Delete btn */
        .cart-del-btn { position: absolute; top: 14px; right: 14px; background: #fff0ee; border: none; border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; color: #e05a2b; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
        .cart-del-btn:active { background: #ffe0d6; transform: scale(0.9); }

        /* Summary Card */
        .cart-summary-card {
          margin: 0 12px 16px; background: #fff; border-radius: 20px;
          overflow: hidden; box-shadow: 0 4px 16px rgba(26,92,56,0.1);
        }
        .cart-summary-head {
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          padding: 14px 16px; color: #fff;
          font-size: 1rem; font-weight: 700; font-family: 'Poppins', sans-serif;
          display: flex; align-items: center; gap: 8px;
        }
        .cart-summary-body { padding: 16px; }
        .summary-line { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 0.87rem; color: #555; }
        .summary-line:last-child { border-bottom: none; }
        .summary-line.total-line { font-size: 1.1rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; border-bottom: none; padding-top: 12px; border-top: 2px solid #e8f5e9; }
        .summary-savings-line { font-size: 0.8rem; color: #27ae60; font-weight: 600; }
        .summary-free-tag { color: #27ae60; font-weight: 700; font-size: 0.85rem; }

        /* Coupon */
        .coupon-section { margin: 0 12px 16px; background: #fff; border-radius: 16px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .coupon-head { font-size: 0.85rem; font-weight: 700; color: #1a1a2e; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .coupon-form { display: flex; gap: 8px; }
        .coupon-input { flex: 1; padding: 10px 14px; border: 1.5px solid #e0e0e0; border-radius: 10px; font-size: 0.85rem; outline: none; font-family: 'Inter', sans-serif; }
        .coupon-input:focus { border-color: #1a5c38; }
        .coupon-btn { background: #1a5c38; color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-size: 0.8rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .coupon-applied { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #27ae60; font-weight: 600; margin-top: 6px; }

        /* Checkout CTA (sticky bottom) */
        .cart-checkout-bar {
          position: fixed; bottom: 60px; left: 0; right: 0; z-index: 150;
          padding: 12px 16px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-top: 1px solid #eee;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
        }
        .checkout-cta-btn {
          width: 100%; background: linear-gradient(135deg, #e05a2b, #f77f00);
          color: #fff; border: none; border-radius: 14px;
          padding: 16px; font-size: 1rem; font-weight: 800;
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; font-family: 'Poppins', sans-serif;
          box-shadow: 0 6px 20px rgba(224,90,43,0.35);
          transition: all 0.2s;
        }
        .checkout-cta-btn:active { transform: scale(0.97); }
        .cta-amount { font-size: 1.1rem; }

        /* Section label */
        .cart-section-label { font-size: 0.75rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 16px 16px 8px; }

        /* Trust strip */
        .cart-trust-strip { display: flex; gap: 20px; justify-content: center; padding: 12px 16px; background: #fff; margin: 0 12px 16px; border-radius: 12px; }
        .trust-item { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 0.65rem; color: #555; font-weight: 600; text-align: center; }
        .trust-icon { font-size: 1.3rem; }

        /* Empty cart */
        .empty-cart-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding: 40px 24px; text-align: center; }
        .empty-cart-icon { width: 120px; height: 120px; background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; margin-bottom: 24px; }
        .empty-cart-title { font-size: 1.3rem; font-weight: 800; color: #1a1a2e; margin-bottom: 8px; font-family: 'Poppins', sans-serif; }
        .empty-cart-sub { font-size: 0.9rem; color: #888; line-height: 1.6; margin-bottom: 28px; }
        .empty-shop-btn { background: linear-gradient(135deg, #e05a2b, #f77f00); color: #fff; padding: 14px 36px; border-radius: 14px; font-weight: 700; font-size: 1rem; text-decoration: none; box-shadow: 0 6px 20px rgba(224,90,43,0.3); font-family: 'Poppins', sans-serif; }
      `}</style>

      <div className="cart-pg">
        {/* Header */}
        <div className="cart-top-header">
          <button className="cart-back-btn" onClick={() => router.back()}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1><i className="fas fa-shopping-cart"></i> My Cart</h1>
          <span className="cart-count-chip">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
        </div>

        {cart.length > 0 ? (
          <>
            {/* Free Delivery Progress */}
            {subtotal < 499 && (
              <div className="cart-free-banner">
                <span>🚚</span>
                <span>Add ₹{499 - subtotal} more for <strong>FREE delivery</strong></span>
                <div className="cart-free-progress">
                  <div className="cart-free-progress-fill" style={{ width: `${Math.min(100, (subtotal / 499) * 100)}%` }}></div>
                </div>
              </div>
            )}
            {subtotal >= 499 && (
              <div className="cart-free-banner" style={{ background: 'linear-gradient(135deg,#1a5c38,#2d6a4f)', color: '#fff' }}>
                <span>🎉</span>
                <strong>You've unlocked FREE delivery!</strong>
              </div>
            )}

            {/* Items */}
            <div className="cart-section-label">{cart.length} Item{cart.length !== 1 ? 's' : ''} in your cart</div>
            {cart.map((item) => {
              const imgSrc = item.imageUrl || item.image || '';
              const pid = item.productId || item.id;
              const savingsPerItem = item.originalPrice > item.price ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) : 0;
              return (
                <div key={`${pid}-${item.weight}`} className="cart-item-card">
                  <button className="cart-del-btn" onClick={() => removeFromCart(pid, item.weight)}>
                    <i className="fas fa-trash-alt"></i>
                  </button>
                  <div className="cart-item-img">
                    {imgSrc
                      ? <img src={imgSrc} alt={item.name} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '🌿'; }} />
                      : '🌿'}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-weight">{item.weight || '250g'} · Organic</div>
                    <div className="cart-item-price-row">
                      <div>
                        <span className="cart-price-main">₹{item.price}</span>
                        {item.originalPrice > item.price && (
                          <span className="cart-price-original">₹{item.originalPrice}</span>
                        )}
                        {savingsPerItem > 0 && (
                          <span className="cart-savings-tag">{savingsPerItem}% OFF</span>
                        )}
                      </div>
                      <div className="qty-ctrl">
                        <button className="qty-btn" onClick={() => updateCartQuantity(pid, item.weight, item.quantity - 1)}>−</button>
                        <span className="qty-num">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateCartQuantity(pid, item.weight, item.quantity + 1)}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Coupon */}
            <div className="coupon-section">
              <div className="coupon-head"><i className="fas fa-tag" style={{ color: '#e05a2b' }}></i> Apply Coupon</div>
              {couponApplied ? (
                <div className="coupon-applied"><i className="fas fa-check-circle"></i> CURIFY499 applied — ₹{discountAmount} off!</div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="coupon-form">
                  <input className="coupon-input" type="text" placeholder="Enter coupon code..." value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                  <button className="coupon-btn" type="submit">Apply</button>
                </form>
              )}
            </div>

            {/* Trust Strip */}
            <div className="cart-trust-strip">
              <div className="trust-item"><span className="trust-icon">🔒</span>Secure<br/>Payment</div>
              <div className="trust-item"><span className="trust-icon">🌿</span>100%<br/>Organic</div>
              <div className="trust-item"><span className="trust-icon">🚚</span>Fast<br/>Delivery</div>
              <div className="trust-item"><span className="trust-icon">↩️</span>7-Day<br/>Returns</div>
            </div>

            {/* Order Summary */}
            <div className="cart-summary-card">
              <div className="cart-summary-head"><i className="fas fa-receipt"></i> Order Summary</div>
              <div className="cart-summary-body">
                <div className="summary-line"><span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span><span>₹{subtotal}</span></div>
                <div className="summary-line"><span>Delivery</span><span className={delivery === 0 ? 'summary-free-tag' : ''}>{delivery === 0 ? '✓ FREE' : `₹${delivery}`}</span></div>
                {discountAmount > 0 && <div className="summary-line summary-savings-line"><span>🎉 Coupon Discount</span><span>−₹{discountAmount}</span></div>}
                {totalItemSavings > 0 && <div className="summary-line summary-savings-line"><span>Product Savings</span><span>−₹{totalItemSavings}</span></div>}
                <div className="summary-line total-line"><span>Total</span><span>₹{finalTotal}</span></div>
              </div>
            </div>
            <div style={{ height: '120px' }}></div>

            {/* Sticky Checkout CTA */}
            <div className="cart-checkout-bar">
              <button className="checkout-cta-btn" onClick={() => router.push('/checkout')}>
                <span>Proceed to Checkout</span>
                <span className="cta-amount">₹{finalTotal} <i className="fas fa-arrow-right" style={{ marginLeft: '6px' }}></i></span>
              </button>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="empty-cart-wrap">
            <div className="empty-cart-icon">🛒</div>
            <div className="empty-cart-title">Your cart is empty!</div>
            <p className="empty-cart-sub">Looks like you haven't added anything yet.<br/>Explore 175+ fresh organic products!</p>
            <Link href="/categories" className="empty-shop-btn">Browse Products →</Link>
          </div>
        )}
      </div>
    </>
  );
}
