-- =============================================
-- Curify – Database Schema
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
  shiprocket_order_id VARCHAR(100), -- for Shiprocket order identification
  return_reason TEXT,
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
  token      VARCHAR(100),
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product   ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- =============================================
-- Multi-Vendor & Delivery Job Additions
-- =============================================

-- Enum for delivery status (safer than raw VARCHAR)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    CREATE TYPE delivery_status AS ENUM ('assigned', 'picked_up', 'in_transit', 'delivered', 'failed');
  END IF;
END$$;

-- Sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  phone        VARCHAR(20),
  address      JSONB NOT NULL,
  pickup_location VARCHAR(100) DEFAULT 'Primary',
  razorpay_account_id VARCHAR(100),
  is_active    BOOLEAN DEFAULT TRUE,        -- soft delete instead of hard delete
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for frequent lookups
CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_is_active ON sellers(is_active);

-- Delivery jobs table
CREATE TABLE IF NOT EXISTS delivery_jobs (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  seller_id        INTEGER REFERENCES sellers(id) ON DELETE RESTRICT, -- prevent seller delete if jobs exist
  pickup_address   JSONB NOT NULL,
  delivery_address JSONB NOT NULL,
  status           delivery_status DEFAULT 'assigned',
  notified_at      TIMESTAMP,               -- track when email was sent
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_order_id ON delivery_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_seller_id ON delivery_jobs(seller_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON delivery_jobs(status);

-- Products update
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- Sellers table updates (additive-only)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(100) DEFAULT 'Primary';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(100);

-- Sub-orders table updates (additive-only)
ALTER TABLE sub_orders ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(50);