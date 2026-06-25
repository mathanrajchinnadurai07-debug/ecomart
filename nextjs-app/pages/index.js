import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { addToast } = useCart();
  const { language, t } = useLanguage();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [products, setProducts] = useState(ALL_PRODUCTS);
  const [activeFarmer, setActiveFarmer] = useState(0);

  const farmers = [
    {
      id: 2,
      name: { en: 'Farmer Selvam', ta: 'விவசாயி செல்வம்' },
      location: { en: 'Valikandapuram, Perambalur District', ta: 'வாலிகண்டபுரம், பெரம்பலூர் மாவட்டம்' },
      crop: { en: 'Organic Tomatoes & Traditional Veg', ta: 'இயற்கை தக்காளி & பாரம்பரிய காய்கறிகள்' },
      story: {
        en: 'Selvam has practiced natural, multi-crop farming for over 12 years. He uses native heirloom seeds and homemade organic compost to keep the soil naturally fertile, ensuring every vegetable is nutrient-dense and chemical-free.',
        ta: 'செல்வம் 12 ஆண்டுகளுக்கும் மேலாக இயற்கை மற்றும் பன்முக பயிர் சாகுபடி செய்து வருகிறார். மண்ணை இயற்கையாகவே வளமாக வைத்திருக்க பாரம்பரிய விதைகளையும், வீட்டிலேயே தயாரித்த இயற்கை உரங்களையும் பயன்படுத்துகிறார்.'
      },
      cert: 'PGS-India Organic (ID: PGS-TN-02)',
      emoji: '🍅',
      bg: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
      textColor: '#1b5e20',
      tagColor: 'rgba(26, 92, 56, 0.12)'
    },
    {
      id: 3,
      name: { en: 'Farmer Anand', ta: 'விவசாயி ஆனந்த்' },
      location: { en: 'Allur, Trichy District', ta: 'ஆலூர், திருச்சி மாவட்டம்' },
      crop: { en: 'Traditional Greens & Country Spinach', ta: 'பாரம்பரிய கீரைகள் & பசலைக்கீரை' },
      story: {
        en: 'Anand specializes in country greens and spinach varieties. He harvests traditional leafy greens before dawn so they reach urban hubs in their peak freshness, retaining maximum vitamins and hydration without post-harvest chemical sprays.',
        ta: 'ஆனந்த் பாரம்பரிய கீரை வகைகளை பயிரிடுவதில் நிபுணத்துவம் பெற்றவர். பாரம்பரிய கீரைகளை விடியற்காலைக்கு முன்பே அறுவடை செய்வதன் மூலம், அவை நகர்ப்புற மையங்களை புத்துணர்ச்சியுடன் சென்றடைகின்றன.'
      },
      cert: 'PGS-India Organic (ID: PGS-TN-05)',
      emoji: '🥬',
      bg: 'linear-gradient(135deg, #efebe9, #d7ccc8)',
      textColor: '#4e3d30',
      tagColor: 'rgba(78, 61, 48, 0.12)'
    },
    {
      id: 4,
      name: { en: 'Farmer Ganesan', ta: 'விவசாயி கணேசன்' },
      location: { en: 'Negamam, Pollachi', ta: 'நெகமம், பொள்ளாச்சி' },
      crop: { en: 'Wood-Pressed Coconut Oil & Millets', ta: 'மரச்செக்கு தேங்காய் எண்ணெய் & சிறுதானியங்கள்' },
      story: {
        en: 'Ganesan tends to a multi-generational organic coconut grove. He uses sun-dried copra and cold-presses them in traditional wooden chekku mills at low temperatures, preserving the natural aroma and gut-friendly fats.',
        ta: 'கணேசன் பல தலைமுறையாக இயற்கை தேங்காய் தோப்பை பராமரித்து வருகிறார். வெயிலில் காயவைத்த கொப்பரையை பாரம்பரிய மரச்செக்கில் குறைந்த வெப்பநிலையில் பிழிந்து, அதன் இயற்கை மணத்தையும் குணத்தையும் பாதுகாக்கிறார்.'
      },
      cert: 'FSSAI Reg: 22421596000123',
      emoji: '🥥',
      bg: 'linear-gradient(135deg, #fff8e1, #ffecb3)',
      textColor: '#7f5f00',
      tagColor: 'rgba(216, 164, 54, 0.15)'
    }
  ];

  // Fetch products from database on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products?limit=1000`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setProducts(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch products from backend:', err);
      }
    };
    fetchProducts();
  }, []);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail })
      });
      const data = await res.json();
      if (data.success) {
        addToast(language === 'en' ? 'Thank you for subscribing! 🌿' : 'சந்தா செலுத்தியதற்கு நன்றி! 🌿', 'success');
        setNewsletterEmail('');
      } else {
        addToast(data.error || 'Failed to subscribe', 'error');
      }
    } catch (err) {
      addToast(language === 'en' ? 'Something went wrong' : 'ஏதோ தவறு நடந்துவிட்டது', 'error');
    }
  };

  // Filter products for homepage sections
  const featuredProducts = products.filter(p => p.isFeatured || p.is_featured).slice(0, 8);
  const dealsProducts = products.filter(p => p.rating >= 4.6).slice(0, 8);

  const categories = [
    { key: 'biscuits', name: 'Biscuits & Cookies', nameTa: 'பிஸ்கட் & குக்கீஸ்', sub: 'Ragi, millet, jaggery, oats, coconut cookies in kraft packaging', subTa: 'ராகி, தினை, வெல்லம் மற்றும் தேங்காய் குக்கீஸ்' },
    { key: 'snacks', name: 'Snacks & Chips', nameTa: 'நொறுக்குத்தீனிகள்', sub: 'Banana chips, millet chips, quinoa puffs, makhana, trail mix', subTa: 'வாழைக்காய் சிப்ஸ், தினை சிப்ஸ், மரவள்ளிக்கிழங்கு சிப்ஸ்' },
    { key: 'mushroom', name: 'Mushroom Products', nameTa: 'காளான் தயாரிப்புகள்', sub: 'Dried mushrooms, powder, soup mix, chips, coffee blend', subTa: 'உலர்ந்த காளான்கள், காளான் சூப் மற்றும் மசாலாக்கள்' },
    { key: 'chicken', name: 'Chicken Products', nameTa: 'கோழி இறைச்சி', sub: 'Breast, mince, sausages, nuggets, tikka — antibiotic-free', subTa: 'ஆரோக்கியமான நாட்டுக்கோழி இறைச்சி' },
    { key: 'mutton', name: 'Mutton Products', nameTa: 'ஆட்டு இறைச்சி', sub: 'Curry cut, mince, seekh kebab, chops, biryani cut', subTa: 'சுத்தமான ஆட்டு இறைச்சி மற்றும் பிரியாணி துண்டுகள்' },
    { key: 'grocery', name: 'Grocery Essentials', nameTa: 'மளிகைப் பொருட்கள்', sub: 'Honey, oils, dal, rice, spices, salt & more', subTa: 'தேன், நாட்டு சர்க்கரை, பாரம்பரிய அரிசி மற்றும் பருப்பு வகைகள்' },
    { key: 'dryfruits', name: 'Dry Fruits & Nuts', nameTa: 'உலர் பழங்கள் & பருப்புகள்', sub: 'Almonds, cashews, walnuts, pistachios, seeds, dates', subTa: 'பாதாம், முந்திரி, உலர் திராட்சை, பேரீச்சம்பழம்' },
    { key: 'herbal', name: 'Herbal & Personal Care', nameTa: 'மூலிகை & அழகு சாதனங்கள்', sub: 'Soaps, oils, shampoo, lip balm, face pack, kajal', subTa: 'இயற்கை மூலிகை சோப்புகள் மற்றும் கூந்தல் தைலங்கள்' },
    { key: 'flour', name: 'Flour & Grains', nameTa: 'மாவு & தானியங்கள்', sub: 'Wheat, ragi, bajra, jowar, quinoa, oats', subTa: 'ராகி மாவு, கம்பு மாவு, பாரம்பரிய தானிய மாவுகள்' },
    { key: 'beverages', name: 'Beverages', nameTa: 'பானங்கள்', sub: 'Green tea, masala chai, filter coffee, herbal teas', subTa: 'மூலிகை தேநீர், மசாலா டீ, மரச்செக்கு காபி' },
    { key: 'spreads', name: 'Honey & Spreads', nameTa: 'தேன் & நெய் வகைகள்', sub: 'Raw honey, peanut butter, almond butter, jams', subTa: 'சுத்தமான தேன், கடலை வெண்ணெய் மற்றும் பழப்பாகு' },
    { key: 'pickles', name: 'Pickles & Chutneys', nameTa: 'ஊறுகாய் & சட்னி பொடிகள்', sub: 'Mango, lemon, garlic pickle, coconut chutney powder', subTa: 'மாங்காய், எலுமிச்சை, பூண்டு ஊறுகாய் மற்றும் பொடி வகைகள்' },
    { key: 'superfoods', name: 'Superfoods', nameTa: 'சூப்பர்ஃபுட்ஸ்', sub: 'Chia seeds, moringa, spirulina, ashwagandha, triphala', subTa: 'முருங்கை பொடி, அஸ்வகந்தா மற்றும் இயற்கை சத்துணவுகள்' },
    { key: 'readytocook', name: 'Ready to Cook', nameTa: 'சமைக்க தயாரானவை', sub: 'Dosa, idli, upma, khichdi, pancake mixes', subTa: 'கேழ்வரகு தோசை, தினை இட்லி மற்றும் உப்மா மாவு வகைகள்' },
    { key: 'vegetables', name: 'Fresh Vegetables', nameTa: 'பசுமையான காயறிகள்', sub: 'Tomato, carrot, spinach, broccoli, onion, potato & more', subTa: 'தக்காளி, கேரட், வெங்காயம் மற்றும் நாட்டு காய்கறிகள்' },
    { key: 'fruits', name: 'Fresh Fruits', nameTa: 'பருவகால பழங்கள்', sub: 'Banana, mango, apple, strawberry, pomegranate, grapes', subTa: 'வாழைப்பழம், மாம்பழம், மாதுளை மற்றும் இயற்கை பழங்கள்' }
  ];

  return (
    <>
      {/* Farmer Spotlight Trust Hero */}
      <div className="farmer-spotlight-hero" style={{ margin: '16px 14px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ background: 'var(--primary-dark)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🌾 {t('seller_spotlight')}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {farmers.map((f, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveFarmer(idx)}
                className="focus-visible-ring"
                aria-label={`View story of ${f.name.en}`}
                style={{
                  background: activeFarmer === idx ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: activeFarmer === idx ? 'var(--primary-dark)' : '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ padding: '20px', background: farmers[activeFarmer].bg, color: farmers[activeFarmer].textColor, display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
          {/* Hand-stamped Postmark overlay motif */}
          <div className="harvest-stamp" style={{ position: 'absolute', top: '16px', right: '16px', transform: 'rotate(8deg) scale(0.95)', border: '2px dashed var(--accent)', color: 'var(--accent)', background: 'rgba(255,255,255,0.85)', padding: '4px 10px', fontSize: '0.65rem', fontWeight: '800', borderRadius: '4px', letterSpacing: '0.5px', pointerEvents: 'none', zIndex: 10 }}>
            🌾 VERIFIED FARMER
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '3rem', background: '#fff', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifycontent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {farmers[activeFarmer].emoji}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: '800', margin: 0, lineHeight: 1.2 }}>
                {language === 'en' ? farmers[activeFarmer].name.en : farmers[activeFarmer].name.ta}
              </h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: '600', margin: '2px 0 0' }}>
                📍 {language === 'en' ? farmers[activeFarmer].location.en : farmers[activeFarmer].location.ta}
              </p>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', background: farmers[activeFarmer].tagColor, padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>
              {language === 'en' ? farmers[activeFarmer].crop.en : farmers[activeFarmer].crop.ta}
            </span>
            <p style={{ fontFamily: 'var(--font)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0, opacity: 0.9 }}>
              {language === 'en' ? farmers[activeFarmer].story.en : farmers[activeFarmer].story.ta}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div className="badge-cert" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', color: 'inherit', fontSize: '0.7rem', padding: '4px 8px' }}>
              🛡️ {farmers[activeFarmer].cert}
            </div>
            <Link 
              href={`/seller/${farmers[activeFarmer].id}`}
              className="focus-visible-ring"
              style={{
                background: 'var(--primary)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.78rem',
                padding: '6px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 6px rgba(26,92,56,0.15)'
              }}
            >
              {language === 'en' ? 'View Farm Storefront' : 'விவசாயப் பக்கத்தைப் பார்'} →
            </Link>
          </div>
        </div>
      </div>

      {/* Live Today's Harvest Feed Widget */}
      <div className="live-harvest-widget" style={{ margin: '0 14px 16px', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', borderRadius: '50%', height: '8px', width: '8px', background: '#4ade80' }}></span>
            <span style={{ position: 'absolute', display: 'inline-flex', borderRadius: '50%', height: '8px', width: '8px', background: '#4ade80', opacity: 0.75, transform: 'scale(1.5)' }}></span>
          </span>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            {language === 'en' ? "Today's Live Harvest Feed" : "இன்றைய நேரலை அறுவடை நிலவரம்"}
          </h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderBottom: '1px solid #f1f3f6', paddingBottom: '8px' }}>
            <div style={{ background: 'rgba(26, 92, 56, 0.08)', borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
              06:00 AM
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: '700', margin: 0, color: 'var(--text)' }}>
                {language === 'en' ? 'Anand harvested fresh Spinach' : 'ஆனந்த் புதிய பசலைக்கீரையை அறுவடை செய்தார்'}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', margin: '1px 0 0' }}>
                📍 {language === 'en' ? 'Allur, Trichy District' : 'ஆலூர், திருச்சி'} · <span style={{ color: 'var(--success)', fontWeight: '600' }}>{language === 'en' ? 'In Transit to Hub' : 'மையத்திற்கு அனுப்பப்படுகிறது'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderBottom: '1px solid #f1f3f6', paddingBottom: '8px' }}>
            <div style={{ background: 'rgba(26, 92, 56, 0.08)', borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
              07:30 AM
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: '700', margin: 0, color: 'var(--text)' }}>
                {language === 'en' ? 'Selvam harvested organic Tomatoes' : 'செல்வம் இயற்கை தக்காளியை அறுவடை செய்தார்'}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', margin: '1px 0 0' }}>
                📍 {language === 'en' ? 'Valikandapuram, Perambalur' : 'வாலிகண்டபுரம், பெரம்பலூர்'} · <span style={{ color: 'var(--success)', fontWeight: '600' }}>{language === 'en' ? 'Sorted & Packed' : 'வகைப்படுத்தப்பட்டு பேக் செய்யப்படுகிறது'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(26, 92, 56, 0.08)', borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
              08:15 AM
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: '700', margin: 0, color: 'var(--text)' }}>
                {language === 'en' ? 'Ganesan cold-pressed raw Coconut Oil' : 'கணேசன் மரச்செக்கு தேங்காய் எண்ணெய் தயாரித்தார்'}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', margin: '1px 0 0' }}>
                📍 {language === 'en' ? 'Negamam, Pollachi' : 'நெகமம், பொள்ளாச்சி'} · <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{language === 'en' ? 'Bottling Complete' : 'பாட்டிலில் அடைத்தல் முடிந்தது'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsored */}
      <div className="m-sponsored-banner">
        <div className="m-sponsored-label">
          {language === 'en' ? 'Sponsored' : 'விளம்பரம்'} <i className="fas fa-info-circle"></i>
        </div>
        <div className="m-sponsored-content" style={{ background: 'linear-gradient(135deg,#fff8e1,#ffe0b2)' }}>
          <div className="m-sponsored-text">
            <strong>{language === 'en' ? 'Organic Biscuits & Cookies — 15 Varieties' : 'இயற்கை பிஸ்கட் & குக்கீஸ் — 15 வகைகள்'}</strong>
            <span>{language === 'en' ? 'Kraft paper packaging | Zero preservatives' : 'சூழல் நட்பு காகித பேக்கிங் | பாதுகாப்புகள் இல்லை'}</span>
          </div>
          <Link href="/products?category=biscuits" className="m-sponsored-btn">{language === 'en' ? 'Shop Now' : 'இப்போது வாங்க'}</Link>
        </div>
      </div>

      {/* Results Header */}
      <div className="m-results-header">
        <span className="m-results-count">
          {language === 'en' ? 'Showing 50+ organic products, with fast delivery' : '50+ இயற்கை தயாரிப்புகள், விரைவான விநியோகம்'}
        </span>
        <p>{language === 'en' ? 'See all products across 16 categories.' : '16 பிரிவுகளின் கீழ் உள்ள அனைத்து தயாரிப்புகளையும் காண்க.'}</p>
      </div>

      {/* Featured Section */}
      <section className="m-section">
        <div className="m-section-header">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700' }}>⭐ {t('featured_products')}</h2>
          <Link href="/products?featured=true" className="m-see-all">{language === 'en' ? 'See All' : 'அனைத்தும் காண்க'} →</Link>
        </div>
        <div className="m-product-scroll">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id || product.slug || product._id} product={product} />
          ))}
        </div>
      </section>

      {/* Today's Deals Section */}
      <section className="m-section m-section-tinted" style={{ '--tint-color': 'rgba(255,111,0,0.06)' }}>
        <div className="m-section-header">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700' }}>🔥 {t('todays_deals')}</h2>
          <Link href="/products?bestseller=true" className="m-see-all">{language === 'en' ? 'See All' : 'அனைத்தும் காண்க'} →</Link>
        </div>
        <p className="m-section-sub">{language === 'en' ? 'Top bestsellers with massive discounts' : 'அதிக தள்ளுபடியுடன் கூடிய சிறந்த விற்பனை பொருட்கள்'}</p>
        <div className="m-product-scroll">
          {dealsProducts.map((product) => (
            <ProductCard key={product.id || product.slug || product._id} product={product} />
          ))}
        </div>
      </section>

      {/* Category Deals Grid */}
      <section className="m-deal-grid">
        <Link href="/products?category=biscuits" className="m-deal-card" style={{ background: 'linear-gradient(135deg,#fff3e0,#ffe0b2)' }}>
          <h3>{language === 'en' ? 'Biscuits & Cookies' : 'பிஸ்கட் & குக்கீஸ்'}</h3>
          <p className="m-deal-off">{language === 'en' ? '15 varieties' : '15 வகைகள்'}</p>
          <div className="m-deal-img">🍪🥜🧁</div>
          <span className="m-deal-link">{language === 'en' ? 'Shop now' : 'இப்போது வாங்க'}</span>
        </Link>
        <Link href="/products?category=mushroom" className="m-deal-card" style={{ background: 'linear-gradient(135deg,#efebe9,#d7ccc8)' }}>
          <h3>{language === 'en' ? 'Mushroom Products' : 'காளான் தயாரிப்புகள்'}</h3>
          <p className="m-deal-off">{language === 'en' ? 'Up to 35% OFF' : '35% வரை தள்ளுபடி'}</p>
          <div className="m-deal-img">🍄🧪🍵</div>
          <span className="m-deal-link">{language === 'en' ? 'Shop now' : 'இப்போது வாங்க'}</span>
        </Link>
        <Link href="/products?category=chicken" className="m-deal-card" style={{ background: 'linear-gradient(135deg,#ffebee,#ffcdd2)' }}>
          <h3>{language === 'en' ? 'Organic Chicken' : 'ஆரோக்கிய நாட்டுக்கோழி'}</h3>
          <p className="m-deal-off"><strong>{language === 'en' ? 'Farm Fresh' : 'பண்ணை புதியது'}</strong></p>
          <div className="m-deal-img">🍗🥩🌡️</div>
          <span className="m-deal-link">{language === 'en' ? 'Shop now' : 'இப்போது வாங்க'}</span>
        </Link>
        <Link href="/products?category=dryfruits" className="m-deal-card" style={{ background: 'linear-gradient(135deg,#fff8e1,#ffecb3)' }}>
          <h3>{language === 'en' ? 'Dry Fruits & Nuts' : 'உலர் பழங்கள் & பருப்புகள்'}</h3>
          <p className="m-deal-off">{language === 'en' ? '15 premium items' : '15 பிரீமியம் பொருட்கள்'}</p>
          <div className="m-deal-img">🥜🌰🍇</div>
          <span className="m-deal-link">{language === 'en' ? 'Shop now' : 'இப்போது வாங்க'}</span>
        </Link>
      </section>

      {/* Category Scrolls */}
      {categories.slice(0, 5).map((cat, idx) => {
        const catProducts = products.filter(p => p.category === cat.key).slice(0, 8);
        if (catProducts.length === 0) return null;
        const isTinted = idx % 2 === 0;
        return (
          <section 
            key={cat.key} 
            className={`m-section ${isTinted ? 'm-section-tinted' : ''}`}
            style={isTinted ? { '--tint-color': 'rgba(181,101,29,0.06)' } : {}}
          >
            <div className="m-section-header">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700' }}>
                {language === 'en' ? cat.name : cat.nameTa}
              </h2>
              <Link href={`/products?category=${cat.key}`} className="m-see-all">{language === 'en' ? 'See All' : 'அனைத்தும் காண்க'} →</Link>
            </div>
            <p className="m-section-sub">
              {language === 'en' ? cat.sub : cat.subTa}
            </p>
            <div className="m-product-scroll">
              {catProducts.map((product) => (
                <ProductCard key={product.id || product.slug || product._id} product={product} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Promo Banner */}
      <div className="m-promo-banner" style={{ background: 'linear-gradient(135deg,#1a5c38,#2d6a4f)' }}>
        <div className="m-promo-text">
          <span>🌿 {language === 'en' ? 'LIMITED TIME' : 'வரம்பற்ற சலுகை'}</span>
          <h3>{language === 'en' ? 'Free Delivery on ₹499+' : '₹499க்கு மேல் இலவச விநியோகம்'}</h3>
          <p>{language === 'en' ? 'Use code: Curify499' : 'குறியீடு: Curify499'}</p>
        </div>
        <Link href="/products" className="m-promo-cta">{language === 'en' ? 'Shop Now' : 'இப்போது வாங்க'}</Link>
      </div>

      {/* Remaining Category Scrolls */}
      {categories.slice(5).map((cat, idx) => {
        const catProducts = products.filter(p => p.category === cat.key).slice(0, 8);
        if (catProducts.length === 0) return null;
        const isTinted = idx % 2 === 0;
        return (
          <section 
            key={cat.key} 
            className={`m-section ${isTinted ? 'm-section-tinted' : ''}`}
            style={isTinted ? { '--tint-color': 'rgba(67,160,71,0.06)' } : {}}
          >
            <div className="m-section-header">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700' }}>
                {language === 'en' ? cat.name : cat.nameTa}
              </h2>
              <Link href={`/products?category=${cat.key}`} className="m-see-all">{language === 'en' ? 'See All' : 'அனைத்தும் காண்க'} →</Link>
            </div>
            <p className="m-section-sub">
              {language === 'en' ? cat.sub : cat.subTa}
            </p>
            <div className="m-product-scroll">
              {catProducts.map((product) => (
                <ProductCard key={product.id || product.slug || product._id} product={product} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Brand Grid Row */}
      <section className="m-brand-row">
        <div className="m-brand-card"><div className="m-brand-img">🥬</div><strong>{language === 'en' ? 'Vegetables' : 'காய்கறிகள்'}</strong><span>15 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🍎</div><strong>{language === 'en' ? 'Fruits' : 'பழங்கள்'}</strong><span>12 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🍪</div><strong>{language === 'en' ? 'Biscuits' : 'பிஸ்கட்'}</strong><span>15 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🍄</div><strong>{language === 'en' ? 'Mushroom' : 'காளான்'}</strong><span>12 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🍗</div><strong>{language === 'en' ? 'Chicken' : 'கோழி'}</strong><span>12 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🥜</div><strong>{language === 'en' ? 'Dry Fruits' : 'உலர் பழங்கள்'}</strong><span>15 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">☕</div><strong>{language === 'en' ? 'Beverages' : 'பானங்கள்'}</strong><span>12 items</span></div>
        <div className="m-brand-card"><div className="m-brand-img">🧬</div><strong>{language === 'en' ? 'Superfoods' : 'சூப்பர்ஃபுட்ஸ்'}</strong><span>10 items</span></div>
      </section>

      {/* Certifications & Trust Badges */}
      <section className="m-section m-trust-section">
        <div className="m-section-header">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700' }}>
            {language === 'en' ? '🏅 Why Trust Curify?' : '🏅 நாம் ஏன் க்யூரிஃபை (Curify) ஐ நம்ப வேண்டும்?'}
          </h2>
        </div>
        <p className="m-section-sub">
          {language === 'en' ? 'Certified organic. Verified quality. Delivered with care.' : 'சான்றளிக்கப்பட்ட இயற்கை தயாரிப்புகள். தரம் சரிபார்க்கப்பட்டது.'}
        </p>
        <div className="m-trust-grid">
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#1a5c38,#2d6a4f)' }}>🌿</div>
            <strong>{language === 'en' ? 'FSSAI Certified' : 'FSSAI சான்றிதழ்'}</strong>
            <span>{language === 'en' ? 'Lic. No. 10021032001234' : 'உரிம எண் 10021032001234'}</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#e05a2b,#f77f00)' }}>🔒</div>
            <strong>{language === 'en' ? '100% Secure Payments' : 'பாதுகாப்பான செலுத்துகை'}</strong>
            <span>{language === 'en' ? 'Razorpay · RBI Approved' : 'Razorpay · ரிசர்வ் வங்கி ஒப்புதல்'}</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#0077b6,#023e8a)' }}>🌱</div>
            <strong>{language === 'en' ? 'PGS-India Organic' : 'பி.ஜி.எஸ்-இந்தியா இயற்கை'}</strong>
            <span>{language === 'en' ? 'Zero synthetic pesticides' : 'பூச்சிக்கொல்லிகள் இல்லாத தயாரிப்புகள்'}</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#9b59b6,#6c3483)' }}>♻️</div>
            <strong>{language === 'en' ? 'Eco Packaging' : 'சுற்றுச்சூழல் நட்பு பேக்கேஜிங்'}</strong>
            <span>{language === 'en' ? '100% recyclable kraft & glass' : '100% மறுசுழற்சி செய்யக்கூடிய காகிதம் & கண்ணாடி'}</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#c0392b,#922b21)' }}>❄️</div>
            <strong>{language === 'en' ? 'Cold-Chain Delivery' : 'புதிய விநியோகம்'}</strong>
            <span>{language === 'en' ? 'Perishables vacuum-sealed' : 'புதிய பொருட்கள் கச்சிதமாக பேக் செய்யப்படுகிறது'}</span>
          </div>
          <div className="m-trust-badge">
            <div className="m-trust-icon" style={{ background: 'linear-gradient(135deg,#f39c12,#d68910)' }}>↩️</div>
            <strong>{language === 'en' ? '24h Freshness Window' : '24 மணிநேர பாதுகாப்பு விண்டோ'}</strong>
            <span>{t('return_policy_desc')}</span>
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
        <h3>{language === 'en' ? 'Need help?' : 'உதவி தேவையா?'}</h3>
        <p>
          {language === 'en' ? 'Visit the ' : 'எங்கள் '}
          <Link href="/support">{language === 'en' ? 'help section' : 'உதவி பகுதிக்கு'}</Link>
          {language === 'en' ? ' or ' : ' அல்லது '}
          <Link href="/support">{language === 'en' ? 'contact us' : 'தொடர்பு கொள்ளவும்'}</Link>
        </p>
      </div>

      {/* Newsletter */}
      <section className="m-newsletter">
        <div className="m-newsletter-inner">
          <h2>🌿 {language === 'en' ? 'Get Weekly Deals' : 'வாராந்திர சலுகைகளைப் பெறுங்கள்'}</h2>
          <p>{language === 'en' ? '50+ organic products — exclusive offers every week!' : '50+ இயற்கை தயாரிப்புகள் — ஒவ்வொரு வாரமும் பிரத்யேக சலுகைகள்!'}</p>
          <form onSubmit={handleNewsletterSubmit} className="m-newsletter-form">
            <input 
              type="email" 
              placeholder={language === 'en' ? "Enter your email..." : "மின்னஞ்சல் முகவரி..."}
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
            />
            <button type="submit" aria-label="Subscribe newsletter"><i className="fas fa-paper-plane"></i></button>
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
            <p>{language === 'en' ? '50+ organic products across 16 categories.' : '16 பிரிவுகளின் கீழ் 50+ இயற்கை தயாரிப்புகள்.'}</p>
          </div>
          <div className="m-footer-links">
            <div className="m-footer-col">
              <h4>{language === 'en' ? 'Categories' : 'பிரிவுகள்'}</h4>
              <Link href="/products?category=biscuits">{language === 'en' ? 'Biscuits' : 'பிஸ்கட்'}</Link>
              <Link href="/products?category=snacks">{language === 'en' ? 'Snacks' : 'நொறுக்குத்தீனிகள்'}</Link>
              <Link href="/products?category=mushroom">{language === 'en' ? 'Mushroom' : 'காளான்'}</Link>
              <Link href="/products?category=chicken">{language === 'en' ? 'Chicken' : 'கோழி இறைச்சி'}</Link>
              <Link href="/products?category=grocery">{language === 'en' ? 'Grocery' : 'மளிகை'}</Link>
            </div>
            <div className="m-footer-col">
              <h4>{language === 'en' ? 'More' : 'மேலும்'}</h4>
              <Link href="/products?category=dryfruits">{language === 'en' ? 'Dry Fruits' : 'உலர் பழங்கள்'}</Link>
              <Link href="/products?category=beverages">{language === 'en' ? 'Beverages' : 'பானங்கள்'}</Link>
              <Link href="/products?category=herbal">{language === 'en' ? 'Herbal' : 'மூலிகை'}</Link>
              <Link href="/products?category=superfoods">{language === 'en' ? 'Superfoods' : 'சூப்பர்ஃபுட்ஸ்'}</Link>
              <Link href="/support">{language === 'en' ? 'Help' : 'உதவி'}</Link>
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
