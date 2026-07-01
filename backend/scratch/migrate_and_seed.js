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

    // Add is_demo, pickup_location, and razorpay_account_id columns to sellers table
    await query(`
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(100) DEFAULT 'Primary';
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(100);
    `);
    console.log('✅ Added is_demo, pickup_location, and razorpay_account_id columns to sellers table');

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

    // Insert or select central seller
    console.log('👤 Inserting Central Store vendor account...');
    const centralRes = await query(`
      INSERT INTO sellers (name, email, address, pickup_location, razorpay_account_id, is_demo, is_active)
      VALUES (
        'Curify Central Store',
        'store@curify.com',
        '{"street": "100 Moringa Way", "city": "Madurai", "state": "TN", "zip": "625001"}'::jsonb,
        'Central_Warehouse',
        'acc_12345_store',
        TRUE,
        TRUE
      )
      ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name, pickup_location = EXCLUDED.pickup_location, razorpay_account_id = EXCLUDED.razorpay_account_id
      RETURNING id;
    `);
    const centralSellerId = centralRes.rows[0].id;
    console.log(`✅ Central Store vendor confirmed with ID: ${centralSellerId}`);

    // Insert or select demo seller
    console.log('👤 Inserting Demo Store vendor account...');
    const demoRes = await query(`
      INSERT INTO sellers (name, email, address, pickup_location, razorpay_account_id, is_demo, is_active)
      VALUES (
        'Curify Demo Store',
        'demo@curify.com',
        '{"street": "200 Rice Husk Road", "city": "Chennai", "state": "TN", "zip": "600001"}'::jsonb,
        'Primary',
        'acc_12345_demo',
        TRUE,
        TRUE
      )
      ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name, pickup_location = EXCLUDED.pickup_location, razorpay_account_id = EXCLUDED.razorpay_account_id
      RETURNING id;
    `);
    const demoSellerId = demoRes.rows[0].id;
    console.log(`✅ Demo vendor confirmed with ID: ${demoSellerId}`);

    // Now safe to set NOT NULL constraint on seller_id since products table is empty or we will assign them all to the central seller
    await query('UPDATE products SET seller_id = $1 WHERE seller_id IS NULL', [centralSellerId]);
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

    // Insert products with upsert (ON CONFLICT DO UPDATE) to preserve IDs
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

      // Assign to different sellers based on category
      const isCentralCategory = ['vegetables', 'fruits', 'grocery'].includes((p.category || '').toLowerCase());
      const productSellerId = isCentralCategory ? centralSellerId : demoSellerId;

      const insertSql = `
        INSERT INTO products (
          name, slug, price, original_price, discount, category, image_url, description,
          rating, reviews_count, stock, weights, is_featured, nutritional_info, farm_source,
          delivery_info, return_policy, seller_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          original_price = EXCLUDED.original_price,
          discount = EXCLUDED.discount,
          category = EXCLUDED.category,
          image_url = EXCLUDED.image_url,
          description = EXCLUDED.description,
          rating = EXCLUDED.rating,
          reviews_count = EXCLUDED.reviews_count,
          stock = EXCLUDED.stock,
          weights = EXCLUDED.weights,
          is_featured = EXCLUDED.is_featured,
          nutritional_info = EXCLUDED.nutritional_info,
          farm_source = EXCLUDED.farm_source,
          delivery_info = EXCLUDED.delivery_info,
          return_policy = EXCLUDED.return_policy,
          seller_id = EXCLUDED.seller_id
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
        productSellerId
      ]);
      insertedCount++;
    }

    console.log(`🎉 Successfully seeded ${insertedCount} products into database!`);

    // Verification Spot Check
    const countRes1 = await query('SELECT COUNT(*) FROM products WHERE seller_id = $1', [centralSellerId]);
    const countRes2 = await query('SELECT COUNT(*) FROM products WHERE seller_id = $1', [demoSellerId]);
    console.log(`🔍 Verification: DB now has ${countRes1.rows[0].count} products for Central Store, and ${countRes2.rows[0].count} for Demo Store.`);

    const sampleRes = await query(`
      SELECT name, slug, price, original_price, discount, seller_id 
      FROM products 
      WHERE slug IN ('ragi-cookies', 'millet-biscuits', 'jaggery-cookies')
      ORDER BY slug
    `);
    console.log('🔍 Spot check of pricing mapping on 3 sample products:');
    sampleRes.rows.forEach(row => {
      console.log(`   - ${row.name} (${row.slug}): price = ${row.price}, original_price = ${row.original_price}, discount = ${row.discount}%, seller_id = ${row.seller_id}`);
    });

  } catch (err) {
    console.error('❌ Migration and Seeding Failed:', err);
  } finally {
    await pool.end();
    console.log('🔌 Database connection pool ended.');
  }
}

main();
