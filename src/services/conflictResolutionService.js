const { Sale, PaymentTransaction, Receipt, Product, OfflineQueue } = require('../models');
const { Op } = require('sequelize');

/**
 * Conflict Resolution Service
 * Handles detection and resolution of conflicts during offline sync
 * Sub-issue 9.4: Conflict resolution for duplicate orders
 */
class ConflictResolutionService {
  /**
   * Detect conflicts for a sale
   * Sub-issue 9.4: Duplicate order detection
   */
  static async detectSaleConflict(saleData, deviceId) {
    try {
      const conflicts = [];
      let hasConflict = false;
      let conflictType = 'none';

      // 1. Check for exact duplicate by offline timestamp and device
      if (saleData.offlineTimestamp && deviceId) {
        const timeTolerance = 5000; // 5 seconds
        const startTime = new Date(new Date(saleData.offlineTimestamp).getTime() - timeTolerance);
        const endTime = new Date(new Date(saleData.offlineTimestamp).getTime() + timeTolerance);

        const duplicateSale = await Sale.findOne({
          where: {
            saleDate: { [Op.between]: [startTime, endTime] },
            totalAmount: saleData.totalAmount,
            cashierId: saleData.cashierId
          }
        });

        if (duplicateSale) {
          hasConflict = true;
          conflictType = 'duplicate';
          conflicts.push({
            type: 'duplicate_sale',
            severity: 'high',
            message: 'Sale with same timestamp, amount, and cashier already exists',
            existingSaleId: duplicateSale.id,
            existingSaleNumber: duplicateSale.saleNumber,
            similarity: 100
          });
        }
      }

      // 2. Check for duplicate by offline ID if provided
      if (saleData.offlineId) {
        const offlineIdDuplicate = await Sale.findOne({
          where: {
            ['metadata.offlineId']: saleData.offlineId
          }
        });

        if (offlineIdDuplicate) {
          hasConflict = true;
          conflictType = 'duplicate';
          conflicts.push({
            type: 'duplicate_offline_id',
            severity: 'critical',
            message: 'Sale with same offline ID already synced',
            existingSaleId: offlineIdDuplicate.id,
            offlineId: saleData.offlineId
          });
        }
      }

      // 3. Check for similar sales (fuzzy matching)
      if (!hasConflict && saleData.items && saleData.items.length > 0) {
        const similar = await this.findSimilarSales(saleData);
        if (similar.length > 0) {
          hasConflict = true;
          conflictType = 'duplicate';
          conflicts.push({
            type: 'similar_sale',
            severity: 'medium',
            message: 'Similar sale(s) found',
            similarSales: similar
          });
        }
      }

      // 4. Check for inventory availability
      if (saleData.items && saleData.items.length > 0) {
        const inventoryConflicts = await this.checkInventoryAvailability(saleData.items);
        if (inventoryConflicts.length > 0) {
          hasConflict = true;
          if (conflictType === 'none') conflictType = 'integrity';
          conflicts.push(...inventoryConflicts);
        }
      }

      // 5. Validate data integrity
      const validationErrors = this.validateSaleData(saleData);
      if (validationErrors.length > 0) {
        hasConflict = true;
        if (conflictType === 'none') conflictType = 'validation';
        conflicts.push(...validationErrors);
      }

      return {
        hasConflict,
        conflictType,
        details: conflicts,
        resolution: hasConflict ? this.suggestResolution(conflicts) : null
      };

    } catch (error) {
      console.error('Error detecting sale conflict:', error);
      throw error;
    }
  }

  /**
   * Find similar sales using fuzzy matching
   */
  static async findSimilarSales(saleData) {
    try {
      const timeTolerance = 300000; // 5 minutes
      const startTime = new Date(new Date(saleData.offlineTimestamp || Date.now()).getTime() - timeTolerance);
      const endTime = new Date(new Date(saleData.offlineTimestamp || Date.now()).getTime() + timeTolerance);

      // Find sales within time window
      const potentialDuplicates = await Sale.findAll({
        where: {
          saleDate: { [Op.between]: [startTime, endTime] },
          cashierId: saleData.cashierId
        }
      });

      const similarSales = [];

      for (const sale of potentialDuplicates) {
        const similarity = this.calculateSaleSimilarity(saleData, sale);
        if (similarity > 0.8) { // 80% similarity threshold
          similarSales.push({
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            similarity: Math.round(similarity * 100),
            totalAmount: sale.totalAmount,
            saleDate: sale.saleDate
          });
        }
      }

      return similarSales;
    } catch (error) {
      console.error('Error finding similar sales:', error);
      return [];
    }
  }

  /**
   * Calculate similarity between two sales
   */
  static calculateSaleSimilarity(sale1, sale2) {
    let score = 0;
    let factors = 0;

    // Amount similarity (40% weight)
    if (sale1.totalAmount && sale2.totalAmount) {
      const amountDiff = Math.abs(sale1.totalAmount - sale2.totalAmount);
      const amountSimilarity = 1 - (amountDiff / Math.max(sale1.totalAmount, sale2.totalAmount));
      score += amountSimilarity * 0.4;
      factors += 0.4;
    }

    // Item count similarity (30% weight)
    if (sale1.items && sale2.items) {
      const countDiff = Math.abs(sale1.items.length - sale2.items.length);
      const countSimilarity = 1 - (countDiff / Math.max(sale1.items.length, sale2.items.length));
      score += countSimilarity * 0.3;
      factors += 0.3;
    }

    // Cashier match (30% weight)
    if (sale1.cashierId === sale2.cashierId) {
      score += 0.3;
      factors += 0.3;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Check inventory availability for sale items
   */
  static async checkInventoryAvailability(items) {
    const conflicts = [];

    for (const item of items) {
      try {
        const product = await Product.findByPk(item.productId);

        if (!product) {
          conflicts.push({
            type: 'inventory_missing',
            severity: 'critical',
            message: `Product not found: ${item.productId}`,
            productId: item.productId
          });
          continue;
        }

        if (product.trackInventory && product.stockQuantity < item.quantity) {
          conflicts.push({
            type: 'inventory_insufficient',
            severity: 'high',
            message: `Insufficient stock for ${product.name}`,
            productId: item.productId,
            productName: product.name,
            requested: item.quantity,
            available: product.stockQuantity
          });
        }
      } catch (error) {
        console.error(`Error checking inventory for product ${item.productId}:`, error);
      }
    }

    return conflicts;
  }

  /**
   * Validate sale data integrity
   */
  static validateSaleData(saleData) {
    const errors = [];

    // Required fields
    if (!saleData.items || saleData.items.length === 0) {
      errors.push({
        type: 'validation_error',
        severity: 'critical',
        message: 'Sale must have at least one item',
        field: 'items'
      });
    }

    if (!saleData.totalAmount || saleData.totalAmount <= 0) {
      errors.push({
        type: 'validation_error',
        severity: 'critical',
        message: 'Invalid total amount',
        field: 'totalAmount'
      });
    }

    // Calculate total and verify
    if (saleData.items && saleData.items.length > 0) {
      const calculatedTotal = saleData.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      const tolerance = 0.01; // Allow 1 cent tolerance for rounding
      if (Math.abs(calculatedTotal - saleData.totalAmount) > tolerance) {
        errors.push({
          type: 'data_mismatch',
          severity: 'high',
          message: 'Total amount does not match sum of items',
          field: 'totalAmount',
          calculated: calculatedTotal,
          provided: saleData.totalAmount
        });
      }
    }

    return errors;
  }

  /**
   * Detect payment conflicts
   */
  static async detectPaymentConflict(paymentData, deviceId) {
    try {
      const conflicts = [];
      let hasConflict = false;

      // Check for duplicate payments
      if (paymentData.transactionId) {
        const duplicate = await PaymentTransaction.findOne({
          where: { transactionId: paymentData.transactionId }
        });

        if (duplicate) {
          hasConflict = true;
          conflicts.push({
            type: 'duplicate_payment',
            severity: 'critical',
            message: 'Payment with same transaction ID already exists',
            existingPaymentId: duplicate.id
          });
        }
      }

      return {
        hasConflict,
        conflictType: hasConflict ? 'duplicate' : 'none',
        details: conflicts
      };
    } catch (error) {
      console.error('Error detecting payment conflict:', error);
      throw error;
    }
  }

  /**
   * Detect receipt conflicts
   */
  static async detectReceiptConflict(receiptData, deviceId) {
    try {
      const conflicts = [];
      let hasConflict = false;

      // Check for duplicate receipts
      if (receiptData.receiptNumber) {
        const duplicate = await Receipt.findOne({
          where: { receiptNumber: receiptData.receiptNumber }
        });

        if (duplicate) {
          hasConflict = true;
          conflicts.push({
            type: 'duplicate_receipt',
            severity: 'critical',
            message: 'Receipt with same number already exists',
            existingReceiptId: duplicate.id
          });
        }
      }

      return {
        hasConflict,
        conflictType: hasConflict ? 'duplicate' : 'none',
        details: conflicts
      };
    } catch (error) {
      console.error('Error detecting receipt conflict:', error);
      throw error;
    }
  }

  /**
   * Suggest resolution strategy based on conflict type
   */
  static suggestResolution(conflicts) {
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    const highConflicts = conflicts.filter(c => c.severity === 'high');

    if (criticalConflicts.length > 0) {
      // Critical conflicts require manual intervention
      return {
        strategy: 'manual',
        reason: 'Critical conflicts detected',
        recommendedActions: [
          'Review conflict details',
          'Verify data integrity',
          'Choose keep_online, keep_offline, or skip'
        ]
      };
    }

    if (highConflicts.length > 0) {
      // High severity conflicts suggest skipping
      return {
        strategy: 'skip',
        reason: 'High severity conflicts detected',
        recommendedActions: [
          'Skip this transaction',
          'Review offline data',
          'Manually reconcile if needed'
        ]
      };
    }

    // Medium/low conflicts can be auto-resolved
    return {
      strategy: 'keep_offline',
      reason: 'Minor conflicts can be auto-resolved',
      recommendedActions: [
        'Proceed with offline data',
        'Log for audit trail'
      ]
    };
  }

  /**
   * Apply resolution strategy
   */
  static async applyResolution(queueId, strategy, userId, reason = null) {
    try {
      const queueItem = await OfflineQueue.findOne({ where: { queueId } });

      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      await OfflineQueue.update({
        resolutionStrategy: strategy,
        conflictResolvedBy: userId,
        conflictResolvedAt: new Date(),
        syncStatus: strategy === 'skip' ? 'skipped' : 'pending',
        metadata: {
          ...queueItem.metadata,
          resolutionReason: reason
        }
      }, {
        where: { queueId }
      });

      return {
        success: true,
        message: `Conflict resolved with strategy: ${strategy}`,
        queueId
      };
    } catch (error) {
      console.error('Error applying resolution:', error);
      throw error;
    }
  }
}

module.exports = ConflictResolutionService;
