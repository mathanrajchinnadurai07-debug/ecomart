import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const router = useRouter();
  const { cart, removeFromCart, updateCartQuantity, addToast } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'CURFEE499') {
      addToast('Coupon applied successfully! 🌿', 'success');
      // Set a 10% coupon discount
      setDiscountAmount(Math.round(subtotal * 0.1));
    } else {
      addToast('Invalid coupon code', 'error');
    }
  };

  const handleProceedToCheckout = () => {
    router.push('/checkout');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const originalSubtotal = cart.reduce((sum, item) => sum + ((item.originalPrice || item.price) * item.quantity), 0);
  const totalItemSavings = originalSubtotal - subtotal;
  
  const delivery = subtotal >= 499 || subtotal === 0 ? 0 : 49;
  const finalTotal = Math.max(0, subtotal + delivery - discountAmount);

  return (
    <>
      <div className="topbar">
        <div className="container">
          <div>
            <i className="fas fa-phone-alt"></i> +91 78457 44038 | <Link href="/support">Help</Link>
          </div>
          <div>
            <Link href="/">Continue Shopping</Link>
          </div>
        </div>
      </div>

      <div className="container section">
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px' }}>
          <i className="fas fa-shopping-cart" style={{ marginRight: '8px' }}></i> Shopping Cart
        </h1>

        {cart.length > 0 ? (
          <div id="cartContent" className="cart-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
            {/* Cart Items List */}
            <div id="cartItems" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item) => {
                const imgSrc = item.imageUrl || item.image || '';
                const pid = item.productId || item.id;
                const savings = (item.originalPrice - item.price) * item.quantity;
                
                return (
                  <div 
                    key={`${pid}-${item.weight}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '16px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: '#fff',
                      position: 'relative'
                    }}
                  >
                    {/* Delete Item Button */}
                    <button 
                      className="btn-icon" 
                      style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }} 
                      onClick={() => removeFromCart(pid, item.weight)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>

                    {/* Image */}
                    <div style={{ width: '70px', height: '70px', minWidth: '70px', background: 'var(--bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', overflow: 'hidden' }}>
                      {imgSrc ? (
                        <img 
                          src={imgSrc} 
                          style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} 
                          alt={item.name}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '🌿';
                          }}
                        />
                      ) : (
                        '🌿'
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '4px', paddingRight: '24px', color: 'var(--text)' }}>
                        {item.name}
                      </div>
                      <div style={{ color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '8px' }}>
                        {item.weight || '250g'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)' }}>
                          ₹{item.price}{' '}
                          {item.originalPrice > item.price && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '400', textDecoration: 'line-through', marginLeft: '6px' }}>
                              ₹{item.originalPrice}
                            </span>
                          )}
                        </div>
                        
                        {/* Quantity Counter Control */}
                        <div className="quantity-control" style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                          <button 
                            onClick={() => updateCartQuantity(pid, item.weight, item.quantity - 1)}
                            style={{ border: 'none', background: 'none', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            −
                          </button>
                          <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '0.85rem' }}>{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQuantity(pid, item.weight, item.quantity + 1)}
                            style={{ border: 'none', background: 'none', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Summary Card */}
            <div className="cart-summary" id="cartSummary" style={{ background: '#fff', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px', fontSize: '1.2rem', fontWeight: '600' }}>Order Summary</h3>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Delivery</span>
                <span>{delivery === 0 ? 'FREE' : `₹${delivery}`}</span>
              </div>
              {discountAmount > 0 && (
                <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Coupon Discount</span>
                  <span style={{ color: 'var(--success)' }}>-₹{discountAmount}</span>
                </div>
              )}
              {totalItemSavings > 0 && (
                <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Item Savings</span>
                  <span style={{ color: 'var(--success)' }}>-₹{totalItemSavings}</span>
                </div>
              )}
              <div className="summary-row summary-total" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: '12px', fontWeight: '700', fontSize: '1.25rem', marginBottom: '20px', color: 'var(--primary)' }}>
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>

              {/* Coupon inputs */}
              <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Coupon code (e.g. CURFEE499)" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                  <button type="submit" className="btn btn-outline btn-sm btn-block" style={{ width: '100%' }}>
                    Apply Coupon
                  </button>
                </form>
              </div>

              {/* Proceed to checkout button */}
              <button 
                onClick={handleProceedToCheckout} 
                className="btn btn-primary btn-lg btn-block" 
                style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                Proceed to Checkout <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        ) : (
          /* Empty Cart State */
          <div id="emptyCart" style={{ display: 'flex', textAlign: 'center', padding: '60px 16px', minHeight: '60vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '160px', height: '160px', background: '#E8F4EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 24px' }}>
              <i className="fas fa-shopping-basket" style={{ fontSize: '4.5rem', color: '#52B788' }}></i>
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '700', color: 'var(--text)' }}>Your cart is empty!</h2>
            <p style={{ color: 'var(--text-light)', maxWidth: '280px', margin: '0 auto 28px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Looks like you haven't added anything yet.<br />Explore fresh organic produce!
            </p>
            <Link href="/categories" className="btn" style={{ padding: '14px 36px', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(231,111,81,0.25)' }}>
              Browse Products
            </Link>
          </div>
        )}
      </div>
      <div style={{ height: '70px' }}></div>
    </>
  );
}
