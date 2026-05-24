import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { db } from '../firebase/config';
import { doc, setDoc, writeBatch, collection, getDocs, serverTimestamp } from 'firebase/firestore';

export default function Checkout() {
  const router = useRouter();
  const { user, userProfile, cart, removeFromCart, updateCartQuantity, clearCart, addToast } = useCart();

  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  
  // Shipping form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    deliveryNote: ''
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // Success order info
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Load user data initially if logged in
  useEffect(() => {
    if (userProfile) {
      const parts = (userProfile.name || '').split(' ');
      setFormData((prev) => ({
        ...prev,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        address1: userProfile.address?.line1 || '',
        address2: userProfile.address?.line2 || '',
        city: userProfile.address?.city || '',
        state: userProfile.address?.state || 'Tamil Nadu',
        pincode: userProfile.address?.pincode || ''
      }));
    }
  }, [userProfile]);

  // If cart is empty, redirect to cart page unless we are on the confirmation step
  useEffect(() => {
    if (cart.length === 0 && currentStep !== 4) {
      router.push('/cart');
    }
  }, [cart, currentStep]);

  // Totals calculations
  const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
  const deliveryFee = subtotal >= 499 ? 0 : 49;
  const codFee = paymentMethod === 'cod' ? 25 : 0;
  const discount = Math.round((subtotal * discountPercent) / 100);
  const grandTotal = subtotal + deliveryFee - discount + codFee;

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    const coupons = { CURFEE10: 10, ORGANIC20: 20, FIRST50: 50 };
    if (coupons[code]) {
      setDiscountPercent(coupons[code]);
      addToast(`${coupons[code]}% off applied successfully! 🎉`, 'success');
    } else {
      addToast('Invalid coupon code', 'error');
    }
  };

  const validateStep2 = () => {
    const required = ['firstName', 'phone', 'email', 'address1', 'city', 'pincode'];
    for (const f of required) {
      if (!formData[f].trim()) {
        addToast('Please fill all required fields', 'error');
        return false;
      }
    }
    if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      addToast('Enter valid 10-digit mobile number', 'error');
      return false;
    }
    if (!/^\d{6}$/.test(formData.pincode)) {
      addToast('Enter valid 6-digit PIN code', 'error');
      return false;
    }
    return true;
  };

  const handleGoStep = (step) => {
    if (step === 2 && currentStep === 1) {
      setCurrentStep(2);
    } else if (step === 3 && currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      addToast('Please login to place your order', 'warning');
      router.push(`/login?redirect=/checkout`);
      return;
    }

    const orderId = 'CF' + new Date().getFullYear() + Date.now().toString().slice(-6);

    const orderPayload = {
      orderId,
      items: cart.map(i => ({
        id: i.productId || i.id,
        productId: i.productId || i.id,
        name: i.name,
        price: i.price,
        originalPrice: i.originalPrice || i.price,
        imageUrl: i.image || '',
        unit: i.weight || '',
        quantity: i.quantity
      })),
      address: {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        email: formData.email,
        line1: formData.address1,
        line2: formData.address2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        note: formData.deliveryNote
      },
      subtotal,
      deliveryFee,
      discount,
      codFee,
      total: grandTotal,
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'paid',
        transactionId: ''
      },
      status: 'placed',
      statusHistory: [
        { status: 'placed', timestamp: new Date().toISOString() }
      ],
      createdAt: new Date().toISOString()
    };

    // Razorpay / UPI payment flow
    if (paymentMethod === 'razorpay' || paymentMethod === 'gpay') {
      setIsLoadingPayment(true);
      try {
        // Load Razorpay script
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          addToast('Payment gateway failed to load. Try COD.', 'error');
          setIsLoadingPayment(false);
          return;
        }

        // Create order via our API
        const response = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: grandTotal, currency: 'INR', receipt: orderId })
        });

        const razorpayOrder = await response.json();

        if (!response.ok) {
          throw new Error(razorpayOrder.error || 'Failed to create payment order');
        }

        // Dev mode (no Razorpay keys configured) - simulate payment
        if (razorpayOrder._dev_mode) {
          addToast('Payment simulated (dev mode) ✅', 'success');
          orderPayload.payment.transactionId = 'pay_dev_' + Date.now().toString().slice(-8);
          orderPayload.payment.status = 'paid';
          setIsLoadingPayment(false);
          await saveOrderToFirestore(orderPayload);
          return;
        }

        // Open Razorpay checkout modal
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'Curfee Organic Market',
          description: `Order ${orderId}`,
          order_id: razorpayOrder.id,
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            contact: formData.phone
          },
          theme: { color: '#1B4332' },
          handler: async function (paymentResponse) {
            // Verify payment on server
            try {
              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentResponse)
              });
              const verifyData = await verifyRes.json();

              if (verifyData.verified) {
                orderPayload.payment.transactionId = paymentResponse.razorpay_payment_id;
                orderPayload.payment.status = 'paid';
                await saveOrderToFirestore(orderPayload);
                addToast('Payment successful! 🎉', 'success');
              } else {
                addToast('Payment verification failed. Contact support.', 'error');
              }
            } catch (err) {
              console.error('Verify error:', err);
              addToast('Payment verification error. Contact support.', 'error');
            }
            setIsLoadingPayment(false);
          },
          modal: {
            ondismiss: function () {
              setIsLoadingPayment(false);
              addToast('Payment cancelled', 'info');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setIsLoadingPayment(false);
          addToast('Payment failed: ' + (response.error?.description || 'Unknown error'), 'error');
        });
        rzp.open();
      } catch (err) {
        console.error('Payment error:', err);
        setIsLoadingPayment(false);
        addToast('Payment failed. Please try again or use COD.', 'error');
      }
    } else {
      // Cash on Delivery
      await saveOrderToFirestore(orderPayload);
    }
  };

  const [isLoadingPayment, setIsLoadingPayment] = useState(false);

  const saveOrderToFirestore = async (orderPayload) => {
    try {
      const orderRef = doc(db, 'users', user.uid, 'orders', orderPayload.orderId);
      const globalOrderRef = doc(db, 'orders', orderPayload.orderId);
      
      await setDoc(orderRef, {
        ...orderPayload,
        createdAt: serverTimestamp()
      });
      await setDoc(globalOrderRef, {
        ...orderPayload,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // Clear firestore cart
      const batch = writeBatch(db);
      const cartCollectionRef = collection(db, 'users', user.uid, 'cart');
      const cartSnap = await getDocs(cartCollectionRef);
      cartSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // Clear local state cart
      clearCart();
      
      setConfirmedOrder(orderPayload);
      setCurrentStep(4);
      addToast('Order placed successfully! 🌿', 'success');
    } catch (e) {
      console.error(e);
      addToast('Failed to save order. Try again.', 'error');
    }
  };

  return (
    <>
      <div className="topbar">
        <Link href="/cart">
          <i className="fas fa-arrow-left" style={{ color: '#fff', fontSize: '1.2rem', marginRight: '10px' }}></i>
        </Link>
        <h1 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>🌿 Checkout</h1>
      </div>

      {/* Progress Bar Wizard */}
      <div className="progress" style={{ display: 'flex', alignItems: 'center', maxWidth: '600px', margin: '24px auto', padding: '0 16px' }}>
        <div className={`prog-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'done' : ''}`} onClick={() => handleGoStep(1)} style={{ cursor: 'pointer' }}>
          <div className="prog-num">1</div>
          <div className="prog-label">Cart</div>
        </div>
        <div className={`prog-line ${currentStep > 1 ? 'done' : ''}`}></div>
        <div className={`prog-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'done' : ''}`} onClick={() => handleGoStep(2)} style={{ cursor: 'pointer' }}>
          <div className="prog-num">2</div>
          <div className="prog-label">Details</div>
        </div>
        <div className={`prog-line ${currentStep > 2 ? 'done' : ''}`}></div>
        <div className={`prog-step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'done' : ''}`} onClick={() => handleGoStep(3)} style={{ cursor: 'pointer' }}>
          <div className="prog-num">3</div>
          <div className="prog-label">Payment</div>
        </div>
        <div className={`prog-line ${currentStep > 3 ? 'done' : ''}`}></div>
        <div className={`prog-step ${currentStep === 4 ? 'activedone done' : ''}`}>
          <div className="prog-num">4</div>
          <div className="prog-label">Confirm</div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="co-wrap" style={{ display: 'flex', gap: '24px', maxWidth: '960px', margin: '0 auto', padding: '0 16px 80px' }}>
        <div className="co-main" style={{ flex: 1 }}>
          
          {/* STEP 1: Cart Items Summary */}
          {currentStep === 1 && (
            <div className="co-step active">
              <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div className="card-title" style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
                  <i className="fas fa-shopping-cart"></i> Your Cart
                </div>
                {cart.map((item, idx) => {
                  const pid = item.productId || item.id;
                  return (
                    <div key={`${pid}-${item.weight}`} className="co-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f1f5f2' }}>
                      <div className="co-item-img" style={{ width: '56px', height: '56px', background: '#f0f7f2', borderRadius: '10px', display: 'flex', alignItems: 'center', justify: 'center', overflow: 'hidden' }}>
                        {item.image ? <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} /> : '🌿'}
                      </div>
                      <div className="co-item-info" style={{ flex: 1 }}>
                        <div className="co-item-name" style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</div>
                        <div className="co-item-unit" style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.weight || '250g'}</div>
                        <div className="co-item-qty" style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                          <button 
                            onClick={() => updateCartQuantity(pid, item.weight, item.quantity - 1)}
                            style={{ width: '28px', height: '28px', border: '1px solid var(--border)', background: '#fff', borderRadius: '4px', cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold' }}
                          >
                            −
                          </button>
                          <span style={{ width: '32px', textAlign: 'center', fontWeight: '600' }}>{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQuantity(pid, item.weight, item.quantity + 1)}
                            style={{ width: '28px', height: '28px', border: '1px solid var(--border)', background: '#fff', borderRadius: '4px', cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="co-item-right" style={{ textAlign: 'right' }}>
                        <div className="co-item-price" style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{item.price * item.quantity}</div>
                        <button 
                          className="co-item-remove" 
                          onClick={() => removeFromCart(pid, item.weight)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', marginTop: '6px' }}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: '16px', borderTop: '1.5px solid var(--border)', paddingTop: '14px' }}>
                  <div className="sum-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '0.87rem' }}>
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="sum-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '0.87rem' }}>
                    <span>Delivery</span>
                    <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="sum-row total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.05rem', color: 'var(--primary)', borderTop: '1.5px solid var(--border)', paddingTop: '12px', marginTop: '6px' }}>
                    <span>Total</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>
              </div>
              <div className="co-btns" style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button className="btn-next" onClick={() => handleGoStep(2)} style={{ flex: 1, padding: '14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Proceed to Details <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Delivery Address Form */}
          {currentStep === 2 && (
            <div className="co-step active">
              <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div className="card-title" style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
                  <i className="fas fa-map-marker-alt"></i> Delivery Address
                </div>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="fg" style={{ display: 'flex', flexDir: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>First Name *</label>
                    <input type="text" id="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Raj" />
                  </div>
                  <div className="fg" style={{ display: 'flex', flexDir: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>Last Name</label>
                    <input type="text" id="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Kumar" />
                  </div>
                  <div className="fg" style={{ display: 'flex', flexDir: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>Phone *</label>
                    <input type="tel" id="phone" value={formData.phone} onChange={handleInputChange} placeholder="+91 98765 43210" />
                  </div>
                  <div className="fg" style={{ display: 'flex', flexDir: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>Email *</label>
                    <input type="email" id="email" value={formData.email} onChange={handleInputChange} placeholder="raj@email.com" />
                  </div>
                  <div className="fg full" style={{ display: 'flex', flexDir: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>Address Line 1 *</label>
                    <input type="text" id="address1" value={formData.address1} onChange={handleInputChange} placeholder="House/Flat No, Street" />
                  </div>
                  <div className="fg full" style={{ display: 'flex', flexDir: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>Address Line 2</label>
                    <input type="text" id="address2" value={formData.address2} onChange={handleInputChange} placeholder="Landmark, Area" />
                  </div>
                  <div className="fg" style={{ display: 'flex', flexDir: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>City *</label>
                    <input type="text" id="city" value={formData.city} onChange={handleInputChange} placeholder="Chennai" />
                  </div>
                  <div className="fg" style={{ display: 'flex', flexDir: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>State *</label>
                    <select id="state" value={formData.state} onChange={handleInputChange}>
                      <option>Tamil Nadu</option>
                      <option>Kerala</option>
                      <option>Karnataka</option>
                      <option>Andhra Pradesh</option>
                      <option>Telangana</option>
                      <option>Maharashtra</option>
                      <option>Delhi</option>
                      <option>Gujarat</option>
                      <option>Rajasthan</option>
                      <option>West Bengal</option>
                      <option>Uttar Pradesh</option>
                    </select>
                  </div>
                  <div className="fg" style={{ display: 'flex', flexDir: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>PIN Code *</label>
                    <input type="text" id="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="600001" maxLength="6" />
                  </div>
                  <div className="fg" style={{ display: 'flex', flexDir: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-light)' }}>Delivery Instructions</label>
                    <input type="text" id="deliveryNote" value={formData.deliveryNote} onChange={handleInputChange} placeholder="Leave at door..." />
                  </div>
                </div>
              </div>
              <div className="co-btns" style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-back" onClick={() => handleGoStep(1)}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <button className="btn-next" onClick={() => handleGoStep(3)}>
                  Proceed to Payment <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment details option */}
          {currentStep === 3 && (
            <div className="co-step active">
              <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div className="card-title" style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
                  <i className="fas fa-credit-card"></i> Payment Method
                </div>
                
                <div className="pay-opts" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  <div className={`pay-opt ${paymentMethod === 'razorpay' ? 'selected' : ''}`} onClick={() => setPaymentMethod('razorpay')}>
                    <div className="po-check"><i className="fas fa-check"></i></div>
                    <div className="po-icon" style={{ fontSize: '1.8rem' }}>💳</div>
                    <div className="po-name" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Credit/Debit Card</div>
                  </div>
                  <div className={`pay-opt ${paymentMethod === 'gpay' ? 'selected' : ''}`} onClick={() => setPaymentMethod('gpay')}>
                    <div className="po-check"><i className="fas fa-check"></i></div>
                    <div className="po-icon" style={{ fontSize: '1.8rem' }}>📱</div>
                    <div className="po-name" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Google Pay / UPI</div>
                  </div>
                  <div className={`pay-opt ${paymentMethod === 'cod' ? 'selected' : ''}`} onClick={() => setPaymentMethod('cod')}>
                    <div className="po-check"><i className="fas fa-check"></i></div>
                    <div className="po-icon" style={{ fontSize: '1.8rem' }}>💵</div>
                    <div className="po-name" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cash on Delivery</div>
                  </div>
                </div>

                {paymentMethod === 'cod' && (
                  <div className="cod-note" style={{ display: 'flex', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#92400e', gap: '8px', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <i className="fas fa-info-circle" style={{ marginTop: '2px' }}></i>
                    <span>COD available. Extra ₹25 handling fee. Keep exact change ready.</span>
                  </div>
                )}

                {isLoadingPayment ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
                    <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>Processing secure simulated gateway...</p>
                  </div>
                ) : (
                  <div className="secure" style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <i className="fas fa-shield-alt"></i> 100% Secure Payment Simulator · RBI Approved · PCI DSS
                  </div>
                )}
              </div>

              <div className="co-btns" style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-back" onClick={() => handleGoStep(2)} disabled={isLoadingPayment}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <button className="btn-next" onClick={handlePlaceOrder} disabled={isLoadingPayment} style={{ flex: 1, padding: '14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <i className="fas fa-lock"></i> Pay Securely <span id="payBtnAmt">₹{grandTotal}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success confirmation screen */}
          {currentStep === 4 && confirmedOrder && (
            <div className="co-step active">
              <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '30px', marginBottom: '20px', textAlign: 'center' }}>
                <div className="confirm-check" style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px' }}>
                  <i className="fas fa-check"></i>
                </div>
                <h2 className="confirm-title" style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '8px', fontWeight: '700' }}>Order Confirmed!</h2>
                <p className="confirm-id" style={{ color: 'var(--text-light)', marginBottom: '20px' }}>Order ID: <strong>#{confirmedOrder.orderId}</strong></p>
                
                <div className="confirm-details" style={{ background: '#f8faf9', borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                  <div className="cd-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.87rem', borderBottom: '1px solid #eef2ef' }}>
                    <span>📦 Items</span>
                    <span>{confirmedOrder.items.length} products</span>
                  </div>
                  <div className="cd-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.87rem', borderBottom: '1px solid #eef2ef' }}>
                    <span>📍 Delivery</span>
                    <span>{confirmedOrder.address.city}, {confirmedOrder.address.pincode}</span>
                  </div>
                  <div className="cd-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.87rem', borderBottom: '1px solid #eef2ef' }}>
                    <span>💳 Payment</span>
                    <span>{confirmedOrder.payment.method.toUpperCase()} {confirmedOrder.payment.status === 'paid' ? '✅' : '⏳'}</span>
                  </div>
                  <div className="cd-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.87rem', borderBottom: '1px solid #eef2ef' }}>
                    <span>🚚 Est. Delivery</span>
                    <span>Within 2-3 business days</span>
                  </div>
                  <div className="cd-row total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem', borderTop: '1.5px solid var(--border)', marginTop: '4px', paddingTop: '12px' }}>
                    <span>Total</span>
                    <span>₹{confirmedOrder.total}</span>
                  </div>
                </div>

                <div className="confirm-btns" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/products" className="cbtn cbtn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', border: '1.5px solid var(--primary)', borderRadius: '10px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                    <i className="fas fa-shopping-bag"></i> Continue Shopping
                  </Link>
                  <Link href={`/order-tracking?orderId=${confirmedOrder.orderId}`} className="cbtn cbtn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 600 }}>
                    <i className="fas fa-truck"></i> Track Order
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sticky Order Summary Sidebar */}
        {currentStep > 1 && currentStep < 4 && (
          <aside className="co-side" id="orderSidebar" style={{ width: '340px' }}>
            <div className="card" style={{ position: 'sticky', top: '16px', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div className="card-title" style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
                <i className="fas fa-shopping-bag"></i> Order Summary
              </div>
              <div id="sidebarItems">
                {cart.map(i => (
                  <div key={`${i.productId}-${i.weight}`} className="sb-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <span>{i.name} ×{i.quantity}</span>
                    <span>₹{i.price * i.quantity}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '14px', borderTop: '1.5px solid var(--border)', paddingTop: '12px' }}>
                <div className="sum-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.87rem' }}>
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="sum-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.87rem' }}>
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                </div>
                {discount > 0 && (
                  <div className="sum-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.87rem' }}>
                    <span style={{ color: '#10b981' }}>Discount</span>
                    <span style={{ color: '#10b981' }}>-₹{discount}</span>
                  </div>
                )}
                {codFee > 0 && (
                  <div className="sum-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.87rem' }}>
                    <span>COD Fee</span>
                    <span>₹{codFee}</span>
                  </div>
                )}
                <div className="sum-row total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.05rem', color: 'var(--primary)', borderTop: '1.5px solid var(--border)', paddingTop: '12px', marginTop: '6px' }}>
                  <span>Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>
              
              {/* Sidebar Coupon code input */}
              <div style={{ marginTop: '14px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <input 
                  type="text" 
                  id="couponInput" 
                  placeholder="Coupon code" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '8px' }}
                />
                <button 
                  onClick={handleApplyCoupon}
                  style={{ width: '100%', padding: '9px', background: '#f0faf4', color: 'var(--primary)', border: '1.5px solid var(--primary)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Apply Coupon
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
