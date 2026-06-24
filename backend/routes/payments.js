const router = require('express').Router();
const { paymentWebhook } = require('../controllers/paymentController');

// The webhook uses express.raw() in server.js, so this route receives a Buffer in req.body
router.post('/webhook', paymentWebhook);

module.exports = router;
