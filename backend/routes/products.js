const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  getAllProducts,
  searchProducts,
  getProductsByCategory,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// Public routes
router.get('/', apiLimiter, getAllProducts);
router.get('/search', apiLimiter, searchProducts);
router.get('/category/:cat', apiLimiter, getProductsByCategory);
router.get('/:id', apiLimiter, getProductById);

// Admin routes (auth required)
router.post('/', verifyToken, requireAdmin, createProduct);
router.put('/:id', verifyToken, requireAdmin, updateProduct);
router.delete('/:id', verifyToken, requireAdmin, deleteProduct);

module.exports = router;
