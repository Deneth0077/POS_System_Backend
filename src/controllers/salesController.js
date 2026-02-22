const salesService = require('../services/salesService');
const vatService = require('../services/vatService');
const vatReportService = require('../services/vatReportService');
const Sale = require('../models/Sale');
const User = require('../models/User');

// @desc    Create a new sale
// @route   POST /api/sales
// @access  Private (Cashier, Manager, Admin)
exports.createSale = async (req, res, next) => {
  try {
    const saleData = {
      ...req.body,
      cashierId: req.user.id,
      cashierName: req.user.fullName,
      kitchenStationId: req.body.kitchenStationId || null
    };

    const sale = await salesService.createSale(saleData);

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private (Manager, Admin)
exports.getSales = async (req, res, next) => {
  try {
    const { startDate, endDate, orderType } = req.query;

    let sales;
    if (startDate && endDate) {
      sales = await salesService.getSalesByDateRange(
        new Date(startDate),
        new Date(endDate),
        orderType
      );
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      sales = await salesService.getSalesByDateRange(today, tomorrow, orderType);
    }

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sale by ID
// @route   GET /api/sales/:id
// @access  Private (Cashier, Manager, Admin)
exports.getSaleById = async (req, res, next) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'cashier',
        attributes: ['username', 'fullName']
      }]
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales report
// @route   GET /api/sales/report
// @access  Private (Manager, Admin)
exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const report = await salesService.getSalesReport(
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate VAT for items
// @route   POST /api/sales/vat/calculate
// @access  Private (Cashier, Manager, Admin)
exports.calculateVAT = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const vatCalculation = await vatService.calculateBillVAT(items);

    res.status(200).json({
      success: true,
      message: 'VAT calculated successfully',
      data: vatCalculation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get VAT breakdown for a sale
// @route   GET /api/sales/:id/vat
// @access  Private (Cashier, Manager, Admin)
exports.getSaleVATBreakdown = async (req, res, next) => {
  try {
    const sale = await Sale.findByPk(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    const vatBreakdown = vatService.getVATBreakdown(
      parseFloat(sale.subtotal),
      parseFloat(sale.totalAmount)
    );

    const validation = vatService.validateVATCalculation({
      subtotal: parseFloat(sale.subtotal),
      vatAmount: parseFloat(sale.vatAmount),
      totalAmount: parseFloat(sale.totalAmount),
      vatRate: parseFloat(sale.vatRate)
    });

    res.status(200).json({
      success: true,
      data: {
        sale: {
          id: sale.id,
          saleNumber: sale.saleNumber,
          saleDate: sale.saleDate
        },
        breakdown: vatBreakdown,
        validation
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate VAT report for date range
// @route   GET /api/sales/reports/vat
// @access  Private (Manager, Admin)
exports.generateVATReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy, includeDetails } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const report = await vatReportService.generateVATReport(
      new Date(startDate),
      new Date(endDate),
      {
        groupBy: groupBy || 'day',
        includeDetails: includeDetails === 'true'
      }
    );

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate VAT report for specific period (daily, monthly, quarterly)
// @route   GET /api/sales/reports/vat/:period
// @access  Private (Manager, Admin)
exports.generatePeriodVATReport = async (req, res, next) => {
  try {
    const { period } = req.params;
    const { date } = req.query;

    if (!['daily', 'monthly', 'quarterly'].includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Use daily, monthly, or quarterly'
      });
    }

    const reportDate = date ? new Date(date) : new Date();
    const report = await vatReportService.generatePeriodReport(period, reportDate);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export VAT report to CSV
// @route   GET /api/sales/reports/vat/export/csv
// @access  Private (Manager, Admin)
exports.exportVATReportCSV = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const report = await vatReportService.generateVATReport(
      new Date(startDate),
      new Date(endDate),
      { groupBy: groupBy || 'day' }
    );

    const csv = vatReportService.exportToCSV(report);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vat-report-${startDate}-${endDate}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/sales/:id/status
// @access  Private (Cashier, Manager, Admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason, cancellationNote, completionReason } = req.body;

    const sale = await Sale.findByPk(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    const updateData = {
      status,
      statusUpdatedBy: req.user.id,
      statusUpdatedAt: new Date()
    };

    if (status === 'voided') {
      if (!cancellationReason) {
        return res.status(400).json({ success: false, message: 'Cancellation reason is required' });
      }
      updateData.cancellationReason = cancellationReason;
      updateData.cancellationNote = cancellationNote || null;
    }

    if (status === 'completed' && completionReason) {
      updateData.completionReason = completionReason;
    }

    await sale.update(updateData);

    if (status === 'voided') {
      const { AuditLog } = require('../models');
      await AuditLog.create({
        userId: req.user.id,
        action: 'STATUS_CHANGE',
        resourceType: 'Sale',
        resourceId: sale.id,
        description: `Order ${sale.saleNumber} voided. Reason: ${cancellationReason}`,
        metadata: { saleNumber: sale.saleNumber, cancellationReason, cancellationNote }
      });
    }

    const { KitchenOrder } = require('../models');
    await KitchenOrder.update(
      {
        status: status === 'voided' ? 'cancelled' : status,
        cancellationReason: status === 'voided' ? cancellationReason : null,
        cancellationNote: status === 'voided' ? cancellationNote : null,
        completionReason: status === 'completed' ? completionReason : null,
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date()
      },
      { where: { saleId: id } }
    );

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sale status
// @route   PATCH /api/sales/:id
// @access  Private (Manager, Admin)
exports.updateSaleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const saleId = req.params.id;

    const sale = await Sale.findByPk(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await sale.update({
      status,
      statusUpdatedBy: req.user.id,
      statusUpdatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: `Sale status updated to ${status}`,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order with reason
// @route   PATCH /api/sales/:id/cancel
// @access  Private (Cashier, Manager, Admin)
exports.cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellationReason, cancellationNote } = req.body;

    if (!cancellationReason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const sale = await Sale.findByPk(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await sale.update({
      status: 'voided',
      cancellationReason,
      cancellationNote: cancellationNote || null,
      statusUpdatedBy: req.user.id,
      statusUpdatedAt: new Date()
    });

    const { AuditLog } = require('../models');
    await AuditLog.create({
      userId: req.user.id,
      action: 'STATUS_CHANGE',
      resourceType: 'Sale',
      resourceId: sale.id,
      description: `Order ${sale.saleNumber} cancelled/voided. Reason: ${cancellationReason}`,
      metadata: { saleNumber: sale.saleNumber, cancellationReason, cancellationNote }
    });


    const { KitchenOrder } = require('../models');
    await KitchenOrder.update(
      {
        status: 'cancelled',
        cancellationReason: cancellationReason,
        cancellationNote: cancellationNote || null,
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date()
      },
      { where: { saleId: id } }
    );

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete order with reason
// @route   PATCH /api/sales/:id/complete
// @access  Private (Cashier, Manager, Admin)
exports.completeOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completionReason } = req.body;

    const sale = await Sale.findByPk(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await sale.update({
      status: 'completed',
      completionReason: completionReason || null,
      statusUpdatedBy: req.user.id,
      statusUpdatedAt: new Date()
    });

    const { KitchenOrder } = require('../models');
    await KitchenOrder.update(
      {
        status: 'completed',
        completionReason: completionReason || null,
        completedAt: new Date(),
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date()
      },
      { where: { saleId: id } }
    );

    res.status(200).json({
      success: true,
      message: 'Order completed successfully',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};
