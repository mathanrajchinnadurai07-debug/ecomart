const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  subscribe,
  unsubscribe
} = require('../controllers/newsletterController');

router.post('/', apiLimiter, subscribe);
router.delete('/:token', apiLimiter, unsubscribe);

module.exports = router;
