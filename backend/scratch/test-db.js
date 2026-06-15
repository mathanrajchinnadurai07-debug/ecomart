require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool, query } = require('../config/database');

async function runTest() {
  console.log('🔌 Testing database connection to:', process.env.DATABASE_URL ? 'URL present' : 'URL missing');
  
  try {
    // 1. Check database version
    const versionRes = await query('SELECT version()');
    console.log('✅ PostgreSQL Version:', versionRes.rows[0].version);

    // 2. Insert test user
    const testId = 'test_user_' + Date.now();
    const insertUserSql = `
      INSERT INTO users (id, name, email, phone, addresses, eco_points)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `;
    const insertRes = await query(insertUserSql, [
      testId,
      'Test User',
      `test_${Date.now()}@example.com`,
      '1234567890',
      JSON.stringify([{ label: 'Home', address: '123 Main St' }]),
      10
    ]);
    console.log('✅ Inserted Test User:', insertRes.rows[0]);

    // 3. Query the user back
    const selectRes = await query('SELECT * FROM users WHERE id = $1', [testId]);
    console.log('✅ Selected User:', selectRes.rows[0]);

    // 4. Clean up test user
    await query('DELETE FROM users WHERE id = $1', [testId]);
    console.log('✅ Cleaned up Test User from DB');

  } catch (err) {
    console.error('❌ Database Test Failed:', err);
  } finally {
    await pool.end();
    console.log('🔌 Connection pool ended.');
  }
}

runTest();
