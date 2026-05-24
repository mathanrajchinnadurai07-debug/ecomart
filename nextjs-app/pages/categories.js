import React, { useState } from 'react';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';

export default function Categories() {
  const [selectedCat, setSelectedCat] = useState('foryou');

  const catMeta = {
    foryou:     { title:'For You',              sub:'Curated picks based on popular organic products', emoji: '🏠' },
    vegetables: { title:'Fresh Vegetables',     sub:'Pesticide-free, farm-fresh organic vegetables', emoji: '🥬' },
    fruits:     { title:'Fresh Fruits',          sub:'Naturally grown, seasonal organic fruits', emoji: '🍎' },
    biscuits:   { title:'Biscuits & Cookies',   sub:'Millet, ragi, jaggery — zero refined sugar', emoji: '🍪' },
    snacks:     { title:'Snacks & Chips',       sub:'Banana chips, quinoa puffs, makhana & more', emoji: '🥜' },
    mushroom:   { title:'Mushroom Products',    sub:'Dried, powder, soup mix, coffee blend', emoji: '🍄' },
    chicken:    { title:'Organic Chicken',       sub:'Antibiotic-free, vacuum sealed & fresh', emoji: '🍗' },
    mutton:     { title:'Organic Mutton',        sub:'Premium goat meat — curry cut, mince, kebab', emoji: '🍖' },
    grocery:    { title:'Grocery Essentials',    sub:'Honey, oils, dal, rice, spices & more', emoji: '🏪' },
    dryfruits:  { title:'Dry Fruits & Nuts',     sub:'Almonds, cashews, walnuts, pistachios, seeds', emoji: '🥣' },
    herbal:     { title:'Herbal & Personal Care',sub:'Soaps, oils, shampoo, lip balm, face care', emoji: '🌿' },
    flour:      { title:'Flour & Grains',        sub:'Wheat, ragi, bajra, jowar, quinoa, oats', emoji: '🌾' },
    beverages:  { title:'Tea & Coffee',          sub:'Green tea, masala chai, filter coffee', emoji: '☕' },
    spreads:    { title:'Honey & Spreads',       sub:'Raw honey, peanut butter, almond butter', emoji: '🍯' },
    pickles:    { title:'Pickles & Chutneys',    sub:'Mango, lemon, garlic pickle, chutney', emoji: '🥒' },
    superfoods: { title:'Superfoods',            sub:'Chia seeds, moringa, spirulina, ashwagandha', emoji: '🧬' },
    readytocook:{ title:'Ready to Cook',         sub:'Dosa, idli, upma, khichdi, pancake mixes', emoji: '🍲' }
  };

  const getEmoji = (cat) => {
    return catMeta[cat]?.emoji || '🌿';
  };

  const renderContent = () => {
    const meta = catMeta[selectedCat] || catMeta.foryou;

    if (selectedCat === 'foryou') {
      const featured = ALL_PRODUCTS.filter(p => p.isFeatured).slice(0, 9);
      const popular = [...ALL_PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 6);

      return (
        <div style={{ padding: '0 0 80px' }}>
          <div className="cat-content-header" style={{ padding: '20px 16px 8px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{meta.title}</h2>
            <p style={{ fontSize: '0.8rem', color: '#999', margin: '4px 0 0' }}>{meta.sub}</p>
          </div>
          
          <div className="cat-banner" style={{ margin: '12px 16px', borderRadius: '12px', padding: '20px', background: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#2d6a4f', margin: '0 0 6px', fontWeight: '700' }}>🌿 Organic Market</h3>
            <p style={{ fontSize: '0.8rem', color: '#555', margin: '0 0 12px' }}>50+ products across 16 categories</p>
            <Link href="/products" style={{ display: 'inline-block', background: '#2d6a4f', color: '#fff', padding: '8px 24px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}>
              Shop All →
            </Link>
          </div>

          <div className="cat-section-title" style={{ padding: '16px 16px 8px', fontSize: '0.9rem', fontWeight: '700', color: '#1a1a1a' }}>⭐ Featured Products</div>
          <div className="cat-products" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '12px 16px' }}>
            {featured.map(p => prodCard(p))}
          </div>

          <div className="cat-section-title" style={{ padding: '16px 16px 8px', fontSize: '0.9rem', fontWeight: '700', color: '#1a1a1a' }}>🔥 Popular This Week</div>
          <div className="cat-products" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '12px 16px' }}>
            {popular.map(p => prodCard(p))}
          </div>

          <div className="cat-section-title" style={{ padding: '16px 16px 8px', fontSize: '0.9rem', fontWeight: '700', color: '#1a1a1a' }}>📦 Browse by Category</div>
          <div className="cat-products" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '12px 16px' }}>
            {Object.keys(catMeta).filter(c => c !== 'foryou').map(c => (
              <div 
                key={c}
                onClick={() => setSelectedCat(c)}
                className="cat-prod-card" 
                style={{ textDecoration: 'none', color: '#1a1a1a', textAlign: 'center', cursor: 'pointer' }}
              >
                <div className="prod-img" style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                  {getEmoji(c)}
                </div>
                <div className="prod-name" style={{ fontSize: '0.72rem', marginTop: '6px', color: '#333', fontWeight: '550' }}>{catMeta[c].title}</div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      const products = ALL_PRODUCTS.filter(p => p.category === selectedCat);
      return (
        <div style={{ padding: '0 0 80px' }}>
          <div className="cat-content-header" style={{ padding: '20px 16px 8px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{meta.title}</h2>
            <p style={{ fontSize: '0.8rem', color: '#999', margin: '4px 0 0' }}>{meta.sub}</p>
          </div>
          
          <Link href={`/products?category=${selectedCat}`} style={{ display: 'block', margin: '8px 16px', padding: '10px', background: '#f0faf5', borderRadius: '8px', textDecoration: 'none', color: '#2d6a4f', fontSize: '0.82rem', fontWeight: '600', textAlign: 'center' }}>
            View All {meta.title} →
          </Link>

          {products.length > 0 ? (
            <div className="cat-products" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '12px 16px' }}>
              {products.slice(0, 12).map(p => prodCard(p))}
            </div>
          ) : (
            <p style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No products found in this category yet.</p>
          )}

          {products.length > 12 && (
            <Link href={`/products?category=${selectedCat}`} style={{ display: 'block', margin: '8px 16px 20px', padding: '12px', background: '#2d6a4f', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center' }}>
              See All {products.length} Products →
            </Link>
          )}
        </div>
      );
    }
  };

  const prodCard = (p) => {
    const price = p.discountPrice || p.price;
    const emoji = getEmoji(p.category);
    const imgSrc = p.images && p.images.length ? p.images[0] : '';
    
    return (
      <Link key={p._id} href={`/product/${p.slug}`} className="cat-prod-card" style={{ textDecoration: 'none', color: '#1a1a1a', textAlign: 'center' }}>
        <div className="prod-img" style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
          {imgSrc ? <img src={imgSrc} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : emoji}
        </div>
        <div className="prod-name" style={{ fontSize: '0.72rem', marginTop: '6px', color: '#333', fontWeight: '500', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', height: '30px' }}>
          {p.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#2d6a4f', fontWeight: '700', marginTop: '2px' }}>₹{price}</div>
      </Link>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="cat-header" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>All Categories</h1>
        <div className="cat-header-actions" style={{ display: 'flex', gap: '20px' }}>
          <Link href="/products" style={{ color: '#333', fontSize: '1.2rem' }}><i className="fas fa-search"></i></Link>
        </div>
      </div>

      {/* Split Layout */}
      <div className="cat-split" style={{ display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div className="cat-sidebar" style={{ width: '80px', minWidth: '80px', background: '#fff', overflowY: 'auto', borderRight: '1px solid #eee' }}>
          {Object.entries(catMeta).map(([key, value]) => (
            <div 
              key={key}
              onClick={() => setSelectedCat(key)}
              className={`cat-sidebar-item ${selectedCat === key ? 'active' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 4px 10px',
                color: selectedCat === key ? '#2d6a4f' : '#666',
                fontSize: '0.65rem',
                textAlign: 'center',
                borderLeft: selectedCat === key ? '3px solid #2d6a4f' : '3px solid transparent',
                background: selectedCat === key ? '#f0faf5' : 'transparent',
                cursor: 'pointer',
                gap: '6px'
              }}
            >
              <div 
                className="icon-wrap"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  background: selectedCat === key ? 'linear-gradient(135deg,#e8f5e9,#c8e6c9)' : '#f8f8f8'
                }}
              >
                {value.emoji}
              </div>
              <span style={{ fontWeight: '500', lineHeight: 1.2 }}>{value.title.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Right Details Panel */}
        <div className="cat-content" style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
          {renderContent()}
        </div>
      </div>
    </>
  );
}
