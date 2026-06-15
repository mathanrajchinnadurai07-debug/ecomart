const { Pool } = require('pg');

// pgBouncer connection pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                       // Limit connections for pgBouncer / transaction mode
  idleTimeoutMillis: 30000,      // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout connecting after 5s
});

// Log pool events in development
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Connected to Supabase PostgreSQL (pgBouncer)');
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err);
  process.exit(-1);
});

/**
 * Query helper – wraps pool.query for convenience.
 * @param {string} text  - SQL query string
 * @param {Array}  params - Parameterised values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client from the pool (for transactions).
 * Remember to call client.release() when done.
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
