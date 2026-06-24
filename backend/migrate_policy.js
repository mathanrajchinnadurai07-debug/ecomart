const { Pool } = require("pg");
require("dotenv").config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ");
    console.log("shipped_at column OK");
    await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ");
    console.log("delivered_at column OK");
    await client.query("CREATE TABLE IF NOT EXISTS complaints (id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, item_id TEXT NOT NULL, user_id TEXT NOT NULL, issue_type TEXT NOT NULL, description TEXT DEFAULT '', status TEXT DEFAULT 'pending', refund_amount NUMERIC(10,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())");
    console.log("complaints table OK");
    await client.query("COMMIT");
    console.log("Migration complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally { client.release(); pool.end(); }
}
migrate();
