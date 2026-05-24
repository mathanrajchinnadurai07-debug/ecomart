const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                       // Max connections in pool
  idleTimeoutMillis: 30000,      // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout connecting after 5s
});

// Log pool events in development
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 New PostgreSQL client connected');
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
