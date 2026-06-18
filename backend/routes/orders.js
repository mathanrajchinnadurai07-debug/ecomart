const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');
const {
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
  shiprocketWebhook,
  returnOrder,
} = require('../controllers/orderController');

// All order routes require authentication
router.post('/', apiLimiter, verifyToken, createOrder);
router.get('/user/:userId', apiLimiter, verifyToken, getOrdersByUser);
router.get('/:id', apiLimiter, verifyToken, getOrderById);
router.put('/:id/status', apiLimiter, verifyToken, updateOrderStatus);
router.post('/:id/return', apiLimiter, verifyToken, returnOrder);
router.post('/shiprocket/webhook', apiLimiter, shiprocketWebhook);

module.exports = router;
