const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const careRoutes = require('./careRoutes');
const biometricRoutes = require('./biometricRoutes');
const medicationRoutes = require('./medicationRoutes');
const legacyParityRoutes = require('./legacyParityRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/', careRoutes);
router.use('/', biometricRoutes);
router.use('/', medicationRoutes);
router.use('/', legacyParityRoutes);

module.exports = router;
