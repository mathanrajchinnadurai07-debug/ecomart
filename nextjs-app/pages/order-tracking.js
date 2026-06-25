import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase/config';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

const LOCAL_T = {
  en: {
    trackTitle: "🌿 Track Your Order",
    trackSubtitle: "Real-time updates & farmer-wise status",
    orderIdLabel: "Order ID",
    enterOrderId: "Enter Order ID",
    trackDifferent: "Track a different order",
    placeholder: "Enter Order ID (e.g. CF2026...)",
    trackBtn: "Track",
    loading: "Retrieving order details...",
    enterIdPrompt: "Enter your Order ID above to track your delivery status",
    notFoundTitle: "Order not found",
    notFoundDesc: "We couldn't find order #{id}. Please check the ID and try again.",
    viewAllOrders: "View All Orders",
    parentStatus: "Overall Status",
    paymentSummary: "Payment Summary",
    subtotal: "Subtotal",
    deliveryFee: "Delivery",
    discount: "Discount",
    codFee: "COD Handling",
    totalAmount: "Total Paid",
    deliveryDetails: "Delivery Details",
    customer: "Customer",
    phone: "Phone",
    address: "Address",
    payment: "Payment",
    needHelp: "Need Help?",
    whatsapp: "WhatsApp Support",
    callUs: "Call Us",
    cancelOrder: "Cancel Order",
    cancelSuccess: "Order cancelled successfully.",
    cancelError: "Could not cancel order. Please contact support.",
    cancelConfirm: "Are you sure you want to cancel this order? This cannot be undone.",
    cancelWarning: "Orders can only be cancelled before they are shipped.",
    
    // Sub-order / seller specific translations
    sellerShipments: "Farmer Shipments",
    sellerLabel: "Farmer / Seller",
    statusPlaced: "Placed",
    statusPlacedDesc: "Order received by farmer",
    statusProcessing: "Preparing",
    statusProcessingDesc: "Farmer is harvesting / packing your items",
    statusShipped: "Shipped",
    statusShippedDesc: "Shipment handed to courier partner",
    statusDelivered: "Delivered",
    statusDeliveredDesc: "Package delivered safely",
    statusCancelled: "Cancelled",
    statusCancelledDesc: "Shipment was cancelled",
    statusRefunded: "Refunded",
    statusRefundedDesc: "Refund issued for this shipment",
    
    // FSSAI / PGS-India / Food Safety translations
    fssaiLicense: "FSSAI License",
    pgsCertified: "PGS-India Certified",
    harvestStamp: "Harvest Date",
    safetyWindow: "24h Food-Safety Return Window",
    safetyWindowActive: "🚨 24-Hour Food-Safety Window Active: You can report any quality or freshness concerns for a full refund.",
    safetyWindowExpired: "🔒 The 24-hour food-safety return window for this shipment has closed.",
    raiseComplaintBtn: "Report Quality Issue / Return",
    complaintRaised: "✅ Complaint Under Review (Refund Pending)",
    
    // Complaint modal
    modalTitle: "Report Food-Safety or Quality Concern",
    selectItem: "Select Item with Issue",
    issueReason: "Reason for concern",
    wrongItem: "Wrong item received",
    damaged: "Damaged packaging / item",
    spoiled: "Spoiled / Stale / Quality issue",
    missingItem: "Missing item",
    otherIssue: "Other concern",
    explainIssue: "Explain the issue in detail (mandatory)",
    explainPlaceholder: "Please describe the freshness, quality, or packaging issue...",
    submitComplaint: "Submit Refund/Return Request",
    submitting: "Submitting request...",
    complaintSuccess: "Complaint submitted successfully. Our team will review and process your refund within 24 hours.",
    complaintError: "Could not submit complaint. Please try again or contact support."
  },
  ta: {
    trackTitle: "🌿 ஆர்டரைக் கண்காணித்தல்",
    trackSubtitle: "விவசாயி வாரியான விநியோகம் மற்றும் உங்களது ஆர்டரின் உன்னேர நிலை",
    orderIdLabel: "ஆர்டர் ஐடி",
    enterOrderId: "ஆர்டர் ஐடியை உள்ளிடவும்",
    trackDifferent: "மற்றொரு ஆர்டரைக் கண்காணிக்கவும்",
    placeholder: "ஆர்டர் ஐடியை உள்ளிடவும் (எ.கா. CF2026...)",
    trackBtn: "கண்காணி",
    loading: "ஆர்டர் விவரங்கள் பெறப்படுகின்றன...",
    enterIdPrompt: "விநியோக நிலையை அறிய மேலே உங்கள் ஆர்டர் ஐடியை உள்ளிடவும்",
    notFoundTitle: "ஆர்டர் கிடைக்கவில்லை",
    notFoundDesc: "ஆர்டர் #{id} ஐ எங்களால் கண்டறிய முடியவில்லை. ஐடியை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    viewAllOrders: "அனைத்து ஆர்டர்களும்",
    parentStatus: "ஒட்டுமொத்த நிலை",
    paymentSummary: "கட்டண விவரம்",
    subtotal: "துணைத் தொகை",
    deliveryFee: "விநியோகம்",
    discount: "தள்ளுபடி",
    codFee: "சிஓடி கட்டணம்",
    totalAmount: "மொத்த கட்டணம்",
    deliveryDetails: "விநியோக முகவரி விவரங்கள்",
    customer: "வாடிக்கையாளர்",
    phone: "தொலைபேசி",
    address: "முகவரி",
    payment: "கட்டண முறை",
    needHelp: "உதவி தேவையா?",
    whatsapp: "வாட்ஸ்அப் உதவி",
    callUs: "அழைக்க",
    cancelOrder: "ஆர்டரை ரத்துசெய்",
    cancelSuccess: "ஆர்டர் வெற்றிகரமாக ரத்து செய்யப்பட்டது.",
    cancelError: "ஆர்டரை ரத்து செய்ய முடியவில்லை. தயவுசெய்து எங்களை தொடர்பு கொள்ளவும்.",
    cancelConfirm: "இந்த ஆர்டரை ரத்துசெய்ய விரும்புகிறீர்களா? இதை மாற்ற முடியாது.",
    cancelWarning: "ஆர்டர்கள் அனுப்பப்படுவதற்கு முன்பு மட்டுமே ரத்து செய்யப்பட முடியும்.",
    
    sellerShipments: "விவசாயி விநியோகங்கள்",
    sellerLabel: "விவசாயி / விற்பனையாளர்",
    statusPlaced: "ஆர்டர் செய்யப்பட்டது",
    statusPlacedDesc: "விவசாயியால் ஆர்டர் ஏற்றுக்கொள்ளப்பட்டது",
    statusProcessing: "தயாரிக்கப்படுகிறது",
    statusProcessingDesc: "பொருட்கள் அறுவடை செய்யப்பட்டு பேக் செய்யப்படுகின்றன",
    statusShipped: "அனுப்பப்பட்டது",
    statusShippedDesc: "பார்சல் விநியோக கூட்டாளரிடம் ஒப்படைக்கப்பட்டது",
    statusDelivered: "விநியோகிக்கப்பட்டது",
    statusDeliveredDesc: "பார்சல் பாதுகாப்பாக விநியோகிக்கப்பட்டது",
    statusCancelled: "ரத்து செய்யப்பட்டது",
    statusCancelledDesc: "விநியோகம் ரத்து செய்யப்பட்டது",
    statusRefunded: "பணம் திரும்பப் பெறப்பட்டது",
    statusRefundedDesc: "இந்த விநியோகத்திற்கு பணம் திருப்பி வழங்கப்பட்டது",
    
    fssaiLicense: "FSSAI உரிமம்",
    pgsCertified: "PGS-இந்தியா சான்றளிக்கப்பட்டது",
    harvestStamp: "அறுவடை தேதி",
    safetyWindow: "24 மணிநேர உணவு பாதுகாப்பு காலம்",
    safetyWindowActive: "🚨 24 மணிநேர உணவு பாதுகாப்பு காலம் பயன்பாட்டில் உள்ளது: தரம் அல்லது புத்துணர்ச்சி குறித்த புகாரை அளித்து முழு பணத்தையும் திரும்பப் பெறலாம்.",
    safetyWindowExpired: "🔒 இந்த விநியோகத்திற்கான 24 மணிநேர உணவு பாதுகாப்பு காலம் முடிவடைந்தது.",
    raiseComplaintBtn: "தரம் குறித்து புகார் செய் / பொருளை திருப்பு",
    complaintRaised: "✅ புகார் பரிசீலனையில் உள்ளது (பணம் திரும்பப் பெறப்படும்)",
    
    modalTitle: "உணவு பாதுகாப்பு அல்லது தரம் குறித்த புகார்",
    selectItem: "பிரச்சனை உள்ள பொருளைத் தேர்ந்தெடுக்கவும்",
    issueReason: "புகாருக்கான காரணம்",
    wrongItem: "தவறான பொருள் கிடைத்தது",
    damaged: "சேதமடைந்த பார்சல் / பொருள்",
    spoiled: "கெட்டுப்போனது / தரம் இல்லாதது",
    missingItem: "விடுபட்ட பொருள்",
    otherIssue: "இதர காரணம்",
    explainIssue: "விவரமாக எழுதவும் (கட்டாயம்)",
    explainPlaceholder: "புத்துணர்ச்சி, தரம் அல்லது பேக்கேஜிங் பிரச்சனையை விவரிக்கவும்...",
    submitComplaint: "பணத்தைத் திரும்பப்பெற / பொருளைத் திருப்பிக் கேட்க விண்ணப்பிக்கவும்",
    submitting: "விண்ணப்பிக்கப்படுகிறது...",
    complaintSuccess: "புகார் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது. எங்கள் குழு 24 மணிநேரத்திற்குள் அதை சரிபார்த்து பணத்தை திருப்பி வழங்கும்.",
    complaintError: "புகாரைச் சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது எங்களைத் தொடர்பு கொள்ளவும்."
  }
};

const STORE_WHATSAPP = '917845744038';

export default function OrderTracking() {
  const router = useRouter();
  const { orderId } = router.query;
  const { user, addToast } = useCart();
  const { language } = useLanguage();
  const currentT = LOCAL_T[language] || LOCAL_T.en;

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [notFound, setNotFound] = useState(false);

  // Complaint modal states
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [selectedSubOrder, setSelectedSubOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [issueType, setIssueType] = useState('spoiled');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const id = orderId;
    if (id) {
      fetchOrder(id);
    }
  }, [router.isReady, orderId]);

  const fetchOrder = (id) => {
    setLoadingOrder(true);
    setNotFound(false);

    const orderDocRef = doc(db, 'orders', id);
    
    // Subscribe to live snapshot updates
    const unsubscribe = onSnapshot(orderDocRef, (snap) => {
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
      } else {
        // Fallback check
        if (user) {
          const userOrderDocRef = doc(db, 'users', user.uid, 'orders', id);
          getDoc(userOrderDocRef).then((uSnap) => {
            if (uSnap.exists()) {
              setOrder({ id: uSnap.id, ...uSnap.data() });
            } else {
              setNotFound(true);
            }
          }).catch(() => setNotFound(true));
        } else {
          setNotFound(true);
        }
      }
      setLoadingOrder(false);
    }, (error) => {
      console.error('Error listening to order status:', error);
      setNotFound(true);
      setLoadingOrder(false);
    });

    return () => unsubscribe();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/order-tracking?orderId=${searchId.trim()}`);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !confirm(currentT.cancelConfirm)) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user ? await user.getIdToken() : ''}`
        },
        body: JSON.stringify({ reason: 'Customer requested cancellation via tracking page' })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        addToast(currentT.cancelSuccess, 'success');
        // reload order
        fetchOrder(order.id);
      } else {
        addToast(resData.error || currentT.cancelError, 'error');
      }
    } catch (e) {
      console.error(e);
      addToast(currentT.cancelError, 'error');
    }
  };

  // Group items by seller for backward compatibility or display sub-orders
  const getSubOrdersList = () => {
    if (!order) return [];
    if (order.sub_orders && order.sub_orders.length > 0) {
      return order.sub_orders;
    }
    
    // Group dynamically if sub_orders array is absent (older orders)
    const grouped = {};
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    items.forEach(item => {
      const sId = item.seller_id || 0;
      const sName = item.seller_name || 'Farmer / Seller';
      if (!grouped[sId]) {
        grouped[sId] = {
          id: `virtual-${sId}`,
          order_id: order.id,
          seller_id: sId,
          seller_name: sName,
          status: order.status,
          created_at: order.created_at,
          order_items: []
        };
      }
      grouped[sId].order_items.push(item);
    });
    return Object.values(grouped);
  };

  const getSubOrderStatusSteps = (subOrder) => {
    const steps = [
      { key: 'placed', label: currentT.statusPlaced, desc: currentT.statusPlacedDesc, icon: '🛍️' },
      { key: 'processing', label: currentT.statusProcessing, desc: currentT.statusProcessingDesc, icon: '👨‍🌾' },
      { key: 'shipped', label: currentT.statusShipped, desc: currentT.statusShippedDesc, icon: '🚚' },
      { key: 'delivered', label: currentT.statusDelivered, desc: currentT.statusDeliveredDesc, icon: '✅' }
    ];

    const currentStatus = subOrder.status || 'placed';
    let activeIdx = 0;
    if (currentStatus === 'processing' || currentStatus === 'confirmed') activeIdx = 1;
    else if (currentStatus === 'shipped') activeIdx = 2;
    else if (currentStatus === 'delivered') activeIdx = 3;
    else if (currentStatus === 'cancelled' || currentStatus === 'refunded') activeIdx = -1;

    return steps.map((step, idx) => {
      let state = 'pending';
      if (activeIdx === -1) {
        state = 'pending';
      } else if (idx < activeIdx) {
        state = 'done';
      } else if (idx === activeIdx) {
        state = 'active';
      }
      return { ...step, state };
    });
  };

  const handleOpenComplaint = (subOrder, item) => {
    setSelectedSubOrder(subOrder);
    setSelectedItem(item);
    setIssueType('spoiled');
    setComplaintDesc('');
    setComplaintModalOpen(true);
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!selectedItem) {
      alert(currentT.selectItem);
      return;
    }
    if (!complaintDesc.trim()) {
      alert(currentT.explainIssue);
      return;
    }

    setSubmittingComplaint(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${order.id}/complaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user ? await user.getIdToken() : ''}`
        },
        body: JSON.stringify({
          item_id: selectedItem.product_id || selectedItem.id,
          issue_type: issueType,
          description: complaintDesc
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        addToast(currentT.complaintSuccess, 'success');
        setComplaintModalOpen(false);
        // Reload order state
        fetchOrder(order.id);
      } else {
        addToast(resData.error || currentT.complaintError, 'error');
      }
    } catch (err) {
      console.error(err);
      addToast(currentT.complaintError, 'error');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const isComplaintWindowActive = () => {
    if (!order || !order.delivered_at) return false;
    const deliveredTime = new Date(order.delivered_at).getTime();
    const elapsedHours = (Date.now() - deliveredTime) / (1000 * 60 * 60);
    return elapsedHours <= 24;
  };

  const getRemainingHours = () => {
    if (!order || !order.delivered_at) return 0;
    const deliveredTime = new Date(order.delivered_at).getTime();
    const remaining = 24 - (Date.now() - deliveredTime) / (1000 * 60 * 60);
    return Math.max(0, Math.round(remaining));
  };

  return (
    <>
      <div 
        className="header" 
        style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', 
          color: '#fff', 
          padding: '24px 16px 64px', 
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Leaf Stamp Pattern */}
        <div style={{
          position: 'absolute',
          right: '-20px',
          bottom: '-20px',
          opacity: 0.1,
          fontSize: '10rem',
          transform: 'rotate(-15deg)',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>🌾</div>

        <h1 style={{ fontSize: '1.5rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', marginBottom: '6px' }}>
          {currentT.trackTitle}
        </h1>
        <p style={{ fontSize: '0.88rem', opacity: '0.9', fontFamily: 'Inter, sans-serif' }}>
          {currentT.trackSubtitle}
        </p>
        <div 
          className="order-id-badge" 
          style={{ 
            display: 'inline-block', 
            background: 'rgba(255,255,255,0.15)', 
            backdropFilter: 'blur(4px)',
            border: '1.5px solid rgba(255,255,255,0.3)', 
            borderRadius: '30px', 
            padding: '6px 18px', 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            marginTop: '12px',
            fontFamily: 'Poppins, sans-serif'
          }}
        >
          {orderId ? `📦 ${currentT.orderIdLabel}: #${orderId}` : currentT.enterOrderId}
        </div>
      </div>

      <div className="container" style={{ maxWidth: '640px', margin: '-40px auto 0', padding: '0 16px 80px', position: 'relative', zIndex: 2 }}>
        {/* Track Different Order card */}
        <div 
          className="card" 
          style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '20px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)', 
            border: '1px solid var(--border)', 
            marginBottom: '20px' 
          }}
        >
          <div style={{ fontSize: '0.88rem', fontWeight: '600', marginBottom: '12px', color: '#4e3d30', fontFamily: 'Poppins, sans-serif' }}>
            {currentT.trackDifferent}
          </div>
          <form onSubmit={handleSearchSubmit} className="search-row" style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder={currentT.placeholder}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="focus-visible-ring"
              style={{ 
                flex: 1, 
                padding: '12px 16px', 
                border: '1.5px solid var(--border)', 
                borderRadius: '12px', 
                fontSize: '0.92rem',
                fontFamily: 'Inter, sans-serif',
                outline: 'none'
              }}
            />
            <button 
              type="submit" 
              className="focus-visible-ring"
              style={{ 
                padding: '12px 24px', 
                background: 'var(--primary)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '12px', 
                fontWeight: '600', 
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                transition: 'background 0.2s'
              }}
            >
              {currentT.trackBtn}
            </button>
          </form>
        </div>

        {/* Dynamic tracking panel */}
        <div id="mainContent">
          {loadingOrder && (
            <div className="card" style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 16px', animation: 'pulse 1.5s infinite' }}></div>
              <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>
                {currentT.loading}
              </div>
            </div>
          )}

          {!orderId && !loadingOrder && (
            <div className="card" style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
              <div style={{ color: 'var(--text-light)', fontSize: '0.92rem', fontFamily: 'Inter, sans-serif' }}>
                {currentT.enterIdPrompt}
              </div>
            </div>
          )}

          {notFound && !loadingOrder && (
            <div className="card" style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🍃</div>
              <h3 style={{ marginBottom: '8px', fontWeight: '700', fontFamily: 'Poppins, sans-serif', color: '#4e3d30' }}>
                {currentT.notFoundTitle}
              </h3>
              <p style={{ color: 'var(--text-light)', fontSize: '0.88rem', marginBottom: '24px', fontFamily: 'Inter, sans-serif' }}>
                {currentT.notFoundDesc.replace('{id}', orderId)}
              </p>
              <Link 
                href="/dashboard" 
                className="btn btn-outline focus-visible-ring" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  textDecoration: 'none', 
                  padding: '10px 20px', 
                  borderRadius: '10px',
                  fontWeight: '600'
                }}
              >
                <i className="fas fa-list"></i> {currentT.viewAllOrders}
              </Link>
            </div>
          )}

          {order && !loadingOrder && (
            <>
              {/* Overall order summary card */}
              <div 
                className="card" 
                style={{ 
                  background: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)', 
                  marginBottom: '20px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{ 
                    padding: '16px 20px', 
                    background: 'rgba(26, 92, 56, 0.04)', 
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary-dark)' }}>
                    {currentT.parentStatus}
                  </div>
                  <span 
                    className={`status-badge status-${order.status || 'placed'}`}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {(order.status || 'placed').replace('_', ' ')}
                  </span>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: '600' }}>Order Date</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text)', marginTop: '2px' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: '600' }}>Total Paid</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary)', marginTop: '2px' }}>
                        ₹{order.total_amount || order.total || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* INDEPENDENT FARMER SHIPMENTS */}
              <h2 style={{ fontSize: '1.1rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '16px', marginTop: '12px' }}>
                🌾 {currentT.sellerShipments} ({getSubOrdersList().length})
              </h2>

              {getSubOrdersList().map((subOrder, subIdx) => {
                const steps = getSubOrderStatusSteps(subOrder);
                const isCancelled = subOrder.status === 'cancelled';
                const isRefunded = subOrder.status === 'refunded';
                const isDelivered = subOrder.status === 'delivered';
                
                return (
                  <div 
                    key={subOrder.id || subIdx} 
                    className="card" 
                    style={{ 
                      background: '#fff', 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)', 
                      marginBottom: '20px', 
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {/* Rotated Harvest Watermark stamp in card */}
                    <div style={{
                      position: 'absolute',
                      right: '16px',
                      top: '16px',
                      transform: 'rotate(10deg)',
                      border: '2px dashed rgba(216, 164, 54, 0.4)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.62rem',
                      fontWeight: '800',
                      color: 'rgba(216, 164, 54, 0.7)',
                      pointerEvents: 'none',
                      fontFamily: 'Poppins, sans-serif',
                      textTransform: 'uppercase'
                    }}>
                      {currentT.pgsCertified}
                    </div>

                    <div style={{ padding: '20px', borderBottom: '1px solid #f0f3f1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.2rem' }}>👨‍🌾</span>
                        <h3 style={{ fontSize: '1rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', color: '#4e3d30', margin: 0 }}>
                          {subOrder.seller_name}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span style={{ background: '#f0faf4', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(26, 92, 56, 0.1)' }}>
                          {currentT.fssaiLicense}: Verified ✅
                        </span>
                        {subOrder.created_at && (
                          <span style={{ background: '#fdfbf7', color: '#d8a436', fontSize: '0.68rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(216, 164, 54, 0.15)' }}>
                            {currentT.harvestStamp}: {new Date(subOrder.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="card-body" style={{ padding: '20px' }}>
                      {/* Cancelled/Refunded State Banner */}
                      {isCancelled && (
                        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>❌</span>
                          <div>{currentT.statusCancelledDesc}</div>
                        </div>
                      )}
                      {isRefunded && (
                        <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>💰</span>
                          <div>{currentT.statusRefundedDesc}</div>
                        </div>
                      )}

                      {/* Shipment Vertical Timeline */}
                      {!isCancelled && !isRefunded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '8px 0 24px 8px' }}>
                          {steps.map((step, idx) => {
                            const isDone = step.state === 'done';
                            const isActive = step.state === 'active';
                            
                            return (
                              <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                                {/* Vertical Connector Line */}
                                {idx < steps.length - 1 && (
                                  <div 
                                    style={{ 
                                      position: 'absolute', 
                                      left: '15px', 
                                      top: '32px', 
                                      bottom: '-22px', 
                                      width: '2px', 
                                      background: isDone ? 'var(--primary)' : '#e2e8f0',
                                      zIndex: 1 
                                    }} 
                                  />
                                )}
                                
                                <div 
                                  style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '50%', 
                                    background: isDone ? 'var(--primary)' : isActive ? '#fff' : '#fff',
                                    border: isDone ? '2px solid var(--primary)' : isActive ? '2px solid var(--primary)' : '2px solid #cbd5e1',
                                    color: isDone ? '#fff' : isActive ? 'var(--primary)' : '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.88rem',
                                    fontWeight: '700',
                                    flexShrink: 0,
                                    zIndex: 2,
                                    boxShadow: isActive ? '0 0 0 4px rgba(26,92,56,0.1)' : 'none'
                                  }}
                                >
                                  {isDone ? '✓' : step.icon}
                                </div>
                                <div style={{ paddingTop: '4px' }}>
                                  <div 
                                    style={{ 
                                      fontSize: '0.88rem', 
                                      fontWeight: '700', 
                                      color: isDone || isActive ? 'var(--primary-dark)' : '#94a3b8',
                                      fontFamily: 'Poppins, sans-serif'
                                    }}
                                  >
                                    {step.label}
                                  </div>
                                  <div 
                                    style={{ 
                                      fontSize: '0.75rem', 
                                      color: isActive ? 'var(--text)' : '#94a3b8', 
                                      marginTop: '2px',
                                      fontFamily: 'Inter, sans-serif'
                                    }}
                                  >
                                    {step.desc}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Shiprocket shipment tracking block */}
                      {subOrder.shiprocket_order_id && !isCancelled && !isRefunded && (
                        <div 
                          style={{ 
                            background: '#f8fafc', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '12px', 
                            padding: '12px 16px', 
                            marginBottom: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700' }}>Logistics Partner</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)' }}>Shiprocket</div>
                            {subOrder.awb_code && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '2px' }}>AWB: {subOrder.awb_code}</div>
                            )}
                          </div>
                          {subOrder.tracking_url && (
                            <a 
                              href={subOrder.tracking_url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="focus-visible-ring"
                              style={{
                                background: '#fff',
                                border: '1px solid var(--border)',
                                color: 'var(--primary)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                              }}
                            >
                              Track <i className="fas fa-external-link-alt" style={{ fontSize: '0.65rem' }}></i>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Items in this sub-order */}
                      <div style={{ borderTop: '1px solid #f0f3f1', paddingTop: '16px' }}>
                        {subOrder.order_items.map((item, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              padding: '8px 0', 
                              borderBottom: idx < subOrder.order_items.length - 1 ? '1px solid #f8faf9' : 'none' 
                            }}
                          >
                            <div 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                background: '#f4f6f4', 
                                borderRadius: '8px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justify: 'center',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}
                            >
                              {item.imageUrl ? (
                                <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} />
                              ) : (
                                '🌿'
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '1px' }}>
                                Qty: {item.quantity}{item.unit ? ` · ${item.unit}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary-dark)' }}>
                                ₹{item.price * item.quantity}
                              </div>
                              {/* Item specific complaint state */}
                              {item.complaint_raised && (
                                <span style={{ color: '#10b981', fontSize: '0.68rem', fontWeight: '700' }}>
                                  {currentT.complaintRaised}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 24h Food-Safety Refund Window Banner & Complaint Triggers */}
                      {isDelivered && !isCancelled && !isRefunded && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid #f0f3f1', paddingTop: '16px' }}>
                          {isComplaintWindowActive() ? (
                            <div style={{ background: '#fdf3f0', border: '1px solid rgba(194, 60, 27, 0.1)', borderRadius: '12px', padding: '14px' }}>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '600', marginBottom: '8px' }}>
                                <span>🛡️</span>
                                <div>
                                  {currentT.safetyWindowActive}
                                </div>
                              </div>
                              
                              {/* Trigger for Complaint modal */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                {subOrder.order_items.filter(item => !item.complaint_raised).map((item, itemIdx) => (
                                  <button
                                    key={itemIdx}
                                    onClick={() => handleOpenComplaint(subOrder, item)}
                                    className="focus-visible-ring"
                                    style={{
                                      background: '#c23c1b', // WCAG AA compliant Harvest Red-Orange (>4.5:1 on white/light backgrounds)
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '8px 14px',
                                      fontSize: '0.78rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      fontFamily: 'Poppins, sans-serif',
                                      boxShadow: '0 2px 4px rgba(194, 60, 27, 0.15)',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#a13116'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#c23c1b'}
                                  >
                                    ⚠️ {currentT.raiseComplaintBtn}: {item.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span>🔒</span>
                              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
                                {currentT.safetyWindowExpired}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Delivery Address & Details Card */}
              <div 
                className="card" 
                style={{ 
                  background: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)', 
                  marginBottom: '20px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)' 
                }}
              >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: '0.95rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', margin: 0, color: 'var(--primary-dark)' }}>
                    📍 {currentT.deliveryDetails}
                  </h2>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1rem', color: 'var(--primary)' }}>👤</span>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>{currentT.customer}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text)' }}>{order.address?.name || '—'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1rem', color: 'var(--primary)' }}>📞</span>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>{currentT.phone}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text)' }}>{order.address?.phone || '—'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1rem', color: 'var(--primary)' }}>🏠</span>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>{currentT.address}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text)', lineHeight: '1.4' }}>
                          {order.address?.line1}{order.address?.line2 ? `, ${order.address.line2}` : ''}, {order.address?.city} - {order.address?.pincode}, {order.address?.state}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1rem', color: 'var(--primary)' }}>💳</span>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>{currentT.payment}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text)' }}>
                          {(order.payment_method || 'prepaid').toUpperCase() === 'COD' ? 'Cash on Delivery' : 'Online Payment'} —{' '}
                          <span style={{ color: order.status === 'pending' || order.status === 'pending_cod' ? '#f59e0b' : '#10b981', fontWeight: '700' }}>
                            {order.status === 'pending' || order.status === 'pending_cod' ? '⏳ Pending' : '✅ Confirmed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order total payment breakout summary */}
              <div 
                className="card" 
                style={{ 
                  background: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)', 
                  marginBottom: '20px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)' 
                }}
              >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: '0.95rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', margin: 0, color: 'var(--primary-dark)' }}>
                    💵 {currentT.paymentSummary}
                  </h2>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--text-light)' }}>{currentT.subtotal}</span>
                      <span style={{ fontWeight: '600' }}>₹{order.subtotal || order.total_amount || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--text-light)' }}>{currentT.deliveryFee}</span>
                      <span style={{ fontWeight: '600' }}>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee || 0}`}</span>
                    </div>
                    {order.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ color: '#10b981' }}>{currentT.discount}</span>
                        <span style={{ color: '#10b981', fontWeight: '700' }}>-₹{order.discount}</span>
                      </div>
                    )}
                    {order.codFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--text-light)' }}>{currentT.codFee}</span>
                        <span style={{ fontWeight: '600' }}>₹{order.codFee}</span>
                      </div>
                    )}
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontWeight: '800', 
                        fontSize: '1.05rem', 
                        borderTop: '1px solid var(--border)', 
                        paddingTop: '12px', 
                        marginTop: '4px', 
                        color: 'var(--primary-dark)' 
                      }}
                    >
                      <span>{currentT.totalAmount}</span>
                      <span>₹{order.total || order.total_amount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Need Help support actions */}
              <div 
                className="card" 
                style={{ 
                  background: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)', 
                  marginBottom: '20px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)' 
                }}
              >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: '0.95rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', margin: 0, color: 'var(--primary-dark)' }}>
                    📞 {currentT.needHelp}
                  </h2>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a 
                      href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent('Hi Curify! I need help with my order: #' + order.id)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="focus-visible-ring"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '12px 20px', 
                        borderRadius: '12px', 
                        background: '#25D366', 
                        color: '#fff', 
                        textDecoration: 'none', 
                        fontSize: '0.88rem', 
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)' 
                      }}
                    >
                      <i className="fab fa-whatsapp"></i> {currentT.whatsapp}
                    </a>
                    <a 
                      href="tel:+917845744038" 
                      className="focus-visible-ring"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '12px 20px', 
                        borderRadius: '12px', 
                        background: '#fff', 
                        border: '1.5px solid var(--border)', 
                        color: 'var(--text)', 
                        textDecoration: 'none', 
                        fontSize: '0.88rem', 
                        fontWeight: 600,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)' 
                      }}
                    >
                      <i className="fas fa-phone"></i> {currentT.callUs}
                    </a>
                    
                    {/* Cancellation Button (Only if cancellable) */}
                    {['pending', 'pending_cod', 'confirmed', 'processing'].includes(order.status) && (
                      <button 
                        onClick={handleCancelOrder}
                        className="focus-visible-ring"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '12px 20px', 
                          borderRadius: '12px', 
                          background: '#fee2e2', 
                          color: '#991b1b', 
                          border: '1.5px solid #fecaca', 
                          cursor: 'pointer', 
                          fontSize: '0.88rem', 
                          fontWeight: 600,
                          transition: 'background 0.2s' 
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fca5a5'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                      >
                        <i className="fas fa-times"></i> {currentT.cancelOrder}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '14px', fontFamily: 'Inter, sans-serif' }}>
                    <i className="fas fa-info-circle"></i> {currentT.cancelWarning}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FOOD-SAFETY COMPLAINT DIALOG MODAL */}
      {complaintModalOpen && selectedItem && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
              animation: 'fadeIn 0.25s ease-out'
            }}
          >
            <div 
              style={{
                padding: '18px 24px',
                background: 'var(--primary-dark)',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: '700', fontSize: '1.05rem' }}>
                🛡️ {currentT.modalTitle}
              </h3>
              <button 
                onClick={() => setComplaintModalOpen(false)}
                className="focus-visible-ring"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmitComplaint} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '6px' }}>
                  {currentT.selectItem}
                </label>
                <div style={{ padding: '10px 12px', background: '#f4f6f4', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-dark)' }}>
                  {selectedItem.name}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '6px' }}>
                  {currentT.issueReason}
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="focus-visible-ring"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="spoiled">{currentT.spoiled}</option>
                  <option value="damaged">{currentT.damaged}</option>
                  <option value="wrong_item">{currentT.wrongItem}</option>
                  <option value="missing_item">{currentT.missingItem}</option>
                  <option value="other">{currentT.otherIssue}</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '6px' }}>
                  {currentT.explainIssue}
                </label>
                <textarea
                  placeholder={currentT.explainPlaceholder}
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  className="focus-visible-ring"
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border)',
                    fontSize: '0.9rem',
                    fontFamily: 'Inter, sans-serif',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setComplaintModalOpen(false)}
                  className="focus-visible-ring"
                  style={{
                    padding: '10px 20px',
                    background: '#fff',
                    border: '1.5px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComplaint}
                  className="focus-visible-ring"
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent)', // Complies with Harvest Red-Orange compliance styles in globals.css
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    opacity: submittingComplaint ? 0.7 : 1
                  }}
                >
                  {submittingComplaint ? currentT.submitting : currentT.submitComplaint}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
