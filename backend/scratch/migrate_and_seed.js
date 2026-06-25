require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool, query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔌 Connecting to PostgreSQL...');
  
  try {
    // === PHASE 1: SCHEMA MIGRATIONS ===
    console.log('⚡ Starting Phase 1 Schema Migrations...');
    
    // Add columns to products table
    await query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS weights JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS nutritional_info JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS farm_source JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_info TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS return_policy TEXT;
    `);
    console.log('✅ Added missing columns to products table');

    // Add is_demo column to sellers table
    await query(`
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Added is_demo column to sellers table');

    // Check if seller_id column exists on products
    const colCheck = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'seller_id'
    `);
    if (colCheck.rows.length === 0) {
      await query(`
        ALTER TABLE products ADD COLUMN seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added seller_id column to products table');
    }

    // Insert or select demo seller
    console.log('👤 Inserting demo vendor account...');
    const sellerRes = await query(`
      INSERT INTO sellers (name, email, address, is_demo, is_active)
      VALUES (
        'Curify Demo Store',
        'demo@curify.com',
        '{"street": "Demo Street", "city": "Mumbai", "state": "MH", "zip": "400001"}'::jsonb,
        TRUE,
        TRUE
      )
      ON CONFLICT (email) DO UPDATE
      SET is_demo = TRUE, name = EXCLUDED.name
      RETURNING id;
    `);
    const sellerId = sellerRes.rows[0].id;
    console.log(`✅ Demo vendor confirmed with ID: ${sellerId}`);

    // Now safe to set NOT NULL constraint on seller_id since products table is empty or we will assign them all to the demo seller
    await query('UPDATE products SET seller_id = $1 WHERE seller_id IS NULL', [sellerId]);
    await query('ALTER TABLE products ALTER COLUMN seller_id SET NOT NULL');
    console.log('✅ Set seller_id NOT NULL constraint on products table');

    // === PHASE 2: PRODUCT SEEDING ===
    console.log('🌱 Starting Phase 2 Product Seeding...');
    
    // Parse ESM products.js using CJS temp file conversion
    console.log('📖 Reading nextjs-app/data/products.js...');
    const productsFilePath = path.resolve(__dirname, '../../nextjs-app/data/products.js');
    let productsContent = fs.readFileSync(productsFilePath, 'utf8');
    
    // Replace ESM export with CommonJS export
    productsContent = productsContent.replace(/export\s+const\s+ALL_PRODUCTS\s*=/, 'module.exports =');
    const tempFilePath = path.resolve(__dirname, './temp_products.js');
    fs.writeFileSync(tempFilePath, productsContent, 'utf8');
    
    const ALL_PRODUCTS = require('./temp_products.js');
    fs.unlinkSync(tempFilePath);
    
    console.log(`Loaded ${ALL_PRODUCTS.length} products from static list.`);

    // Check for duplicate slugs
    const slugs = ALL_PRODUCTS.map(p => p.slug);
    const uniqueSlugs = new Set(slugs);
    if (uniqueSlugs.size !== slugs.length) {
      throw new Error(`Duplicate slugs found in products list! Total: ${slugs.length}, Unique: ${uniqueSlugs.size}`);
    }
    console.log('✅ Deduplication check passed: 0 duplicate slugs found.');

    // Clear existing products for this seller to ensure idempotency
    console.log(`🗑️ Clearing existing products for seller ID: ${sellerId} to prevent duplicates...`);
    await query('DELETE FROM products WHERE seller_id = $1', [sellerId]);

    // Insert products
    let insertedCount = 0;
    for (const p of ALL_PRODUCTS) {
      // 1. Core pricing mapping correctness resolution:
      // PostgreSQL "price" is the final selling price.
      // PostgreSQL "original_price" is the pre-discount original price.
      let priceVal;
      let originalPriceVal = null;
      if (p.discountPrice !== undefined && p.discountPrice !== null) {
        priceVal = p.discountPrice;
        originalPriceVal = p.price;
      } else {
        priceVal = p.price;
      }

      // 2. Image path mapping
      const imageUrl = (p.images && p.images.length > 0) ? p.images[0] : (p.image || null);

      // 3. Other fields mapping
      const reviewsCount = p.numReviews || 0;
      const stock = p.stock !== undefined ? p.stock : 100;
      const isFeatured = !!p.isFeatured;
      const weights = p.weights || [];
      
      const nutritionalInfo = p.nutritionalInfo || {};
      const farmSource = p.farmSource || {};
      const deliveryInfo = p.deliveryInfo || null;
      const returnPolicy = p.returnPolicy || null;

      const insertSql = `
        INSERT INTO products (
          name, slug, price, original_price, discount, category, image_url, description,
          rating, reviews_count, stock, weights, is_featured, nutritional_info, farm_source,
          delivery_info, return_policy, seller_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
      `;

      await query(insertSql, [
        p.name,
        p.slug,
        priceVal,
        originalPriceVal,
        p.discount || 0,
        p.category,
        imageUrl,
        p.description || null,
        p.rating || 0.0,
        reviewsCount,
        stock,
        JSON.stringify(weights),
        isFeatured,
        JSON.stringify(nutritionalInfo),
        JSON.stringify(farmSource),
        deliveryInfo,
        returnPolicy,
        sellerId
      ]);
      insertedCount++;
    }

    console.log(`🎉 Successfully seeded ${insertedCount} products into database!`);

    // Verification Spot Check
    const countRes = await query('SELECT COUNT(*) FROM products WHERE seller_id = $1', [sellerId]);
    console.log(`🔍 Verification: DB now has ${countRes.rows[0].count} products for demo seller.`);

    const sampleRes = await query(`
      SELECT name, slug, price, original_price, discount 
      FROM products 
      WHERE seller_id = $1 AND slug IN ('ragi-cookies', 'millet-biscuits', 'jaggery-cookies')
      ORDER BY slug
    `, [sellerId]);
    console.log('🔍 Spot check of pricing mapping on 3 sample products:');
    sampleRes.rows.forEach(row => {
      console.log(`   - ${row.name} (${row.slug}): price = ${row.price}, original_price = ${row.original_price}, discount = ${row.discount}%`);
    });

  } catch (err) {
    console.error('❌ Migration and Seeding Failed:', err);
  } finally {
    await pool.end();
    console.log('🔌 Database connection pool ended.');
  }
}

main();
