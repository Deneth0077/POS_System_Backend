const express = require('express');
const router = express.Router();
const stockIssueController = require('../controllers/stockIssueController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Create a new stock issue request
// POST /api/stock-issues
router.post('/', stockIssueController.createStockIssue);

// List all stock issues
// GET /api/stock-issues
router.get('/', stockIssueController.listStockIssues);

// Get preview/details of a specific stock issue
// GET /api/stock-issues/:id/preview
router.get('/:id/preview', stockIssueController.getStockIssuePreview);

// Confirm a stock issue (Execute transfer)
// POST /api/stock-issues/:id/confirm
// Requires specific role? Maybe 'inventory_manager' or 'admin'. For now, allowing authenticated users.
router.post('/:id/confirm', stockIssueController.confirmStockIssue);

// Cancel a stock issue
// POST /api/stock-issues/:id/cancel
router.post('/:id/cancel', stockIssueController.cancelStockIssue);

module.exports = router;
