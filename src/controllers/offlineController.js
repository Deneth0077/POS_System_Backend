const OfflineService = require('../services/offlineService');
const SyncService = require('../services/syncService');
const ConflictResolutionService = require('../services/conflictResolutionService');
const OfflineReceiptService = require('../services/offlineReceiptService');
const { validationResult } = require('express-validator');

/**
 * Offline Controller
 * Handles offline operations and synchronization
 * Issue 9: Offline sales capability
 */
class OfflineController {
  /**
   * Queue an offline sale
   * Sub-issue 9.1: Store offline order
   * POST /api/offline/queue/sale
   */
  static async queueSale(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { saleData, deviceId, priority } = req.body;

      if (priority) saleData.priority = priority;

      const result = await OfflineService.queueOfflineSale(
        saleData,
        deviceId,
        req.user.id,
        req.user.fullName || req.user.username
      );

      res.status(201).json({
        success: true,
        message: 'Sale queued for synchronization',
        data: result
      });

    } catch (error) {
      console.error('Error queuing offline sale:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to queue offline sale',
        error: error.message
      });
    }
  }

  /**
   * Generate offline receipt
   * Sub-issue 9.3: Offline receipt generation
   * POST /api/offline/receipts/generate
   */
  static async generateOfflineReceipt(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { saleData, deviceId, receiptType, format, language, orderType } = req.body;

      const result = await OfflineReceiptService.generateOfflineReceipt(saleData, {
        deviceId,
        cashierId: req.user.id,
        cashierName: req.user.fullName || req.user.username,
        receiptType,
        format,
        language,
        orderType
      });

      res.status(201).json({
        success: true,
        message: 'Receipt generated offline',
        data: result
      });

    } catch (error) {
      console.error('Error generating offline receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate offline receipt',
        error: error.message
      });
    }
  }

  /**
   * Sync pending items
   * Sub-issue 9.2: Synchronize when online
   * POST /api/offline/sync
   */
  static async syncPendingItems(req, res) {
    try {
      const { deviceId, syncType = 'manual' } = req.body;

      const result = await SyncService.syncPendingItems(deviceId, {
        userId: req.user.id,
        userName: req.user.fullName || req.user.username,
        syncType
      });

      res.json({
        success: true,
        message: 'Synchronization completed',
        data: result
      });

    } catch (error) {
      console.error('Error syncing pending items:', error);
      res.status(500).json({
        success: false,
        message: 'Synchronization failed',
        error: error.message
      });
    }
  }

  /**
   * Get pending queue items
   * GET /api/offline/queue/pending
   */
  static async getPendingItems(req, res) {
    try {
      const { deviceId, limit } = req.query;

      const items = await OfflineService.getPendingQueueItems(
        deviceId,
        limit ? parseInt(limit) : 100
      );

      res.json({
        success: true,
        data: { items, count: items.length }
      });

    } catch (error) {
      console.error('Error getting pending items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending items',
        error: error.message
      });
    }
  }

  /**
   * Get conflicted items
   * Sub-issue 9.4: View conflicts
   * GET /api/offline/conflicts
   */
  static async getConflictedItems(req, res) {
    try {
      const { deviceId } = req.query;

      const items = await OfflineService.getConflictedItems(deviceId);

      res.json({
        success: true,
        data: { items, count: items.length }
      });

    } catch (error) {
      console.error('Error getting conflicted items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conflicted items',
        error: error.message
      });
    }
  }

  /**
   * Resolve conflict
   * Sub-issue 9.4: Conflict resolution
   * POST /api/offline/conflicts/:queueId/resolve
   */
  static async resolveConflict(req, res) {
    try {
      const { queueId } = req.params;
      const { strategy, reason } = req.body;

      const result = await ConflictResolutionService.applyResolution(
        queueId,
        strategy,
        req.user.id,
        reason
      );

      res.json({
        success: true,
        message: 'Conflict resolved',
        data: result
      });

    } catch (error) {
      console.error('Error resolving conflict:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve conflict',
        error: error.message
      });
    }
  }

  /**
   * Get queue statistics
   * GET /api/offline/queue/stats
   */
  static async getQueueStats(req, res) {
    try {
      const { deviceId } = req.query;

      const stats = await OfflineService.getQueueStats(deviceId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting queue stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue statistics',
        error: error.message
      });
    }
  }

  /**
   * Get sync history
   * GET /api/offline/sync/history
   */
  static async getSyncHistory(req, res) {
    try {
      const { deviceId, limit } = req.query;

      const history = await SyncService.getSyncHistory(
        deviceId,
        limit ? parseInt(limit) : 20
      );

      res.json({
        success: true,
        data: { history, count: history.length }
      });

    } catch (error) {
      console.error('Error getting sync history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sync history',
        error: error.message
      });
    }
  }

  /**
   * Get sync statistics
   * GET /api/offline/sync/stats
   */
  static async getSyncStats(req, res) {
    try {
      const { deviceId, days } = req.query;

      const stats = await SyncService.getSyncStats(
        deviceId,
        days ? parseInt(days) : 30
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting sync stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sync statistics',
        error: error.message
      });
    }
  }

  /**
   * Clear synced items
   * DELETE /api/offline/queue/clear-synced
   */
  static async clearSyncedItems(req, res) {
    try {
      const { deviceId, daysOld } = req.body;

      const result = await OfflineService.clearSyncedItems(
        daysOld || 30,
        deviceId
      );

      res.json({
        success: true,
        message: result.message,
        data: { deletedCount: result.deletedCount }
      });

    } catch (error) {
      console.error('Error clearing synced items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear synced items',
        error: error.message
      });
    }
  }

  /**
   * Get queue item details
   * GET /api/offline/queue/:queueId
   */
  static async getQueueItem(req, res) {
    try {
      const { queueId } = req.params;

      const item = await OfflineService.getQueueItem(queueId);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Queue item not found'
        });
      }

      res.json({
        success: true,
        data: item
      });

    } catch (error) {
      console.error('Error getting queue item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue item',
        error: error.message
      });
    }
  }

  /**
   * Reset failed item for retry
   * POST /api/offline/queue/:queueId/retry
   */
  static async retryFailedItem(req, res) {
    try {
      const { queueId } = req.params;

      const item = await OfflineService.resetFailedItem(queueId);

      res.json({
        success: true,
        message: 'Item reset for retry',
        data: item
      });

    } catch (error) {
      console.error('Error retrying failed item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry item',
        error: error.message
      });
    }
  }
}

module.exports = OfflineController;
