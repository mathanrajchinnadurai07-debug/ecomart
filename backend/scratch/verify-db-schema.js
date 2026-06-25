require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/database');

async function verifySchema() {
  try {
    const colQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
        AND column_name IN ('razorpay_order_id', 'shipped_at', 'delivered_at');
    `;
    const tblQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('sub_orders', 'complaints', 'return_requests');
    `;
    const prodCountQuery = `SELECT COUNT(*) FROM products;`;
    const prodSampleQuery = `SELECT * FROM products LIMIT 3;`;

    const cols = await db.query(colQuery);
    const tbls = await db.query(tblQuery);
    const count = await db.query(prodCountQuery);
    const samples = await db.query(prodSampleQuery);

    console.log('--- COLUMNS IN ORDERS ---');
    console.log(cols.rows);
    console.log('\n--- TABLES IN SCHEMA ---');
    console.log(tbls.rows);
    console.log('\n--- PRODUCT COUNT ---');
    console.log(count.rows);
    console.log('\n--- PRODUCT SAMPLES ---');
    console.log(samples.rows);
  } catch (err) {
    console.error('Error running verify query:', err);
  } finally {
    process.exit(0);
  }
}

verifySchema();
