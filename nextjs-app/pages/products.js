import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ALL_PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';

export default function Products() {
  const router = useRouter();
  
  // State for filters
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('');
  
  // Mobile drawer visibility states
  const [mobFilterOpen, setMobFilterOpen] = useState(false);
  const [mobSortOpen, setMobSortOpen] = useState(false);
  const [mobActiveTab, setMobActiveTab] = useState('category');

  // Load filters from URL query params initially
  useEffect(() => {
    if (router.isReady) {
      const { category, search, bestseller, featured } = router.query;
      
      if (category) {
        setSelectedCategories([category]);
      } else {
        setSelectedCategories([]);
      }
      
      if (featured === 'true' || featured === true) {
        setFeaturedOnly(true);
      } else {
        setFeaturedOnly(false);
      }
      
      if (bestseller === 'true') {
        setSortBy('rating'); // Bestseller is sorted by highest rating
      }
    }
  }, [router.isReady, router.query]);

  // Handle Category check box click
  const handleCategoryChange = (cat) => {
    setSelectedCategories((prev) => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInStockOnly(false);
    setFeaturedOnly(false);
    setSortBy('');
  };

  // Perform client-side filter and sorting logic
  let filtered = [...ALL_PRODUCTS];

  // Search keyword match
  if (router.query.search) {
    const q = router.query.search.toLowerCase().trim();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  // Category filter
  if (selectedCategories.length > 0) {
    filtered = filtered.filter(p => selectedCategories.includes(p.category));
  }

  // Price range filter
  if (minPrice !== '') {
    filtered = filtered.filter(p => {
      const price = p.discountPrice || p.price;
      return price >= parseFloat(minPrice);
    });
  }
  if (maxPrice !== '') {
    filtered = filtered.filter(p => {
      const price = p.discountPrice || p.price;
      return price <= parseFloat(maxPrice);
    });
  }

  // Rating filter
  if (minRating !== '') {
    filtered = filtered.filter(p => p.rating >= parseFloat(minRating));
  }

  // Stock filter
  if (inStockOnly) {
    filtered = filtered.filter(p => (p.stock !== undefined ? p.stock : 100) > 0);
  }

  // Featured filter
  if (featuredOnly) {
    filtered = filtered.filter(p => p.isFeatured);
  }

  // Sorting logic
  if (sortBy === 'price_low') {
    filtered.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
  } else if (sortBy === 'price_high') {
    filtered.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
  } else if (sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  const allCategories = [
    { key: 'vegetables', emoji: '🥬', label: 'Vegetables' },
    { key: 'fruits', emoji: '🍎', label: 'Fruits' },
    { key: 'biscuits', emoji: '🍪', label: 'Biscuits' },
    { key: 'snacks', emoji: '🥜', label: 'Snacks' },
    { key: 'mushroom', emoji: '🍄', label: 'Mushroom' },
    { key: 'chicken', emoji: '🍗', label: 'Chicken' },
    { key: 'mutton', emoji: '🍖', label: 'Mutton' },
    { key: 'grocery', emoji: '🏪', label: 'Grocery' },
    { key: 'herbal', emoji: '🌿', label: 'Herbal' },
    { key: 'dryfruits', emoji: '🥣', label: 'Dry Fruits' },
    { key: 'flour', emoji: '🌾', label: 'Flour' },
    { key: 'beverages', emoji: '☕', label: 'Beverages' },
    { key: 'spreads', emoji: '🍯', label: 'Spreads' },
    { key: 'pickles', emoji: '🥒', label: 'Pickles' },
    { key: 'superfoods', emoji: '🧬', label: 'Superfoods' },
    { key: 'readytocook', emoji: '🍲', label: 'Ready to Cook' }
  ];

  return (
    <>
      <div className="topbar">
        <div className="container">
          <div>
            <i className="fas fa-phone-alt"></i> +91 78457 44038 | <Link href="/support">Help</Link>
          </div>
          <div>
            <Link href="/products?bestseller=true"><i className="fas fa-percent"></i> Special Offers</Link>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="page-layout">
          {/* Desktop Filter Sidebar */}
          <aside className="filter-sidebar" id="desktopFilterSidebar">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Filters</h2>
            
            <div className="filter-group">
              <h3>Category</h3>
              {allCategories.map(cat => (
                <label key={cat.key}>
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.includes(cat.key)}
                    onChange={() => handleCategoryChange(cat.key)} 
                  /> {cat.emoji} {cat.label}
                </label>
              ))}
            </div>

            <div className="filter-group">
              <h3>Price Range</h3>
              <div className="price-range">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)} 
                />
                <span>—</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)} 
                />
              </div>
            </div>

            <div className="filter-group">
              <h3>Rating</h3>
              <label>
                <input 
                  type="radio" 
                  name="rating" 
                  value="4" 
                  checked={minRating === '4'}
                  onChange={() => setMinRating('4')} 
                /> ★★★★☆ & up
              </label>
              <label>
                <input 
                  type="radio" 
                  name="rating" 
                  value="3" 
                  checked={minRating === '3'}
                  onChange={() => setMinRating('3')} 
                /> ★★★☆☆ & up
              </label>
            </div>

            <div className="filter-group">
              <h3>Availability</h3>
              <label>
                <input 
                  type="checkbox" 
                  checked={inStockOnly} 
                  onChange={(e) => setInStockOnly(e.target.checked)} 
                /> In Stock
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={featuredOnly} 
                  onChange={(e) => setFeaturedOnly(e.target.checked)} 
                /> Featured only
              </label>
            </div>

            <button className="clear-filters" onClick={handleClearFilters}>
              Clear All Filters
            </button>
          </aside>

          {/* Main Catalog View */}
          <main style={{ paddingBottom: '60px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }} id="pageTitle">
                {router.query.search ? `Search Results for "${router.query.search}"` : 'All Products'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span id="productCount" style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  {filtered.length} products found
                </span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="desktop-sort" 
                  style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value="">Sort by: Relevance</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="product-grid" id="productGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {filtered.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-light)' }}>
                <i className="fas fa-search" style={{ fontSize: '3rem', marginBottom: '16px' }}></i>
                <h2>No Products Found</h2>
                <p>Try broadening your search criteria or clearing filters.</p>
                <button 
                  onClick={handleClearFilters}
                  style={{ marginTop: '16px', padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Mobile Sticky Sort/Filter Bar */}
            <div className="mob-sort-bar">
              <button onClick={() => setMobSortOpen(true)}><strong>Sort</strong></button>
              <button onClick={() => setMobFilterOpen(true)}><i className="fas fa-filter" style={{ marginRight: '6px' }}></i> <strong>Filter</strong></button>
            </div>

            {/* Mobile Fullscreen Filter Drawer */}
            <div id="mobFilterDrawer" className={`mob-filter-drawer ${mobFilterOpen ? 'active' : ''}`}>
              <div className="mob-filter-header">
                <button onClick={() => setMobFilterOpen(false)}><i className="fas fa-arrow-left"></i></button>
                <h2>Filters</h2>
                <button className="clear-btn" onClick={handleClearFilters}>Clear Filters</button>
              </div>
              <div className="mob-filter-body">
                <div className="mob-filter-sidebar">
                  <button className={mobActiveTab === 'category' ? 'active' : ''} onClick={() => setMobActiveTab('category')}>Category</button>
                  <button className={mobActiveTab === 'price' ? 'active' : ''} onClick={() => setMobActiveTab('price')}>Price</button>
                  <button className={mobActiveTab === 'rating' ? 'active' : ''} onClick={() => setMobActiveTab('rating')}>Rating</button>
                  <button className={mobActiveTab === 'availability' ? 'active' : ''} onClick={() => setMobActiveTab('availability')}>Availability</button>
                </div>
                <div className="mob-filter-content">
                  {mobActiveTab === 'category' && (
                    <div id="mob-panel-category" className="mob-panel active">
                      {allCategories.map(cat => (
                        <label key={cat.key}>
                          <input 
                            type="checkbox" 
                            checked={selectedCategories.includes(cat.key)}
                            onChange={() => handleCategoryChange(cat.key)} 
                          /> {cat.label}
                        </label>
                      ))}
                    </div>
                  )}
                  {mobActiveTab === 'price' && (
                    <div id="mob-panel-price" className="mob-panel active">
                      <label style={{ display: 'block', marginBottom: '12px' }}>
                        Min: 
                        <input 
                          type="number" 
                          value={minPrice} 
                          onChange={(e) => setMinPrice(e.target.value)} 
                          style={{ border: '1px solid #ccc', padding: '6px', width: '100%', marginTop: '4px' }} 
                        />
                      </label>
                      <label style={{ display: 'block' }}>
                        Max: 
                        <input 
                          type="number" 
                          value={maxPrice} 
                          onChange={(e) => setMaxPrice(e.target.value)} 
                          style={{ border: '1px solid #ccc', padding: '6px', width: '100%', marginTop: '4px' }} 
                        />
                      </label>
                    </div>
                  )}
                  {mobActiveTab === 'rating' && (
                    <div id="mob-panel-rating" className="mob-panel active">
                      <label>
                        <input 
                          type="radio" 
                          name="mob_rating" 
                          checked={minRating === '4'}
                          onChange={() => setMinRating('4')} 
                        /> ★★★★☆ & up
                      </label>
                      <label>
                        <input 
                          type="radio" 
                          name="mob_rating" 
                          checked={minRating === '3'}
                          onChange={() => setMinRating('3')} 
                        /> ★★★☆☆ & up
                      </label>
                    </div>
                  )}
                  {mobActiveTab === 'availability' && (
                    <div id="mob-panel-availability" className="mob-panel active">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={inStockOnly} 
                          onChange={(e) => setInStockOnly(e.target.checked)} 
                        /> In Stock
                      </label>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={featuredOnly} 
                          onChange={(e) => setFeaturedOnly(e.target.checked)} 
                        /> Featured
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <div className="mob-filter-footer">
                <div style={{ fontWeight: '700' }}>{filtered.length} products found</div>
                <button className="apply-btn" onClick={() => setMobFilterOpen(false)}>Apply</button>
              </div>
            </div>

            {/* Mobile Sort Modal */}
            {mobSortOpen && (
              <div 
                id="mobSortModal" 
                className="mob-sort-modal active" 
                onClick={(e) => e.target.id === 'mobSortModal' && setMobSortOpen(false)}
              >
                <div className="mob-sort-content">
                  <h3 style={{ padding: '16px', borderBottom: '1px solid #eee', margin: 0 }}>Sort By</h3>
                  <div style={{ padding: '10px' }}>
                    <label className="mob-sort-option">
                      <input 
                        type="radio" 
                        name="mob_sort" 
                        checked={sortBy === ''}
                        onChange={() => { setSortBy(''); setMobSortOpen(false); }} 
                      /> Relevance
                    </label>
                    <label className="mob-sort-option">
                      <input 
                        type="radio" 
                        name="mob_sort" 
                        checked={sortBy === 'price_low'}
                        onChange={() => { setSortBy('price_low'); setMobSortOpen(false); }} 
                      /> Price: Low to High
                    </label>
                    <label className="mob-sort-option">
                      <input 
                        type="radio" 
                        name="mob_sort" 
                        checked={sortBy === 'price_high'}
                        onChange={() => { setSortBy('price_high'); setMobSortOpen(false); }} 
                      /> Price: High to Low
                    </label>
                    <label className="mob-sort-option">
                      <input 
                        type="radio" 
                        name="mob_sort" 
                        checked={sortBy === 'rating'}
                        onChange={() => { setSortBy('rating'); setMobSortOpen(false); }} 
                      /> Highest Rated
                    </label>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
