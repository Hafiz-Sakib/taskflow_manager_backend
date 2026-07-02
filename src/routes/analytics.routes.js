const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(protect);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/boards/:id', analyticsController.getBoardStats);
router.get('/recent', analyticsController.getRecentlyViewed);
router.get('/system', authorize(ROLES.ADMIN), analyticsController.getSystemStats);

module.exports = router;
