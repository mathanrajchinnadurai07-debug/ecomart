const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getJobsByDriver, updateJobStatus } = require('../controllers/deliveryController');

// Both routes require a valid Firebase auth token.
// A missing or invalid token returns 401 before the controller runs.
router.get('/jobs/:email', verifyToken, getJobsByDriver);
router.put('/jobs/:id/status', verifyToken, updateJobStatus);

module.exports = router;
