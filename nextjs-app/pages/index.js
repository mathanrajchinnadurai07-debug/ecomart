import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';

export default function Home() {
  const { addToast } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const slides = [
    {
      tag: '🍪 ORGANIC BISCUITS',
      title: 'Fresh Baked Cookies',
      desc: 'Millet, ragi, jaggery cookies — zero refined sugar',
      bg: 'linear-gradient(135deg,#b5651d,#d4a574)',
      emoji: '🍪',
      link: '/products?category=biscuits'
    },
    {
      tag: '🍄 MUSHROOM POWER',
      title: 'Mushroom Products',
      desc: 'Dried, powders, snacks & immunity blends',
      bg: 'linear-gradient(135deg,#6d4c41,#8d6e63)',
      emoji: '🍄',
      link: '/products?category=mushroom'
    },
    {
      tag: '🍗 FARM FRESH',
      title: 'Organic Chicken & Mutton',
      desc: 'Antibiotic-free, vacuum sealed & delivered fresh',
      bg: 'linear-gradient(135deg,#c62828,#e53935)',
      emoji: '🍗',
      link: '/products?category=chicken'
    },
    {
      tag: '🥬 FARM FRESH',
      title: 'Organic Vegetables',
      desc: 'Tomato, carrot, spinach, broccoli — pesticide free',
      bg: 'linear-gradient(135deg,#43a047,#66bb6a)',
      emoji: '🥬',
      link: '/products?category=vegetables'
    },
    {
      tag: '🍎 SEASONAL FRUITS',
      title: 'Organic Fruits',
      desc: 'Mango, apple, strawberry, banana — naturally grown',
      bg: 'linear-gradient(135deg,#ff6f00,#ffa726)',
      emoji: '🍎',
      link: '/products?category=fruits'
    },
    {
      tag: '🔥 MEGA DEALS',
      title: 'Up to 40% OFF',
      desc: 'On 50+ organic products — limited time!',
      bg: 'linear-gradient(135deg,#1a5c38,#2d6a4f)',
      emoji: '🎉',
      link: '/products?bestseller=true'
    }
  ];

  // Auto slide effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    addToast('Thank you for subscribing! 🌿', 'success');
    setNewsletterEmail('');
  };

  // Filter products for homepage sections
  const featuredProducts = ALL_PRODUCTS.filter(p => p.isFeatured).slice(0, 8);
  // Deals Products: Bestsellers or high rating
  const dealsProducts = ALL_PRODUCTS.filter(p => p.rating >= 4.6).slice(0, 8);

  const categories = [
    { key: 'biscuits', name: 'Biscuits & Cookies', sub: 'Ragi, millet, jaggery, oats, coconut cookies in kraft packaging' },
    { key: 'snacks', name: 'Snacks & Chips', sub: 'Banana chips, millet chips, quinoa puffs, makhana, trail mix' },
    { key: 'mushroom', name: 'Mushroom Products', sub: 'Dried mushrooms, powder, soup mix, chips, coffee blend' },
    { key: 'chicken', name: 'Chicken Products', sub: 'Breast, mince, sausages, nuggets, tikka — antibiotic-free' },
    { key: 'mutton', name: 'Mutton Products', sub: 'Curry cut, mince, seekh kebab, chops, biryani cut' },
    { key: 'grocery', name: 'Grocery Essentials', sub: 'Honey, oils, dal, rice, spices, salt & more' },
    { key: 'dryfruits', name: 'Dry Fruits & Nuts', sub: 'Almonds, cashews, walnuts, pistachios, seeds, dates' },
    { key: 'herbal', name: 'Herbal & Personal Care', sub: 'Soaps, oils, shampoo, lip balm, face pack, kajal' },
    { key: 'flour', name: 'Flour & Grains', sub: 'Wheat, ragi, bajra, jowar, quinoa, oats' },
    { key: 'beverages', name: 'Beverages', sub: 'Green tea, masala chai, filter coffee, herbal teas' },
    { key: 'spreads', name: 'Honey & Spreads', sub: 'Raw honey, peanut butter, almond butter, jams' },
    { key: 'pickles', name: 'Pickles & Chutneys', sub: 'Mango, lemon, garlic pickle, coconut chutney powder' },
    { key: 'superfoods', name: 'Superfoods', sub: 'Chia seeds, moringa, spirulina, ashwagandha, triphala' },
    { key: 'readytocook', name: 'Ready to Cook', sub: 'Dosa, idli, upma, khichdi, pancake mixes' },
    { key: 'vegetables', name: 'Fresh Vegetables', sub: 'Tomato, carrot, spinach, broccoli, onion, potato & more' },
    { key: 'fruits', name: 'Fresh Fruits', sub: 'Banana, mango, apple, strawberry, pomegranate, grapes' }
  ];

  return (
    <>
      {/* Hero Slider */}
      <div className="m-hero-slider" id="mHeroSlider">
        <div 
          className="m-hero-track" 
          style={{ 
            display: 'flex', 
            transform: `translateX(-${currentSlide * 100}%)`, 
            transition: 'transform 0.5s ease-in-out' 
          }}
        >
          {slides.map((slide, idx) => (
            <div 
              key={idx} 
              className="m-hero-card" 
              style={{ background: slide.bg, minWidth: '100%', flexShrink: 0 }}
            >
              <div className="m-hero-text">
                <span className="m-hero-tag">{slide.tag}</span>
                <h2>{slide.title}</h2>
                <p>{slide.desc}</p>
                <Link href={slide.link} className="m-hero-cta">Shop Now →</Link>
              </div>
              <div className="m-hero-img">{slide.emoji}</div>
            </div>
          ))}
        </div>
        <div className="m-hero-dots">
          {slides.map((_, idx) => (
            <span 
              key={idx} 
              className={`m-dot ${currentSlide === idx ? 'active' : ''}`} 
              onClick={() => setCurrentSlide(idx)}
            ></span>
          ))}
        </div>
      </div>

      {/* Sponsored */}
      <div className="m-sponsored-banner">
        <div className="m-sponsored-label">Sponsored <i className="fas fa-info-circle"></i></div>
        <div className="m-sponsored-content" style={{ background: 'linear-gradient(135deg,#fff8e1,#ffe0b2)' }}>
          <div className="m-sponsored-text">
            <strong>Organic Biscuits & Cookies — 15 Varieties</strong>
            <span>Kraft paper packaging | Zero preservatives</span>
          </div>
          <Link href="/products?category=biscuits" className="m-sponsored-btn">Shop Now</Link>
        </div>
      </div>

      {/* Results Header */}
      <div className="m-results-header">
        <span className="m-results-count">Showing 50+ organic products, with fast delivery</span>
        <p>See all products across 16 categories.</p>
      </div>

      {/* Featured Section */}
      <section className="m-section">
        <div className="m-section-header">
          <h2>⭐ Featured Products</h2>
          <Link href="/products?featured=true" className="m-see-all">See All →</Link>
        </div>
        <div className="m-product-scroll">
          {featuredProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* Today's Deals Section */}
      <section className="m-section m-section-tinted" style={{ '--tint-color': 'rgba(255,111,0,0.06)' }}>
        <div className="m-section-header">
          <h2>🔥 Today's Deals</h2>
          <Link href="/products?bestseller=true" className="m-see-all">See All →</Link>
        </div>
        <p className="m-section-sub">Top bestsellers with massive discounts</p>
        <div className="m-product-scroll">
          {dealsProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* Category Deals Grid */}
      <section className="m-deal-grid">
        <Link href="/products?category=biscuits" className="m-deal-card" style={{ background: 'linear-gradient(135deg,#fff3e0,#ffe0b2)' }}>
          <h3>Biscuits & Cookies</h3>
          <p className="m-deal-off">15 varieties</p>
          <div className="m-deal-img">🍪🥜🧁</div>
          <span className="m-deal-link">Shop now</span>
        </Link>
        <Link href="/products?category=mushroom" className="m-deal-card" style={{ background: 'linear-gradient(135deg,#efebe9,#d7ccc8)' }}>
          <h3>Mushroom Products</h3>
          <p className="m-deal-off">Up to <strong>35% OFF</strong></p>
          <div className="m-deal-img">🍄🧪🍵</div>
          <span className="m-deal-link">Shop now</span>
        </Link>
        <Link href="/products?category=chicken" className="m-deal-card" style={{ background: 'linear-gradient(135deg,#ffebee,#ffcdd2)' }}>
          <h3>Organic Chicken</h3>
          <p className="m-deal-off"><strong>Farm Fresh</strong></p>
          <div className="m-deal-img">🍗🥩🌡️</div>
          <span className="m-deal-link">Shop now</span>
        </Link>
        <Link href="/products?category=dryfruits" className="m-deal-card" style={{ background: 'linear-gradient(135deg,#fff8e1,#ffecb3)' }}>
          <h3>Dry Fruits & Nuts</h3>
          <p className="m-deal-off">15 premium items</p>
          <div className="m-deal-img">🥜🌰🍇</div>
          <span className="m-deal-link">Shop now</span>
        </Link>
      </section>

      {/* Category Scrolls */}
      {categories.slice(0, 5).map((cat, idx) => {
        const catProducts = ALL_PRODUCTS.filter(p => p.category === cat.key).slice(0, 8);
        if (catProducts.length === 0) return null;
        const isTinted = idx % 2 === 0;
        return (
          <section 
            key={cat.key} 
            className={`m-section ${isTinted ? 'm-section-tinted' : ''}`}
            style={isTinted ? { '--tint-color': 'rgba(181,101,29,0.06)' } : {}}
          >
            <div className="m-section-header">
              <h2>{cat.name}</h2>
              <Link href={`/products?category=${cat.key}`} className="m-see-all">See All →</Link>
            </div>
            <p className="m-section-sub">{cat.sub}</p>
            <div className="m-product-scroll">
              {catProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Promo Banner */}
      <div className="m-promo-banner" style={{ background: 'linear-gradient(135deg,#1a5c38,#2d6a4f)' }}>
        <div className="m-promo-text">
          <span>🌿 LIMITED TIME</span>
          <h3>Free Delivery on ₹499+</h3>
          <p>Use code: Curify499</p>
        </div>
        <Link href="/products" className="m-promo-cta">Shop Now</Link>
      </div>

      {/* Remaining Category Scrolls */}
      {categories.slice(5).map((cat, idx) => {
        const catProducts = ALL_PRODUCTS.filter(p => p.category === cat.key).slice(0, 8);
        if (catProducts.length === 0) return null;
        const isTinted = idx % 2 === 0;
        return (
          <section 
            key={cat.key} 
            className={`m-section ${isTinted ? 'm-section-tinted' : ''}`}
            style={isTinted ? { '--tint-color': 'rgba(67,160,71,0.06)' } : {}}
          >
            <div className="m-section-header">
              <h2>{cat.name}</h2>
              <Link href={`/products?category=${cat.key}`} className="m-see-all">See All →</Link>
            </div>
            <p className="m-section-sub">{cat.sub}</p>
            <div className="m-product-scroll">
              {catProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Brand Grid Row */}
      <section className="m-brand-row">
        <div className="m-brand-card"><div className="m-brand-img">🥬</div><strong>Vegetables</strong><span>15 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🍎</div><strong>Fruits</strong><span>12 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🍪</div><strong>Biscuits</strong><span>15 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🍄</div><strong>Mushroom</strong><span>12 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🍗</div><strong>Chicken</strong><span>12 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🥜</div><strong>Dry Fruits</strong><span>15 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">☕</div><strong>Beverages</strong><span>12 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🧬</div><strong>Superfoods</strong><span>10 items</span></div>
      </section>

      {/* Certifications & Trust Badges */}
      <section className="m-section m-trust-section">
        <div className="m-section-header">
          <h2>🏅 Why Trust Curify?</h2>
        </div>
        <p className="m-section-sub">Certified organic. Verified quality. Delivered with care.</p>
        <div className="m-trust-grid">
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#1a5c38,#2d6a4f)' }}>🌿</div>
            <strong>FSSAI Certified</strong>
            <span>Lic. No. 10021032001234</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#e05a2b,#f77f00)' }}>🔒</div>
            <strong>100% Secure Payments</strong>
            <span>Razorpay · RBI Approved</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#0077b6,#023e8a)' }}>🌱</div>
            <strong>Organic India Certified</strong>
            <span>Zero synthetic pesticides</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#9b59b6,#6c3483)' }}>♻️</div>
            <strong>Eco Packaging</strong>
            <span>100% recyclable kraft & glass</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#c0392b,#922b21)' }}>❄️</div>
            <strong>Cold-Chain Delivery</strong>
            <span>Perishables vacuum-sealed</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#f39c12,#d68910)' }}>↩️</div>
            <strong>7-Day Easy Returns</strong>
            <span>No questions asked policy</span>
          </div>
        </div>
        <div className="m-cert-strip">
          <span className="m-cert-pill">✔ ISO 22000</span>
          <span className="m-cert-pill">✔ Non-GMO</span>
          <span className="m-cert-pill">✔ Gluten-Free Options</span>
          <span className="m-cert-pill">✔ No Artificial Colours</span>
          <span className="m-cert-pill">✔ Vegan Friendly</span>
          <span className="m-cert-pill">✔ Farm-to-Door</span>
        </div>
      </section>

      {/* Help Section */}
      <div className="m-help-section">
        <h3>Need help?</h3>
        <p>Visit the <Link href="/support">help section</Link> or <Link href="/support">contact us</Link></p>
      </div>

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
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
            />
            <button type="submit"><i className="fas fa-paper-plane"></i></button>
          </form>
        </div>
      </section>

      {/* Footer Details */}
      <footer className="m-footer">
        <div className="m-footer-top">
          <div className="m-footer-brand">
            <div className="m-logo" style={{ justifyContent: 'flex-start', marginBottom: '8px' }}>
              <div className="m-logo-icon"><span>🌿</span></div>
              <div className="m-logo-text"><span>Curify</span><span>Organic</span></div>
            </div>
            <p>50+ organic products across 14 categories.</p>
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
          </div>
        </div>
        <div className="m-footer-bottom">
          <p>&copy; 2026 Curify. Made with 🌿 in India</p>
        </div>
      </footer>
      <div style={{ height: '70px' }}></div>
    </>
  );
}
