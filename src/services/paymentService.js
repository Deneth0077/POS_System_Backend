const CashDrawer = require('../models/CashDrawer');
const PaymentTransaction = require('../models/PaymentTransaction');
const Sale = require('../models/Sale');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class PaymentService {
  /**
   * Generate unique transaction ID
   */
  generateTransactionId(prefix = 'TXN') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Validate cash denominations
   */
  validateDenominations(denominations, expectedTotal = null) {
    const validDenominations = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.25, 0.10, 0.05];
    let calculatedTotal = 0;

    if (!Array.isArray(denominations) || denominations.length === 0) {
      return {
        isValid: false,
        message: 'Denominations must be a non-empty array',
        calculatedTotal: 0,
        expectedTotal: expectedTotal || 0,
        difference: 0
      };
    }

    for (const denom of denominations) {
      if (!validDenominations.includes(denom.value)) {
        return {
          isValid: false,
          message: `Invalid denomination value: ${denom.value}`,
          calculatedTotal: 0,
          expectedTotal: expectedTotal || 0,
          difference: 0
        };
      }
      
      if (denom.count < 0 || !Number.isInteger(denom.count)) {
        return {
          isValid: false,
          message: `Invalid count for denomination ${denom.value}`,
          calculatedTotal: 0,
          expectedTotal: expectedTotal || 0,
          difference: 0
        };
      }

      calculatedTotal += denom.value * denom.count;
    }

    const difference = expectedTotal ? calculatedTotal - expectedTotal : 0;

    return {
      isValid: expectedTotal ? Math.abs(difference) < 0.01 : true,
      message: expectedTotal && Math.abs(difference) >= 0.01 
        ? `Amount mismatch: calculated ${calculatedTotal}, expected ${expectedTotal}`
        : 'Validation successful',
      calculatedTotal: parseFloat(calculatedTotal.toFixed(2)),
      expectedTotal: expectedTotal || calculatedTotal,
      difference: parseFloat(difference.toFixed(2)),
      breakdown: denominations
    };
  }

  /**
   * Process cash payment
   */
  async processCashPayment(paymentData) {
    const transaction = await sequelize.transaction();

    try {
      const { saleId, items, amount, amountPaid, cashierId, cashierName, notes, denominations } = paymentData;

      // Validate amount paid is sufficient
      if (amountPaid < amount) {
        throw new Error('Amount paid is less than the total amount');
      }

      const changeGiven = parseFloat((amountPaid - amount).toFixed(2));

      // Get or create sale if items provided
      let sale = null;
      if (saleId) {
        sale = await Sale.findByPk(saleId, { transaction });
        if (!sale) {
          throw new Error('Sale not found');
        }
      } else if (items && items.length > 0) {
        // This would typically call salesService.createSale
        // For now, we'll just note that a sale should be created
        throw new Error('Sale creation from payment not yet implemented. Create sale first.');
      }

      // Get active cash drawer for cashier
      const cashDrawer = await CashDrawer.findOne({
        where: {
          cashierId,
          status: 'open'
        },
        transaction
      });

      if (!cashDrawer) {
        throw new Error('No open cash drawer found. Please open a cash drawer first.');
      }

      // Create payment transaction
      const transactionId = this.generateTransactionId('CASH');
      const paymentTransaction = await PaymentTransaction.create({
        transactionId,
        saleId: sale ? sale.id : null,
        saleNumber: sale ? sale.saleNumber : null,
        paymentMethod: 'cash',
        amount,
        currency: 'LKR',
        status: 'completed',
        transactionType: 'payment',
        cashierId,
        cashierName,
        cashDrawerId: cashDrawer.id,
        amountPaid,
        changeGiven,
        denominations,
        receiptNumber: sale ? sale.saleNumber : transactionId,
        notes,
        processedAt: new Date()
      }, { transaction });

      // Update cash drawer
      await cashDrawer.update({
        totalCashIn: parseFloat((parseFloat(cashDrawer.totalCashIn) + amount).toFixed(2)),
        totalCashOut: parseFloat((parseFloat(cashDrawer.totalCashOut) + changeGiven).toFixed(2)),
        totalSales: cashDrawer.totalSales + 1
      }, { transaction });

      // Update sale payment method if sale exists
      if (sale && sale.paymentMethod !== 'cash') {
        await sale.update({ paymentMethod: 'cash' }, { transaction });
      }

      await transaction.commit();

      return {
        transactionId: paymentTransaction.transactionId,
        saleNumber: paymentTransaction.receiptNumber,
        amount: parseFloat(paymentTransaction.amount),
        amountPaid: parseFloat(paymentTransaction.amountPaid),
        changeGiven: parseFloat(paymentTransaction.changeGiven),
        paymentMethod: 'cash',
        timestamp: paymentTransaction.processedAt,
        receiptNumber: paymentTransaction.receiptNumber
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Open cash drawer
   */
  async openCashDrawer(drawerData) {
    const { cashierId, cashierName, openingBalance, denominations, notes } = drawerData;

    // Check if cashier already has an open drawer
    const existingDrawer = await CashDrawer.findOne({
      where: {
        cashierId,
        status: 'open'
      }
    });

    if (existingDrawer) {
      throw new Error('Cashier already has an open cash drawer');
    }

    // Validate denominations if provided
    if (denominations) {
      const validation = this.validateDenominations(denominations, openingBalance);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }
    }

    const cashDrawer = await CashDrawer.create({
      cashierId,
      cashierName,
      openingBalance,
      expectedBalance: openingBalance,
      openingDenominations: denominations,
      status: 'open',
      notes,
      openedAt: new Date()
    });

    return {
      drawerId: cashDrawer.id,
      cashierId: cashDrawer.cashierId,
      openingBalance: parseFloat(cashDrawer.openingBalance),
      openedAt: cashDrawer.openedAt
    };
  }

  /**
   * Close cash drawer
   */
  async closeCashDrawer(closeData) {
    const transaction = await sequelize.transaction();

    try {
      const { drawerId, closingBalance, actualCash, denominations, notes } = closeData;

      const cashDrawer = await CashDrawer.findByPk(drawerId, { transaction });

      if (!cashDrawer) {
        throw new Error('Cash drawer not found');
      }

      if (cashDrawer.status !== 'open') {
        throw new Error('Cash drawer is not open');
      }

      // Validate closing denominations if provided
      if (denominations) {
        const validation = this.validateDenominations(denominations, actualCash);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }
      }

      // Calculate expected balance
      const expectedBalance = parseFloat(cashDrawer.openingBalance) + 
                             parseFloat(cashDrawer.totalCashIn) - 
                             parseFloat(cashDrawer.totalCashOut);

      const variance = parseFloat((actualCash - expectedBalance).toFixed(2));

      // Update cash drawer
      await cashDrawer.update({
        closingBalance,
        actualCash,
        expectedBalance: parseFloat(expectedBalance.toFixed(2)),
        variance,
        closingDenominations: denominations,
        status: 'closed',
        closedAt: new Date(),
        notes: notes ? `${cashDrawer.notes || ''}\n${notes}`.trim() : cashDrawer.notes
      }, { transaction });

      // Get sales count from payment transactions
      const salesCount = await PaymentTransaction.count({
        where: {
          cashDrawerId: drawerId,
          transactionType: 'payment',
          status: 'completed'
        },
        transaction
      });

      // Get total amount from payment transactions
      const totalAmount = await PaymentTransaction.sum('amount', {
        where: {
          cashDrawerId: drawerId,
          transactionType: 'payment',
          status: 'completed'
        },
        transaction
      }) || 0;

      await transaction.commit();

      return {
        drawerId: cashDrawer.id,
        expectedBalance: parseFloat(expectedBalance.toFixed(2)),
        actualBalance: parseFloat(actualCash),
        variance: parseFloat(variance.toFixed(2)),
        totalSales: salesCount,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        closedAt: cashDrawer.closedAt,
        reconciliationReport: {
          openingBalance: parseFloat(cashDrawer.openingBalance),
          totalCashIn: parseFloat(cashDrawer.totalCashIn),
          totalCashOut: parseFloat(cashDrawer.totalCashOut),
          expectedBalance: parseFloat(expectedBalance.toFixed(2)),
          actualCash: parseFloat(actualCash),
          variance: parseFloat(variance.toFixed(2)),
          closingDenominations: denominations
        }
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get cash drawer status
   */
  async getCashDrawerStatus(cashierId = null, shiftId = null) {
    const where = {};
    
    if (cashierId) {
      where.cashierId = cashierId;
    }

    // Get most recent drawer (open or closed today)
    const cashDrawer = await CashDrawer.findOne({
      where: {
        ...where,
        status: { [Op.in]: ['open', 'closed'] },
        openedAt: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      order: [['openedAt', 'DESC']]
    });

    if (!cashDrawer) {
      return null;
    }

    const expectedBalance = parseFloat(cashDrawer.openingBalance) + 
                           parseFloat(cashDrawer.totalCashIn) - 
                           parseFloat(cashDrawer.totalCashOut);

    return {
      drawerId: cashDrawer.id,
      cashierId: cashDrawer.cashierId,
      cashierName: cashDrawer.cashierName,
      openingBalance: parseFloat(cashDrawer.openingBalance),
      currentBalance: parseFloat(expectedBalance.toFixed(2)),
      totalCashIn: parseFloat(cashDrawer.totalCashIn),
      totalCashOut: parseFloat(cashDrawer.totalCashOut),
      expectedBalance: parseFloat(expectedBalance.toFixed(2)),
      actualCash: cashDrawer.actualCash ? parseFloat(cashDrawer.actualCash) : null,
      variance: cashDrawer.variance ? parseFloat(cashDrawer.variance) : 0,
      status: cashDrawer.status,
      openedAt: cashDrawer.openedAt,
      closedAt: cashDrawer.closedAt,
      lastUpdated: cashDrawer.updatedAt
    };
  }

  /**
   * Process cash refund
   */
  async processCashRefund(refundData) {
    const transaction = await sequelize.transaction();

    try {
      const { saleId, amount, reason, approvedBy, approverName, notes } = refundData;

      // Get original sale
      const sale = await Sale.findByPk(saleId, { transaction });
      if (!sale) {
        throw new Error('Sale not found');
      }

      if (sale.paymentMethod !== 'cash') {
        throw new Error('Original payment was not cash');
      }

      if (sale.status === 'refunded') {
        throw new Error('Sale has already been refunded');
      }

      // Validate refund amount
      if (amount > parseFloat(sale.totalAmount)) {
        throw new Error('Refund amount exceeds sale total');
      }

      // Get original payment transaction
      const originalPayment = await PaymentTransaction.findOne({
        where: {
          saleId,
          paymentMethod: 'cash',
          transactionType: 'payment'
        },
        transaction
      });

      // Get active cash drawer for approver
      const cashDrawer = await CashDrawer.findOne({
        where: {
          cashierId: approvedBy,
          status: 'open'
        },
        transaction
      });

      if (!cashDrawer) {
        throw new Error('No open cash drawer found for processing refund');
      }

      // Create refund transaction
      const refundTransactionId = this.generateTransactionId('REFUND');
      const refundTransaction = await PaymentTransaction.create({
        transactionId: refundTransactionId,
        saleId,
        saleNumber: sale.saleNumber,
        paymentMethod: 'cash',
        amount,
        currency: 'LKR',
        status: 'completed',
        transactionType: 'refund',
        cashierId: approvedBy,
        cashierName: approverName,
        cashDrawerId: cashDrawer.id,
        refundReason: reason,
        refundedAmount: amount,
        approvedBy,
        receiptNumber: `REF-${sale.saleNumber}`,
        notes,
        processedAt: new Date(),
        refundedAt: new Date()
      }, { transaction });

      // Update cash drawer
      await cashDrawer.update({
        totalCashOut: parseFloat((parseFloat(cashDrawer.totalCashOut) + amount).toFixed(2)),
        totalRefunds: cashDrawer.totalRefunds + 1
      }, { transaction });

      // Update original sale status
      await sale.update({
        status: 'refunded'
      }, { transaction });

      await transaction.commit();

      return {
        refundId: refundTransaction.id,
        transactionId: refundTransaction.transactionId,
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        refundAmount: parseFloat(amount),
        refundedAt: refundTransaction.refundedAt,
        refundNumber: refundTransaction.receiptNumber
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reconcile cash drawer
   */
  async reconcileCashDrawer(reconciliationData) {
    const dbTransaction = await sequelize.transaction();

    try {
      const { drawerId, actualCash, closingDenominations, notes, reconciledBy, reconcilerName } = reconciliationData;

      const drawer = await CashDrawer.findByPk(drawerId, { transaction: dbTransaction });

      if (!drawer) {
        throw new Error('Cash drawer not found');
      }

      if (drawer.status !== 'closed') {
        throw new Error('Can only reconcile closed drawers');
      }

      // Calculate expected balance
      const expectedBalance = parseFloat((
        parseFloat(drawer.openingBalance) +
        parseFloat(drawer.totalCashIn) -
        parseFloat(drawer.totalCashOut)
      ).toFixed(2));

      // Calculate variance
      const variance = parseFloat((actualCash - expectedBalance).toFixed(2));

      // Validate closing denominations if provided
      let denominationValidation = null;
      if (closingDenominations && closingDenominations.length > 0) {
        denominationValidation = this.validateDenominations(closingDenominations, actualCash);
        if (!denominationValidation.isValid) {
          throw new Error(`Denomination validation failed: ${denominationValidation.message}`);
        }
      }

      // Update drawer with reconciliation data
      await drawer.update({
        status: 'reconciled',
        actualCash: parseFloat(actualCash),
        expectedBalance,
        variance,
        closingDenominations: closingDenominations || drawer.closingDenominations,
        reconciledAt: new Date(),
        reconciledBy,
        notes: notes ? `${drawer.notes || ''}\n[Reconciliation] ${notes}`.trim() : drawer.notes
      }, { transaction: dbTransaction });

      await dbTransaction.commit();

      return {
        drawerId: drawer.id,
        cashierId: drawer.cashierId,
        cashierName: drawer.cashierName,
        openingBalance: parseFloat(drawer.openingBalance),
        closingBalance: parseFloat(drawer.closingBalance),
        expectedBalance,
        actualCash: parseFloat(actualCash),
        variance,
        variancePercentage: expectedBalance > 0 ? parseFloat(((variance / expectedBalance) * 100).toFixed(2)) : 0,
        totalSales: drawer.totalSales,
        totalRefunds: drawer.totalRefunds,
        totalCashIn: parseFloat(drawer.totalCashIn),
        totalCashOut: parseFloat(drawer.totalCashOut),
        status: 'reconciled',
        openedAt: drawer.openedAt,
        closedAt: drawer.closedAt,
        reconciledAt: drawer.reconciledAt,
        reconciledBy,
        reconcilerName,
        denominationBreakdown: closingDenominations || drawer.closingDenominations
      };

    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }

  /**
   * Get reconciliation report
   */
  async getReconciliationReport(filters = {}) {
    try {
      const { startDate, endDate, cashierId, status } = filters;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.openedAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      } else if (startDate) {
        whereClause.openedAt = {
          [Op.gte]: new Date(startDate)
        };
      }

      if (cashierId) {
        whereClause.cashierId = cashierId;
      }

      if (status) {
        whereClause.status = status;
      }

      const drawers = await CashDrawer.findAll({
        where: whereClause,
        order: [['openedAt', 'DESC']],
        attributes: [
          'id',
          'cashierId',
          'cashierName',
          'openingBalance',
          'closingBalance',
          'actualCash',
          'expectedBalance',
          'variance',
          'totalCashIn',
          'totalCashOut',
          'totalSales',
          'totalRefunds',
          'status',
          'openedAt',
          'closedAt',
          'reconciledAt',
          'reconciledBy'
        ]
      });

      // Calculate summary statistics
      const summary = {
        totalDrawers: drawers.length,
        openDrawers: drawers.filter(d => d.status === 'open').length,
        closedDrawers: drawers.filter(d => d.status === 'closed').length,
        reconciledDrawers: drawers.filter(d => d.status === 'reconciled').length,
        totalVariance: parseFloat(drawers.reduce((sum, d) => sum + parseFloat(d.variance || 0), 0).toFixed(2)),
        totalCashIn: parseFloat(drawers.reduce((sum, d) => sum + parseFloat(d.totalCashIn || 0), 0).toFixed(2)),
        totalCashOut: parseFloat(drawers.reduce((sum, d) => sum + parseFloat(d.totalCashOut || 0), 0).toFixed(2)),
        totalSales: drawers.reduce((sum, d) => sum + (d.totalSales || 0), 0),
        totalRefunds: drawers.reduce((sum, d) => sum + (d.totalRefunds || 0), 0)
      };

      return {
        summary,
        drawers: drawers.map(d => ({
          id: d.id,
          cashierId: d.cashierId,
          cashierName: d.cashierName,
          openingBalance: parseFloat(d.openingBalance),
          closingBalance: d.closingBalance ? parseFloat(d.closingBalance) : null,
          actualCash: d.actualCash ? parseFloat(d.actualCash) : null,
          expectedBalance: d.expectedBalance ? parseFloat(d.expectedBalance) : null,
          variance: parseFloat(d.variance || 0),
          variancePercentage: d.expectedBalance && d.expectedBalance > 0 
            ? parseFloat(((parseFloat(d.variance || 0) / parseFloat(d.expectedBalance)) * 100).toFixed(2))
            : 0,
          totalCashIn: parseFloat(d.totalCashIn),
          totalCashOut: parseFloat(d.totalCashOut),
          totalSales: d.totalSales,
          totalRefunds: d.totalRefunds,
          status: d.status,
          openedAt: d.openedAt,
          closedAt: d.closedAt,
          reconciledAt: d.reconciledAt,
          reconciledBy: d.reconciledBy
        }))
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get drawer discrepancies (variances above threshold)
   */
  async getDrawerDiscrepancies(filters = {}) {
    try {
      const { startDate, endDate, threshold = 10.00 } = filters;

      const whereClause = {
        status: {
          [Op.in]: ['closed', 'reconciled']
        },
        variance: {
          [Op.or]: [
            { [Op.gt]: threshold },
            { [Op.lt]: -threshold }
          ]
        }
      };

      if (startDate && endDate) {
        whereClause.openedAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const discrepancies = await CashDrawer.findAll({
        where: whereClause,
        order: [
          [sequelize.fn('ABS', sequelize.col('variance')), 'DESC']
        ],
        attributes: [
          'id',
          'cashierId',
          'cashierName',
          'openingBalance',
          'closingBalance',
          'actualCash',
          'expectedBalance',
          'variance',
          'totalSales',
          'status',
          'openedAt',
          'closedAt',
          'reconciledAt',
          'notes'
        ]
      });

      const summary = {
        totalDiscrepancies: discrepancies.length,
        totalVariance: parseFloat(discrepancies.reduce((sum, d) => sum + parseFloat(d.variance), 0).toFixed(2)),
        averageVariance: discrepancies.length > 0
          ? parseFloat((discrepancies.reduce((sum, d) => sum + parseFloat(d.variance), 0) / discrepancies.length).toFixed(2))
          : 0,
        shortages: discrepancies.filter(d => parseFloat(d.variance) < 0).length,
        overages: discrepancies.filter(d => parseFloat(d.variance) > 0).length
      };

      return {
        threshold,
        summary,
        discrepancies: discrepancies.map(d => ({
          id: d.id,
          cashierId: d.cashierId,
          cashierName: d.cashierName,
          expectedBalance: parseFloat(d.expectedBalance || 0),
          actualCash: parseFloat(d.actualCash || 0),
          variance: parseFloat(d.variance),
          variancePercentage: d.expectedBalance && d.expectedBalance > 0
            ? parseFloat(((parseFloat(d.variance) / parseFloat(d.expectedBalance)) * 100).toFixed(2))
            : 0,
          totalSales: d.totalSales,
          status: d.status,
          openedAt: d.openedAt,
          closedAt: d.closedAt,
          reconciledAt: d.reconciledAt,
          notes: d.notes
        }))
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment transaction history
   */
  async getPaymentTransactions(filters = {}) {
    try {
      const { 
        startDate, 
        endDate, 
        paymentMethod, 
        cashierId,
        status,
        page = 1,
        limit = 50
      } = filters;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.processedAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      if (paymentMethod) {
        whereClause.paymentMethod = paymentMethod;
      }

      if (cashierId) {
        whereClause.cashierId = cashierId;
      }

      if (status) {
        whereClause.status = status;
      }

      const offset = (page - 1) * limit;

      const { count, rows: transactions } = await PaymentTransaction.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['processedAt', 'DESC']],
        include: [
          {
            model: Sale,
            as: 'sale',
            attributes: ['id', 'saleNumber', 'totalAmount']
          }
        ]
      });

      return {
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        },
        transactions: transactions.map(t => ({
          id: t.id,
          transactionId: t.transactionId,
          saleId: t.saleId,
          saleNumber: t.sale?.saleNumber,
          amount: parseFloat(t.amount),
          paymentMethod: t.paymentMethod,
          status: t.status,
          cashierId: t.cashierId,
          processedAt: t.processedAt,
          refundedAt: t.refundedAt
        }))
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get drawer summary
   */
  async getDrawerSummary(filters = {}) {
    try {
      const { startDate, endDate } = filters;

      const whereClause = {};

      if (startDate && endDate) {
        whereClause.openedAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const drawers = await CashDrawer.findAll({
        where: whereClause,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('totalCashIn')), 'totalCashIn'],
          [sequelize.fn('SUM', sequelize.col('totalCashOut')), 'totalCashOut'],
          [sequelize.fn('SUM', sequelize.col('variance')), 'totalVariance'],
          [sequelize.fn('SUM', sequelize.col('totalSales')), 'totalSales'],
          [sequelize.fn('SUM', sequelize.col('totalRefunds')), 'totalRefunds']
        ],
        group: ['status'],
        raw: true
      });

      const allDrawers = await CashDrawer.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalDrawers'],
          [sequelize.fn('SUM', sequelize.col('totalCashIn')), 'overallCashIn'],
          [sequelize.fn('SUM', sequelize.col('totalCashOut')), 'overallCashOut'],
          [sequelize.fn('SUM', sequelize.col('variance')), 'overallVariance'],
          [sequelize.fn('AVG', sequelize.col('variance')), 'averageVariance']
        ],
        raw: true
      });

      return {
        overall: {
          totalDrawers: parseInt(allDrawers[0]?.totalDrawers || 0),
          totalCashIn: parseFloat(allDrawers[0]?.overallCashIn || 0),
          totalCashOut: parseFloat(allDrawers[0]?.overallCashOut || 0),
          totalVariance: parseFloat(allDrawers[0]?.overallVariance || 0),
          averageVariance: parseFloat(allDrawers[0]?.averageVariance || 0)
        },
        byStatus: drawers.map(d => ({
          status: d.status,
          count: parseInt(d.count),
          totalCashIn: parseFloat(d.totalCashIn || 0),
          totalCashOut: parseFloat(d.totalCashOut || 0),
          totalVariance: parseFloat(d.totalVariance || 0),
          totalSales: parseInt(d.totalSales || 0),
          totalRefunds: parseInt(d.totalRefunds || 0)
        }))
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PaymentService();
