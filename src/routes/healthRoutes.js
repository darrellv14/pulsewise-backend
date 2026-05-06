const express = require('express');
const healthController = require('../controllers/healthController');
const metricsAuth = require('../middlewares/metricsAuth');

const router = express.Router();

router.get('/health', healthController.health);
router.get('/metrics', metricsAuth, healthController.metrics);

module.exports = router;
