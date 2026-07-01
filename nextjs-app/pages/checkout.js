import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { db, auth } from '../firebase/config';
import { doc, setDoc, writeBatch, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { maskEmail, maskPhone, maskPincode, maskAddressLine } from '../middleware/sanitize';

export default function Checkout() {
  const router = useRouter();
  const { user, userProfile, cart, removeFromCart, updateCartQuantity, clearCart, addToast, loading: authLoading } = useCart();
  const { language, t } = useLanguage();

  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [maskDataEnabled, setMaskDataEnabled] = useState(true);

  // Page-load Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      addToast(language === 'en' ? 'Please login to checkout' : 'செக்அவுட் செய்ய உள்நுழையவும்', 'info');
      router.push('/login?redirect=/checkout');
    }
  }, [user, authLoading]);

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

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    const coupons = { CURIFY10: 10, ORGANIC20: 20, FIRST50: 50, CURIFY499: 10 };
    if (coupons[code]) {
      setDiscountPercent(coupons[code]);
      addToast(language === 'en' ? `${coupons[code]}% off applied successfully! 🎉` : `${coupons[code]}% தள்ளுபடி வெற்றிகரமாகச் சேர்க்கப்பட்டது! 🎉`, 'success');
    } else {
      addToast(language === 'en' ? 'Invalid coupon code' : 'தவறான விளம்பரக் குறியீடு', 'error');
    }
  };

  const validateStep2 = () => {
    const required = ['firstName', 'phone', 'email', 'address1', 'city', 'pincode'];
    for (const f of required) {
      if (!formData[f].trim()) {
        addToast(language === 'en' ? 'Please fill all required fields' : 'தேவையான அனைத்து விவரங்களையும் நிரப்பவும்', 'error');
        return false;
      }
    }
    if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      addToast(language === 'en' ? 'Enter valid 10-digit mobile number' : 'சரியான அலைபேசி எண்ணை உள்ளிடவும்', 'error');
      return false;
    }
    if (!/^\d{6}$/.test(formData.pincode)) {
      addToast(language === 'en' ? 'Enter valid 6-digit PIN code' : 'சரியான பின்கோடை உள்ளிடவும்', 'error');
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
      addToast(language === 'en' ? 'Please login to place your order' : 'ஆர்டர் செய்ய உள்நுழையவும்', 'warning');
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
        quantity: i.quantity,
        seller_id: i.seller_id || 2,
        seller_name: i.seller_name || 'Curify Central Store',
        seller_location: i.seller_location || 'Tamil Nadu'
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

    if (paymentMethod === 'razorpay' || paymentMethod === 'gpay') {
      setIsLoadingPayment(true);
      try {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          addToast('Payment gateway failed to load. Try COD.', 'error');
          setIsLoadingPayment(false);
          return;
        }

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

        const backendPayload = {
          user_id: user ? user.uid : 'guest',
          items: orderPayload.items,
          total_amount: orderPayload.total,
          address: orderPayload.address,
          status: 'pending'
        };

        const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(backendPayload)
        });

        const createData = await createRes.json();

        if (!createRes.ok || !createData.success) {
          throw new Error(createData.error || 'Failed to create payment order');
        }

        const razorpayOrder = createData;

        const options = {
          key: razorpayOrder.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: 'INR',
          name: 'Curify',
          description: `Order ${orderId}`,
          order_id: razorpayOrder.razorpay_order_id,
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            contact: formData.phone
          },
          theme: { color: '#1a5c38' },
          handler: async function (paymentResponse) {
            setIsLoadingPayment(true);
            try {
              const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${createData.data.id}/status`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  status: 'confirmed',
                  payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_signature: paymentResponse.razorpay_signature
                })
              });
              
              const updateData = await updateRes.json();

              if (updateData.success) {
                clearCart();
                setConfirmedOrder(orderPayload);
                setCurrentStep(4);
                addToast(language === 'en' ? 'Payment successful & Order placed! 🎉' : 'கட்டணம் செலுத்தப்பட்டு ஆர்டர் உறுதி செய்யப்பட்டது! 🎉', 'success');
              } else {
                addToast(updateData.error || 'Failed to process order on server.', 'error');
              }
            } catch (err) {
              console.error('Order status update error:', err);
              addToast('Order processing error. Contact support.', 'error');
            }
            setIsLoadingPayment(false);
          },
          modal: {
            ondismiss: function () {
              setIsLoadingPayment(false);
              addToast(language === 'en' ? 'Payment cancelled' : 'கட்டணம் செலுத்தப்படுவது ரத்துசெய்யப்பட்டது', 'info');
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
        addToast(language === 'en' ? 'Payment failed. Please try again or use COD.' : 'கட்டணம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும் அல்லது COD பயன்படுத்தவும்.', 'error');
      }
    } else {
      // Cash on Delivery
      await saveOrderToFirestore(orderPayload);
    }
  };

  const saveOrderToFirestore = async (orderPayload) => {
    try {
      let token = 'firebase_guest';
      if (auth.currentUser) {
        try {
          token = await auth.currentUser.getIdToken();
        } catch (e) {
          token = localStorage.getItem('Curify_token') || 'firebase_guest';
        }
      } else {
        token = localStorage.getItem('Curify_token') || 'firebase_guest';
      }

      const backendPayload = {
        user_id: user ? user.uid : 'guest',
        items: orderPayload.items,
        total_amount: orderPayload.total,
        address: orderPayload.address,
        status: 'pending',
        payment_method: 'cod'
      };

      const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(backendPayload)
      });
      
      const createData = await createRes.json();

      if (createData.success) {
        clearCart();
        setConfirmedOrder(orderPayload);
        setCurrentStep(4);
        addToast(language === 'en' ? 'Order placed successfully! 🌿' : 'ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டது! 🌿', 'success');
      } else {
        addToast(createData.error || 'Failed to save order on server.', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to save order. Try again.', 'error');
    }
  };

  if (authLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', background: '#faf8f4', minHeight: '100vh' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '16px' }}></i>
        <h2 style={{ fontFamily: 'var(--font-heading)' }}>{language === 'en' ? 'Loading checkout...' : 'செக்அவுட் விவரங்கள் ஏற்றப்படுகிறது...'}</h2>
      </div>
    );
  }

  return (
    <div className="checkout-pg">
      <style>{`
        .checkout-pg { background: #faf8f4; min-height: 100vh; padding-bottom: 120px; font-family: 'Inter', sans-serif; }
        
        /* Header styling */
        .checkout-header {
          position: sticky; top: 0; z-index: 200;
          background: #fff; border-bottom: 1px solid var(--border);
          padding: 14px 16px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
        .checkout-header h1 { color: var(--text); font-size: 1.1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; font-family: 'Poppins', sans-serif; }
        .checkout-back-btn { background: #faf8f4; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #333; cursor: pointer; font-size: 1rem; }

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
          background: #fff; border-color: var(--primary); color: var(--primary);
          box-shadow: 0 0 0 4px rgba(26,92,56,0.15);
        }
        .step-item.active .step-label { color: var(--primary); }
        .step-item.done .step-num {
          background: var(--primary); border-color: var(--primary); color: #fff;
        }
        .step-item.done .step-label { color: var(--primary); }

        .step-divider {
          flex: 1; height: 3px; background: #e2e8f0; margin-bottom: 22px;
          position: relative; top: -1px; z-index: 1; transition: all 0.3s;
        }
        .step-divider.done { background: var(--primary); }

        /* Main layout split columns */
        .checkout-wrap { display: flex; flex-direction: column; gap: 16px; padding: 0 12px; max-width: 960px; margin: 0 auto; }
        @media(min-width: 768px) {
          .checkout-wrap { flex-direction: row; align-items: flex-start; }
          .checkout-main { flex: 1; }
          .checkout-sidebar { width: 340px; position: sticky; top: 80px; }
        }

        /* Card components */
        .co-card { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); border: 1px solid var(--border); }
        .co-card-title { font-size: 0.95rem; font-weight: 700; color: var(--primary); font-family: 'Poppins', sans-serif; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed var(--border); padding-bottom: 10px; }

        /* Group Block inside checkout */
        .co-group-block {
          border: 1px solid var(--border); border-radius: 12px; margin-bottom: 14px; overflow: hidden;
        }
        .co-group-head {
          background: var(--bg); padding: 8px 12px; font-size: 0.8rem; font-weight: 700; color: var(--primary); border-bottom: 1px solid var(--border);
        }

        /* Cart items inside checkout */
        .co-item { display: flex; align-items: center; gap: 12px; padding: 12px 12px; border-bottom: 1px solid #f8f8f8; position: relative; }
        .co-item:last-child { border-bottom: none; }
        .co-item-img {
          width: 56px; height: 56px; min-width: 56px; border-radius: 8px;
          background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; overflow: hidden;
        }
        .co-item-img img { width: 100%; height: 100%; object-fit: cover; }
        .co-item-info { flex: 1; }
        .co-item-name { font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 2px; }
        .co-item-weight { font-size: 0.7rem; color: var(--text-light); margin-bottom: 6px; }
        .co-item-price { font-size: 0.95rem; font-weight: 800; color: var(--primary); font-family: 'Poppins', sans-serif; }

        /* Qty controls */
        .co-qty-ctrl { display: flex; align-items: center; background: var(--bg); border-radius: 8px; overflow: hidden; max-width: fit-content; border: 1px solid var(--border); }
        .co-qty-btn { background: none; border: none; padding: 4px 10px; font-size: 0.9rem; font-weight: 700; color: var(--primary); cursor: pointer; }
        .co-qty-num { min-width: 24px; text-align: center; font-size: 0.8rem; font-weight: 700; color: var(--text); }

        /* Remove item */
        .co-item-remove { background: #fff0ee; border: none; border-radius: 6px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; color: var(--accent); cursor: pointer; font-size: 0.75rem; }

        /* Inputs */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media(max-width: 480px) {
          .form-grid { grid-template-columns: 1fr; }
        }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { font-size: 0.72rem; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.3px; }
        .form-input, .form-select {
          width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
          font-size: 0.88rem; outline: none; transition: all 0.2s; font-family: 'Inter', sans-serif;
          background: #fff;
        }
        .form-input:focus, .form-select:focus { border-color: var(--primary); }

        /* Buttons */
        .btn-checkout-next {
          width: 100%; padding: 14px; background: var(--primary);
          color: #fff; border: none; border-radius: 10px; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s; font-family: var(--font-heading);
        }
        .btn-checkout-next:active { transform: scale(0.98); }
        .btn-checkout-back {
          padding: 14px 20px; border: 1.5px solid var(--border); background: #fff;
          color: var(--text-light); border-radius: 10px; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px;
        }
        .btn-checkout-back:active { background: var(--bg); }

        /* Success screen card */
        .success-circle {
          width: 72px; height: 72px; border-radius: 50%; background: #dcfce7;
          color: #15803d; display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; margin: 0 auto 16px;
          box-shadow: 0 4px 12px rgba(21,128,61,0.1);
        }
        .success-title { font-size: 1.25rem; color: var(--primary); margin-bottom: 6px; font-weight: 800; font-family: 'Poppins', sans-serif; }
        .success-subtitle { font-size: 0.85rem; color: var(--text-light); margin-bottom: 24px; }
        .success-details { background: #fafdfb; border: 1px solid #e8f5e9; border-radius: 12px; padding: 14px; text-align: left; margin-bottom: 24px; }
        .success-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.82rem; border-bottom: 1px dashed #e8f5e9; color: var(--text); }
        .success-row:last-child { border-bottom: none; }
        .success-row.total-row { font-size: 0.95rem; font-weight: 800; color: var(--primary); padding-top: 10px; border-top: 1.5px solid #e8f5e9; }
        
        .success-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .success-btn { text-decoration: none; padding: 12px 20px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
        .success-btn.primary { background: var(--primary); color: #fff; }
        .success-btn.outline { border: 1.5px solid var(--primary); color: var(--primary); background: #fff; }

        /* UPI option list */
        .fk-pay-page { background: #faf8f4; font-family: 'Inter', sans-serif; padding-bottom: 32px; }
        .fk-pay-header { background: #fff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10; }
        .fk-pay-header-left { display: flex; align-items: center; gap: 12px; }
        .fk-back-btn { background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text); }
        .fk-header-title { font-size: 0.78rem; color: var(--text-light); font-weight: 400; line-height: 1.2; }
        .fk-header-title strong { font-size: 1rem; color: var(--text); display: block; font-weight: 700; }
        .fk-secure-badge { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--text-light); }
        .fk-total-bar { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 14px; }
        .fk-total-label { font-size: 0.95rem; font-weight: 600; color: var(--primary); display: flex; align-items: center; gap: 6px; }
        .fk-total-amount { font-size: 1.05rem; font-weight: 700; color: var(--text); }
        .fk-accordion-section { background: #fff; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 10px; }
        .fk-accordion-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; cursor: pointer; border-bottom: 1px solid transparent; transition: border-color 0.2s; user-select: none; }
        .fk-accordion-header.open { border-bottom-color: var(--border); }
        .fk-acc-left { display: flex; align-items: center; gap: 12px; }
        .fk-acc-icon { width: 36px; height: 36px; border-radius: 6px; background: var(--bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fk-acc-title { font-size: 0.9rem; font-weight: 700; color: var(--text); line-height: 1.2; }
        .fk-acc-sub { font-size: 0.78rem; color: var(--text-light); margin-top: 2px; }
        .fk-acc-offer { font-size: 0.78rem; color: #388e3c; font-weight: 600; margin-top: 2px; }
        .fk-acc-chevron { color: var(--text-light); transition: transform 0.25s; }
        .fk-acc-chevron.open { transform: rotate(180deg); }
        .fk-accordion-body { padding: 16px; }
        .fk-upi-option { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
        .fk-upi-option:last-child { border-bottom: none; }
        .fk-upi-left { display: flex; align-items: center; gap: 12px; }
        .fk-radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: border-color 0.2s; }
        .fk-radio.selected { border-color: var(--primary); }
        .fk-radio-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); }
        .fk-upi-name { font-size: 0.88rem; color: var(--text); font-weight: 500; }
        .fk-pay-btn { width: 100%; padding: 14px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: 'Poppins', sans-serif; margin-top: 16px; transition: background 0.2s; }
        .fk-pay-btn:active { transform: scale(0.99); }
        .fk-pay-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
        
        .fk-cod-body { padding: 16px; }
        .fk-cod-warn { background: #fff8e7; border: 1px solid #ffe0a3; border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #7a4f00; margin-bottom: 16px; line-height: 1.5; }
        .fk-place-order-btn { width: 100%; padding: 14px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: 'Poppins', sans-serif; transition: background 0.2s; }
        .fk-place-order-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
        .fk-unavail-section { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: space-between; opacity: 0.6; margin-bottom: 8px; }
        .fk-unavail-left { display: flex; align-items: center; gap: 12px; }
        .fk-unavail-title { font-size: 0.9rem; color: var(--text); font-weight: 500; }
        .fk-unavail-badge { font-size: 0.78rem; color: var(--text-light); display: flex; align-items: center; gap: 4px; }
        
        .sum-line { display: flex; justify-content: space-between; font-size: 0.84rem; color: var(--text); padding: 6px 0; border-bottom: 1px dashed #f1f5f2; }
        .sum-line:last-child { border-bottom: none; }
        .sum-line.total-line { border-top: 1.5px solid var(--border); border-bottom: none; padding-top: 12px; margin-top: 6px; font-size: 1.05rem; font-weight: 800; color: var(--primary); font-family: 'Poppins', sans-serif; }
      `}</style>

      {/* Header Panel */}
      <div className="checkout-header">
        <Link href="/cart">
          <button className="checkout-back-btn focus-visible-ring" aria-label="Go back to cart">
            <i className="fas fa-arrow-left"></i>
          </button>
        </Link>
        <h1>🌿 {language === 'en' ? 'Secure Checkout' : 'பாதுகாப்பான செக்அவுட்'}</h1>
        <div style={{ width: '36px' }}></div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="checkout-stepper">
        <div className={`step-item ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'done' : ''}`} onClick={() => handleGoStep(1)}>
          <div className="step-num">{currentStep > 1 ? <i className="fas fa-check"></i> : 1}</div>
          <span className="step-label">{language === 'en' ? 'Cart' : 'கூடை'}</span>
        </div>
        <div className={`step-divider ${currentStep > 1 ? 'done' : ''}`}></div>
        <div className={`step-item ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'done' : ''}`} onClick={() => handleGoStep(2)}>
          <div className="step-num">{currentStep > 2 ? <i className="fas fa-check"></i> : 2}</div>
          <span className="step-label">{language === 'en' ? 'Details' : 'விவரங்கள்'}</span>
        </div>
        <div className={`step-divider ${currentStep > 2 ? 'done' : ''}`}></div>
        <div className={`step-item ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'done' : ''}`} onClick={() => handleGoStep(3)}>
          <div className="step-num">{currentStep > 3 ? <i className="fas fa-check"></i> : 3}</div>
          <span className="step-label">{language === 'en' ? 'Payment' : 'செலுத்துகை'}</span>
        </div>
        <div className={`step-divider ${currentStep > 3 ? 'done' : ''}`}></div>
        <div className={`step-item ${currentStep === 4 ? 'done' : ''}`}>
          <div className="step-num">{currentStep === 4 ? <i className="fas fa-check"></i> : 4}</div>
          <span className="step-label">{language === 'en' ? 'Confirm' : 'உறுதிசெய்தல்'}</span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="checkout-wrap">
        <div className="checkout-main">
          
          {/* STEP 1: Cart Items Summary Grouped by Farmer */}
          {currentStep === 1 && (
            <div className="co-step">
              <div className="co-card">
                <div className="co-card-title">
                  <i className="fas fa-shopping-cart"></i> {language === 'en' ? `Your Items (${cart.length})` : `கூடை பொருட்கள் (${cart.length})`}
                </div>
                
                {groupsList.map((group) => (
                  <div key={group.sellerId} className="co-group-block">
                    <div className="co-group-head">
                      🌾 {group.sellerName} · {group.sellerLocation}
                    </div>
                    {group.items.map((item) => {
                      const pid = item.productId || item.id;
                      return (
                        <div key={`${pid}-${item.weight}`} className="co-item">
                          <div className="co-item-img">
                            {item.image ? <img src={item.image} alt={item.name} /> : '🌿'}
                          </div>
                          <div className="co-item-info">
                            <div className="co-item-name">{item.name}</div>
                            <div className="co-item-weight">{item.weight || '250g'} · PGS-India</div>
                            <div className="co-qty-ctrl">
                              <button className="co-qty-btn focus-visible-ring" onClick={() => updateCartQuantity(pid, item.weight, item.quantity - 1)}>−</button>
                              <span className="co-qty-num">{item.quantity}</span>
                              <button className="co-qty-btn focus-visible-ring" onClick={() => updateCartQuantity(pid, item.weight, item.quantity + 1)}>+</button>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <div className="co-item-price">₹{item.price * item.quantity}</div>
                            <button className="co-item-remove focus-visible-ring" onClick={() => removeFromCart(pid, item.weight)} aria-label="Remove item">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div style={{ marginTop: '16px', borderTop: '1.5px solid var(--border)', paddingTop: '12px' }}>
                  <div className="sum-line">
                    <span>{language === 'en' ? 'Subtotal' : 'பொருட்களின் தொகை'}</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="sum-line">
                    <span>{language === 'en' ? 'Delivery Fee' : 'விநியோக கட்டணம்'}</span>
                    <span style={{ color: deliveryFee === 0 ? '#15803d' : '#333', fontWeight: deliveryFee === 0 ? '700' : '400' }}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="sum-line total-line">
                    <span>{language === 'en' ? 'Total Amount' : 'மொத்த தொகை'}</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>
              </div>
              
              <button className="btn-checkout-next focus-visible-ring" onClick={() => handleGoStep(2)}>
                {language === 'en' ? 'Proceed to Details' : 'விவரங்களை நிரப்பத் தொடரவும்'} <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          )}

          {/* STEP 2: Delivery Address Form */}
          {currentStep === 2 && (
            <div className="co-step">
              <div className="co-card">
                <div className="co-card-title">
                  <i className="fas fa-map-marker-alt"></i> {language === 'en' ? 'Delivery Address' : 'விநியோக முகவரி'}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{language === 'en' ? 'First Name *' : 'முதல் பெயர் *'}</label>
                    <input type="text" id="firstName" className="form-input" value={formData.firstName} onChange={handleInputChange} placeholder="Raj" />
                  </div>
                  <div className="form-group">
                    <label>{language === 'en' ? 'Last Name' : 'குடும்பப் பெயர்'}</label>
                    <input type="text" id="lastName" className="form-input" value={formData.lastName} onChange={handleInputChange} placeholder="Kumar" />
                  </div>
                  <div className="form-group">
                    <label>{language === 'en' ? 'Phone Number *' : 'அலைபேசி எண் *'}</label>
                    <input type="tel" id="phone" className="form-input" value={formData.phone} onChange={handleInputChange} placeholder="10-digit mobile number" />
                  </div>
                  <div className="form-group">
                    <label>{language === 'en' ? 'Email Address *' : 'மின்னஞ்சல் முகவரி *'}</label>
                    <input type="email" id="email" className="form-input" value={formData.email} onChange={handleInputChange} placeholder="raj@email.com" />
                  </div>
                  <div className="form-group full-width">
                    <label>{language === 'en' ? 'Address Line 1 *' : 'கதவு எண், தெரு முகவரி *'}</label>
                    <input type="text" id="address1" className="form-input" value={formData.address1} onChange={handleInputChange} placeholder="House/Flat No, Apartment, Street" />
                  </div>
                  <div className="form-group full-width">
                    <label>{language === 'en' ? 'Address Line 2 (Optional)' : 'பகுதி, முக்கிய அடையாளம் (விருப்பத்தேர்வு)'}</label>
                    <input type="text" id="address2" className="form-input" value={formData.address2} onChange={handleInputChange} placeholder="Landmark, Locality, Area" />
                  </div>
                  <div className="form-group">
                    <label>{language === 'en' ? 'City *' : 'மாநகரம் / ஊர் *'}</label>
                    <input type="text" id="city" className="form-input" value={formData.city} onChange={handleInputChange} placeholder="Chennai" />
                  </div>
                  <div className="form-group">
                    <label>{language === 'en' ? 'State *' : 'மாநிலம் *'}</label>
                    <select id="state" className="form-select" value={formData.state} onChange={handleInputChange}>
                      <option>Tamil Nadu</option>
                      <option>Kerala</option>
                      <option>Karnataka</option>
                      <option>Andhra Pradesh</option>
                      <option>Telangana</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{language === 'en' ? 'PIN Code *' : 'பின்கோடு *'}</label>
                    <input type="text" id="pincode" className="form-input" value={formData.pincode} onChange={handleInputChange} placeholder="600001" maxLength="6" />
                  </div>
                  <div className="form-group">
                    <label>{language === 'en' ? 'Delivery Instructions' : 'விநியோக குறிப்புகள்'}</label>
                    <input type="text" id="deliveryNote" className="form-input" value={formData.deliveryNote} onChange={handleInputChange} placeholder="e.g. Leave at door, call before delivery" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-checkout-back focus-visible-ring" onClick={() => handleGoStep(1)}>
                  <i className="fas fa-arrow-left"></i> {language === 'en' ? 'Back' : 'பின்செல்'}
                </button>
                <button className="btn-checkout-next focus-visible-ring" style={{ flex: 1 }} onClick={() => handleGoStep(3)}>
                  {language === 'en' ? 'Proceed to Payment' : 'செலுத்துகைக்குத் தொடரவும்'} <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Page */}
          {currentStep === 3 && (
            <div className="fk-pay-page">
              <div className="fk-pay-header">
                <div className="fk-pay-header-left">
                  <button className="fk-back-btn focus-visible-ring" onClick={() => handleGoStep(2)} aria-label="Go back to address">
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <div className="fk-header-title">
                    {language === 'en' ? 'Step 3 of 3' : 'படி 3 - இறுதிப் படி'}
                    <strong>{language === 'en' ? 'Payments' : 'கட்டணம் செலுத்துதல்'}</strong>
                  </div>
                </div>
                <div className="fk-secure-badge">
                  <i className="fas fa-shield-alt" style={{ color: 'var(--primary)' }}></i>
                  100% Secure
                </div>
              </div>

              {/* Total Amount Bar */}
              <div className="fk-total-bar">
                <div className="fk-total-label">
                  {language === 'en' ? 'Total Amount' : 'மொத்த தொகை'}
                </div>
                <div className="fk-total-amount">₹{grandTotal}</div>
              </div>

              {/* Online payment save promotion */}
              {paymentMethod === 'cod' && (
                <div style={{ margin: '0 0 14px 0', background: '#fff8e7', border: '1px solid #ffe0a3', borderRadius: '8px', padding: '12px 16px', fontSize: '0.8rem', color: '#7a4f00', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span>⚠️ {language === 'en' ? 'Avoid COD fee. Pay online and save ₹25' : 'COD கட்டணத்தைத் தவிர்க்கலாம். ஆன்லைனில் செலுத்தி ₹25 சேமிக்கவும்'}</span>
                  <button style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => setPaymentMethod('razorpay')}>
                    {language === 'en' ? 'Pay Online' : 'ஆன்லைன் கட்டணம்'}
                  </button>
                </div>
              )}

              {/* UPI Options */}
              <div className="fk-accordion-section">
                <div
                  className={`fk-accordion-header ${['gpay','phonepe','paytm','upi'].includes(paymentMethod) ? 'open' : ''}`}
                  onClick={() => setPaymentMethod(paymentMethod === 'upi' ? '' : 'upi')}
                >
                  <div className="fk-acc-left">
                    <div className="fk-acc-icon">
                      <span style={{ fontWeight: '800', fontSize: '0.7rem', color: '#555', border: '2px solid #555', padding: '1px 4px', borderRadius: '3px' }}>UPI</span>
                    </div>
                    <div>
                      <div className="fk-acc-title">UPI App / QR</div>
                      <div className="fk-acc-sub">{language === 'en' ? 'Pay instantly via GPay, PhonePe or any app' : 'கூகுள் பே, ஃபோன்பே மூலம் எளிதாகச் செலுத்தலாம்'}</div>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-down fk-acc-chevron ${['gpay','phonepe','paytm','upi'].includes(paymentMethod) ? 'open' : ''}`}></i>
                </div>

                {['gpay','phonepe','paytm','upi'].includes(paymentMethod) && (
                  <div style={{ padding: '8px 16px 16px' }}>
                    {[
                      { id: 'gpay',    name: 'Google Pay',   emoji: '🟢' },
                      { id: 'phonepe', name: 'PhonePe',      emoji: '🟣' },
                      { id: 'paytm',   name: 'Paytm UPI',    emoji: '🔵' },
                      { id: 'upi',     name: 'Other UPI App',emoji: '📱' },
                    ].map(opt => (
                      <div key={opt.id} className="fk-upi-option" onClick={() => setPaymentMethod(opt.id)}>
                        <div className="fk-upi-left">
                          <div className={`fk-radio ${paymentMethod === opt.id ? 'selected' : ''}`}>
                            {paymentMethod === opt.id && <div className="fk-radio-dot"></div>}
                          </div>
                          <span className="fk-upi-name">{opt.emoji} {opt.name}</span>
                        </div>
                      </div>
                    ))}
                    <button className="fk-pay-btn focus-visible-ring" disabled={isLoadingPayment} onClick={handlePlaceOrder}>
                      {isLoadingPayment ? '...' : `${language === 'en' ? 'Pay' : 'செலுத்துக'} ₹${grandTotal}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Credit/Debit Cards Accordion */}
              <div className="fk-accordion-section">
                <div
                  className={`fk-accordion-header ${paymentMethod === 'razorpay' ? 'open' : ''}`}
                  onClick={() => setPaymentMethod(paymentMethod === 'razorpay' ? '' : 'razorpay')}
                >
                  <div className="fk-acc-left">
                    <div className="fk-acc-icon">
                      <i className="far fa-credit-card" style={{ fontSize: '1.2rem', color: '#555' }}></i>
                    </div>
                    <div>
                      <div className="fk-acc-title">{language === 'en' ? 'Credit / Debit Cards' : 'கிரெடிட் / டெபிட் கார்டு'}</div>
                      <div className="fk-acc-sub">{language === 'en' ? 'Secure online payment via Razorpay gateway' : 'Razorpay மூலம் பாதுகாப்பாக செலுத்தலாம்'}</div>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-down fk-acc-chevron ${paymentMethod === 'razorpay' ? 'open' : ''}`}></i>
                </div>

                {paymentMethod === 'razorpay' && (
                  <div className="fk-accordion-body">
                    <p className="fk-card-note">
                      🔒 {language === 'en' ? 'All cards, netbanking, and wallets are secured by Razorpay (RBI approved).' : 'அனைத்து கார்டுகளும் மற்றும் வாலட்களும் ரேசர்பே (RBI ஒப்புதல்) மூலம் பாதுகாக்கப்படுகிறது.'}
                    </p>
                    <button className="fk-pay-btn focus-visible-ring" disabled={isLoadingPayment} onClick={handlePlaceOrder}>
                      {isLoadingPayment ? '...' : `${language === 'en' ? 'Open Secure Checkout' : 'பாதுகாப்பாக கட்டணம் செலுத்து'} ₹${grandTotal}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Cash on Delivery Accordion */}
              <div className="fk-accordion-section">
                <div
                  className={`fk-accordion-header ${paymentMethod === 'cod' ? 'open' : ''}`}
                  onClick={() => setPaymentMethod(paymentMethod === 'cod' ? '' : 'cod')}
                >
                  <div className="fk-acc-left">
                    <div className="fk-acc-icon">
                      <i className="fas fa-hand-holding-usd" style={{ fontSize: '1.2rem', color: '#555' }}></i>
                    </div>
                    <div>
                      <div className="fk-acc-title">{language === 'en' ? 'Cash on Delivery (COD)' : 'பொருள் கிடைத்தவுடன் பணம் செலுத்துதல்'}</div>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-down fk-acc-chevron ${paymentMethod === 'cod' ? 'open' : ''}`}></i>
                </div>

                {paymentMethod === 'cod' && (
                  <div className="fk-cod-body">
                    <div className="fk-cod-warn">
                      ⚠️ {language === 'en' ? `Extra ₹25 COD processing fee applies. Total due: ₹${grandTotal}` : `கூடுதல் ₹25 COD செயலாக்கக் கட்டணம் பொருந்தும். மொத்தத் தொகை: ₹${grandTotal}`}
                    </div>
                    <button className="fk-place-order-btn focus-visible-ring" disabled={isLoadingPayment} onClick={handlePlaceOrder}>
                      {isLoadingPayment ? '...' : (language === 'en' ? 'Place Order (COD)' : 'ஆர்டர் செய் (COD)')}
                    </button>
                  </div>
                )}
              </div>

              {/* Payment security trust badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-light)', background: '#fff', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px' }}>🔒 RBI Approved Gateway</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-light)', background: '#fff', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px' }}>🛡️ 256-Bit SSL Secured</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-light)', background: '#fff', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '4px' }}>🌾 Direct Farmer Support</span>
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
                <h2 className="success-title">{language === 'en' ? 'Order Placed Successfully!' : 'ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டது!'}</h2>
                <p className="success-subtitle">
                  {language === 'en' ? 'Thank you for shopping with Curify. Your organic products are on the way!' : 'க்யூரிஃபையில் வாங்கியதற்கு நன்றி. உங்கள் இயற்கை பொருட்கள் விரைவில் வந்து சேரும்!'}
                </p>
                
                <div className="success-details">
                  <div className="success-row">
                    <span>{language === 'en' ? 'Order Reference' : 'ஆர்டர் குறிப்பு எண்'}</span>
                    <strong style={{ color: 'var(--primary)' }}>#{confirmedOrder.orderId}</strong>
                  </div>
                  <div className="success-row">
                    <span>{language === 'en' ? 'Items Count' : 'பொருட்களின் எண்ணிக்கை'}</span>
                    <span>{confirmedOrder.items.length} {language === 'en' ? 'items' : 'பொருட்கள்'}</span>
                  </div>
                  <div className="success-row">
                    <span>{language === 'en' ? 'Delivery Address' : 'விநியோக முகவரி'}</span>
                    <span>{confirmedOrder.address.city}, {maskDataEnabled ? maskPincode(confirmedOrder.address.pincode) : confirmedOrder.address.pincode}</span>
                  </div>
                  <div className="success-row">
                    <span>{language === 'en' ? 'Payment Mode' : 'செலுத்துகை முறை'}</span>
                    <span>{confirmedOrder.payment.method.toUpperCase()} ({confirmedOrder.payment.status === 'paid' ? 'PAID ✅' : 'PENDING ⏳'})</span>
                  </div>
                  <div className="success-row total-row">
                    <span>{language === 'en' ? 'Grand Total' : 'மொத்த தொகை'}</span>
                    <span>₹{confirmedOrder.total}</span>
                  </div>
                </div>

                <div className="success-actions">
                  <Link href="/products" className="success-btn outline focus-visible-ring">
                    <i className="fas fa-shopping-bag"></i> {language === 'en' ? 'Continue Shopping' : 'மேலும் பொருட்களை வாங்க'}
                  </Link>
                  <Link href={`/order-tracking?orderId=${confirmedOrder.orderId}`} className="success-btn primary focus-visible-ring">
                    <i className="fas fa-truck"></i> {language === 'en' ? 'Track Order Status' : 'ஆர்டரைத் கண்காணிக்க'}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Order Summary Grouped by Farmer */}
        {currentStep > 1 && currentStep < 4 && (
          <aside className="checkout-sidebar">
            <div className="co-card">
              <div className="co-card-title">
                <i className="fas fa-shopping-bag"></i> {language === 'en' ? 'Order Summary' : 'ஆர்டர் சுருக்கம்'}
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '14px', paddingRight: '4px' }}>
                {groupsList.map((group) => (
                  <div key={group.sellerId} style={{ marginBottom: '12px', borderBottom: '1px solid #f1f5f2', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      🌾 {group.sellerName}
                    </div>
                    {group.items.map(i => (
                      <div key={`${i.productId}-${i.weight}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0', color: 'var(--text)' }}>
                        <span>{i.name} ({i.quantity} qty)</span>
                        <span style={{ fontWeight: '700' }}>₹{i.price * i.quantity}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: '12px' }}>
                <div className="sum-line">
                  <span>{language === 'en' ? 'Subtotal' : 'பொருட்களின் தொகை'}</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="sum-line">
                  <span>{language === 'en' ? 'Delivery' : 'டெலிவரி கட்டணம்'}</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                </div>
                {discount > 0 && (
                  <div className="sum-line" style={{ color: '#15803d', fontWeight: '700' }}>
                    <span>{language === 'en' ? 'Coupon Discount' : 'தள்ளுபடி'}</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                {codFee > 0 && (
                  <div className="sum-line">
                    <span>{language === 'en' ? 'COD Processing Fee' : 'COD கட்டணம்'}</span>
                    <span>₹{codFee}</span>
                  </div>
                )}
                <div className="sum-line total-line">
                  <span>{language === 'en' ? 'Grand Total' : 'மொத்த தொகை'}</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>

              {/* Sidebar Coupon code input */}
              <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)', display: 'block', marginBottom: '6px' }}>
                  {language === 'en' ? 'APPLY COUPON CODE' : 'விளம்பரக் குறியீடு'}
                </label>
                <div className="coupon-bar">
                  <input 
                    type="text" 
                    className="coupon-input"
                    placeholder="e.g. CURIFY499" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button onClick={handleApplyCoupon} className="coupon-btn focus-visible-ring">
                    {language === 'en' ? 'Apply' : 'சேர்'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      <div style={{ height: '80px' }}></div>
    </div>
  );
}
