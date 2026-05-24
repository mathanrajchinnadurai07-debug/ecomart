const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');
const {
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');

// All order routes require authentication
router.post('/', apiLimiter, verifyToken, createOrder);
router.get('/user/:userId', apiLimiter, verifyToken, getOrdersByUser);
router.get('/:id', apiLimiter, verifyToken, getOrderById);
router.put('/:id/status', apiLimiter, verifyToken, updateOrderStatus);

module.exports = router;
