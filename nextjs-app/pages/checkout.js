import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { db, auth } from '../firebase/config';
import { doc, setDoc, writeBatch, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { maskEmail, maskPhone, maskPincode, maskAddressLine } from '../middleware/sanitize';

export default function Checkout() {
  const router = useRouter();
  const { user, userProfile, cart, removeFromCart, updateCartQuantity, clearCart, addToast } = useCart();

  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);
  const [mockPaymentPayload, setMockPaymentPayload] = useState(null);
  const [mockCardDetails, setMockCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [mockUpiId, setMockUpiId] = useState('');
  const [processingMockPay, setProcessingMockPay] = useState(false);
  const [maskDataEnabled, setMaskDataEnabled] = useState(true);

  useEffect(() => {
    const storedMask = localStorage.getItem('Curify_mask_data');
    if (storedMask !== null) {
      setMaskDataEnabled(storedMask === 'true');
    }
  }, []);

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
    const coupons = { Curify10: 10, ORGANIC20: 20, FIRST50: 50 };
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

        // Retrieve Auth token
        let token = 'firebase_guest';
        if (auth.currentUser) {
          try {
            token = await auth.currentUser.getIdToken();
          } catch (e) {
            console.error('Failed to get id token:', e);
            token = localStorage.getItem('Curify_token') || 'firebase_guest';
          }
        } else {
          token = localStorage.getItem('Curify_token') || 'firebase_guest';
        }

        // Create order via our API
        const response = await fetch(`/api/create-order`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: grandTotal, currency: 'INR', receipt: orderId, items: orderPayload.items })
        });

        const razorpayOrder = await response.json();

        if (!response.ok) {
          throw new Error(razorpayOrder.error || 'Failed to create payment order');
        }

        // Dev mode (no Razorpay keys configured) - simulate payment via mock modal
        if (razorpayOrder._dev_mode) {
          setMockPaymentPayload(orderPayload);
          setShowMockPaymentModal(true);
          setIsLoadingPayment(false);
          return;
        }

        // Open Razorpay checkout modal
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'Curify',
          description: `Order ${orderId}`,
          order_id: razorpayOrder.id,
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            contact: formData.phone
          },
          theme: { color: '#1a5c38' },
          handler: async function (paymentResponse) {
            // Verify payment on server
            try {
              const verifyRes = await fetch(`/api/verify-payment`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
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

  const handleConfirmMockPayment = async () => {
    if (paymentMethod === 'razorpay') {
      if (!mockCardDetails.number || !mockCardDetails.expiry || !mockCardDetails.cvv) {
        addToast('Please fill all card details', 'error');
        return;
      }
      if (mockCardDetails.number.replace(/\s/g, '').length !== 16) {
        addToast('Card number must be 16 digits', 'error');
        return;
      }
    } else if (paymentMethod === 'gpay') {
      if (!mockUpiId.trim() || !mockUpiId.includes('@')) {
        addToast('Please enter a valid UPI ID (e.g. name@okhdfcbank)', 'error');
        return;
      }
    }

    setProcessingMockPay(true);
    setTimeout(async () => {
      try {
        const payload = { ...mockPaymentPayload };
        payload.payment.transactionId = 'pay_dev_' + Date.now().toString().slice(-8);
        payload.payment.status = 'paid';
        
        await saveOrderToFirestore(payload);
        
        setShowMockPaymentModal(false);
        setProcessingMockPay(false);
        addToast('Payment Successful! 🎉', 'success');
      } catch (e) {
        console.error(e);
        addToast('Mock payment execution failed', 'error');
        setProcessingMockPay(false);
      }
    }, 2000);
  };

  const saveOrderToFirestore = async (orderPayload) => {
    try {
      // Save the order directly to Firestore to bypass external backend needs
      const userRef = doc(db, 'users', user.uid);
      const orderRef = doc(collection(userRef, 'orders'), orderPayload.orderId);
      
      const firestoreData = {
        ...orderPayload,
        updated_at: serverTimestamp(),
      };
      
      await setDoc(orderRef, firestoreData);
      
      // Save global order reference
      const globalOrderRef = doc(db, 'orders', orderPayload.orderId);
      await setDoc(globalOrderRef, firestoreData);

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
    <div className="checkout-pg">
      <style>{`
        .checkout-pg { background: #f4f6f0; min-height: 100vh; padding-bottom: 120px; font-family: 'Inter', sans-serif; }
        
        /* Header styling */
        .checkout-header {
          position: sticky; top: 0; z-index: 200;
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          padding: 14px 16px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 2px 12px rgba(26,92,56,0.3);
        }
        .checkout-header h1 { color: #fff; font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; font-family: 'Poppins', sans-serif; }
        .checkout-back-btn { background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; font-size: 1rem; }

        /* Wizard progress stepper */
        .checkout-stepper {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 500px; margin: 24px auto 30px; padding: 0 16px;
        }
        .step-item {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          position: relative; z-index: 2; cursor: pointer; flex: 1;
        }
        .step-num {
          width: 30px; height: 30px; border-radius: 50%; background: #e2e8f0;
          color: #64748b; display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 700; transition: all 0.3s;
          border: 2px solid #e2e8f0;
        }
        .step-label {
          font-size: 0.72rem; font-weight: 700; color: #64748b;
          transition: all 0.3s; font-family: 'Poppins', sans-serif;
        }
        .step-item.active .step-num {
          background: #fff; border-color: #1a5c38; color: #1a5c38;
          box-shadow: 0 0 0 4px rgba(26,92,56,0.15);
        }
        .step-item.active .step-label { color: #1a5c38; }
        .step-item.done .step-num {
          background: #1a5c38; border-color: #1a5c38; color: #fff;
        }
        .step-item.done .step-label { color: #1a5c38; }

        .step-divider {
          flex: 1; height: 3px; background: #e2e8f0; margin-bottom: 22px;
          position: relative; top: -1px; z-index: 1; transition: all 0.3s;
        }
        .step-divider.done { background: #1a5c38; }

        /* Main layout split columns */
        .checkout-wrap { display: flex; flex-direction: column; gap: 16px; padding: 0 12px; max-width: 960px; margin: 0 auto; }
        @media(min-width: 768px) {
          .checkout-wrap { flex-direction: row; align-items: flex-start; }
          .checkout-main { flex: 1; }
          .checkout-sidebar { width: 340px; position: sticky; top: 80px; }
        }

        /* Card components */
        .co-card { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.01); }
        .co-card-title { font-size: 0.95rem; font-weight: 700; color: #1a5c38; font-family: 'Poppins', sans-serif; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #e8f5e9; padding-bottom: 10px; }

        /* Cart items inside checkout */
        .co-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0faf5; position: relative; }
        .co-item:last-child { border-bottom: none; }
        .co-item-img {
          width: 56px; height: 56px; min-width: 56px; border-radius: 10px;
          background: linear-gradient(135deg, #e8f5e9, #f0faf5);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; overflow: hidden;
        }
        .co-item-img img { width: 100%; height: 100%; object-fit: cover; }
        .co-item-info { flex: 1; }
        .co-item-name { font-size: 0.88rem; font-weight: 700; color: #1a1a2e; margin-bottom: 2px; }
        .co-item-weight { font-size: 0.7rem; color: #888; margin-bottom: 6px; }
        .co-item-price { font-size: 0.95rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }

        /* Qty controls */
        .co-qty-ctrl { display: flex; align-items: center; background: #f4f6f0; border-radius: 8px; overflow: hidden; max-width: fit-content; }
        .co-qty-btn { background: none; border: none; padding: 4px 10px; font-size: 0.9rem; font-weight: 700; color: #1a5c38; cursor: pointer; }
        .co-qty-num { min-width: 24px; text-align: center; font-size: 0.8rem; font-weight: 700; color: #1a1a2e; }

        /* Remove item */
        .co-item-remove { background: #fff0ee; border: none; border-radius: 6px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; color: #e05a2b; cursor: pointer; font-size: 0.75rem; }

        /* Inputs */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media(max-width: 480px) {
          .form-grid { grid-template-columns: 1fr; }
        }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { font-size: 0.72rem; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.3px; }
        .form-input, .form-select {
          width: 100%; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px;
          font-size: 0.88rem; outline: none; transition: all 0.2s; font-family: 'Inter', sans-serif;
          background: #fff;
        }
        .form-input:focus, .form-select:focus { border-color: #1a5c38; box-shadow: 0 0 0 3px rgba(26,92,56,0.1); }

        /* Payment Selectable boxes */
        .pay-opts { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px; }
        @media(min-width: 600px) { .pay-opts { grid-template-columns: repeat(3, 1fr); } }
        .pay-opt {
          background: #fafdfb; border: 1.5px solid #e2e8f0; border-radius: 14px;
          padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s;
          position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .pay-opt.selected {
          border-color: #1a5c38; background: #f0faf5;
          box-shadow: 0 4px 12px rgba(26,92,56,0.08);
        }
        .po-check {
          position: absolute; top: 10px; right: 10px; width: 18px; height: 18px;
          border-radius: 50%; background: #1a5c38; color: #fff;
          display: none; align-items: center; justify-content: center; font-size: 0.6rem;
        }
        .pay-opt.selected .po-check { display: flex; }
        .po-icon { font-size: 1.8rem; }
        .po-name { font-size: 0.8rem; font-weight: 700; color: #333; }
        
        .cod-note { display: flex; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 12px; font-size: 0.8rem; color: #b45309; gap: 8px; align-items: flex-start; margin-bottom: 16px; font-weight: 500; }
        
        /* Buttons */
        .btn-checkout-next {
          width: 100%; padding: 14px; background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          color: #fff; border: none; border-radius: 12px; font-size: 0.95rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 12px rgba(26,92,56,0.2); transition: all 0.2s;
        }
        .btn-checkout-next:active { transform: scale(0.98); }
        .btn-checkout-back {
          padding: 14px 20px; border: 1.5px solid #cbd5e1; background: #fff;
          color: #475569; border-radius: 12px; font-size: 0.95rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px;
        }
        .btn-checkout-back:active { background: #f8fafc; }
        .btn-pay-secure {
          flex: 1; padding: 14px; background: linear-gradient(135deg, #e05a2b, #f77f00);
          color: #fff; border: none; border-radius: 12px; font-size: 0.95rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 12px rgba(224,90,43,0.3); transition: all 0.2s;
        }
        .btn-pay-secure:active { transform: scale(0.98); }
        .btn-pay-secure:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Coupon bar */
        .coupon-bar { display: flex; gap: 8px; margin-top: 10px; }
        .coupon-input { flex: 1; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.85rem; outline: none; }
        .coupon-input:focus { border-color: #1a5c38; }
        .coupon-btn { background: #f0faf4; color: #1a5c38; border: 1.5px solid #1a5c38; border-radius: 8px; padding: 10px 14px; font-size: 0.8rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .coupon-btn:active { background: #e8f5ee; }

        /* Order Summary Lines */
        .sum-line { display: flex; justify-content: space-between; font-size: 0.84rem; color: #555; padding: 6px 0; border-bottom: 1px dashed #f1f5f2; }
        .sum-line:last-child { border-bottom: none; }
        .sum-line.total-line { border-top: 2px solid #e8f5e9; border-bottom: none; padding-top: 12px; margin-top: 6px; font-size: 1.05rem; font-weight: 800; color: #1a5c38; font-family: 'Poppins', sans-serif; }

        /* Success screen card */
        .success-circle {
          width: 72px; height: 72px; border-radius: 50%; background: #dcfce7;
          color: #15803d; display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; margin: 0 auto 16px;
          box-shadow: 0 4px 12px rgba(21,128,61,0.15);
        }
        .success-title { font-size: 1.3rem; color: #1a5c38; margin-bottom: 6px; font-weight: 800; font-family: 'Poppins', sans-serif; }
        .success-subtitle { font-size: 0.82rem; color: #666; margin-bottom: 24px; }
        .success-details { background: #fafdfb; border: 1px solid #e8f5e9; border-radius: 12px; padding: 14px; text-align: left; margin-bottom: 24px; }
        .success-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.82rem; border-bottom: 1px dashed #e8f5e9; color: #555; }
        .success-row:last-child { border-bottom: none; }
        .success-row.total-row { font-size: 0.95rem; font-weight: 800; color: #1a5c38; padding-top: 10px; border-top: 1.5px solid #e8f5e9; }
        
        .success-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .success-btn { text-decoration: none; padding: 12px 20px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
        .success-btn.primary { background: linear-gradient(135deg, #1a5c38, #2d6a4f); color: #fff; box-shadow: 0 3px 8px rgba(26,92,56,0.18); }
        .success-btn.outline { border: 1.5px solid #1a5c38; color: #1a5c38; background: #fff; }
      `}</style>

      {/* Header Panel */}
      <div className="checkout-header">
        <Link href="/cart">
          <button className="checkout-back-btn">
            <i className="fas fa-arrow-left"></i>
          </button>
        </Link>
        <h1>🌿 Secure Checkout</h1>
        <div style={{ width: '36px' }}></div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="checkout-stepper">
        <div className={`step-item ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'done' : ''}`} onClick={() => handleGoStep(1)}>
          <div className="step-num">{currentStep > 1 ? <i className="fas fa-check"></i> : 1}</div>
          <span className="step-label">Cart</span>
        </div>
        <div className={`step-divider ${currentStep > 1 ? 'done' : ''}`}></div>
        <div className={`step-item ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'done' : ''}`} onClick={() => handleGoStep(2)}>
          <div className="step-num">{currentStep > 2 ? <i className="fas fa-check"></i> : 2}</div>
          <span className="step-label">Details</span>
        </div>
        <div className={`step-divider ${currentStep > 2 ? 'done' : ''}`}></div>
        <div className={`step-item ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'done' : ''}`} onClick={() => handleGoStep(3)}>
          <div className="step-num">{currentStep > 3 ? <i className="fas fa-check"></i> : 3}</div>
          <span className="step-label">Payment</span>
        </div>
        <div className={`step-divider ${currentStep > 3 ? 'done' : ''}`}></div>
        <div className={`step-item ${currentStep === 4 ? 'done' : ''}`}>
          <div className="step-num">{currentStep === 4 ? <i className="fas fa-check"></i> : 4}</div>
          <span className="step-label">Confirm</span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="checkout-wrap">
        <div className="checkout-main">
          
          {/* STEP 1: Cart Items Summary */}
          {currentStep === 1 && (
            <div className="co-step">
              <div className="co-card">
                <div className="co-card-title">
                  <i className="fas fa-shopping-cart"></i> Your Items ({cart.length})
                </div>
                {cart.map((item) => {
                  const pid = item.productId || item.id;
                  return (
                    <div key={`${pid}-${item.weight}`} className="co-item">
                      <div className="co-item-img">
                        {item.image ? <img src={item.image} alt={item.name} /> : '🌿'}
                      </div>
                      <div className="co-item-info">
                        <div className="co-item-name">{item.name}</div>
                        <div className="co-item-weight">{item.weight || '250g'}</div>
                        <div className="co-qty-ctrl">
                          <button 
                            className="co-qty-btn"
                            onClick={() => updateCartQuantity(pid, item.weight, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span className="co-qty-num">{item.quantity}</span>
                          <button 
                            className="co-qty-btn"
                            onClick={() => updateCartQuantity(pid, item.weight, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <div className="co-item-price">₹{item.price * item.quantity}</div>
                        <button 
                          className="co-item-remove" 
                          onClick={() => removeFromCart(pid, item.weight)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: '16px', borderTop: '2px solid #e8f5e9', paddingTop: '12px' }}>
                  <div className="sum-line">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="sum-line">
                    <span>Delivery</span>
                    <span style={{ color: deliveryFee === 0 ? '#15803d' : '#333', fontWeight: deliveryFee === 0 ? '700' : '400' }}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="sum-line total-line">
                    <span>Total Amount</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>
              </div>
              
              <button className="btn-checkout-next" onClick={() => handleGoStep(2)}>
                Proceed to Details <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          )}

          {/* STEP 2: Delivery Address Form */}
          {currentStep === 2 && (
            <div className="co-step">
              <div className="co-card">
                <div className="co-card-title">
                  <i className="fas fa-map-marker-alt"></i> Delivery Address
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input type="text" id="firstName" className="form-input" value={formData.firstName} onChange={handleInputChange} placeholder="Raj" />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" id="lastName" className="form-input" value={formData.lastName} onChange={handleInputChange} placeholder="Kumar" />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input type="tel" id="phone" className="form-input" value={formData.phone} onChange={handleInputChange} placeholder="10-digit mobile number" />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" id="email" className="form-input" value={formData.email} onChange={handleInputChange} placeholder="raj@email.com" />
                  </div>
                  <div className="form-group full-width">
                    <label>Address Line 1 *</label>
                    <input type="text" id="address1" className="form-input" value={formData.address1} onChange={handleInputChange} placeholder="House/Flat No, Apartment, Street" />
                  </div>
                  <div className="form-group full-width">
                    <label>Address Line 2 (Optional)</label>
                    <input type="text" id="address2" className="form-input" value={formData.address2} onChange={handleInputChange} placeholder="Landmark, Locality, Area" />
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input type="text" id="city" className="form-input" value={formData.city} onChange={handleInputChange} placeholder="Chennai" />
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <select id="state" className="form-select" value={formData.state} onChange={handleInputChange}>
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
                  <div className="form-group">
                    <label>PIN Code *</label>
                    <input type="text" id="pincode" className="form-input" value={formData.pincode} onChange={handleInputChange} placeholder="600001" maxLength="6" />
                  </div>
                  <div className="form-group">
                    <label>Delivery Instructions</label>
                    <input type="text" id="deliveryNote" className="form-input" value={formData.deliveryNote} onChange={handleInputChange} placeholder="e.g. Leave at door, call before delivery" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-checkout-back" onClick={() => handleGoStep(1)}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <button className="btn-checkout-next" style={{ flex: 1 }} onClick={() => handleGoStep(3)}>
                  Proceed to Payment <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Details Option */}
          {currentStep === 3 && (
            <div className="co-step">
              {/* Delivery Summary Block */}
              <div className="co-card" style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e8f5e9', paddingBottom: '8px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#1a5c38', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-truck"></i> Shipping Information Summary
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#e05a2b', cursor: 'pointer', fontWeight: '700' }} onClick={() => handleGoStep(2)}>
                    Change
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.4' }}>
                  <div><strong>Recipient:</strong> {formData.firstName} {formData.lastName}</div>
                  <div>
                    <strong>Address:</strong> {maskDataEnabled ? maskAddressLine(formData.address1) : formData.address1}
                    {formData.address2 && `, ${maskDataEnabled ? maskAddressLine(formData.address2) : formData.address2}`}
                    {`, ${formData.city}, ${formData.state} - `}
                    {maskDataEnabled ? maskPincode(formData.pincode) : formData.pincode}
                  </div>
                  <div><strong>Phone:</strong> {maskDataEnabled ? maskPhone(formData.phone) : formData.phone}</div>
                  <div><strong>Email:</strong> {maskDataEnabled ? maskEmail(formData.email) : formData.email}</div>
                </div>
              </div>

              <div className="co-card">
                <div className="co-card-title">
                  <i className="fas fa-credit-card"></i> Select Payment Method
                </div>
                
                <div className="pay-opts">
                  <div className={`pay-opt ${paymentMethod === 'razorpay' ? 'selected' : ''}`} onClick={() => setPaymentMethod('razorpay')}>
                    <div className="po-check"><i className="fas fa-check"></i></div>
                    <div className="po-icon">💳</div>
                    <div className="po-name">Credit / Debit Card</div>
                  </div>
                  <div className={`pay-opt ${paymentMethod === 'gpay' ? 'selected' : ''}`} onClick={() => setPaymentMethod('gpay')}>
                    <div className="po-check"><i className="fas fa-check"></i></div>
                    <div className="po-icon">📱</div>
                    <div className="po-name">Google Pay / UPI</div>
                  </div>
                  <div className={`pay-opt ${paymentMethod === 'cod' ? 'selected' : ''}`} onClick={() => setPaymentMethod('cod')}>
                    <div className="po-check"><i className="fas fa-check"></i></div>
                    <div className="po-icon">💵</div>
                    <div className="po-name">Cash on Delivery</div>
                  </div>
                </div>

                {paymentMethod === 'cod' && (
                  <div className="cod-note">
                    <i className="fas fa-info-circle" style={{ marginTop: '2px', fontSize: '0.9rem' }}></i>
                    <span>Cash on Delivery is selected. Note: An extra ₹25 processing fee will be added. Please keep exact change ready.</span>
                  </div>
                )}

                {isLoadingPayment ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.2rem', color: '#1a5c38' }}></i>
                    <p style={{ marginTop: '10px', fontSize: '0.88rem', color: '#555', fontWeight: '500' }}>
                      Processing secure payment transaction...
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#888', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <i className="fas fa-shield-alt" style={{ color: '#15803d' }}></i> Secure Payment Gateway · 256-bit SSL Encrypted
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-checkout-back" onClick={() => handleGoStep(2)} disabled={isLoadingPayment}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                <button className="btn-pay-secure" onClick={handlePlaceOrder} disabled={isLoadingPayment}>
                  <i className="fas fa-lock"></i> Pay Securely <span>₹{grandTotal}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success confirmation screen */}
          {currentStep === 4 && confirmedOrder && (
            <div className="co-step">
              <div className="co-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div className="success-circle">
                  <i className="fas fa-check"></i>
                </div>
                <h2 className="success-title">Order Placed Successfully!</h2>
                <p className="success-subtitle">Thank you for shopping with Curify. Your organic products are on the way!</p>
                
                <div className="success-details">
                  <div className="success-row">
                    <span>Order Reference</span>
                    <strong style={{ color: '#1a5c38' }}>#{confirmedOrder.orderId}</strong>
                  </div>
                  <div className="success-row">
                    <span>Items Count</span>
                    <span>{confirmedOrder.items.length} items</span>
                  </div>
                  <div className="success-row">
                    <span>Delivery Address</span>
                    <span>{confirmedOrder.address.city}, {maskDataEnabled ? maskPincode(confirmedOrder.address.pincode) : confirmedOrder.address.pincode}</span>
                  </div>
                  <div className="success-row">
                    <span>Payment Mode</span>
                    <span>{confirmedOrder.payment.method.toUpperCase()} ({confirmedOrder.payment.status === 'paid' ? 'PAID ✅' : 'PENDING ⏳'})</span>
                  </div>
                  <div className="success-row">
                    <span>Estimated Shipping</span>
                    <span>2-3 business days</span>
                  </div>
                  <div className="success-row total-row">
                    <span>Grand Total Paid</span>
                    <span>₹{confirmedOrder.total}</span>
                  </div>
                </div>

                <div className="success-actions">
                  <Link href="/products" className="success-btn outline">
                    <i className="fas fa-shopping-bag"></i> Continue Shopping
                  </Link>
                  <Link href={`/order-tracking?orderId=${confirmedOrder.orderId}`} className="success-btn primary">
                    <i className="fas fa-truck"></i> Track Order Status
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Order Summary (shown for step 2 and 3) */}
        {currentStep > 1 && currentStep < 4 && (
          <aside className="checkout-sidebar">
            <div className="co-card">
              <div className="co-card-title">
                <i className="fas fa-shopping-bag"></i> Order Summary
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '14px', paddingRight: '4px' }}>
                {cart.map(i => (
                  <div key={`${i.productId}-${i.weight}`} style={{ display: 'flex', justify: 'space-between', fontSize: '0.82rem', padding: '6px 0', borderBottom: '1px solid #f1f5f2', color: '#555' }}>
                    <span>{i.name} ({i.quantity} qty)</span>
                    <span style={{ fontWeight: '600' }}>₹{i.price * i.quantity}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '2px solid #e8f5e9', paddingTop: '12px' }}>
                <div className="sum-line">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="sum-line">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                </div>
                {discount > 0 && (
                  <div className="sum-line" style={{ color: '#15803d', fontWeight: '600' }}>
                    <span>Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                {codFee > 0 && (
                  <div className="sum-line">
                    <span>COD Processing Fee</span>
                    <span>₹{codFee}</span>
                  </div>
                )}
                <div className="sum-line total-line">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>

              {/* Sidebar Coupon code input */}
              <div style={{ marginTop: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#555', display: 'block', marginBottom: '6px' }}>APPLY COUPON CODE</label>
                <div className="coupon-bar">
                  <input 
                    type="text" 
                    className="coupon-input"
                    placeholder="e.g. ORGANIC20" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button onClick={handleApplyCoupon} className="coupon-btn">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mock Payment Modal */}
      {showMockPaymentModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="modal-box" style={{
            background: '#fff', borderRadius: '20px', padding: '24px',
            width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1a5c38', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Poppins, sans-serif' }}>
              <i className="fas fa-shield-alt"></i> Secure Payment Gateway
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#555', background: '#f4f6f0', padding: '12px', borderRadius: '10px' }}>
              <span>Order Amount:</span>
              <strong style={{ color: '#1a5c38' }}>₹{grandTotal}</strong>
            </div>

            {paymentMethod === 'razorpay' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>Enter Card Information:</div>
                <input 
                  type="text" 
                  placeholder="Card Number (16 digits)" 
                  maxLength="19"
                  value={mockCardDetails.number}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    v = v.match(/.{1,4}/g)?.join(' ') || v;
                    setMockCardDetails({ ...mockCardDetails, number: v });
                  }}
                  style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="MM/YY" 
                    maxLength="5"
                    value={mockCardDetails.expiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2,4);
                      setMockCardDetails({ ...mockCardDetails, expiry: v });
                    }}
                    style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                  />
                  <input 
                    type="password" 
                    placeholder="CVV" 
                    maxLength="3"
                    value={mockCardDetails.cvv}
                    onChange={(e) => setMockCardDetails({ ...mockCardDetails, cvv: e.target.value.replace(/\D/g, '') })}
                    style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Cardholder Name" 
                  value={mockCardDetails.name}
                  onChange={(e) => setMockCardDetails({ ...mockCardDetails, name: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>Enter UPI Information:</div>
                <input 
                  type="text" 
                  placeholder="UPI ID (e.g. name@okhdfcbank)" 
                  value={mockUpiId}
                  onChange={(e) => setMockUpiId(e.target.value)}
                  style={{ padding: '10px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
                <div style={{ textAlign: 'center', padding: '10px', background: '#fff9f5', borderRadius: '10px', border: '1px dashed #ffa726', fontSize: '0.78rem', color: '#e65100' }}>
                  <i className="fas fa-qrcode"></i> Scanning QR Code is also supported on delivery!
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button 
                onClick={() => setShowMockPaymentModal(false)}
                disabled={processingMockPay}
                style={{
                  flex: 1, padding: '12px', border: '1.5px solid #cbd5e1',
                  borderRadius: '10px', background: '#fff', color: '#555',
                  fontWeight: '600', cursor: 'pointer', fontSize: '0.88rem'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmMockPayment}
                disabled={processingMockPay}
                style={{
                  flex: 1.5, padding: '12px', border: 'none',
                  borderRadius: '10px', background: 'linear-gradient(135deg, #1a5c38, #2d6a4f)',
                  color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {processingMockPay ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock"></i> Pay Securely
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: '80px' }}></div>
    </div>
  );
}
