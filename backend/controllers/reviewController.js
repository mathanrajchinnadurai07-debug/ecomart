const db = require('../config/database');
const { deleteCachePattern } = require('../config/redis');

// --------------- POST /api/reviews ---------------
const addReview = async (req, res, next) => {
  try {
    const { product_id, rating, comment } = req.body;
    const user_id = req.user.uid; // from verifyToken middleware

    if (!product_id || !rating) {
      return res.status(400).json({ success: false, error: 'Product ID and Rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    // Insert or update review (user can only review a product once, UPSERT)
    const { rows } = await db.query(
      `INSERT INTO reviews (product_id, user_id, rating, comment) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (product_id, user_id) 
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment 
       RETURNING *`,
      [product_id, user_id, rating, comment || '']
    );

    // Update product average rating
    await updateProductRating(product_id);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// --------------- GET /api/reviews/product/:id ---------------
const getProductReviews = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT r.id, r.product_id, r.rating, r.comment, r.created_at, u.name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = $1 
       ORDER BY r.created_at DESC`,
      [id]
    );

    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
};

// Helper function to update the average rating in products table
const updateProductRating = async (productId) => {
  try {
    const { rows } = await db.query(
      `SELECT AVG(rating) as avg_rating, COUNT(id) as total_reviews 
       FROM reviews WHERE product_id = $1`,
      [productId]
    );

    if (rows.length > 0) {
      const avg = parseFloat(rows[0].avg_rating).toFixed(1);
      const count = parseInt(rows[0].total_reviews, 10);

      await db.query(
        `UPDATE products SET rating = $1, reviews_count = $2 WHERE id = $3`,
        [avg, count, productId]
      );
      
      await deleteCachePattern(`product:${productId}`);
      await deleteCachePattern('products:*');
    }
  } catch (e) {
    console.error('Error updating product rating:', e);
  }
};

module.exports = {
  addReview,
  getProductReviews
};
