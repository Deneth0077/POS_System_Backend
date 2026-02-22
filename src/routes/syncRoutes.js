const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  syncOfflineSales,
  getUnsyncedSales,
  syncInventory,
  getInventorySnapshot
} = require('../controllers/syncController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { syncLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../config/roles');

/**
 * @swagger
 * tags:
 *   name: Sync
 *   description: Offline data synchronization for POS terminals
 */

// Validation rules
const syncOfflineSalesValidation = [
  body('sales').isArray({ min: 1 }).withMessage('Sales array is required and must not be empty'),
  body('sales.*.offlineId').notEmpty().withMessage('Offline ID is required for each sale'),
  body('sales.*.items').isArray({ min: 1 }).withMessage('Items array is required for each sale'),
  body('sales.*.amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number')
];

const syncInventoryValidation = [
  body('updates').isArray().withMessage('Updates array is required'),
  body('updates.*.productId').notEmpty().withMessage('Product ID is required for each update'),
  body('updates.*.quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative number')
];

/**
 * @swagger
 * /api/sync/offline-sales:
 *   post:
 *     summary: Sync offline sales
 *     description: Upload and synchronize sales made while offline. Accessible by all authenticated users.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sales
 *             properties:
 *               sales:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - offlineId
 *                     - items
 *                     - amountPaid
 *                   properties:
 *                     offlineId:
 *                       type: string
 *                       example: OFFLINE-2025-001
 *                     items:
 *                       type: array
 *                       minItems: 1
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: integer
 *                           quantity:
 *                             type: integer
 *                           unitPrice:
 *                             type: number
 *                     amountPaid:
 *                       type: number
 *                       format: decimal
 *                     paymentMethod:
 *                       type: string
 *                       enum: [cash, card, mobile, other]
 *                     saleDate:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: Sales synchronized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     syncedCount:
 *                       type: integer
 *                       example: 5
 *                     failedCount:
 *                       type: integer
 *                       example: 0
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/offline-sales', syncLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), syncOfflineSalesValidation, validate, syncOfflineSales);

/**
 * @swagger
 * /api/sync/unsynced-sales:
 *   get:
 *     summary: Get unsynced sales
 *     description: Retrieve list of sales that haven't been synced. Requires Admin or Manager role.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unsynced sales retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin or Manager role
 */
router.get('/unsynced-sales', syncLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), getUnsyncedSales);

/**
 * @swagger
 * /api/sync/inventory:
 *   post:
 *     summary: Sync inventory updates
 *     description: Synchronize inventory quantity updates from offline terminals. Requires Admin or Manager role.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 50
 *                     batchNumber:
 *                       type: string
 *                       example: BATCH-2025-001
 *     responses:
 *       200:
 *         description: Inventory synchronized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedCount:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin or Manager role
 */
router.post('/inventory', syncLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), syncInventoryValidation, validate, syncInventory);

/**
 * @swagger
 * /api/sync/inventory-snapshot:
 *   get:
 *     summary: Get inventory snapshot
 *     description: Download complete inventory snapshot for offline operation. Accessible by all authenticated users.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory snapshot retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     inventory:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryBatch'
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory-snapshot', syncLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), getInventorySnapshot);

module.exports = router;
