const router = require('express').Router();
const { paymentLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');
const {
  createPaymentOrder,
  verifyPayment,
  paymentWebhook,
} = require('../controllers/paymentController');

// Both payment routes require authentication and stricter rate limiting
router.post('/create', paymentLimiter, verifyToken, createPaymentOrder);
router.post('/verify', paymentLimiter, verifyToken, verifyPayment);
router.post('/webhook', paymentLimiter, paymentWebhook);

module.exports = router;
