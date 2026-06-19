const express = require('express');
const router = express.Router();
const { getJobsByDriver, updateJobStatus } = require('../controllers/deliveryController');

// All delivery APIs are open for now, but in production we could add basic auth
router.get('/jobs/:email', getJobsByDriver);
router.put('/jobs/:id/status', updateJobStatus);

module.exports = router;
