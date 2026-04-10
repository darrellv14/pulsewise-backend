const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const careRoutes = require('./careRoutes');
const biometricRoutes = require('./biometricRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/', careRoutes);
router.use('/', biometricRoutes);

module.exports = router;
