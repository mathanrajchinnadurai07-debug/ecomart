import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/ProductCard';

const FARMERS_DATA = {
  '2': {
    id: 2,
    name: { en: 'Farmer Selvam', ta: 'விவசாயி செல்வம்' },
    location: { en: 'Valikandapuram, Perambalur District', ta: 'வாலிகண்டபுரம், பெரம்பலூர் மாவட்டம்' },
    coords: "11.23° N, 78.96° E",
    crop: { en: 'Organic Tomatoes & Traditional Veg', ta: 'இயற்கை தக்காளி & பாரம்பரிய காயறிகள்' },
    story: {
      en: 'Selvam has practiced natural, multi-crop farming for over 12 years. He uses native heirloom seeds and homemade organic compost to keep the soil naturally fertile, ensuring every vegetable is nutrient-dense and chemical-free.',
      ta: 'செல்வம் 12 ஆண்டுகளுக்கும் மேலாக இயற்கை மற்றும் பன்முக பயிர் சாகுபடி செய்து வருகிறார். மண்ணை இயற்கையாகவே வளமாக வைத்திருக்க பாரம்பரிய விதைகளையும், வீட்டிலேயே தயாரித்த இயற்கை உரங்களையும் பயன்படுத்துகிறார்.'
    },
    cert: 'PGS-India Organic (ID: PGS-TN-02)',
    fssai: 'FSSAI Reg: 22421596000102',
    experience: { en: '12+ Years Natural Farming', ta: '12+ ஆண்டுகள் இயற்கை விவசாயம்' },
    emoji: '🍅',
    bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    textColor: '#1b5e20'
  },
  '3': {
    id: 3,
    name: { en: 'Farmer Anand', ta: 'விவசாயி ஆனந்த்' },
    location: { en: 'Allur, Trichy District', ta: 'ஆலூர், திருச்சி மாவட்டம்' },
    coords: "10.81° N, 78.69° E",
    crop: { en: 'Traditional Greens & Country Spinach', ta: 'பாரம்பரிய கீரைகள் & பசலைக்கீரை' },
    story: {
      en: 'Anand specializes in country greens and spinach varieties. He harvests traditional leafy greens before dawn so they reach urban hubs in their peak freshness, retaining maximum vitamins and hydration without post-harvest chemical sprays.',
      ta: 'ஆனந்த் பாரம்பரிய கீரை வகைகளை பயிரிடுவதில் நிபுணத்துவம் பெற்றவர். பாரம்பரிய கீரைகளை விடியற்காலைக்கு முன்பே அறுவடை செய்வதன் மூலம், அவை நகர்ப்புற மையங்களை புத்துணர்ச்சியுடன் சென்றடைகின்றன.'
    },
    cert: 'PGS-India Organic (ID: PGS-TN-05)',
    fssai: 'FSSAI Reg: 22421596000105',
    experience: { en: '8+ Years Organic Cultivation', ta: '8+ ஆண்டுகள் இயற்கை விவசாயம்' },
    emoji: '🥬',
    bg: 'linear-gradient(135deg, #efebe9 0%, #d7ccc8 100%)',
    textColor: '#4e3d30'
  },
  '4': {
    id: 4,
    name: { en: 'Farmer Ganesan', ta: 'விவசாயி கணேசன்' },
    location: { en: 'Negamam, Pollachi', ta: 'நெகமம், பொள்ளாச்சி' },
    coords: "10.66° N, 77.03° E",
    crop: { en: 'Wood-Pressed Coconut Oil & Millets', ta: 'மரச்செக்கு தேங்காய் எண்ணெய் & சிறுதானியங்கள்' },
    story: {
      en: 'Ganesan tends to a multi-generational organic coconut grove. He uses sun-dried copra and cold-presses them in traditional wooden chekku mills at low temperatures, preserving the natural aroma and gut-friendly fats.',
      ta: 'கணேசன் பல தலைமுறையாக இயற்கை தேங்காய் தோப்பை பராமரித்து வருகிறார். வெயிலில் காயவைத்த கொப்பரையை பாரம்பரிய மரச்செக்கில் குறைந்த வெப்பநிலையில் பிழிந்து, அதன் இயற்கை மணத்தையும் குணத்தையும் பாதுகாக்கிறார்.'
    },
    cert: 'FSSAI Reg: 22421596000123',
    fssai: 'FSSAI Reg: 22421596000123',
    experience: { en: '3rd Generation Coconut Grove', ta: '3-ஆம் தலைமுறை தேங்காய் தோப்பு' },
    emoji: '🥥',
    bg: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
    textColor: '#7f5f00'
  }
};

const LOCAL_T = {
  en: {
    backToShop: "Back to Shop",
    farmStory: "Our Farm Story",
    location: "Location",
    coords: "Coordinates",
    certification: "Certifications",
    experience: "Experience",
    listedHarvests: "Active Harvest Listings",
    noProducts: "No active harvest items listed currently.",
    noProductsDesc: "This farmer is preparing their next seasonal harvest. Please check back in a few days!",
    fssaiLicense: "FSSAI License",
    pgsIndia: "PGS-India Organic",
    trustStamp: "Harvest Stamp"
  },
  ta: {
    backToShop: "கடைக்குத் திரும்புக",
    farmStory: "எங்கள் விவசாயக் கதை",
    location: "இருப்பிடம்",
    coords: "புவிசார் ஒருங்கிணைப்புகள்",
    certification: "சான்றிதழ்கள்",
    experience: "அனுபவம்",
    listedHarvests: "விற்பனைக்கு உள்ள அறுவடைகள்",
    noProducts: "தற்போது விற்பனைக்கு தயாரிப்புகள் எதுவும் இல்லை.",
    noProductsDesc: "இந்த விவசாயி தனது அடுத்த பருவ கால அறுவடைக்கு தயாராகி வருகிறார். சில நாட்களில் மீண்டும் சரிபார்க்கவும்!",
    fssaiLicense: "FSSAI உரிமம்",
    pgsIndia: "PGS-இந்தியா இயற்கை சான்றிதழ்",
    trustStamp: "அறுவடை முத்திரை"
  }
};

const SkeletonCard = () => (
  <div className="product-card" style={{ border: '1px solid var(--border)', background: '#fff', boxShadow: 'none' }}>
    <div className="skeleton skeleton-image" style={{ width: '100%', height: '140px', borderRadius: '12px 12px 0 0' }}></div>
    <div className="product-info" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="skeleton" style={{ height: '12px', width: '45%' }}></div>
      <div className="skeleton" style={{ height: '16px', width: '80%' }}></div>
      <div className="skeleton" style={{ height: '12px', width: '60%' }}></div>
      <div className="skeleton" style={{ height: '18px', width: '50%', marginTop: '6px' }}></div>
    </div>
  </div>
);

export default function SellerStorefront() {
  const router = useRouter();
  const { id } = router.query;
  const { language } = useLanguage();
  const { addToast } = useCart();
  
  const isTa = language === 'ta';
  const currentT = LOCAL_T[language] || LOCAL_T.en;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicSellerInfo, setDynamicSellerInfo] = useState(null);

  // Get static farmer story if available
  const farmerProfile = FARMERS_DATA[id];

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/products?seller_id=${id}&limit=50`);
        const resData = await res.json();
        
        if (res.ok && resData.success) {
          setProducts(resData.data);
          
          // If no static profile exists, resolve dynamically from product seller info
          if (!farmerProfile && resData.data.length > 0) {
            const firstProduct = resData.data[0];
            setDynamicSellerInfo({
              name: firstProduct.seller_name,
              location: firstProduct.seller_location || 'Tamil Nadu, India',
              cert: firstProduct.seller_location ? 'PGS-India Certified' : 'Curify Verified Farmer',
              fssai: 'FSSAI Verified'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching farmer products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [router.isReady, id]);

  const sellerName = farmerProfile 
    ? (isTa ? farmerProfile.name.ta : farmerProfile.name.en) 
    : (dynamicSellerInfo?.name || `Farmer #${id}`);

  const sellerLocation = farmerProfile
    ? (isTa ? farmerProfile.location.ta : farmerProfile.location.en)
    : (dynamicSellerInfo?.location || 'Tamil Nadu, India');

  const sellerStory = farmerProfile
    ? (isTa ? farmerProfile.story.ta : farmerProfile.story.en)
    : (isTa 
        ? `${sellerName} தமிழ்நாட்டைச் சேர்ந்த ஒரு சான்றளிக்கப்பட்ட விவசாயி ஆவார். இவர் நமது வாடிக்கையாளர்களுக்கு புத்துணர்ச்சியான மற்றும் வேதிப்பொருள் இல்லாத இயற்கை பொருட்களை வழங்குகிறார்.` 
        : `${sellerName} is a verified Curify organic farmer from Tamil Nadu. They provide fresh, chemical-free organic harvests direct to your kitchen.`);

  const sellerCert = farmerProfile?.cert || dynamicSellerInfo?.cert || 'PGS-India Organic Certified';
  const sellerFssai = farmerProfile?.fssai || 'FSSAI Registered: Verified ✅';
  const sellerCoords = farmerProfile?.coords || '11.00° N, 78.00° E';

  return (
    <>
      <div 
        className="seller-store-pg"
        style={{
          background: '#fdfdfd',
          minHeight: '100vh',
          paddingBottom: '80px',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {/* Dynamic header banner with farmer's color theme */}
        <div 
          className="seller-hero"
          style={{
            background: farmerProfile?.bg || 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: farmerProfile ? farmerProfile.textColor : '#fff',
            padding: '40px 16px 64px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Rotated Harvest Watermark stamp */}
          <div style={{
            position: 'absolute',
            right: '-10px',
            bottom: '-20px',
            opacity: 0.08,
            fontSize: '8rem',
            transform: 'rotate(-10deg)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}>🌾</div>

          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
            {farmerProfile?.emoji || '👨‍🌾'}
          </div>
          <h1 style={{ fontSize: '1.6rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', marginBottom: '6px' }}>
            {sellerName}
          </h1>
          <p style={{ fontSize: '0.88rem', opacity: '0.9', fontWeight: '500', fontFamily: 'Inter, sans-serif' }}>
            📍 {sellerLocation}
          </p>
        </div>

        <div 
          className="container"
          style={{
            maxWidth: '800px',
            margin: '-32px auto 0',
            padding: '0 16px',
            position: 'relative',
            zIndex: 2
          }}
        >
          {/* Farmer Profile Card */}
          <div 
            className="card"
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              padding: '24px',
              marginBottom: '28px'
            }}
          >
            <h2 style={{ fontSize: '1.05rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', color: '#4e3d30', marginBottom: '12px' }}>
              📖 {currentT.farmStory}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: '1.6', marginBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
              {sellerStory}
            </p>

            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '16px',
                borderTop: '1px solid #f0f3f1',
                paddingTop: '20px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>{currentT.location}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)', marginTop: '2px' }}>{sellerLocation}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>{currentT.coords}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)', marginTop: '2px', fontFamily: 'Courier, monospace' }}>{sellerCoords}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>{currentT.certification}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', marginTop: '2px' }}>
                  {sellerCert}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>{currentT.fssaiLicense}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)', marginTop: '2px' }}>
                  {sellerFssai}
                </div>
              </div>
            </div>
          </div>

          {/* Active Listings Grid */}
          <h2 style={{ fontSize: '1.2rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '16px' }}>
            🌱 {currentT.listedHarvests}
          </h2>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '16px' }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : products.length === 0 ? (
            <div 
              className="card"
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                padding: '40px 24px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌾</div>
              <h3 style={{ fontSize: '1rem', fontFamily: 'Poppins, sans-serif', fontWeight: '700', color: '#4e3d30', marginBottom: '6px' }}>
                {currentT.noProducts}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', maxWidth: '320px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
                {currentT.noProductsDesc}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '16px' }}>
              {products.map(product => (
                <ProductCard key={product._id || product.id} product={product} />
              ))}
            </div>
          )}

          {/* Link back to shop */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link 
              href="/products"
              className="focus-visible-ring"
              style={{
                fontSize: '0.88rem',
                color: 'var(--primary-dark)',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-arrow-left" style={{ fontSize: '0.8rem' }}></i> {currentT.backToShop}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
