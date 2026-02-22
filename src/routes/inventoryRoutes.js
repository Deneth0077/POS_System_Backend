const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  // Inventory Batch operations
  getInventoryBatches,
  getInventoryBatchById,
  createInventoryBatch,
  updateInventoryBatch,
  deleteInventoryBatch,
  // Ingredient operations
  getIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  updateIngredientStock,
  // Wastage and Alerts
  recordWastage,
  getStockAlerts,
  acknowledgeAlert,
  resolveAlert,
  performReconciliation,
  // Reports
  getDailyUsageReport,
  getWastageReport,
  getPopularItemsReport,
  deleteIngredient,
  getLocations
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { apiLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory management with ingredient tracking, alerts, and reporting
 */

// ==================== INVENTORY BATCH ROUTES (List & Create) ====================
router.get('/', apiLimiter, protect, getInventoryBatches);
router.get('/locations', apiLimiter, protect, getLocations);
router.post('/', apiLimiter, protect, authorize('admin', 'manager'), createInventoryBatch);

// ==================== INGREDIENT ROUTES ====================

/**
 * @swagger
 * /api/inventory/ingredients:
 *   get:
 *     summary: Get all ingredients
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Ingredients retrieved successfully
 */
router.get('/ingredients', apiLimiter, protect, getIngredients);

/**
 * @swagger
 * /api/inventory/ingredients/{id}:
 *   get:
 *     summary: Get ingredient by ID
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ingredient retrieved successfully
 *       404:
 *         description: Ingredient not found
 */
router.get('/ingredients/:id', apiLimiter, protect, getIngredientById);

/**
 * @swagger
 * /api/inventory/ingredients:
 *   post:
 *     summary: Create new ingredient
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *               currentStock:
 *                 type: number
 *               reorderLevel:
 *                 type: number
 *               unitCost:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ingredient created successfully
 */
router.post('/ingredients', apiLimiter, protect, authorize('admin', 'manager'), createIngredient);

/**
 * @swagger
 * /api/inventory/ingredients/{id}:
 *   put:
 *     summary: Update ingredient
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ingredient updated successfully
 */
router.put('/ingredients/:id', apiLimiter, protect, authorize('admin', 'manager'), updateIngredient);

/**
 * @swagger
 * /api/inventory/ingredients/{id}:
 *   delete:
 *     summary: Delete ingredient
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ingredient deleted successfully
 */
router.delete('/ingredients/:id', apiLimiter, protect, authorize('admin'), deleteIngredient);

/**
 * @swagger
 * /api/inventory/ingredients/{id}/stock:
 *   put:
 *     summary: Update ingredient stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *               transactionType:
 *                 type: string
 *                 enum: [purchase, adjustment, return]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock updated successfully
 */
router.put('/ingredients/:id/stock', apiLimiter, protect, authorize('admin', 'manager'), updateIngredientStock);

// ==================== WASTAGE ROUTES ====================

/**
 * @swagger
 * /api/inventory/wastage:
 *   post:
 *     summary: Record ingredient wastage
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ingredientId
 *               - quantity
 *               - reason
 *             properties:
 *               ingredientId:
 *                 type: integer
 *               quantity:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Wastage recorded successfully
 */
router.post('/wastage', apiLimiter, protect, authorize('admin', 'manager'), recordWastage);

// ==================== ALERT ROUTES ====================

/**
 * @swagger
 * /api/inventory/alerts:
 *   get:
 *     summary: Fetch low-stock alerts
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: alertType
 *         schema:
 *           type: string
 *           enum: [low_stock, out_of_stock, expiring_soon, expired]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: isResolved
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 */
router.get('/alerts', apiLimiter, protect, getStockAlerts);

/**
 * @swagger
 * /api/inventory/alerts/{id}/acknowledge:
 *   patch:
 *     summary: Acknowledge stock alert
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alert acknowledged
 */
router.patch('/alerts/:id/acknowledge', apiLimiter, protect, authorize('admin', 'manager'), acknowledgeAlert);

/**
 * @swagger
 * /api/inventory/alerts/{id}/resolve:
 *   patch:
 *     summary: Resolve stock alert
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alert resolved
 */
router.patch('/alerts/:id/resolve', apiLimiter, protect, authorize('admin', 'manager'), resolveAlert);

// ==================== RECONCILIATION ROUTE ====================

/**
 * @swagger
 * /api/inventory/reconciliation:
 *   post:
 *     summary: Perform daily stock reconciliation
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reconciliation completed successfully
 */
router.post('/reconciliation', apiLimiter, protect, authorize('admin', 'manager'), performReconciliation);

// ==================== REPORT ROUTES ====================

/**
 * @swagger
 * /api/inventory/reports/daily-usage:
 *   get:
 *     summary: Generate daily usage report
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Daily usage report generated
 */
router.get('/reports/daily-usage', apiLimiter, protect, getDailyUsageReport);

/**
 * @swagger
 * /api/inventory/reports/wastage:
 *   get:
 *     summary: Generate wastage report
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Wastage report generated
 */
router.get('/reports/wastage', apiLimiter, protect, getWastageReport);

/**
 * @swagger
 * /api/inventory/reports/popular-items:
 *   get:
 *     summary: Generate popular items report
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Popular items report generated
 */
router.get('/reports/popular-items', apiLimiter, protect, getPopularItemsReport);

// ==================== INVENTORY BATCH ROUTES (Item operations) ====================
// NOTE: These must be last to avoid catching other routes like /ingredients, /alerts etc.
router.get('/:id', apiLimiter, protect, getInventoryBatchById);
router.put('/:id', apiLimiter, protect, authorize('admin', 'manager'), updateInventoryBatch);
router.delete('/:id', apiLimiter, protect, authorize('admin'), deleteInventoryBatch);

module.exports = router;
