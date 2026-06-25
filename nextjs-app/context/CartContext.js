import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  addDoc,
  updateDoc, 
  collection, 
  onSnapshot, 
  deleteDoc, 
  writeBatch,
  increment,
  serverTimestamp
} from 'firebase/firestore';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Security Context States
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaPassed, setMfaPassed] = useState(true);

  // Show Toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to log login audit trails
  const logLoginEvent = async (currentUser) => {
    try {
      const userAgent = navigator.userAgent;
      
      // Basic OS detection
      let os = 'Unknown OS';
      if (userAgent.indexOf('Win') !== -1) os = 'Windows';
      else if (userAgent.indexOf('Mac') !== -1) os = 'macOS';
      else if (userAgent.indexOf('Linux') !== -1) os = 'Linux';
      else if (/Android/i.test(userAgent)) os = 'Android';
      else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';

      // Basic Browser detection
      let browser = 'Unknown Browser';
      if (userAgent.indexOf('Firefox') !== -1) browser = 'Mozilla Firefox';
      else if (userAgent.indexOf('Chrome') !== -1) browser = 'Google Chrome';
      else if (userAgent.indexOf('Safari') !== -1) browser = 'Apple Safari';
      else if (userAgent.indexOf('Edge') !== -1) browser = 'Microsoft Edge';

      const timestamp = new Date().toISOString();
      const loginHistoryRef = collection(db, 'users', currentUser.uid, 'login_history');
      
      await addDoc(loginHistoryRef, {
        os,
        browser,
        timestamp,
        userAgent: userAgent.slice(0, 100),
        ip: '192.168.1.1 (NAT-Verified)', // Simulated NAT
        status: 'Success'
      });

      // Write active session
      const sessionId = sessionStorage.getItem('Curify_session_id') || 'sess_' + Date.now();
      sessionStorage.setItem('Curify_session_id', sessionId);
      
      const sessionDocRef = doc(db, 'users', currentUser.uid, 'active_sessions', sessionId);
      await setDoc(sessionDocRef, {
        sessionId,
        os,
        browser,
        lastActive: timestamp,
        userAgent: userAgent.slice(0, 100),
        isCurrent: true
      });
    } catch (err) {
      console.error('Audit log registration failed:', err);
    }
  };

  // Toggle MFA configuration
  const toggleMfa = async (enabled) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { mfaEnabled: enabled });
      setMfaEnabled(enabled);
      if (enabled) {
        setMfaPassed(true);
        sessionStorage.setItem('Curify_mfa_passed_' + user.uid, 'true');
      }
      addToast(enabled ? 'MFA Enabled Successfully! 🔒' : 'MFA Disabled Successfully! 🔓', 'success');
      setUserProfile(prev => ({ ...prev, mfaEnabled: enabled }));
    } catch (err) {
      console.error(err);
      addToast('Failed to update MFA settings', 'error');
    }
  };

  // Revoke other active device sessions
  const revokeOtherSessions = async () => {
    if (!user) return;
    try {
      const newSalt = Date.now().toString();
      sessionStorage.setItem('Curify_session_salt', newSalt);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { sessionSalt: newSalt });
      
      // Clear other sessions in Firestore active_sessions subcollection
      const currentSessionId = sessionStorage.getItem('Curify_session_id');
      const sessionsRef = collection(db, 'users', user.uid, 'active_sessions');
      const snap = await getDocs(sessionsRef);
      
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        if (d.id !== currentSessionId) {
          batch.delete(d.ref);
        }
      });
      await batch.commit();

      addToast('Log out of all other devices completed! 🔒', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to revoke other sessions', 'error');
    }
  };

  // Auth State
  useEffect(() => {
    let userSnapshotUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (userSnapshotUnsubscribe) {
        userSnapshotUnsubscribe();
        userSnapshotUnsubscribe = null;
      }

      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('Curify_token', 'firebase_' + currentUser.uid);

        // Fetch user profile in real-time
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        userSnapshotUnsubscribe = onSnapshot(userDocRef, async (userDoc) => {
          let profileData = null;
          if (userDoc.exists()) {
            profileData = userDoc.data();
            
            // Session Salt Verification
            const localSalt = sessionStorage.getItem('Curify_session_salt');
            if (profileData.sessionSalt && localSalt && profileData.sessionSalt !== localSalt) {
              await logout();
              addToast('Session terminated by another device. 🔒', 'warning');
              return;
            } else if (!profileData.sessionSalt) {
              const initialSalt = Date.now().toString();
              sessionStorage.setItem('Curify_session_salt', initialSalt);
              await updateDoc(userDocRef, { sessionSalt: initialSalt });
            } else if (!localSalt) {
              sessionStorage.setItem('Curify_session_salt', profileData.sessionSalt);
            }

            // MFA Check
            if (profileData.mfaEnabled) {
              setMfaEnabled(true);
              const sessionMfaPassed = sessionStorage.getItem('Curify_mfa_passed_' + currentUser.uid) === 'true';
              setMfaPassed(sessionMfaPassed);
            } else {
              setMfaEnabled(false);
              setMfaPassed(true);
            }

            // Role evaluation
            setIsAdmin(profileData.role === 'admin');
          } else {
            // Profile Init
            const initialSalt = Date.now().toString();
            sessionStorage.setItem('Curify_session_salt', initialSalt);
            
            profileData = {
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              email: currentUser.email || '',
              phone: currentUser.phoneNumber || '',
              role: 'customer',
              mfaEnabled: false,
              sessionSalt: initialSalt,
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, profileData);
            setMfaEnabled(false);
            setMfaPassed(true);
            setIsAdmin(false);
          }
          
          setUserProfile({ uid: currentUser.uid, ...profileData });
          localStorage.setItem('Curify_user', JSON.stringify({ uid: currentUser.uid, ...profileData }));
        }, (err) => {
          console.error('User profile snapshot error:', err);
        });

        // Register session log audits
        const sessionLogged = sessionStorage.getItem('Curify_login_logged_' + currentUser.uid);
        if (!sessionLogged) {
          sessionStorage.setItem('Curify_login_logged_' + currentUser.uid, 'true');
          await logLoginEvent(currentUser);
        }

        // Merge local cart to Firestore if there are items
        const localCart = JSON.parse(localStorage.getItem('Curify_cart') || '[]');
        if (localCart.length > 0) {
          const batch = writeBatch(db);
          for (const item of localCart) {
            const cartItemRef = doc(db, 'users', currentUser.uid, 'cart', item.productId);
            batch.set(cartItemRef, {
              name: item.name,
              price: item.price,
              originalPrice: item.originalPrice || item.price,
              imageUrl: item.image || '',
              unit: item.weight || '',
              category: item.category || '',
              quantity: item.quantity,
              seller_id: item.seller_id || 2,
              seller_name: item.seller_name || 'Curify Central Store',
              seller_location: item.seller_location || 'Tamil Nadu'
            }, { merge: true });
          }
          await batch.commit();
          localStorage.removeItem('Curify_cart');
        }

        // Merge local wishlist to Firestore
        const localWishlist = JSON.parse(localStorage.getItem('Curify_wishlist') || '[]');
        if (localWishlist.length > 0) {
          const batch = writeBatch(db);
          for (const productId of localWishlist) {
            const wishItemRef = doc(db, 'users', currentUser.uid, 'wishlist', productId);
            batch.set(wishItemRef, { addedAt: serverTimestamp() }, { merge: true });
          }
          await batch.commit();
          localStorage.removeItem('Curify_wishlist');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setMfaEnabled(false);
        setMfaPassed(true);
        localStorage.removeItem('Curify_token');
        localStorage.removeItem('Curify_user');
        
        // Load cart and wishlist from local storage
        const localCart = JSON.parse(localStorage.getItem('Curify_cart') || '[]');
        setCart(localCart);
        const localWishlist = JSON.parse(localStorage.getItem('Curify_wishlist') || '[]');
        setWishlist(localWishlist);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (userSnapshotUnsubscribe) userSnapshotUnsubscribe();
    };
  }, []);

  // Listen to Cart and Wishlist changes if user logged in
  useEffect(() => {
    if (!user) return;
    
    // Cart Listener
    const cartRef = collection(db, 'users', user.uid, 'cart');
    const unsubscribeCart = onSnapshot(cartRef, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        productId: d.id,
        ...d.data(),
        image: d.data().imageUrl || d.data().image || '',
        weight: d.data().unit || '250g',
        seller_id: d.data().seller_id || 2,
        seller_name: d.data().seller_name || 'Curify Central Store',
        seller_location: d.data().seller_location || 'Tamil Nadu'
      }));
      setCart(items);
    }, (error) => {
      console.error('Cart snapshot listener error:', error);
    });

    // Wishlist Listener
    const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
    const unsubscribeWishlist = onSnapshot(wishlistRef, (snap) => {
      const wList = snap.docs.map(d => d.id);
      setWishlist(wList);
      localStorage.setItem('Curify_wishlist', JSON.stringify(wList));
    }, (error) => {
      console.error('Wishlist snapshot listener error:', error);
    });

    return () => {
      unsubscribeCart();
      unsubscribeWishlist();
    };
  }, [user]);

  // Wishlist handler
  const toggleWishlist = async (productId) => {
    let updated = [...wishlist];
    const idx = updated.indexOf(productId);
    
    if (user) {
      try {
        const wishDocRef = doc(db, 'users', user.uid, 'wishlist', productId);
        if (idx > -1) {
          await deleteDoc(wishDocRef);
          addToast('Removed from wishlist 💔', 'info');
        } else {
          await setDoc(wishDocRef, { addedAt: serverTimestamp() });
          addToast('Added to wishlist! 💖', 'success');
        }
      } catch (err) {
        console.error('Firestore wishlist error:', err);
      }
    } else {
      if (idx > -1) {
        updated.splice(idx, 1);
        addToast('Removed from wishlist 💔', 'info');
      } else {
        updated.push(productId);
        addToast('Added to wishlist! 💖', 'success');
      }
      setWishlist(updated);
      localStorage.setItem('Curify_wishlist', JSON.stringify(updated));
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.includes(productId);
  };

  // Cart Operations
  const addToCart = async (product, weight = '250g', quantity = 1) => {
    const pid = product._id || product.id || product.slug;
    const finalPrice = product.weights && product.weights.length > 0
      ? (product.weights.find((w) => w.label === weight)?.discountPrice || product.weights.find((w) => w.label === weight)?.price || product.price)
      : (product.discountPrice || product.price);
    const origPrice = product.weights && product.weights.length > 0
      ? (product.weights.find((w) => w.label === weight)?.price || product.price)
      : (product.price);
    const imgUrl = product.imageUrl || (product.images && product.images[0]) || '';

    if (user) {
      try {
        const cartItemRef = doc(db, 'users', user.uid, 'cart', pid);
        const cartDoc = await getDoc(cartItemRef);
        if (cartDoc.exists()) {
          await updateDoc(cartItemRef, {
            quantity: increment(quantity)
          });
        } else {
          await setDoc(cartItemRef, {
            name: product.name,
            price: finalPrice,
            originalPrice: origPrice,
            imageUrl: imgUrl,
            unit: weight,
            category: product.category || '',
            quantity: quantity,
            seller_id: product.seller_id || 2,
            seller_name: product.seller_name || 'Curify Central Store',
            seller_location: product.seller_location || 'Tamil Nadu'
          });
        }
        addToast(`${product.name} added to cart! 🛒`, 'success');
      } catch (e) {
        console.error('Firestore addToCart error:', e);
        addToast('Failed to add to cart', 'error');
      }
    } else {
      const updated = [...cart];
      const idx = updated.findIndex((i) => i.productId === pid && i.weight === weight);
      if (idx > -1) {
        updated[idx].quantity += quantity;
      } else {
        updated.push({
          id: pid,
          productId: pid,
          name: product.name,
          price: finalPrice,
          originalPrice: origPrice,
          image: imgUrl,
          weight: weight,
          quantity: quantity,
          seller_id: product.seller_id || 2,
          seller_name: product.seller_name || 'Curify Central Store',
          seller_location: product.seller_location || 'Tamil Nadu'
        });
      }
      setCart(updated);
      localStorage.setItem('Curify_cart', JSON.stringify(updated));
      addToast(`${product.name} added to cart! 🛒`, 'success');
    }
  };

  const removeFromCart = async (productId, weight) => {
    if (user) {
      try {
        const cartItemRef = doc(db, 'users', user.uid, 'cart', productId);
        await deleteDoc(cartItemRef);
        addToast('Removed from cart', 'info');
      } catch (e) {
        console.error('Firestore removeFromCart error:', e);
        addToast('Failed to remove item', 'error');
      }
    } else {
      const updated = cart.filter((i) => !(i.productId === productId && i.weight === weight));
      setCart(updated);
      localStorage.setItem('Curify_cart', JSON.stringify(updated));
      addToast('Removed from cart', 'info');
    }
  };

  const updateCartQuantity = async (productId, weight, quantity) => {
    const qty = Math.max(1, quantity);
    if (user) {
      try {
        const cartItemRef = doc(db, 'users', user.uid, 'cart', productId);
        await updateDoc(cartItemRef, { quantity: qty });
      } catch (e) {
        console.error('Firestore updateCartQuantity error:', e);
      }
    } else {
      const updated = cart.map((i) => {
        if (i.productId === productId && i.weight === weight) {
          return { ...i, quantity: qty };
        }
        return i;
      });
      setCart(updated);
      localStorage.setItem('Curify_cart', JSON.stringify(updated));
    }
  };

  const clearCart = async () => {
    if (user) {
      try {
        const cartRef = collection(db, 'users', user.uid, 'cart');
        const snap = await getDocs(cartRef);
        const batch = writeBatch(db);
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      } catch (e) {
        console.error('Clear cart error:', e);
      }
    } else {
      setCart([]);
      localStorage.removeItem('Curify_cart');
    }
  };

  const logout = async () => {
    try {
      const currentSessionId = sessionStorage.getItem('Curify_session_id');
      if (user && currentSessionId) {
        try {
          const sessionDocRef = doc(db, 'users', user.uid, 'active_sessions', currentSessionId);
          await deleteDoc(sessionDocRef);
        } catch (e) {
          console.error('Failed to delete active session doc:', e);
        }
      }
      
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      setMfaEnabled(false);
      setMfaPassed(true);
      setCart([]);
      
      localStorage.removeItem('Curify_token');
      localStorage.removeItem('Curify_user');
      localStorage.removeItem('Curify_cart');
      sessionStorage.removeItem('Curify_session_salt');
      sessionStorage.removeItem('Curify_session_id');
      
      addToast('Logged out successfully', 'info');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const saveAddress = async (address) => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { address });
        setUserProfile((prev) => ({ ...prev, address }));
        addToast('Address updated successfully! 🏠', 'success');
      } catch (e) {
        console.error('Save address error:', e);
        addToast('Failed to save address', 'error');
      }
    }
  };

  return (
    <CartContext.Provider value={{
      user,
      userProfile,
      loading,
      cart,
      wishlist,
      toasts,
      isAdmin,
      mfaEnabled,
      mfaPassed,
      setMfaPassed,
      toggleMfa,
      revokeOtherSessions,
      addToast,
      removeToast,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      toggleWishlist,
      isInWishlist,
      logout,
      saveAddress
    }}>
      {children}
      {/* Toast Notification Renderer */}
      <div id="toastContainer" style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} style={{
            background: t.type === 'success' ? '#2d6a4f' : t.type === 'error' ? '#c53030' : t.type === 'warning' ? '#dd6b20' : '#2b6cb0',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideIn 0.3s ease-out forwards',
            pointerEvents: 'auto'
          }}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </CartContext.Provider>
  );
};
