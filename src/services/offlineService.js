const { OfflineQueue, Sale, Product } = require('../models');
const crypto = require('crypto');
const { Op } = require('sequelize');

/**
 * Offline Service
 * Handles local storage and management of offline operations
 * Sub-issue 9.1: Local storage schema for offline orders
 */
class OfflineService {
  /**
   * Generate unique queue ID for offline transaction
   */
  static generateQueueId(deviceId, operationType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${deviceId}-${operationType}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Calculate checksum for data integrity
   */
  static calculateChecksum(data) {
    const jsonString = JSON.stringify(data);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Queue an offline sale
   * Sub-issue 9.1: Store offline orders with complete schema
   */
  static async queueOfflineSale(saleData, deviceId, cashierId, cashierName) {
    try {
      const queueId = this.generateQueueId(deviceId, 'sale');
      const checksum = this.calculateChecksum(saleData);

      const queueItem = await OfflineQueue.create({
        queueId,
        deviceId,
        operationType: 'sale',
        transactionData: saleData,
        offlineTimestamp: saleData.saleDate || new Date(),
        cashierId,
        cashierName,
        syncStatus: 'pending',
        dataChecksum: checksum,
        priority: saleData.priority || 5,
        metadata: {
          orderType: saleData.orderType,
          tableNumber: saleData.tableNumber,
          itemCount: saleData.items?.length || 0,
          totalAmount: saleData.totalAmount
        }
      });

      return {
        success: true,
        queueId,
        queueItem,
        message: 'Sale queued for sync'
      };
    } catch (error) {
      console.error('Error queueing offline sale:', error);
      throw error;
    }
  }

  /**
   * Queue an offline payment
   */
  static async queueOfflinePayment(paymentData, deviceId, cashierId, cashierName) {
    try {
      const queueId = this.generateQueueId(deviceId, 'payment');
      const checksum = this.calculateChecksum(paymentData);

      const queueItem = await OfflineQueue.create({
        queueId,
        deviceId,
        operationType: 'payment',
        transactionData: paymentData,
        offlineTimestamp: paymentData.timestamp || new Date(),
        cashierId,
        cashierName,
        syncStatus: 'pending',
        dataChecksum: checksum,
        priority: 7, // Higher priority for payments
        metadata: {
          paymentMethod: paymentData.paymentMethod,
          amount: paymentData.amount
        }
      });

      return {
        success: true,
        queueId,
        queueItem,
        message: 'Payment queued for sync'
      };
    } catch (error) {
      console.error('Error queueing offline payment:', error);
      throw error;
    }
  }

  /**
   * Queue an offline receipt
   * Sub-issue 9.3: Offline receipt generation
   */
  static async queueOfflineReceipt(receiptData, deviceId, cashierId, cashierName) {
    try {
      const queueId = this.generateQueueId(deviceId, 'receipt');
      const checksum = this.calculateChecksum(receiptData);

      const queueItem = await OfflineQueue.create({
        queueId,
        deviceId,
        operationType: 'receipt',
        transactionData: receiptData,
        offlineTimestamp: new Date(),
        cashierId,
        cashierName,
        syncStatus: 'pending',
        dataChecksum: checksum,
        priority: 3, // Lower priority for receipts
        metadata: {
          receiptType: receiptData.receiptType,
          format: receiptData.format,
          language: receiptData.language
        }
      });

      return {
        success: true,
        queueId,
        queueItem,
        message: 'Receipt queued for sync'
      };
    } catch (error) {
      console.error('Error queueing offline receipt:', error);
      throw error;
    }
  }

  /**
   * Get pending queue items for sync
   */
  static async getPendingQueueItems(deviceId = null, limit = 100) {
    try {
      const where = {
        syncStatus: 'pending',
        [Op.or]: [
          { retryAfter: null },
          { retryAfter: { [Op.lte]: new Date() } }
        ]
      };

      if (deviceId) {
        where.deviceId = deviceId;
      }

      const items = await OfflineQueue.findAll({
        where,
        order: [
          ['priority', 'DESC'],
          ['offlineTimestamp', 'ASC']
        ],
        limit
      });

      return items;
    } catch (error) {
      console.error('Error getting pending queue items:', error);
      throw error;
    }
  }

  /**
   * Get queue item by ID
   */
  static async getQueueItem(queueId) {
    try {
      return await OfflineQueue.findOne({
        where: { queueId }
      });
    } catch (error) {
      console.error('Error getting queue item:', error);
      throw error;
    }
  }

  /**
   * Update queue item sync status
   */
  static async updateSyncStatus(queueId, status, details = {}) {
    try {
      const updateData = {
        syncStatus: status,
        lastSyncAttempt: new Date(),
        syncAttempts: details.incrementAttempts 
          ? require('../config/database').sequelize.literal('syncAttempts + 1')
          : undefined
      };

      if (status === 'synced') {
        updateData.syncedAt = new Date();
        updateData.serverId = details.serverId;
        updateData.serverReference = details.serverReference;
      }

      if (status === 'failed') {
        updateData.errorMessage = details.errorMessage;
        updateData.errorDetails = details.errorDetails;
        
        // Calculate retry delay with exponential backoff
        const item = await this.getQueueItem(queueId);
        if (item && item.syncAttempts < item.maxRetries) {
          const delay = Math.min(Math.pow(2, item.syncAttempts) * 1000, 300000); // Max 5 minutes
          updateData.retryAfter = new Date(Date.now() + delay);
        }
      }

      if (status === 'conflict') {
        updateData.hasConflict = true;
        updateData.conflictType = details.conflictType;
        updateData.conflictDetails = details.conflictDetails;
      }

      await OfflineQueue.update(updateData, {
        where: { queueId }
      });

      return await this.getQueueItem(queueId);
    } catch (error) {
      console.error('Error updating sync status:', error);
      throw error;
    }
  }

  /**
   * Mark item as having conflict
   * Sub-issue 9.4: Conflict detection
   */
  static async markConflict(queueId, conflictType, conflictDetails) {
    try {
      await OfflineQueue.update({
        syncStatus: 'conflict',
        hasConflict: true,
        conflictType,
        conflictDetails,
        lastSyncAttempt: new Date()
      }, {
        where: { queueId }
      });

      return await this.getQueueItem(queueId);
    } catch (error) {
      console.error('Error marking conflict:', error);
      throw error;
    }
  }

  /**
   * Get items with conflicts
   */
  static async getConflictedItems(deviceId = null) {
    try {
      const where = { hasConflict: true };
      if (deviceId) {
        where.deviceId = deviceId;
      }

      return await OfflineQueue.findAll({
        where,
        order: [['offlineTimestamp', 'DESC']]
      });
    } catch (error) {
      console.error('Error getting conflicted items:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(deviceId = null) {
    try {
      const where = deviceId ? { deviceId } : {};

      const [total, pending, synced, failed, conflicts] = await Promise.all([
        OfflineQueue.count({ where }),
        OfflineQueue.count({ where: { ...where, syncStatus: 'pending' } }),
        OfflineQueue.count({ where: { ...where, syncStatus: 'synced' } }),
        OfflineQueue.count({ where: { ...where, syncStatus: 'failed' } }),
        OfflineQueue.count({ where: { ...where, hasConflict: true } })
      ]);

      // Get breakdown by operation type
      const byOperation = await OfflineQueue.findAll({
        where,
        attributes: [
          'operationType',
          [require('../config/database').sequelize.fn('COUNT', 'id'), 'count']
        ],
        group: ['operationType']
      });

      return {
        total,
        pending,
        synced,
        failed,
        conflicts,
        byOperation: byOperation.reduce((acc, item) => {
          acc[item.operationType] = parseInt(item.get('count'));
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      throw error;
    }
  }

  /**
   * Clear synced items older than specified days
   */
  static async clearSyncedItems(daysOld = 30, deviceId = null) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const where = {
        syncStatus: 'synced',
        syncedAt: { [Op.lte]: cutoffDate }
      };

      if (deviceId) {
        where.deviceId = deviceId;
      }

      const deletedCount = await OfflineQueue.destroy({ where });

      return {
        success: true,
        deletedCount,
        message: `Cleared ${deletedCount} synced items older than ${daysOld} days`
      };
    } catch (error) {
      console.error('Error clearing synced items:', error);
      throw error;
    }
  }

  /**
   * Verify data integrity using checksum
   */
  static verifyChecksum(queueItem) {
    const calculatedChecksum = this.calculateChecksum(queueItem.transactionData);
    return calculatedChecksum === queueItem.dataChecksum;
  }

  /**
   * Reset failed item for retry
   */
  static async resetFailedItem(queueId) {
    try {
      await OfflineQueue.update({
        syncStatus: 'pending',
        syncAttempts: 0,
        retryAfter: null,
        errorMessage: null,
        errorDetails: null
      }, {
        where: { queueId }
      });

      return await this.getQueueItem(queueId);
    } catch (error) {
      console.error('Error resetting failed item:', error);
      throw error;
    }
  }
}

module.exports = OfflineService;
