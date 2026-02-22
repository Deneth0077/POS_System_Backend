const express = require('express');
const router = express.Router();
const OfflineController = require('../controllers/offlineController');
const { protect } = require('../middleware/auth');
const { body, query, param } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Offline
 *   description: Offline operations and synchronization endpoints
 */

/**
 * @swagger
 * /api/offline/queue/sale:
 *   post:
 *     summary: Queue an offline sale
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - saleData
 *               - deviceId
 *             properties:
 *               saleData:
 *                 type: object
 *               deviceId:
 *                 type: string
 *               priority:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Sale queued successfully
 */
router.post(
  '/queue/sale',
  protect,
  body('saleData').isObject().withMessage('Sale data must be an object'),
  body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
  body('priority').optional().isInt({ min: 1, max: 10 }),
  OfflineController.queueSale
);

/**
 * @swagger
 * /api/offline/receipts/generate:
 *   post:
 *     summary: Generate offline receipt
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - saleData
 *               - deviceId
 *             properties:
 *               saleData:
 *                 type: object
 *               deviceId:
 *                 type: string
 *               receiptType:
 *                 type: string
 *                 enum: [original, duplicate, refund]
 *               format:
 *                 type: string
 *                 enum: [print, email, sms, pdf]
 *               language:
 *                 type: string
 *                 enum: [english, sinhala, tamil]
 *               orderType:
 *                 type: string
 *                 enum: [dine-in, takeaway, delivery]
 *     responses:
 *       201:
 *         description: Receipt generated offline
 */
router.post(
  '/receipts/generate',
  protect,
  body('saleData').isObject().withMessage('Sale data must be an object'),
  body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
  body('receiptType').optional().isIn(['original', 'duplicate', 'refund']),
  body('format').optional().isIn(['print', 'email', 'sms', 'pdf']),
  body('language').optional().isIn(['english', 'sinhala', 'tamil']),
  body('orderType').optional().isIn(['dine-in', 'takeaway', 'delivery']),
  OfflineController.generateOfflineReceipt
);

/**
 * @swagger
 * /api/offline/sync:
 *   post:
 *     summary: Synchronize pending items
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *               syncType:
 *                 type: string
 *                 enum: [manual, automatic, scheduled, startup]
 *     responses:
 *       200:
 *         description: Synchronization completed
 */
router.post(
  '/sync',
  protect,
  body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
  body('syncType').optional().isIn(['manual', 'automatic', 'scheduled', 'startup']),
  OfflineController.syncPendingItems
);

/**
 * @swagger
 * /api/offline/queue/pending:
 *   get:
 *     summary: Get pending queue items
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pending items retrieved
 */
router.get(
  '/queue/pending',
  protect,
  query('deviceId').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  OfflineController.getPendingItems
);

/**
 * @swagger
 * /api/offline/conflicts:
 *   get:
 *     summary: Get items with conflicts
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conflicted items retrieved
 */
router.get(
  '/conflicts',
  protect,
  query('deviceId').optional().isString(),
  OfflineController.getConflictedItems
);

/**
 * @swagger
 * /api/offline/conflicts/{queueId}/resolve:
 *   post:
 *     summary: Resolve a conflict
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - strategy
 *             properties:
 *               strategy:
 *                 type: string
 *                 enum: [keep_offline, keep_online, merge, manual, skip]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conflict resolved
 */
router.post(
  '/conflicts/:queueId/resolve',
  protect,
  param('queueId').isString().notEmpty(),
  body('strategy').isIn(['keep_offline', 'keep_online', 'merge', 'manual', 'skip']),
  body('reason').optional().isString(),
  OfflineController.resolveConflict
);

/**
 * @swagger
 * /api/offline/queue/stats:
 *   get:
 *     summary: Get queue statistics
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue statistics retrieved
 */
router.get(
  '/queue/stats',
  protect,
  query('deviceId').optional().isString(),
  OfflineController.getQueueStats
);

/**
 * @swagger
 * /api/offline/sync/history:
 *   get:
 *     summary: Get sync history
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sync history retrieved
 */
router.get(
  '/sync/history',
  protect,
  query('deviceId').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  OfflineController.getSyncHistory
);

/**
 * @swagger
 * /api/offline/sync/stats:
 *   get:
 *     summary: Get sync statistics
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sync statistics retrieved
 */
router.get(
  '/sync/stats',
  protect,
  query('deviceId').optional().isString(),
  query('days').optional().isInt({ min: 1, max: 365 }),
  OfflineController.getSyncStats
);

/**
 * @swagger
 * /api/offline/queue/clear-synced:
 *   delete:
 *     summary: Clear synced items
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *               daysOld:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Synced items cleared
 */
router.delete(
  '/queue/clear-synced',
  protect,
  body('deviceId').optional().isString(),
  body('daysOld').optional().isInt({ min: 1 }),
  OfflineController.clearSyncedItems
);

/**
 * @swagger
 * /api/offline/queue/{queueId}:
 *   get:
 *     summary: Get queue item details
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Queue item retrieved
 */
router.get(
  '/queue/:queueId',
  protect,
  param('queueId').isString().notEmpty(),
  OfflineController.getQueueItem
);

/**
 * @swagger
 * /api/offline/queue/{queueId}/retry:
 *   post:
 *     summary: Retry failed item
 *     tags: [Offline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item reset for retry
 */
router.post(
  '/queue/:queueId/retry',
  protect,
  param('queueId').isString().notEmpty(),
  OfflineController.retryFailedItem
);

module.exports = router;
