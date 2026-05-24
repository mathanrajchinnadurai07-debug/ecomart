import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ALL_PRODUCTS } from '../data/products';

export default function SearchBar({ onSearch }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Debounced search
    clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        const results = ALL_PRODUCTS.filter(p =>
          p.name.toLowerCase().includes(value.toLowerCase()) ||
          p.category.toLowerCase().includes(value.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(value.toLowerCase()))
        ).slice(0, 8);
        setSuggestions(results);
        setShowSuggestions(true);
        setLoading(false);
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      if (onSearch) onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (product) => {
    setQuery('');
    setShowSuggestions(false);
    router.push(`/product/${product._id || product.slug}`);
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} style={{ background: '#fef08a', padding: 0 }}>{part}</mark> : part
    );
  };

  return (
    <div className="m-searchbar-wrapper" ref={wrapperRef} id="searchBar">
      <form onSubmit={handleSubmit} className="m-searchbar-form">
        <i className="fas fa-search m-searchbar-icon"></i>
        <input
          type="text"
          placeholder="Search organic products..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="m-searchbar-input"
          autoComplete="off"
        />
        {loading && <div className="m-searchbar-spinner"></div>}
        {query && (
          <button
            type="button"
            className="m-searchbar-clear"
            onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); }}
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="m-searchbar-dropdown" id="searchSuggestions">
          {suggestions.map((product) => (
            <div
              key={product._id}
              className="m-searchbar-item"
              onClick={() => handleSuggestionClick(product)}
            >
              <div className="m-searchbar-item-img">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} />
                ) : (
                  <span className="m-searchbar-item-emoji">{product.emoji || '🌿'}</span>
                )}
              </div>
              <div className="m-searchbar-item-info">
                <span className="m-searchbar-item-name">
                  {highlightMatch(product.name, query)}
                </span>
                <span className="m-searchbar-item-cat">{product.category}</span>
              </div>
              <span className="m-searchbar-item-price">
                ₹{product.discountPrice || product.price}
              </span>
            </div>
          ))}
          <div className="m-searchbar-footer" onClick={handleSubmit}>
            See all results for "{query}" →
          </div>
        </div>
      )}

      {showSuggestions && query.trim().length >= 2 && suggestions.length === 0 && !loading && (
        <div className="m-searchbar-dropdown">
          <div className="m-searchbar-empty">
            <i className="fas fa-search"></i>
            <p>No results found for "{query}"</p>
          </div>
        </div>
      )}
    </div>
  );
}
