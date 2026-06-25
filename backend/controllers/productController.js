const db = require('../config/database');
const { getCache, setCache, deleteCache, deleteCachePattern, TTL } = require('../config/redis');
const admin = require('firebase-admin');

/**
 * Format PostgreSQL DB product object to match frontend API schema.
 * Handles camelCase vs snake_case mapping, single image vs images array, weights JSONB parsing, etc.
 */
const formatProductDbToApi = (p) => {
  if (!p) return null;
  
  let weightsParsed = p.weights;
  if (typeof weightsParsed === 'string') {
    try {
      weightsParsed = JSON.parse(weightsParsed);
    } catch (e) {
      weightsParsed = [];
    }
  }

  let nutritionalInfoParsed = p.nutritional_info;
  if (typeof nutritionalInfoParsed === 'string') {
    try {
      nutritionalInfoParsed = JSON.parse(nutritionalInfoParsed);
    } catch (e) {
      nutritionalInfoParsed = {};
    }
  }

  let farmSourceParsed = p.farm_source;
  if (typeof farmSourceParsed === 'string') {
    try {
      farmSourceParsed = JSON.parse(farmSourceParsed);
    } catch (e) {
      farmSourceParsed = {};
    }
  }
  
  return {
    ...p,
    _id: p.slug || String(p.id),
    id: p.id,
    name: p.name,
    price: p.price ? parseFloat(p.price) : 0,
    originalPrice: p.original_price ? parseFloat(p.original_price) : (p.price ? parseFloat(p.price) : 0),
    original_price: p.original_price ? parseFloat(p.original_price) : (p.price ? parseFloat(p.price) : 0),
    discount: p.discount || 0,
    category: p.category,
    image_url: p.image_url,
    imageUrl: p.image_url,
    image: p.image_url,
    images: p.image_url ? [p.image_url] : [],
    description: p.description,
    rating: p.rating ? parseFloat(p.rating) : 4.5,
    numReviews: p.reviews_count || 0,
    reviews_count: p.reviews_count || 0,
    stock: p.stock !== undefined ? p.stock : 100,
    isFeatured: !!p.is_featured,
    is_featured: !!p.is_featured,
    weights: weightsParsed || [],
    nutritionalInfo: nutritionalInfoParsed || {},
    nutritional_info: nutritionalInfoParsed || {},
    farmSource: farmSourceParsed || {},
    farm_source: farmSourceParsed || {},
    deliveryInfo: p.delivery_info,
    delivery_info: p.delivery_info,
    returnPolicy: p.return_policy,
    return_policy: p.return_policy,
    seller_id: p.seller_id,
    seller_name: p.seller_name || 'Curify Central Store',
    seller_location: p.seller_address 
      ? (typeof p.seller_address === 'string' ? JSON.parse(p.seller_address).city : p.seller_address.city) || 'Tamil Nadu'
      : 'Chennai, TN'
  };
};

// --------------- GET /api/products ---------------
const getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'created_at', order = 'DESC', category } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `products:all:${page}:${limit}:${sort}:${order}:${category || ''}`;

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    // Whitelist sortable columns
    const allowedSorts = ['created_at', 'price', 'rating', 'name', 'discount'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let query = 'SELECT p.*, s.name AS seller_name, s.address AS seller_address FROM products p LEFT JOIN sellers s ON p.seller_id = s.id';
    const params = [];
    let paramCount = 0;
    const conditions = [];

    if (category) {
      paramCount++;
      conditions.push(`LOWER(p.category) = $${paramCount}`);
      params.push(category.toLowerCase());
    }

    if (req.query.seller_id) {
      paramCount++;
      conditions.push(`p.seller_id = $${paramCount}`);
      params.push(parseInt(req.query.seller_id, 10));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY p.${sortCol} ${sortOrder}`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const { rows } = await db.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM products';
    const countParams = [];
    const countConditions = [];
    
    if (category) {
      countConditions.push('LOWER(category) = $1');
      countParams.push(category.toLowerCase());
    }
    
    if (req.query.seller_id) {
      countConditions.push('seller_id = $' + (countParams.length + 1));
      countParams.push(parseInt(req.query.seller_id, 10));
    }
    
    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    const formattedRows = rows.map(formatProductDbToApi);

    const response = {
      success: true,
      data: formattedRows,
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
      `SELECT p.*, s.name AS seller_name, s.address AS seller_address 
       FROM products p 
       LEFT JOIN sellers s ON p.seller_id = s.id
       WHERE LOWER(p.name) LIKE $1 OR LOWER(p.description) LIKE $1 OR LOWER(p.category) LIKE $1
       ORDER BY p.rating DESC LIMIT 50`,
      [`%${q.toLowerCase()}%`]
    );

    const formattedRows = rows.map(formatProductDbToApi);

    const response = { success: true, data: formattedRows, count: formattedRows.length };
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
      `SELECT p.*, s.name AS seller_name, s.address AS seller_address 
       FROM products p 
       LEFT JOIN sellers s ON p.seller_id = s.id 
       WHERE LOWER(p.category) = $1 
       ORDER BY p.created_at DESC`,
      [cat.toLowerCase()]
    );

    const formattedRows = rows.map(formatProductDbToApi);

    const response = { success: true, data: formattedRows, count: formattedRows.length };
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

    const { rows } = await db.query(
      `SELECT p.*, s.name AS seller_name, s.address AS seller_address 
       FROM products p 
       LEFT JOIN sellers s ON p.seller_id = s.id 
       WHERE p.id = $1`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fetch reviews
    const reviews = await db.query(
      'SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC',
      [id]
    );

    const productFormatted = formatProductDbToApi(rows[0]);

    const response = { success: true, data: { ...productFormatted, reviews: reviews.rows } };
    await setCache(cacheKey, response, TTL.SINGLE_PRODUCT);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// --------------- GET /api/products/slug/:slug ---------------
const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cacheKey = `products:slug:${slug}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await db.query(
      `SELECT p.*, s.name AS seller_name, s.address AS seller_address 
       FROM products p 
       LEFT JOIN sellers s ON p.seller_id = s.id 
       WHERE p.slug = $1`,
      [slug]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = rows[0];

    // Fetch reviews
    const reviews = await db.query(
      'SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC',
      [product.id]
    );

    const productFormatted = formatProductDbToApi(product);

    const response = { success: true, data: { ...productFormatted, reviews: reviews.rows } };
    await setCache(cacheKey, response, TTL.SINGLE_PRODUCT);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

// --------------- POST /api/products (admin) ---------------
const createProduct = async (req, res, next) => {
  try {
    const { 
      name, price, original_price, discount, category, image_url, description, stock,
      slug, weights, isFeatured, rating, numReviews, seller_id
    } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ success: false, error: 'Name, price, and category are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO products (name, price, original_price, discount, category, image_url, description, stock, seller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, price, original_price || null, discount || 0, category, image_url || null, description || null, stock || 0, seller_id || null]
    );

    const productDb = rows[0];

    // Push to Firestore if credentials are configured
    const hasFirebase = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL;
    if (hasFirebase && admin.apps.length > 0) {
      const dbFirestore = admin.firestore();
      const docSlug = slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      await dbFirestore.collection('products').doc(docSlug).set({
        id: productDb.id,
        name: name.trim(),
        slug: docSlug,
        category,
        price: parseFloat(price),
        originalPrice: parseFloat(original_price) || parseFloat(price),
        discount: parseInt(discount) || 0,
        stock: parseInt(stock) || 0,
        rating: parseFloat(rating) || 4.5,
        numReviews: parseInt(numReviews) || 0,
        description: description ? description.trim() : '',
        imageUrl: image_url || '',
        images: image_url ? [image_url] : [],
        isFeatured: !!isFeatured,
        weights: weights || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`🔥 Synced product "${name}" to Firestore with slug "${docSlug}"`);
    }

    // Invalidate product list cache
    await deleteCachePattern('products:*');

    res.status(201).json({ success: true, data: formatProductDbToApi(productDb) });
  } catch (err) {
    next(err);
  }
};

// --------------- PUT /api/products/:id (admin) ---------------
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, original_price, discount, category, image_url, description, stock, seller_id } = req.body;

    const { rows } = await db.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           original_price = COALESCE($3, original_price),
           discount = COALESCE($4, discount),
           category = COALESCE($5, category),
           image_url = COALESCE($6, image_url),
           description = COALESCE($7, description),
           stock = COALESCE($8, stock),
           seller_id = COALESCE($9, seller_id)
       WHERE id = $10 RETURNING *`,
      [name, price, original_price, discount, category, image_url, description, stock, seller_id, id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await deleteCachePattern('products:*');
    res.json({ success: true, data: formatProductDbToApi(rows[0]) });
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
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
};
