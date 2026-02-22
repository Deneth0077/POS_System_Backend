const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin', 'Manager', 'Owner'));

router.get('/daily', reportController.getDailySalesReport);
router.get('/monthly', reportController.getMonthlySalesReport);
router.get('/profit-summary', reportController.getProfitSummary);
router.get('/best-selling', reportController.getBestSellingItems);
router.get('/owner-dashboard', reportController.getOwnerDashboardStats);

module.exports = router;
