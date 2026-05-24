const Redis = require('ioredis');

// --------------- Connection ---------------
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: true, // won't throw on startup if Redis is down
});

redis.on('connect', () => console.log('🔴 Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

// --------------- TTL presets (seconds) ---------------
const TTL = {
  PRODUCTS_LIST: 5 * 60,       // 5 minutes
  SINGLE_PRODUCT: 10 * 60,     // 10 minutes
  SEARCH_RESULTS: 2 * 60,      // 2 minutes
  CART: 24 * 60 * 60,          // 24 hours
  SESSION: 7 * 24 * 60 * 60,   // 7 days
};

// --------------- Cache helpers ---------------

/**
 * Get cached value (auto JSON-parsed).
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis getCache error:', err.message);
    return null;
  }
};

/**
 * Set a value in cache with optional TTL.
 * @param {string} key
 * @param {any}    value - Will be JSON-stringified
 * @param {number} ttl   - Time-to-live in seconds (default: 5 min)
 */
const setCache = async (key, value, ttl = TTL.PRODUCTS_LIST) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    console.error('Redis setCache error:', err.message);
  }
};

/**
 * Delete one or more cache keys.
 * @param {string|string[]} keys
 */
const deleteCache = async (keys) => {
  try {
    const keyList = Array.isArray(keys) ? keys : [keys];
    if (keyList.length) await redis.del(...keyList);
  } catch (err) {
    console.error('Redis deleteCache error:', err.message);
  }
};

/**
 * Delete all keys matching a pattern (e.g. "products:*").
 * @param {string} pattern
 */
const deleteCachePattern = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch (err) {
    console.error('Redis deleteCachePattern error:', err.message);
  }
};

module.exports = { redis, TTL, getCache, setCache, deleteCache, deleteCachePattern };
