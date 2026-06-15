-- =========================================================
-- Curify - Database Migrations for Production
-- Execute these statements in your Supabase SQL Editor
-- =========================================================

-- 1. Support Shiprocket tracking and order identification
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_order_id VARCHAR(100);

-- 2. Support green loyalty program eco-points
ALTER TABLE users ADD COLUMN IF NOT EXISTS eco_points INTEGER DEFAULT 0;

-- 3. Update newsletter subscribers table for DPDP alignment
-- (Allows tokens and active/inactive status tracking)
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS token VARCHAR(100);
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
