const router = require('express').Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');
const {
  getUserById,
  updateUser,
  addAddress,
  createUser,
} = require('../controllers/userController');

// Create / upsert user on first login
router.post('/', apiLimiter, verifyToken, createUser);

// Add address
router.post('/address', apiLimiter, verifyToken, addAddress);

// Get & update user profile
router.get('/:id', apiLimiter, verifyToken, getUserById);
router.put('/:id', apiLimiter, verifyToken, updateUser);

module.exports = router;
