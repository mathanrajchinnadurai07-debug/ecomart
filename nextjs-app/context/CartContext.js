import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
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

  // Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('Curify_token', 'firebase_' + currentUser.uid);

        // Fetch user profile
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          let profileData = null;

          if (userDoc.exists()) {
            profileData = userDoc.data();
          } else {
            profileData = {
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              email: currentUser.email || '',
              phone: currentUser.phoneNumber || '',
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, profileData);
          }
          setUserProfile({ uid: currentUser.uid, ...profileData });
          localStorage.setItem('Curify_user', JSON.stringify({ uid: currentUser.uid, ...profileData }));

          // Check if admin
          try {
            const adminDocRef = doc(db, 'admins', 'config');
            const adminDoc = await getDoc(adminDocRef);
            if (adminDoc.exists()) {
              const emails = adminDoc.data().emails || [];
              setIsAdmin(emails.includes(currentUser.email));
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            setIsAdmin(false);
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
                quantity: item.quantity
              }, { merge: true });
            }
            await batch.commit();
            localStorage.removeItem('Curify_cart');
          }
        } catch (error) {
          console.error('Error handling logged in user profile:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        localStorage.removeItem('Curify_token');
        localStorage.removeItem('Curify_user');
        // Load cart from local storage
        const localCart = JSON.parse(localStorage.getItem('Curify_cart') || '[]');
        setCart(localCart);
      }
      setLoading(false);
    });

    // Sync wishlist from local storage initially
    const localWishlist = JSON.parse(localStorage.getItem('Curify_wishlist') || '[]');
    setWishlist(localWishlist);

    return () => unsubscribe();
  }, []);

  // Listen to Cart changes if user logged in
  useEffect(() => {
    if (!user) return;
    const cartRef = collection(db, 'users', user.uid, 'cart');
    const unsubscribe = onSnapshot(cartRef, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        productId: d.id,
        ...d.data(),
        // Map to uniform names
        image: d.data().imageUrl || d.data().image || '',
        weight: d.data().unit || '250g'
      }));
      setCart(items);
    }, (error) => {
      console.error('Cart snapshot listener error:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Wishlist handler
  const toggleWishlist = (productId) => {
    let updated = [...wishlist];
    const idx = updated.indexOf(productId);
    if (idx > -1) {
      updated.splice(idx, 1);
      addToast('Removed from wishlist 💔', 'info');
    } else {
      updated.push(productId);
      addToast('Added to wishlist! 💖', 'success');
    }
    setWishlist(updated);
    localStorage.setItem('Curify_wishlist', JSON.stringify(updated));
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
            quantity: quantity
          });
        }
        addToast(`${product.name} added to cart! 🛒`, 'success');
      } catch (e) {
        console.error('Firestore addToCart error:', e);
        addToast('Failed to add item to cart', 'error');
      }
    } else {
      // Local storage cart
      const localCart = [...cart];
      const idx = localCart.findIndex((i) => i.productId === pid && i.weight === weight);
      if (idx > -1) {
        localCart[idx].quantity += quantity;
      } else {
        localCart.push({
          id: pid,
          productId: pid,
          name: product.name,
          image: imgUrl,
          price: finalPrice,
          originalPrice: origPrice,
          weight,
          quantity,
          stock: product.stock || 100,
          slug: product.slug || pid,
          category: product.category || ''
        });
      }
      setCart(localCart);
      localStorage.setItem('Curify_cart', JSON.stringify(localCart));
      addToast(`${product.name} added to cart! 🛒`, 'success');
    }
  };

  const removeFromCart = async (productId, weight) => {
    if (user) {
      try {
        const cartItemRef = doc(db, 'users', user.uid, 'cart', productId);
        await deleteDoc(cartItemRef);
        addToast('Item removed from cart', 'info');
      } catch (e) {
        console.error('Firestore removeFromCart error:', e);
        addToast('Failed to remove item', 'error');
      }
    } else {
      const updated = cart.filter((i) => !(i.productId === productId && i.weight === weight));
      setCart(updated);
      localStorage.setItem('Curify_cart', JSON.stringify(updated));
      addToast('Item removed from cart', 'info');
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
        const snap = await onSnapshot(cartRef, async (s) => {
          const batch = writeBatch(db);
          s.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        });
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
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      setCart([]);
      localStorage.removeItem('Curify_token');
      localStorage.removeItem('Curify_user');
      localStorage.removeItem('Curify_cart');
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
            background: t.type === 'success' ? '#2d6a4f' : t.type === 'error' ? '#c53030' : '#2b6cb0',
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
