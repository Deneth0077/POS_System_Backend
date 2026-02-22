const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const stockTransferController = require('../controllers/stockTransferController');
const reconciliationController = require('../controllers/stockReconciliationController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ============================================
// ADD STOCK ROUTES
// ============================================

/**
 * @route   POST /api/stock/add
 * @desc    Add stock (single item purchase/receive)
 * @access  Private
 */
router.post('/add', stockController.addStock);

/**
 * @route   POST /api/stock/add/bulk
 * @desc    Bulk add stock (multiple items)
 * @access  Private
 */
router.post('/add/bulk', stockController.bulkAddStock);

/**
 * @route   GET /api/stock/add/history
 * @desc    Get add stock history with filters
 * @access  Private
 */
router.get('/add/history', stockController.getAddStockHistory);

// ============================================
// STOCK ADJUSTMENT ROUTES
// ============================================

/**
 * @route   POST /api/stock/adjust
 * @desc    Adjust stock levels (manual correction)
 * @access  Private
 */
router.post('/adjust', stockController.adjustStock);

/**
 * @route   GET /api/stock/adjust/history
 * @desc    Get stock adjustment history with filters
 * @access  Private
 */
router.get('/adjust/history', stockController.getAdjustmentHistory);

// ============================================
// STOCK TRANSFER ROUTES
// ============================================

/**
 * @route   POST /api/stock/transfer
 * @desc    Initiate a stock transfer
 * @access  Private
 */
router.post('/transfer', stockTransferController.initiateTransfer);

/**
 * @route   POST /api/stock/transfer/:transferId/receive
 * @desc    Receive a stock transfer
 * @access  Private
 */
router.post('/transfer/:transferId/receive', stockTransferController.receiveTransfer);

/**
 * @route   POST /api/stock/transfer/:transferId/cancel
 * @desc    Cancel a stock transfer
 * @access  Private
 */
router.post('/transfer/:transferId/cancel', stockTransferController.cancelTransfer);

/**
 * @route   GET /api/stock/transfer
 * @desc    Get all transfers with filters
 * @access  Private
 */
router.get('/transfer', stockTransferController.getAllTransfers);

/**
 * @route   GET /api/stock/transfer/:transferId
 * @desc    Get single transfer by ID
 * @access  Private
 */
router.get('/transfer/:transferId', stockTransferController.getTransferById);

// ============================================
// DAMAGED STOCK ROUTES
// ============================================

/**
 * @route   POST /api/stock/damaged
 * @desc    Report damaged stock
 * @access  Private
 */
router.post('/damaged', stockController.reportDamage);

/**
 * @route   POST /api/stock/damaged/:damageId/approve
 * @desc    Approve damaged stock report
 * @access  Private
 */
router.post('/damaged/:damageId/approve', stockController.approveDamage);

/**
 * @route   GET /api/stock/damaged/history
 * @desc    Get damaged stock history with filters
 * @access  Private
 */
router.get('/damaged/history', stockController.getDamagedStockHistory);

// ============================================
// RETURN STOCK (TO SUPPLIER) ROUTES
// ============================================

/**
 * @route   POST /api/stock/return
 * @desc    Initiate return to supplier
 * @access  Private
 */
router.post('/return', stockController.initiateReturn);

/**
 * @route   POST /api/stock/return/:returnId/approve
 * @desc    Approve return to supplier
 * @access  Private
 */
router.post('/return/:returnId/approve', stockController.approveReturn);

/**
 * @route   POST /api/stock/return/:returnId/complete
 * @desc    Mark return as completed (refund received)
 * @access  Private
 */
router.post('/return/:returnId/complete', stockController.completeReturn);

/**
 * @route   GET /api/stock/return/history
 * @desc    Get return history with filters
 * @access  Private
 */
router.get('/return/history', stockController.getReturnHistory);

// ============================================
// STOCK RECONCILIATION ROUTES
// ============================================

/**
 * @route   POST /api/stock/reconciliation/start
 * @desc    Start unique active reconciliation
 * @access  Private
 */
router.post('/reconciliation/start', reconciliationController.startReconciliation);

/**
 * @route   GET /api/stock/reconciliation/active
 * @desc    Get current in-progress reconciliation
 * @access  Private
 */
router.get('/reconciliation/active', reconciliationController.getActiveReconciliation);

/**
 * @route   POST /api/stock/reconciliation/update
 * @desc    Update counts for reconciliation items
 * @access  Private
 */
router.post('/reconciliation/update', reconciliationController.updateItems);

/**
 * @route   POST /api/stock/reconciliation/:id/submit
 * @desc    Submit for review
 * @access  Private
 */
router.post('/reconciliation/:id/submit', reconciliationController.submitReconciliation);

/**
 * @route   POST /api/stock/reconciliation/:id/approve
 * @desc    Approve and apply adjustments
 * @access  Private (Manager/Admin)
 */
router.post('/reconciliation/:id/approve', authorize('admin', 'manager'), reconciliationController.approveReconciliation);

// ============================================
// STOCK HISTORY & REPORTS ROUTES
// ============================================

/**
 * @route   GET /api/stock/history
 * @desc    Get complete stock transaction history
 * @access  Private
 */
router.get('/history', stockController.getStockHistory);

/**
 * @route   GET /api/stock/summary
 * @desc    Get stock summary report
 * @access  Private
 */
router.get('/summary', stockController.getStockSummary);

/**
 * @route   GET /api/stock/ingredient/:ingredientId/movement
 * @desc    Get stock movement for specific ingredient
 * @access  Private
 */
router.get('/ingredient/:ingredientId/movement', stockController.getIngredientMovement);

module.exports = router;
