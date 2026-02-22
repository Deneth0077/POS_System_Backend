const BillSplit = require('../models/BillSplit');
const Sale = require('../models/Sale');
const vatService = require('../services/vatService');
const { Op } = require('sequelize');

/**
 * @desc    Split a bill into multiple parts
 * @route   POST /api/sales/:id/split
 * @access  Private
 */
exports.createBillSplit = async (req, res, next) => {
  try {
    const { splits } = req.body;
    const saleId = req.params.id;

    // Validate sale exists
    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Check if already split
    const existingSplits = await BillSplit.count({ where: { saleId } });
    if (existingSplits > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bill has already been split. Delete existing splits first.'
      });
    }

    // Validate splits
    if (!splits || !Array.isArray(splits) || splits.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 splits are required'
      });
    }

    // Calculate total from splits
    const totalFromSplits = splits.reduce((sum, split) => sum + parseFloat(split.totalAmount || 0), 0);
    const saleTotalAmount = parseFloat(sale.totalAmount);

    // Allow small rounding differences (within 1 rupee)
    if (Math.abs(totalFromSplits - saleTotalAmount) > 1) {
      return res.status(400).json({
        success: false,
        message: `Split amounts (${totalFromSplits.toFixed(2)}) must equal sale total (${saleTotalAmount.toFixed(2)})`
      });
    }

    // Create bill splits
    const createdSplits = [];
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const billSplit = await BillSplit.create({
        saleId,
        splitNumber: i + 1,
        customerName: split.customerName || `Customer ${i + 1}`,
        items: split.items || [],
        subtotal: split.subtotal || 0,
        vatAmount: split.vatAmount || 0,
        totalAmount: split.totalAmount,
        notes: split.notes
      });
      createdSplits.push(billSplit);
    }

    res.status(201).json({
      success: true,
      message: `Bill split into ${splits.length} parts successfully`,
      data: createdSplits
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all splits for a sale
 * @route   GET /api/sales/:id/splits
 * @access  Private
 */
exports.getSaleSplits = async (req, res, next) => {
  try {
    const saleId = req.params.id;

    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    const splits = await BillSplit.findAll({
      where: { saleId },
      order: [['splitNumber', 'ASC']]
    });

    // Calculate summary
    const totalPaid = splits
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);

    const totalPending = splits
      .filter(s => s.paymentStatus === 'pending')
      .reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);

    res.json({
      success: true,
      count: splits.length,
      summary: {
        totalAmount: parseFloat(sale.totalAmount),
        totalPaid,
        totalPending,
        allPaid: totalPending === 0 && splits.length > 0
      },
      data: splits
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get split by ID
 * @route   GET /api/sales/splits/:id
 * @access  Private
 */
exports.getSplitById = async (req, res, next) => {
  try {
    const split = await BillSplit.findByPk(req.params.id);

    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    res.json({
      success: true,
      data: split
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Pay a bill split
 * @route   POST /api/sales/splits/:id/pay
 * @access  Private
 */
exports.paySplit = async (req, res, next) => {
  try {
    const { paymentMethod, amountPaid } = req.body;
    const splitId = req.params.id;

    const split = await BillSplit.findByPk(splitId);
    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    if (split.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This split has already been paid'
      });
    }

    const totalAmount = parseFloat(split.totalAmount);
    const paid = parseFloat(amountPaid);

    if (paid < totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient payment. Required: ${totalAmount}, Received: ${paid}`
      });
    }

    const change = paid - totalAmount;

    // Update split
    split.paymentStatus = 'paid';
    split.paymentMethod = paymentMethod;
    split.amountPaid = paid;
    split.changeGiven = change;
    split.paidAt = new Date();
    split.paidBy = req.user.id;
    await split.save();

    // Check if all splits are paid
    const allSplits = await BillSplit.findAll({
      where: { saleId: split.saleId }
    });

    const allPaid = allSplits.every(s => s.paymentStatus === 'paid');

    res.json({
      success: true,
      message: 'Split paid successfully',
      data: {
        split,
        changeGiven: change,
        allSplitsPaid: allPaid
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete all splits for a sale
 * @route   DELETE /api/sales/:id/splits
 * @access  Private (Admin/Manager)
 */
exports.deleteSaleSplits = async (req, res, next) => {
  try {
    const saleId = req.params.id;

    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Check if any splits are already paid
    const paidSplits = await BillSplit.count({
      where: {
        saleId,
        paymentStatus: 'paid'
      }
    });

    if (paidSplits > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete splits. ${paidSplits} split(s) already paid.`
      });
    }

    const deleted = await BillSplit.destroy({ where: { saleId } });

    res.json({
      success: true,
      message: `${deleted} split(s) deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update split details
 * @route   PUT /api/sales/splits/:id
 * @access  Private (Admin/Manager)
 */
exports.updateSplit = async (req, res, next) => {
  try {
    const { customerName, notes } = req.body;
    const splitId = req.params.id;

    const split = await BillSplit.findByPk(splitId);
    if (!split) {
      return res.status(404).json({
        success: false,
        message: 'Split not found'
      });
    }

    if (split.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a paid split'
      });
    }

    if (customerName) split.customerName = customerName;
    if (notes !== undefined) split.notes = notes;

    await split.save();

    res.json({
      success: true,
      message: 'Split updated successfully',
      data: split
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment summary for all splits
 * @route   GET /api/sales/splits/summary
 * @access  Private
 */
exports.getSplitsSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, paymentStatus } = req.query;

    const where = {};
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const splits = await BillSplit.findAll({ where });

    const summary = {
      totalSplits: splits.length,
      paid: splits.filter(s => s.paymentStatus === 'paid').length,
      pending: splits.filter(s => s.paymentStatus === 'pending').length,
      cancelled: splits.filter(s => s.paymentStatus === 'cancelled').length,
      totalAmount: splits.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
      paidAmount: splits
        .filter(s => s.paymentStatus === 'paid')
        .reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
      pendingAmount: splits
        .filter(s => s.paymentStatus === 'pending')
        .reduce((sum, s) => sum + parseFloat(s.totalAmount), 0)
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
