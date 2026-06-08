import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';

export default function Layout({ children }) {
  const router = useRouter();
  const { user, userProfile, cart, wishlist, logout, addToast } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [userLocation, setUserLocation] = useState('Detect Location');

  // Chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const msgsEndRef = useRef(null);

  const STORE_NAME = 'Curify';
  const STORE_HOURS = '9:00 AM – 9:00 PM';
  const currentHour = new Date().getHours();
  const isOpen = currentHour >= 9 && currentHour < 21;

  const AUTO_REPLIES = {
    greeting: `🌿 Welcome to ${STORE_NAME}!\n\nHi! I'm Curify Bot, your 24/7 assistant.\n\nHow can I help?\n\n1️⃣ Track my order\n2️⃣ Product information\n3️⃣ Delivery & shipping\n4️⃣ Returns & refunds\n5️⃣ Speak to a human`,
    order_tracking: `📦 Track Your Order\n\nTo track your order, go to the Account Dashboard or Support page.\n\nOr share your Order ID and we'll check it for you!\n\nOrders placed before 2 PM ship same day.`,
    delivery: `🚚 Delivery Info\n\n✅ Free delivery above ₹499\n📦 Standard: 2-4 business days\n⚡ Express: Next day (select areas)\n\nBelow ₹499 → ₹49 fee\nAbove ₹499 → FREE\n\n📍 We deliver across India!`,
    returns: `↩️ Returns & Refunds\n\n✅ 7-day easy returns\n✅ Full refund for damaged items\n✅ Replacement for wrong items\n\n1. Share order ID\n2. Tell us the issue\n3. We'll arrange pickup\n4. Refund in 5-7 days`,
    products: `🌿 Our Products\n\nWe offer a wide variety of fresh organic foods and snacks. Head over to our catalog to see them all!\n\n🛒 Shop: /products`,
    payment: `💳 Payment Methods\n\n✅ Google Pay / UPI\n✅ PhonePe\n✅ Credit / Debit Cards\n✅ Net Banking\n✅ Cash on Delivery\n\n🔒 Secured by Razorpay (RBI approved)`,
    hours: `🕐 Store Hours\n\n⏰ ${STORE_HOURS}\n📅 Monday to Sunday\n\n${isOpen ? '🟢 We are OPEN!' : '🔴 Currently CLOSED. Leave a message!'}\n\nBot is 24/7! 🤖`,
    fallback: `Thanks for reaching out! 🌿\n\nOur team will reply within ${isOpen ? '5 minutes' : 'a few hours'}.\n\n📦 Track in your Account Page\n🛒 Shop: /products`
  };

  useEffect(() => {
    // Show badge after 3 seconds
    const timer = setTimeout(() => {
      if (!chatOpen) setShowBadge(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [chatOpen]);

  useEffect(() => {
    if (msgsEndRef.current) {
      msgsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  // Inactivity session timeout (15 mins)
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        addToast('You have been logged out due to inactivity. 🔒', 'warning');
      }, INACTIVITY_LIMIT);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    resetTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  const handleSearch = (e) => {
    e?.preventDefault();
    let url = '/products?';
    if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;
    if (searchCategory) url += `category=${searchCategory}&`;
    router.push(url);
  };

  const handleDetectLocation = (e) => {
    e.preventDefault();
    if (navigator.geolocation) {
      setUserLocation('Detecting...');
      navigator.geolocation.getCurrentPosition(
        () => {
          setUserLocation('Location Set ✓');
          addToast('Delivery location set to your current location!', 'success');
        },
        () => {
          setUserLocation('Mumbai, MH');
          addToast('Could not detect location. Defaulting to Mumbai.', 'info');
        }
      );
    }
  };

  const toggleChat = () => {
    const nextState = !chatOpen;
    setChatOpen(nextState);
    if (nextState) {
      setShowBadge(false);
      if (chatMessages.length === 0) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setChatMessages([{ sender: 'bot', text: AUTO_REPLIES.greeting }]);
        }, 1000);
      }
    }
  };

  const sendBotReply = (userText) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const lo = userText.toLowerCase();
      let reply = AUTO_REPLIES.fallback;
      if (/order|track|where|status/.test(lo)) reply = AUTO_REPLIES.order_tracking;
      else if (/deliver|ship|time|days|fee|charge/.test(lo)) reply = AUTO_REPLIES.delivery;
      else if (/return|refund|replace|exchange|damage/.test(lo)) reply = AUTO_REPLIES.returns;
      else if (/pay|gpay|phonepe|card|upi|cod|cash/.test(lo)) reply = AUTO_REPLIES.payment;
      else if (/product|item|organic|fresh|category/.test(lo)) reply = AUTO_REPLIES.products;
      else if (/hour|time|open|close|available/.test(lo)) reply = AUTO_REPLIES.hours;
      else if (/hi|hello|hey|namaste|help/.test(lo)) reply = AUTO_REPLIES.greeting;
      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 800 + Math.random() * 500);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text }]);
    setChatInput('');
    sendBotReply(text);
  };

  const handleQuickChat = (type) => {
    const labels = {
      track: '📦 Track my order',
      delivery: '🚚 Delivery info',
      returns: '↩️ Returns policy',
      payment: '💳 Payment methods',
      hours: '🕐 Store hours'
    };
    const text = labels[type];
    setChatMessages((prev) => [...prev, { sender: 'user', text }]);
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const map = { track: 'order_tracking', delivery: 'delivery', returns: 'returns', payment: 'payment', hours: 'hours' };
      const reply = AUTO_REPLIES[map[type]] || AUTO_REPLIES.fallback;
      setChatMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 600);
  };

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      {/* HEADER */}
      <header className="m-header" id="mHeader">
        <div className="m-header-top">
          <Link href="/" className="m-logo">
            <div className="m-logo-icon"><span>🌿</span></div>
            <div className="m-logo-text"><span>Curify</span><span>Organic</span></div>
          </Link>
          <div className="m-header-actions">
            {user ? (
              <>
                <Link href="/dashboard" className="m-header-btn" id="authBtn">
                  <i className="fas fa-user-circle"></i>
                  <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>
                    {userProfile?.name ? userProfile.name.split(' ')[0] : 'Profile'}
                  </span>
                </Link>
                <button 
                  onClick={logout} 
                  className="m-header-btn" 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                  title="Logout"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </>
            ) : (
              <Link href="/login" className="m-header-btn" id="authBtn">
                <i className="fas fa-user"></i>
                <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>Login</span>
              </Link>
            )}
            <Link href="/dashboard?tab=wishlist" className="m-header-btn">
              <i className="fas fa-heart"></i>
              {wishlist.length > 0 && (
                <span className="m-bnav-badge" style={{ display: 'flex', top: '-4px', right: '-4px' }}>
                  {wishlist.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="m-search-wrap">
          <select 
            className="m-search-dept" 
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
          >
            <option value="">All</option>
            <option value="biscuits">Biscuits</option>
            <option value="snacks">Snacks</option>
            <option value="mushroom">Mushroom</option>
            <option value="chicken">Chicken</option>
            <option value="mutton">Mutton</option>
            <option value="grocery">Grocery</option>
            <option value="herbal">Herbal</option>
            <option value="dryfruits">Dry Fruits</option>
            <option value="flour">Flour</option>
            <option value="beverages">Beverages</option>
            <option value="spreads">Spreads</option>
            <option value="pickles">Pickles</option>
            <option value="superfoods">Superfoods</option>
            <option value="readytocook">Ready to Cook</option>
            <option value="vegetables">Vegetables</option>
            <option value="fruits">Fruits</option>
          </select>
          <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <i className="fas fa-search m-search-icon"></i>
          </button>
          <input 
            type="text" 
            placeholder="Search 50+ organic products..." 
            className="m-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="m-location-bar">
          <i className="fas fa-map-marker-alt"></i>
          <span onClick={handleDetectLocation} style={{ cursor: 'pointer' }}>
            Deliver to <strong>{userLocation}</strong>
          </span>
          <i className="fas fa-chevron-down" style={{ fontSize: '0.6rem', marginLeft: '2px' }}></i>
          <Link href="/products?bestseller=true" className="m-prime-btn">🔥 Today's Deals</Link>
        </div>
      </header>

      {/* CATEGORY TABS (SCROLLABLE ROW) */}
      <div className="m-category-tabs">
        <Link href="/" className={`m-cat-tab ${router.pathname === '/' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🏠</div><span>For You</span>
        </Link>
        <Link href="/products?category=biscuits" className={`m-cat-tab ${router.query.category === 'biscuits' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🍪</div><span>Biscuits</span>
        </Link>
        <Link href="/products?category=snacks" className={`m-cat-tab ${router.query.category === 'snacks' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🥜</div><span>Snacks</span>
        </Link>
        <Link href="/products?category=mushroom" className={`m-cat-tab ${router.query.category === 'mushroom' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🍄</div><span>Mushroom</span>
        </Link>
        <Link href="/products?category=chicken" className={`m-cat-tab ${router.query.category === 'chicken' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🍗</div><span>Chicken</span>
        </Link>
        <Link href="/products?category=mutton" className={`m-cat-tab ${router.query.category === 'mutton' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🍖</div><span>Mutton</span>
        </Link>
        <Link href="/products?category=grocery" className={`m-cat-tab ${router.query.category === 'grocery' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🏪</div><span>Grocery</span>
        </Link>
        <Link href="/products?category=dryfruits" className={`m-cat-tab ${router.query.category === 'dryfruits' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🥣</div><span>Dry Fruits</span>
        </Link>
        <Link href="/products?category=flour" className={`m-cat-tab ${router.query.category === 'flour' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🌾</div><span>Flour</span>
        </Link>
        <Link href="/products?category=beverages" className={`m-cat-tab ${router.query.category === 'beverages' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">☕</div><span>Beverages</span>
        </Link>
        <Link href="/products?category=spreads" className={`m-cat-tab ${router.query.category === 'spreads' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🍯</div><span>Spreads</span>
        </Link>
        <Link href="/products?category=pickles" className={`m-cat-tab ${router.query.category === 'pickles' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🥒</div><span>Pickles</span>
        </Link>
        <Link href="/products?category=superfoods" className={`m-cat-tab ${router.query.category === 'superfoods' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🧬</div><span>Superfoods</span>
        </Link>
        <Link href="/products?category=readytocook" className={`m-cat-tab ${router.query.category === 'readytocook' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🍲</div><span>Ready Cook</span>
        </Link>
        <Link href="/products?category=vegetables" className={`m-cat-tab ${router.query.category === 'vegetables' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🥬</div><span>Vegetables</span>
        </Link>
        <Link href="/products?category=fruits" className={`m-cat-tab ${router.query.category === 'fruits' ? 'active' : ''}`}>
          <div className="m-cat-tab-icon">🍎</div><span>Fruits</span>
        </Link>
      </div>

      {/* MAIN CONTAINER */}
      <main className="m-main-content">
        {children}
      </main>

      {/* BOTTOM NAV */}
      <nav className="m-bottom-nav">
        <Link href="/" className={`m-bnav-item ${router.pathname === '/' ? 'active' : ''}`}>
          <i className="fas fa-home"></i><span>Home</span>
        </Link>
        <Link href="/categories" className={`m-bnav-item ${router.pathname === '/categories' ? 'active' : ''}`}>
          <i className="fas fa-th-large"></i><span>Categories</span>
        </Link>
        <Link href="/cart" className={`m-bnav-item ${router.pathname === '/cart' ? 'active' : ''}`}>
          <div className="m-bnav-cart-icon">
            <i className="fas fa-shopping-cart"></i>
            {totalCartItems > 0 && (
              <span className="m-bnav-badge" id="cartCount">{totalCartItems}</span>
            )}
          </div>
          <span>Cart</span>
        </Link>
        <Link href="/dashboard" className={`m-bnav-item ${router.pathname === '/dashboard' ? 'active' : ''}`}>
          <i className="fas fa-user"></i><span>Account</span>
        </Link>
        <Link href="/support" className={`m-bnav-item ${router.pathname === '/support' ? 'active' : ''}`}>
          <i className="fas fa-headset"></i><span>Support</span>
        </Link>
      </nav>

      {/* FLOATING CHAT BOT & WIDGET SECTION */}
      <style>{`
        /* Chatbot floating button */
        .chatbot-float-btn {
          position: fixed; bottom: 85px; right: 16px; z-index: 9999;
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          color: #fff; border: none; cursor: pointer;
          box-shadow: 0 4px 16px rgba(26,92,56,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; transition: all 0.2s ease;
        }
        .chatbot-float-btn:active { transform: scale(0.92); }
        .chatbot-badge {
          position: absolute; top: -2px; right: -2px; width: 18px; height: 18px;
          background: #e05a2b; color: #fff; border-radius: 50%; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem; font-weight: 700;
        }

        /* Widget window */
        .chatbot-widget {
          position: fixed; bottom: 155px; right: 16px; z-index: 10000;
          width: 350px; border-radius: 18px; overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          display: none; flex-direction: column;
          background: #fff; max-height: 520px;
          border: 1px solid rgba(0,0,0,0.03);
          font-family: 'Inter', sans-serif;
          animation: chatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .chatbot-widget.open { display: flex; }
        @keyframes chatSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media(max-width: 480px) {
          .chatbot-widget {
            width: calc(100% - 32px) !important;
            right: 16px !important;
            left: 16px !important;
            bottom: 90px !important;
            max-height: 480px !important;
          }
        }

        /* Header */
        .chatbot-head {
          background: linear-gradient(135deg, #1a5c38, #2d6a4f);
          padding: 14px 16px; display: flex; align-items: center; gap: 12px;
        }
        .chatbot-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,0.15); display: flex;
          align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0;
        }
        .chatbot-name { color: #fff; font-weight: 700; font-size: 0.95rem; font-family: 'Poppins', sans-serif; }
        .chatbot-stat { color: rgba(255,255,255,0.8); font-size: 0.72rem; display: flex; align-items: center; gap: 5px; }
        .chatbot-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; display: inline-block; animation: chatPulse 1.5s infinite; }
        @keyframes chatPulse {
          0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
          70% { box-shadow: 0 0 0 6px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        .chatbot-close {
          margin-left: auto; background: none; border: none;
          color: rgba(255,255,255,0.8); cursor: pointer;
          font-size: 1.15rem; padding: 4px; transition: color 0.2s;
        }
        .chatbot-close:hover { color: #fff; }

        /* Messages */
        .chatbot-msgs {
          background: #f4f6f0; flex: 1; overflow-y: auto;
          padding: 16px; display: flex; flex-direction: column; gap: 10px;
          min-height: 240px;
        }
        .chatbot-bubble {
          max-width: 85%; border-radius: 14px; padding: 10px 14px;
          font-size: 0.82rem; line-height: 1.45; white-space: pre-wrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .chatbot-bubble.bot {
          align-self: flex-start; background: #fff; color: #1e293b;
          border-bottom-left-radius: 4px; border: 1px solid rgba(0,0,0,0.01);
        }
        .chatbot-bubble.user {
          align-self: flex-end; background: #1a5c38; color: #fff;
          border-bottom-right-radius: 4px;
        }

        /* Typing indicator */
        .chatbot-typing {
          align-self: flex-start; background: #fff; border-radius: 14px;
          border-bottom-left-radius: 4px; padding: 12px 16px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .chatbot-dots { display: flex; gap: 4px; align-items: center; }
        .chatbot-dots span {
          width: 5px; height: 5px; background: #94a3b8; border-radius: 50%;
          display: inline-block; animation: chatBlink 1.4s infinite both;
        }
        .chatbot-dots span:nth-child(2) { animation-delay: 0.2s; }
        .chatbot-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes chatBlink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }

        /* Quick Replies */
        .chatbot-quick {
          padding: 10px 14px; background: #f4f6f0;
          display: flex; flex-wrap: wrap; gap: 6px;
          border-top: 1px solid #e2e8f0;
        }
        .chatbot-qb {
          background: #fff; border: 1.5px solid #1a5c38; color: #1a5c38;
          padding: 6px 12px; border-radius: 20px; font-size: 0.74rem;
          font-weight: 700; cursor: pointer; transition: all 0.2s ease;
          outline: none; display: flex; align-items: center; gap: 4px;
        }
        .chatbot-qb:active { background: #e8f5ee; transform: scale(0.95); }

        /* Input */
        .chatbot-input {
          display: flex; background: #fff; border-top: 1px solid #e2e8f0;
          padding: 10px 12px; gap: 8px; align-items: center;
        }
        .chatbot-input-field {
          flex: 1; border: 1.5px solid #cbd5e1; border-radius: 20px;
          padding: 8px 14px; font-size: 0.84rem; outline: none;
          font-family: 'Inter', sans-serif; transition: border-color 0.2s;
        }
        .chatbot-input-field:focus { border-color: #1a5c38; }
        
        .chatbot-send-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: #1a5c38; color: #fff; border: none;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; font-size: 0.85rem; flex-shrink: 0;
          transition: all 0.2s; box-shadow: 0 2px 6px rgba(26,92,56,0.15);
        }
        .chatbot-send-btn:active { transform: scale(0.9); }
      `}</style>

      <button className="chatbot-float-btn" onClick={toggleChat} title="Chat with us">
        <i className="fas fa-comment-dots"></i>
        {showBadge && <div className="chatbot-badge">1</div>}
      </button>

      <div className={`chatbot-widget ${chatOpen ? 'open' : ''}`}>
        <div className="chatbot-head">
          <div className="chatbot-avatar">🤖</div>
          <div>
            <div className="chatbot-name">Curify Bot</div>
            <div className="chatbot-stat">
              <span className="chatbot-dot"></span> Online now
            </div>
          </div>
          <button className="chatbot-close" onClick={toggleChat}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="chatbot-msgs" id="cbMsgs">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`chatbot-bubble ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {isTyping && (
            <div className="chatbot-typing">
              <div className="chatbot-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={msgsEndRef} />
        </div>

        <div className="chatbot-quick">
          <button className="chatbot-qb" onClick={() => handleQuickChat('track')}>📦 Track Order</button>
          <button className="chatbot-qb" onClick={() => handleQuickChat('delivery')}>🚚 Delivery</button>
          <button className="chatbot-qb" onClick={() => handleQuickChat('returns')}>↩️ Returns</button>
          <button className="chatbot-qb" onClick={() => handleQuickChat('payment')}>💳 Payment</button>
          <button className="chatbot-qb" onClick={() => handleQuickChat('hours')}>🕐 Hours</button>
        </div>

        <div className="chatbot-input">
          <input 
            className="chatbot-input-field"
            placeholder="Ask me anything..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
          />
          <button className="chatbot-send-btn" onClick={handleSendChat}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </>
  );
}
