const { OfflineQueue, SyncLog, Sale, PaymentTransaction, Receipt } = require('../models');
const OfflineService = require('./offlineService');
const ConflictResolutionService = require('./conflictResolutionService');
const SalesService = require('./salesService');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

/**
 * Sync Service
 * Handles synchronization of offline data when connection is restored
 * Sub-issue 9.2: Sync mechanism when online resumes
 */
class SyncService {
  /**
   * Start a new sync session
   */
  static async startSyncSession(deviceId, syncType = 'automatic', userId = null, userName = null) {
    try {
      const syncSessionId = `SYNC-${Date.now()}-${uuidv4()}`;

      // Count pending items
      const pendingItems = await OfflineService.getPendingQueueItems(deviceId);

      const syncLog = await SyncLog.create({
        syncSessionId,
        deviceId,
        syncType,
        syncDirection: 'upload',
        startedAt: new Date(),
        status: 'in_progress',
        itemsQueued: pendingItems.length,
        initiatedBy: userId,
        initiatedByName: userName
      });

      return { syncSessionId, syncLog, itemsQueued: pendingItems.length };
    } catch (error) {
      console.error('Error starting sync session:', error);
      throw error;
    }
  }

  /**
   * Complete sync session
   */
  static async completeSyncSession(syncSessionId, stats) {
    try {
      const completedAt = new Date();
      const syncLog = await SyncLog.findOne({ where: { syncSessionId } });
      
      if (!syncLog) {
        throw new Error('Sync session not found');
      }

      const durationMs = completedAt - syncLog.startedAt;

      await SyncLog.update({
        completedAt,
        status: stats.itemsFailed > 0 ? 'partial' : 'completed',
        itemsProcessed: stats.itemsProcessed || 0,
        itemsFailed: stats.itemsFailed || 0,
        itemsConflicted: stats.itemsConflicted || 0,
        itemsSkipped: stats.itemsSkipped || 0,
        durationMs,
        operationStats: stats.operationStats || {},
        conflicts: stats.conflicts || []
      }, {
        where: { syncSessionId }
      });

      return await SyncLog.findOne({ where: { syncSessionId } });
    } catch (error) {
      console.error('Error completing sync session:', error);
      throw error;
    }
  }

  /**
   * Sync all pending items
   * Sub-issue 9.2: Main sync mechanism
   */
  static async syncPendingItems(deviceId, options = {}) {
    const {
      userId = null,
      userName = null,
      syncType = 'automatic',
      batchSize = 50
    } = options;

    try {
      // Start sync session
      const { syncSessionId } = await this.startSyncSession(deviceId, syncType, userId, userName);

      const stats = {
        itemsProcessed: 0,
        itemsFailed: 0,
        itemsConflicted: 0,
        itemsSkipped: 0,
        operationStats: {},
        conflicts: []
      };

      // Get pending items in batches
      const pendingItems = await OfflineService.getPendingQueueItems(deviceId, batchSize);

      console.log(`Starting sync for ${pendingItems.length} items from device ${deviceId}`);

      // Process each item
      for (const item of pendingItems) {
        try {
          // Verify data integrity
          if (!OfflineService.verifyChecksum(item)) {
            await OfflineService.updateSyncStatus(item.queueId, 'failed', {
              errorMessage: 'Data integrity check failed',
              incrementAttempts: true
            });
            stats.itemsFailed++;
            continue;
          }

          // Update status to syncing
          await OfflineService.updateSyncStatus(item.queueId, 'syncing', {});

          // Sync based on operation type
          let result;
          switch (item.operationType) {
            case 'sale':
              result = await this.syncSale(item);
              break;
            case 'payment':
              result = await this.syncPayment(item);
              break;
            case 'receipt':
              result = await this.syncReceipt(item);
              break;
            default:
              throw new Error(`Unknown operation type: ${item.operationType}`);
          }

          // Update operation stats
          if (!stats.operationStats[item.operationType]) {
            stats.operationStats[item.operationType] = { success: 0, failed: 0, conflicted: 0 };
          }

          if (result.conflict) {
            stats.itemsConflicted++;
            stats.operationStats[item.operationType].conflicted++;
            stats.conflicts.push({
              queueId: item.queueId,
              operationType: item.operationType,
              conflictType: result.conflictType,
              details: result.details
            });
          } else if (result.success) {
            stats.itemsProcessed++;
            stats.operationStats[item.operationType].success++;
          } else {
            stats.itemsFailed++;
            stats.operationStats[item.operationType].failed++;
          }

        } catch (error) {
          console.error(`Error syncing item ${item.queueId}:`, error);
          await OfflineService.updateSyncStatus(item.queueId, 'failed', {
            errorMessage: error.message,
            errorDetails: { stack: error.stack },
            incrementAttempts: true
          });
          stats.itemsFailed++;
        }
      }

      // Complete sync session
      await this.completeSyncSession(syncSessionId, stats);

      return {
        success: true,
        syncSessionId,
        stats
      };

    } catch (error) {
      console.error('Error in sync process:', error);
      throw error;
    }
  }

  /**
   * Sync individual sale
   * Sub-issue 9.4: Check for conflicts
   */
  static async syncSale(queueItem) {
    const transaction = await sequelize.transaction();

    try {
      const saleData = queueItem.transactionData;

      // Check for duplicate/conflict
      const conflict = await ConflictResolutionService.detectSaleConflict(saleData, queueItem.deviceId);

      if (conflict.hasConflict) {
        await OfflineService.markConflict(
          queueItem.queueId,
          conflict.conflictType,
          conflict.details
        );

        await transaction.rollback();
        return {
          success: false,
          conflict: true,
          conflictType: conflict.conflictType,
          details: conflict.details
        };
      }

      // Create sale on server
      const sale = await Sale.create({
        ...saleData,
        metadata: {
          ...saleData.metadata,
          syncedFrom: queueItem.queueId,
          offlineTimestamp: queueItem.offlineTimestamp,
          deviceId: queueItem.deviceId
        }
      }, { transaction });

      // Update queue item
      await OfflineService.updateSyncStatus(queueItem.queueId, 'synced', {
        serverId: sale.id,
        serverReference: sale.saleNumber
      });

      await transaction.commit();

      return {
        success: true,
        sale,
        conflict: false
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Sync individual payment
   */
  static async syncPayment(queueItem) {
    const transaction = await sequelize.transaction();

    try {
      const paymentData = queueItem.transactionData;

      // Check for duplicate payment
      const conflict = await ConflictResolutionService.detectPaymentConflict(paymentData, queueItem.deviceId);

      if (conflict.hasConflict) {
        await OfflineService.markConflict(
          queueItem.queueId,
          conflict.conflictType,
          conflict.details
        );

        await transaction.rollback();
        return {
          success: false,
          conflict: true,
          conflictType: conflict.conflictType,
          details: conflict.details
        };
      }

      // Create payment on server
      const payment = await PaymentTransaction.create({
        ...paymentData,
        metadata: {
          ...paymentData.metadata,
          syncedFrom: queueItem.queueId,
          offlineTimestamp: queueItem.offlineTimestamp,
          deviceId: queueItem.deviceId
        }
      }, { transaction });

      // Update queue item
      await OfflineService.updateSyncStatus(queueItem.queueId, 'synced', {
        serverId: payment.id,
        serverReference: payment.transactionId
      });

      await transaction.commit();

      return {
        success: true,
        payment,
        conflict: false
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Sync individual receipt
   * Sub-issue 9.3: Offline receipt generation sync
   */
  static async syncReceipt(queueItem) {
    const transaction = await sequelize.transaction();

    try {
      const receiptData = queueItem.transactionData;

      // Check for duplicate receipt
      const conflict = await ConflictResolutionService.detectReceiptConflict(receiptData, queueItem.deviceId);

      if (conflict.hasConflict) {
        await OfflineService.markConflict(
          queueItem.queueId,
          conflict.conflictType,
          conflict.details
        );

        await transaction.rollback();
        return {
          success: false,
          conflict: true,
          conflictType: conflict.conflictType,
          details: conflict.details
        };
      }

      // Create receipt on server
      const receipt = await Receipt.create({
        ...receiptData,
        metadata: {
          ...receiptData.metadata,
          syncedFrom: queueItem.queueId,
          offlineTimestamp: queueItem.offlineTimestamp,
          deviceId: queueItem.deviceId
        }
      }, { transaction });

      // Update queue item
      await OfflineService.updateSyncStatus(queueItem.queueId, 'synced', {
        serverId: receipt.id,
        serverReference: receipt.receiptNumber
      });

      await transaction.commit();

      return {
        success: true,
        receipt,
        conflict: false
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use syncPendingItems instead
   */
  async syncOfflineSales(offlineSales, user) {
    const results = {
      total: offlineSales.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < offlineSales.length; i++) {
      const offlineSale = offlineSales[i];
      
      try {
        // Check if this offline sale has already been synced
        const existingSale = await Sale.findOne({
          where: { offlineId: offlineSale.offlineId }
        });
        
        if (existingSale) {
          results.errors.push({
            index: i,
            offlineId: offlineSale.offlineId,
            error: 'Sale already synced'
          });
          results.failed++;
          continue;
        }

        // Validate and process the sale
        const saleData = {
          items: offlineSale.items,
          cashierId: offlineSale.cashierId || user.id,
          cashierName: offlineSale.cashierName || user.fullName,
          paymentMethod: offlineSale.paymentMethod || 'cash',
          amountPaid: offlineSale.amountPaid,
          offlineId: offlineSale.offlineId
        };

        // Create the sale using sales service
        const sale = await salesService.createSale(saleData);

        // Mark as synced
        sale.isSynced = true;
        sale.syncedAt = new Date();
        await sale.save();

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          offlineId: offlineSale.offlineId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get unsynced sales (sales that were created offline but not yet synced)
   * @returns {Promise<Array>} - Array of unsynced sales
   */
  async getUnsyncedSales() {
    try {
      const unsyncedSales = await Sale.findAll({
        where: { isSynced: false },
        include: [{
          model: User,
          as: 'cashier',
          attributes: ['username', 'fullName']
        }],
        order: [['saleDate', 'DESC']]
      });

      return unsyncedSales;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync inventory data between offline and online
   * @param {Array} inventoryUpdates - Array of inventory updates
   * @returns {Promise<Object>} - Sync result
   */
  async syncInventory(inventoryUpdates) {
    const results = {
      total: inventoryUpdates.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < inventoryUpdates.length; i++) {
      const update = inventoryUpdates[i];
      
      try {
        if (update.batchNumber) {
          // Update specific batch (Sequelize)
          const batch = await InventoryBatch.findOne({
            where: {
              productId: update.productId,
              batchNumber: update.batchNumber
            }
          });

          if (!batch) {
            results.errors.push({
              index: i,
              error: 'Batch not found'
            });
            results.failed++;
            continue;
          }

          batch.quantity = update.quantity;
          await batch.save();
        } else {
          // For products without batch tracking, this is currently not applicable
          // as the system uses batch-based inventory management.
          // If general product stock tracking is needed, it should be added to Product model.
          results.errors.push({
            index: i,
            error: 'Batch number is required for inventory updates'
          });
          results.failed++;
          continue;
        }

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get sync history for a device
   */
  static async getSyncHistory(deviceId, limit = 20) {
    try {
      return await SyncLog.findAll({
        where: { deviceId },
        order: [['startedAt', 'DESC']],
        limit
      });
    } catch (error) {
      console.error('Error getting sync history:', error);
      throw error;
    }
  }

  /**
   * Get sync session details
   */
  static async getSyncSession(syncSessionId) {
    try {
      return await SyncLog.findOne({
        where: { syncSessionId }
      });
    } catch (error) {
      console.error('Error getting sync session:', error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats(deviceId = null, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        startedAt: { [Op.gte]: startDate }
      };

      if (deviceId) {
        where.deviceId = deviceId;
      }

      const logs = await SyncLog.findAll({ where });

      const stats = {
        totalSessions: logs.length,
        completedSessions: logs.filter(l => l.status === 'completed').length,
        partialSessions: logs.filter(l => l.status === 'partial').length,
        failedSessions: logs.filter(l => l.status === 'failed').length,
        totalItemsProcessed: logs.reduce((sum, l) => sum + (l.itemsProcessed || 0), 0),
        totalItemsFailed: logs.reduce((sum, l) => sum + (l.itemsFailed || 0), 0),
        totalConflicts: logs.reduce((sum, l) => sum + (l.itemsConflicted || 0), 0),
        averageDuration: logs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / (logs.length || 1)
      };

      return stats;
    } catch (error) {
      console.error('Error getting sync stats:', error);
      throw error;
    }
  }

  /**
   * Get current inventory snapshot for offline synchronization
   * @returns {Promise<Object>} - Current inventory data
   */
  async getInventorySnapshot() {
    try {
      const Product = require('../models/Product');
      const InventoryBatch = require('../models/InventoryBatch');

      const products = await Product.findAll({
        where: { isActive: true }
      });
      
      const batches = await InventoryBatch.findAll({
        where: { isExpired: false },
        include: [{
          model: Product,
          as: 'product',
          attributes: ['name', 'sku']
        }]
      });

      return {
        products,
        batches,
        snapshotTime: new Date()
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SyncService;
