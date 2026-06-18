const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');
const {
  addReview,
  getProductReviews
} = require('../controllers/reviewController');

// Add a review (requires auth)
router.post('/', apiLimiter, verifyToken, addReview);

// Get reviews for a product (public)
router.get('/product/:id', getProductReviews);

module.exports = router;
