import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function Footer() {
  const { addToast } = useCart();
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      addToast('Thank you for subscribing! 🌿', 'success');
      setEmail('');
    }
  };

  return (
    <footer className="m-footer" id="mainFooter">
      {/* Newsletter */}
      <section className="m-newsletter">
        <div className="m-newsletter-inner">
          <h2>🌿 Get Weekly Deals</h2>
          <p>50+ organic products — exclusive offers every week!</p>
          <form onSubmit={handleNewsletterSubmit} className="m-newsletter-form">
            <input
              type="email"
              placeholder="Enter your email..."
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit"><i className="fas fa-paper-plane"></i></button>
          </form>
        </div>
      </section>

      <div className="m-footer-top">
        <div className="m-footer-brand">
          <div className="m-logo" style={{ justifyContent: 'flex-start', marginBottom: '8px' }}>
            <div className="m-logo-icon"><span>🌿</span></div>
            <div className="m-logo-text"><span>Curfee</span><span>Organic</span></div>
          </div>
          <p>50+ organic products across 16 categories.</p>
          <div className="m-footer-social">
            <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            <a href="#" aria-label="YouTube"><i className="fab fa-youtube"></i></a>
          </div>
        </div>
        <div className="m-footer-links">
          <div className="m-footer-col">
            <h4>Categories</h4>
            <Link href="/products?category=biscuits">Biscuits</Link>
            <Link href="/products?category=snacks">Snacks</Link>
            <Link href="/products?category=mushroom">Mushroom</Link>
            <Link href="/products?category=chicken">Chicken</Link>
            <Link href="/products?category=grocery">Grocery</Link>
          </div>
          <div className="m-footer-col">
            <h4>More</h4>
            <Link href="/products?category=dryfruits">Dry Fruits</Link>
            <Link href="/products?category=beverages">Beverages</Link>
            <Link href="/products?category=herbal">Herbal</Link>
            <Link href="/products?category=superfoods">Superfoods</Link>
            <Link href="/support">Help</Link>
          </div>
          <div className="m-footer-col">
            <h4>Account</h4>
            <Link href="/login">Login / Register</Link>
            <Link href="/dashboard">My Account</Link>
            <Link href="/order-tracking">Track Orders</Link>
            <Link href="/cart">My Cart</Link>
            <Link href="/green-member">Green Member</Link>
          </div>
        </div>
      </div>
      <div className="m-footer-bottom">
        <p>&copy; 2026 Curfee Organic Market. Made with 🌿 in India</p>
      </div>
    </footer>
  );
}
