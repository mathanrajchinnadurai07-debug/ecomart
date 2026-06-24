require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/database');

async function run() {
  const client = await db.getClient();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sub_orders (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        seller_id INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        shiprocket_order_id VARCHAR(100),
        shipment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Migration successful: sub_orders table created.');
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
