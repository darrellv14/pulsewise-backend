const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const careRoutes = require('./careRoutes');
const biometricRoutes = require('./biometricRoutes');
const medicationRoutes = require('./medicationRoutes');
const patientCareRoutes = require('./patientCareRoutes');
const mlRecommendationRoutes = require('./mlRecommendationRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/', careRoutes);
router.use('/', biometricRoutes);
router.use('/', medicationRoutes);
router.use('/', patientCareRoutes);
router.use('/', mlRecommendationRoutes);

module.exports = router;
