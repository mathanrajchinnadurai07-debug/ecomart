import React from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, userProfile, cart, wishlist, logout } = useCart();

  const totalCartItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <nav className="m-navbar" id="mainNavbar">
      <div className="m-navbar-inner">
        <Link href="/" className="m-logo">
          <div className="m-logo-icon"><span>🌿</span></div>
          <div className="m-logo-text"><span>Curfee</span><span>Organic</span></div>
        </Link>

        <div className="m-navbar-links">
          <Link href="/">Home</Link>
          <Link href="/products">Products</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/support">Support</Link>
        </div>

        <div className="m-navbar-actions">
          {user ? (
            <>
              <Link href="/dashboard" className="m-navbar-user">
                <i className="fas fa-user-circle"></i>
                <span>{userProfile?.name ? userProfile.name.split(' ')[0] : 'Profile'}</span>
              </Link>
              <button onClick={logout} className="m-navbar-btn" title="Logout">
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </>
          ) : (
            <Link href="/login" className="m-navbar-btn">
              <i className="fas fa-user"></i>
              <span>Login</span>
            </Link>
          )}

          <Link href="/dashboard?tab=wishlist" className="m-navbar-btn">
            <i className="fas fa-heart"></i>
            {wishlist.length > 0 && (
              <span className="m-bnav-badge">{wishlist.length}</span>
            )}
          </Link>

          <Link href="/cart" className="m-navbar-btn m-cart-btn">
            <i className="fas fa-shopping-cart"></i>
            {totalCartItems > 0 && (
              <span className="m-bnav-badge" id="navCartCount">{totalCartItems}</span>
            )}
            <span>Cart</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
