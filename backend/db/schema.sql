-- =============================================
-- Kurfee – Database Schema
-- PostgreSQL
-- =============================================

-- Products
CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255)   NOT NULL,
  price          NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  discount       INTEGER        DEFAULT 0,
  category       VARCHAR(100)   NOT NULL,
  image_url      TEXT,
  description    TEXT,
  rating         NUMERIC(2, 1)  DEFAULT 0.0,
  reviews_count  INTEGER        DEFAULT 0,
  stock          INTEGER        DEFAULT 0,
  created_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- Users (Firebase UID as primary key)
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(100) PRIMARY KEY,
  name       VARCHAR(255),
  email      VARCHAR(255) UNIQUE NOT NULL,
  phone      VARCHAR(20),
  addresses  JSONB        DEFAULT '[]'::jsonb,
  eco_points INT          DEFAULT 0,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL PRIMARY KEY,
  user_id      VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items        JSONB        NOT NULL, -- keeping JSONB for quick frontend reads
  total_amount NUMERIC(10, 2) NOT NULL,
  address      JSONB,
  status       VARCHAR(50)  DEFAULT 'pending',
  payment_id   VARCHAR(255),
  shipment_id  VARCHAR(255), -- for Shiprocket tracking
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Order Items (Relational representation for queries)
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER      NOT NULL,
  price      NUMERIC(10, 2) NOT NULL
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER      NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, user_id)
);

-- Newsletter Subscribers (DPDP compliant)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email      VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product   ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
