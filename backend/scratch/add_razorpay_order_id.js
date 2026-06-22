require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/database');
async function run() {
  const client = await db.getClient();
  try {
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100)');
    console.log('Migration successful');
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    process.exit(0);
  }
}
run();
