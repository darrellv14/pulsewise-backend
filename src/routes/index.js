const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const careRoutes = require('./careRoutes');
const biometricRoutes = require('./biometricRoutes');
const medicationRoutes = require('./medicationRoutes');
const patientCareRoutes = require('./patientCareRoutes');
const mlRecommendationRoutes = require('./mlRecommendationRoutes');
const heartRiskModelRoutes = require('./heartRiskModelRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/', careRoutes);
router.use('/', biometricRoutes);
router.use('/', medicationRoutes);
router.use('/', patientCareRoutes);
router.use('/', mlRecommendationRoutes);
router.use('/', heartRiskModelRoutes);
router.use('/', notificationRoutes);
router.use('/', adminRoutes);

module.exports = router;
