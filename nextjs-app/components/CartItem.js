import React from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function CartItem({ item }) {
  const { updateCartQuantity, removeFromCart } = useCart();

  const productId = item.productId || item.id;
  const weight = item.weight || item.unit || '250g';
  const name = item.name || 'Product';
  const image = item.image || item.imageUrl || '';
  const price = item.price || 0;
  const originalPrice = item.originalPrice || price;
  const quantity = item.quantity || 1;

  const handleIncrease = () => {
    updateCartQuantity(productId, weight, quantity + 1);
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      updateCartQuantity(productId, weight, quantity - 1);
    } else {
      removeFromCart(productId, weight);
    }
  };

  const handleRemove = () => {
    removeFromCart(productId, weight);
  };

  const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <div className="m-cart-item" id={`cart-item-${productId}`}>
      <Link href={`/product/${item.slug || productId}`} className="m-cart-item-img">
        {image ? (
          <img src={image} alt={name} />
        ) : (
          <div className="m-cart-item-placeholder">🌿</div>
        )}
      </Link>

      <div className="m-cart-item-details">
        <Link href={`/product/${item.slug || productId}`} className="m-cart-item-name">
          {name}
        </Link>
        <span className="m-cart-item-weight">{weight}</span>

        <div className="m-cart-item-price-row">
          <span className="m-cart-item-price">₹{(price * quantity).toFixed(0)}</span>
          {discount > 0 && (
            <>
              <span className="m-cart-item-original">₹{(originalPrice * quantity).toFixed(0)}</span>
              <span className="m-cart-item-discount">{discount}% off</span>
            </>
          )}
        </div>

        <div className="m-cart-item-actions">
          <div className="m-cart-qty-control">
            <button onClick={handleDecrease} className="m-cart-qty-btn" aria-label="Decrease quantity">
              {quantity === 1 ? <i className="fas fa-trash-alt"></i> : '−'}
            </button>
            <span className="m-cart-qty-value">{quantity}</span>
            <button onClick={handleIncrease} className="m-cart-qty-btn" aria-label="Increase quantity">
              +
            </button>
          </div>
          <button onClick={handleRemove} className="m-cart-remove-btn">
            <i className="fas fa-trash-alt"></i> Remove
          </button>
        </div>
      </div>
    </div>
  );
}
