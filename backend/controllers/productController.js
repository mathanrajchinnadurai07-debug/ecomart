const db = require('../config/database');
const { getCache, setCache, deleteCache, deleteCachePattern, TTL } = require('../config/redis');

// --------------- GET /api/products ---------------
const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `products:all:${page}:${limit}:${sort}:${order}`;

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    // Whitelist sortable columns
    const allowedSorts = ['created_at', 'price', 'rating', 'name', 'discount'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { rows } = await db.query(
      `SELECT * FROM products ORDER BY ${sortCol} ${sortOrder} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query('SELECT COUNT(*) FROM products');
    const total = parseInt(countResult.rows[0].count, 10);

    const response = {
      success: true,
      data: rows,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    };

    await setCache(cacheKey, response, TTL.PRODUCTS_LIST);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// --------------- GET /api/products/search?q= ---------------
const searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Search query is required' });

    const cacheKey = `products:search:${q.toLowerCase()}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await db.query(
      `SELECT * FROM products
       WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(category) LIKE $1
       ORDER BY rating DESC LIMIT 50`,
      [`%${q.toLowerCase()}%`]
    );

    const response = { success: true, data: rows, count: rows.length };
    await setCache(cacheKey, response, TTL.SEARCH_RESULTS);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// --------------- GET /api/products/category/:cat ---------------
const getProductsByCategory = async (req, res, next) => {
  try {
    const { cat } = req.params;
    const cacheKey = `products:category:${cat.toLowerCase()}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await db.query(
      'SELECT * FROM products WHERE LOWER(category) = $1 ORDER BY created_at DESC',
      [cat.toLowerCase()]
    );

    const response = { success: true, data: rows, count: rows.length };
    await setCache(cacheKey, response, TTL.PRODUCTS_LIST);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// --------------- GET /api/products/:id ---------------
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `products:${id}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fetch reviews
    const reviews = await db.query(
      'SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC',
      [id]
    );

    const response = { success: true, data: { ...rows[0], reviews: reviews.rows } };
    await setCache(cacheKey, response, TTL.SINGLE_PRODUCT);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// --------------- POST /api/products (admin) ---------------
const createProduct = async (req, res, next) => {
  try {
    const { name, price, original_price, discount, category, image_url, description, stock } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ success: false, error: 'Name, price, and category are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO products (name, price, original_price, discount, category, image_url, description, stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, price, original_price || null, discount || 0, category, image_url || null, description || null, stock || 0]
    );

    // Invalidate product list cache
    await deleteCachePattern('products:*');

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// --------------- PUT /api/products/:id (admin) ---------------
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, original_price, discount, category, image_url, description, stock } = req.body;

    const { rows } = await db.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           original_price = COALESCE($3, original_price),
           discount = COALESCE($4, discount),
           category = COALESCE($5, category),
           image_url = COALESCE($6, image_url),
           description = COALESCE($7, description),
           stock = COALESCE($8, stock)
       WHERE id = $9 RETURNING *`,
      [name, price, original_price, discount, category, image_url, description, stock, id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await deleteCachePattern('products:*');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// --------------- DELETE /api/products/:id (admin) ---------------
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM products WHERE id = $1', [id]);

    if (!rowCount) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await deleteCachePattern('products:*');
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProducts,
  searchProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
