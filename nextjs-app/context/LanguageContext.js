import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const TRANSLATIONS = {
  en: {
    todays_harvest: "Today's Harvest",
    todays_harvest_msg: "🌾 Anand harvested fresh Spinach at Trichy this morning | 🍅 Selvam harvested organic Tomatoes at Perambalur | 🥥 Ganesan cold-pressed fresh Coconut Oil at Pollachi",
    search_placeholder: "Search 50+ organic products...",
    deliver_to: "Deliver to",
    detect_location: "Detect Location",
    todays_deals: "Today's Deals",
    home: "Home",
    categories: "Categories",
    cart: "Cart",
    account: "Account",
    support: "Support",
    add_to_cart: "Add to Cart",
    buy_now: "Buy Now",
    out_of_stock: "Out of Stock",
    in_stock: "In Stock",
    low_stock: "Only {count} left",
    harvest_stamp: "Harvest Stamp",
    harvested_on: "Harvested on",
    at: "at",
    by: "by",
    return_policy_tag: "24-Hour Food-Safety Window",
    return_policy_desc: "24-hour return & full refund for freshness/quality complaints.",
    seller_spotlight: "Farmer Spotlight",
    featured_products: "Featured Products",
    seasonal_products: "Seasonal & Fresh",
    reviews: "Customer Reviews",
    write_review: "Write a Review",
    related_products: "Related Products from Same Farmer",
    cart_grouped_by: "Your Cart (Grouped by Farmer)",
    subtotal: "Subtotal",
    delivery_estimate: "Delivery Estimate",
    place_order: "Place Order",
    payment_method: "Payment Method",
    secure_payment: "Secured by Razorpay",
    track_order: "Track Your Order",
    wishlist: "My Wishlist",
    empty_wishlist: "Your wishlist is empty.",
    view_details: "View Details",
    seller_storefront: "Farmer Storefront",
    all_products: "All Products",
    farm_story: "Farm Story",
    location: "Location",
    certifications: "Certifications",
    back_to_shop: "Back to Shop",
    product_not_found: "Product Not Found",
    product_not_found_desc: "The product you are looking for does not exist or has been removed."
  },
  ta: {
    todays_harvest: "இன்றைய அறுவடை",
    todays_harvest_msg: "🌾 ஆனந்த் இன்று காலை திருச்சியில் புதிய கீரையை அறுவடை செய்தார் | 🍅 செல்வம் பெரம்பலூரில் இயற்கை தக்காளியை அறுவடை செய்தார் | 🥥 கணேசன் பொள்ளாச்சியில் புதிய தேங்காய் எண்ணெயை தயாரித்தார்",
    search_placeholder: "50+ இயற்கை தயாரிப்புகளைத் தேடுங்கள்...",
    deliver_to: "விநியோகம் செய்யுமிடம்",
    detect_location: "இருப்பிடத்தைக் கண்டறியவும்",
    todays_deals: "இன்றைய சலுகைகள்",
    home: "முகப்பு",
    categories: "வகைகள்",
    cart: "கூடை",
    account: "கணக்கு",
    support: "உதவி",
    add_to_cart: "கூடையில் சேர்க்க",
    buy_now: "இப்போது வாங்க",
    out_of_stock: "இருப்பில் இல்லை",
    in_stock: "இருப்பில் உள்ளது",
    low_stock: "{count} மட்டுமே மீதமுள்ளது",
    harvest_stamp: "அறுவடை முத்திரை",
    harvested_on: "அறுவடை செய்யப்பட்ட நாள்",
    at: "இடம்",
    by: "விவசாயி",
    return_policy_tag: "24 மணிநேர உணவு பாதுகாப்பு காலம்",
    return_policy_desc: "புத்துணர்ச்சி/தரம் குறித்த புகார்களுக்கு 24 மணிநேரத்திற்குள் திரும்பப் பெற்று முழுப் பணம் திரும்பப் பெறலாம்.",
    seller_spotlight: "விவசாயி வெளிச்சம்",
    featured_products: "சிறப்பு தயாரிப்புகள்",
    seasonal_products: "பருவகால தயாரிப்புகள்",
    reviews: "வாடிக்கையாளர் மதிப்புரைகள்",
    write_review: "மதிப்புரை எழுதவும்",
    related_products: "அதே விவசாயியின் பிற தயாரிப்புகள்",
    cart_grouped_by: "உங்கள் கூடை (விவசாயி வாரியாக)",
    subtotal: "துணைத் தொகை",
    delivery_estimate: "மதிப்பிடப்பட்ட விநியோக நேரம்",
    place_order: "ஆர்டர் செய்யவும்",
    payment_method: "கட்டண முறை",
    secure_payment: "ரேசர்பே (Razorpay) மூலம் பாதுகாக்கப்பட்டது",
    track_order: "ஆர்டரைத் கண்காணிக்கவும்",
    wishlist: "எனது விருப்பப்பட்டியல்",
    empty_wishlist: "உங்கள் விருப்பப்பட்டியல் காலியாக உள்ளது.",
    view_details: "விவரங்களைப் பார்க்க",
    seller_storefront: "விவசாயி முகப்பு",
    all_products: "அனைத்து தயாரிப்புகள்",
    farm_story: "விவசாயக் கதை",
    location: "இருப்பிடம்",
    certifications: "சான்றிதழ்கள்",
    back_to_shop: "கடைக்குத் திரும்புக",
    product_not_found: "தயாரிப்பு கிடைக்கவில்லை",
    product_not_found_desc: "நீங்கள் தேடும் தயாரிப்பு இல்லை அல்லது நீக்கப்பட்டுவிட்டது."
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('curify_language');
    if (saved === 'en' || saved === 'ta') {
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang) => {
    if (lang === 'en' || lang === 'ta') {
      setLanguage(lang);
      localStorage.setItem('curify_language', lang);
    }
  };

  const t = (key, interpolations = {}) => {
    let text = TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
    Object.keys(interpolations).forEach(k => {
      text = text.replace(`{${k}}`, interpolations[k]);
    });
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
