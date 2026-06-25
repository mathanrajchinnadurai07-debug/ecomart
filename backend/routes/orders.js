const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
  shiprocketWebhook,
  cancelOrder,
  returnOrder,
  refundOrder,
  raiseComplaint,
  listComplaints,
  approveComplaint,
  rejectComplaint,
  validateCoupon,
  downloadInvoice,
  stuckComplaints
} = require('../controllers/orderController');

// All order routes require authentication
router.post('/', apiLimiter, verifyToken, createOrder);
router.post('/validate-coupon', apiLimiter, verifyToken, validateCoupon);

// Admin: complaint management (must be before /:id routes to avoid conflict)
router.get('/admin/complaints', apiLimiter, verifyToken, requireAdmin, listComplaints);
router.put('/admin/complaints/:id/approve', apiLimiter, verifyToken, requireAdmin, approveComplaint);
router.put('/admin/complaints/:id/reject', apiLimiter, verifyToken, requireAdmin, rejectComplaint);
router.get('/admin/complaints/stuck', apiLimiter, verifyToken, requireAdmin, stuckComplaints);

router.get('/user/:userId', apiLimiter, verifyToken, getOrdersByUser);
router.get('/:id', apiLimiter, verifyToken, getOrderById);
router.get('/:id/invoice', apiLimiter, verifyToken, downloadInvoice);
router.put('/:id/status', apiLimiter, verifyToken, updateOrderStatus);
router.post('/:id/cancel', apiLimiter, verifyToken, cancelOrder);
router.post('/:id/return', apiLimiter, verifyToken, returnOrder);
router.post('/:id/refund', apiLimiter, verifyToken, requireAdmin, refundOrder);
router.post('/:id/complaint', apiLimiter, verifyToken, raiseComplaint);
router.post('/shiprocket/webhook', apiLimiter, shiprocketWebhook);

module.exports = router;
