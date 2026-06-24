const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

router.get('/', sellerController.getSellers);
router.post('/', verifyToken, requireAdmin, sellerController.createSeller);
router.put('/:id', verifyToken, requireAdmin, sellerController.updateSeller);
router.delete('/:id', verifyToken, requireAdmin, sellerController.deleteSeller);

// Seller-scoped portal routes
router.get('/sub-orders', verifyToken, sellerController.getSellerSubOrders);
router.get('/sub-orders/:id/label', verifyToken, sellerController.getShiprocketLabel);

module.exports = router;
