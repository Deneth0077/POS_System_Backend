const {
  StockTransaction,
  DamagedStock,
  StockReturn,
  Ingredient,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * Add Stock - Purchase or receive new stock
 */
exports.addStock = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      ingredientId,
      quantity,
      unitCost,
      storageLocation,
      locationId,
      locationName,
      referenceNumber,
      batchNumber,
      expiryDate,
      notes
    } = req.body;

    // Get location name if provided
    let toLocationName = locationName;
    if (locationId) {
      const { StockLocation } = require('../models');
      const location = await StockLocation.findByPk(locationId);
      if (location) toLocationName = location.locationName;
    }

    // Validate input
    if (!ingredientId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Ingredient ID and valid quantity are required'
      });
    }

    // Get ingredient
    const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
    if (!ingredient) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Calculate new stock
    const previousStock = parseFloat(ingredient.currentStock);
    const newStock = previousStock + parseFloat(quantity);
    const totalCost = unitCost ? parseFloat(quantity) * parseFloat(unitCost) : null;

    // Generate transaction number
    const transactionNumber = await StockTransaction.generateTransactionNumber();

    // Create stock transaction
    const stockTransaction = await StockTransaction.create({
      transactionNumber,
      transactionType: 'add_stock',
      ingredientId,
      quantity: parseFloat(quantity),
      unit: ingredient.unit,
      previousStock,
      newStock,
      unitCost: unitCost || ingredient.unitCost,
      totalCost,
      storageLocation: storageLocation || ingredient.storageLocation,
      toLocation: toLocationName || storageLocation || ingredient.storageLocation,
      referenceType: 'purchase_order',
      referenceNumber,
      batchNumber,
      expiryDate,
      notes,
      status: 'completed',
      performedBy: req.user.id,
      createdBy: req.user.id,
      transactionDate: new Date()
    }, { transaction });

    // Update ingredient stock and cost
    const updateData = {
      currentStock: newStock,
      storageLocation: storageLocation || ingredient.storageLocation
    };

    // Update unit cost if provided
    if (unitCost) {
      updateData.unitCost = unitCost;
    }

    await ingredient.update(updateData, { transaction });

    await transaction.commit();

    // Fetch complete transaction with associations
    const completeTransaction = await StockTransaction.findByPk(stockTransaction.id, {
      include: [
        { model: Ingredient, as: 'ingredient' },
        { model: User, as: 'performer', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.status(201).json({
      message: 'Stock added successfully',
      transaction: completeTransaction
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Add stock error:', error);
    res.status(500).json({
      error: 'Failed to add stock',
      details: error.message
    });
  }
};

/**
 * Bulk Add Stock - Add multiple items at once
 */
exports.bulkAddStock = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { items, referenceNumber, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Items array is required' });
    }

    const transactions = [];
    const errors = [];

    for (const item of items) {
      try {
        const { ingredientId, quantity, unitCost, batchNumber, expiryDate, storageLocation } = item;

        if (!ingredientId || !quantity || quantity <= 0) {
          errors.push({
            ingredientId,
            error: 'Invalid ingredient ID or quantity'
          });
          continue;
        }

        // Get ingredient
        const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
        if (!ingredient) {
          errors.push({
            ingredientId,
            error: 'Ingredient not found'
          });
          continue;
        }

        // Calculate new stock
        const previousStock = parseFloat(ingredient.currentStock);
        const newStock = previousStock + parseFloat(quantity);
        const totalCost = unitCost ? parseFloat(quantity) * parseFloat(unitCost) : null;

        // Generate transaction number
        const transactionNumber = await StockTransaction.generateTransactionNumber();

        // Create stock transaction
        const stockTransaction = await StockTransaction.create({
          transactionNumber,
          transactionType: 'add_stock',
          ingredientId,
          quantity: parseFloat(quantity),
          unit: ingredient.unit,
          previousStock,
          newStock,
          unitCost: unitCost || ingredient.unitCost,
          totalCost,
          storageLocation: storageLocation || ingredient.storageLocation,
          referenceType: 'purchase_order',
          referenceNumber,
          batchNumber,
          expiryDate,
          notes,
          status: 'completed',
          performedBy: req.user.id,
          createdBy: req.user.id,
          transactionDate: new Date()
        }, { transaction });

        // Update ingredient stock
        const updateData = {
          currentStock: newStock,
          storageLocation: storageLocation || ingredient.storageLocation
        };

        if (unitCost) {
          updateData.unitCost = unitCost;
        }

        await ingredient.update(updateData, { transaction });

        transactions.push(stockTransaction);

      } catch (itemError) {
        errors.push({
          ingredientId: item.ingredientId,
          error: itemError.message
        });
      }
    }

    await transaction.commit();

    res.status(201).json({
      message: `Successfully processed ${transactions.length} items`,
      transactions,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: items.length,
        successful: transactions.length,
        failed: errors.length
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Bulk add stock error:', error);
    res.status(500).json({
      error: 'Failed to bulk add stock',
      details: error.message
    });
  }
};

/**
 * Get Add Stock History
 */
exports.getAddStockHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      ingredientId,
      startDate,
      endDate,
      referenceNumber
    } = req.query;

    const where = {
      transactionType: 'add_stock'
    };

    if (ingredientId) {
      where.ingredientId = ingredientId;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate[Op.lte] = new Date(endDate);
      }
    }

    if (referenceNumber) {
      where.referenceNumber = {
        [Op.like]: `%${referenceNumber}%`
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StockTransaction.findAndCountAll({
      where,
      include: [
        {
          model: Ingredient,
          as: 'ingredient',
          attributes: ['id', 'name', 'unit', 'currentStock']
        },
        {
          model: User,
          as: 'performer',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['transactionDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transactions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get add stock history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve add stock history',
      details: error.message
    });
  }
};

// ============================================
// STOCK ADJUSTMENT
// ============================================

/**
 * Stock Adjustment - Manual correction of stock levels
 */
exports.adjustStock = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      ingredientId,
      adjustmentType, // 'increase' or 'decrease'
      quantity,
      reason,
      locationId,
      locationName,
      notes
    } = req.body;

    // Get location name if provided
    let toLocationName = locationName;
    if (locationId) {
      const { StockLocation } = require('../models');
      const location = await StockLocation.findByPk(locationId);
      if (location) toLocationName = location.locationName;
    }

    // Validate input
    if (!ingredientId || !quantity || quantity <= 0 || !adjustmentType) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Ingredient ID, adjustment type, and valid quantity are required'
      });
    }

    if (!['increase', 'decrease'].includes(adjustmentType)) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Adjustment type must be either "increase" or "decrease"'
      });
    }

    if (!reason) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Reason for adjustment is required'
      });
    }

    // Get ingredient
    const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
    if (!ingredient) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Calculate new stock
    const previousStock = parseFloat(ingredient.currentStock);
    const adjustmentQuantity = adjustmentType === 'increase'
      ? parseFloat(quantity)
      : -parseFloat(quantity);
    const newStock = previousStock + adjustmentQuantity;

    // Prevent negative stock
    if (newStock < 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Adjustment would result in negative stock',
        currentStock: previousStock,
        adjustmentQuantity,
        resultingStock: newStock
      });
    }

    // Generate transaction number
    const transactionNumber = await StockTransaction.generateTransactionNumber();

    // Create stock transaction
    const stockTransaction = await StockTransaction.create({
      transactionNumber,
      transactionType: 'adjustment',
      ingredientId,
      quantity: adjustmentQuantity,
      unit: ingredient.unit,
      previousStock,
      newStock,
      reason,
      notes,
      toLocation: toLocationName,
      status: 'completed',
      performedBy: req.user.id,
      createdBy: req.user.id,
      transactionDate: new Date()
    }, { transaction });

    // Update ingredient stock
    await ingredient.update({
      currentStock: newStock
    }, { transaction });

    await transaction.commit();

    // Fetch complete transaction with associations
    const completeTransaction = await StockTransaction.findByPk(stockTransaction.id, {
      include: [
        { model: Ingredient, as: 'ingredient' },
        { model: User, as: 'performer', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.status(201).json({
      message: 'Stock adjusted successfully',
      transaction: completeTransaction
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Stock adjustment error:', error);
    res.status(500).json({
      error: 'Failed to adjust stock',
      details: error.message
    });
  }
};

/**
 * Get Stock Adjustment History
 */
exports.getAdjustmentHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      ingredientId,
      startDate,
      endDate
    } = req.query;

    const where = {
      transactionType: 'adjustment'
    };

    if (ingredientId) {
      where.ingredientId = ingredientId;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate[Op.lte] = new Date(endDate);
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StockTransaction.findAndCountAll({
      where,
      include: [
        {
          model: Ingredient,
          as: 'ingredient',
          attributes: ['id', 'name', 'unit', 'currentStock']
        },
        {
          model: User,
          as: 'performer',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['transactionDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      adjustments: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get adjustment history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve adjustment history',
      details: error.message
    });
  }
};

// ============================================
// DAMAGED STOCK
// ============================================

/**
 * Report Damaged Stock
 */
exports.reportDamage = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      ingredientId,
      quantity,
      damageType,
      damageReason,
      damageDate,
      batchNumber,
      expiryDate,
      location,
      disposalMethod,
      notes
    } = req.body;

    // Validate input
    if (!ingredientId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Ingredient ID and valid quantity are required'
      });
    }

    if (!damageType || !damageReason) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Damage type and reason are required'
      });
    }

    const validDamageTypes = ['expired', 'spoiled', 'broken', 'contaminated', 'other'];
    if (!validDamageTypes.includes(damageType)) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Damage type must be one of: ${validDamageTypes.join(', ')}`
      });
    }

    // Get ingredient
    const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
    if (!ingredient) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Check if sufficient stock
    if (parseFloat(ingredient.currentStock) < parseFloat(quantity)) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Insufficient stock. Available: ${ingredient.currentStock}, Requested: ${quantity}`
      });
    }

    // Calculate costs
    const unitCost = ingredient.unitCost;
    const totalLoss = parseFloat(quantity) * parseFloat(unitCost);

    // Generate damage number
    const damageNumber = await DamagedStock.generateDamageNumber();

    // Create damaged stock record
    const damagedStock = await DamagedStock.create({
      damageNumber,
      ingredientId,
      quantity: parseFloat(quantity),
      unit: ingredient.unit,
      damageType,
      damageReason,
      damageDate: damageDate || new Date(),
      unitCost,
      totalLoss,
      batchNumber,
      expiryDate,
      location,
      reportedBy: req.user.id,
      status: 'reported',
      disposalMethod,
      notes
    }, { transaction });

    // Calculate new stock
    const previousStock = parseFloat(ingredient.currentStock);
    const newStock = previousStock - parseFloat(quantity);

    // Generate transaction number
    const transactionNumber = await StockTransaction.generateTransactionNumber();

    // Create stock transaction
    const stockTransaction = await StockTransaction.create({
      transactionNumber,
      transactionType: 'damaged',
      ingredientId,
      quantity: -parseFloat(quantity),
      unit: ingredient.unit,
      previousStock,
      newStock,
      unitCost,
      totalCost: -totalLoss,
      referenceType: 'damaged_stock',
      referenceId: damagedStock.id,
      referenceNumber: damageNumber,
      reason: `${damageType}: ${damageReason}`,
      batchNumber,
      notes,
      status: 'completed',
      performedBy: req.user.id,
      transactionDate: new Date()
    }, { transaction });

    // Update damaged stock with transaction reference
    await damagedStock.update({
      stockTransactionId: stockTransaction.id
    }, { transaction });

    // Update ingredient stock
    await ingredient.update({
      currentStock: newStock
    }, { transaction });

    await transaction.commit();

    // Fetch complete damaged stock record
    const completeDamage = await DamagedStock.findByPk(damagedStock.id, {
      include: [
        { model: Ingredient, as: 'ingredient' },
        { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
        { model: StockTransaction, as: 'stockTransaction' }
      ]
    });

    res.status(201).json({
      message: 'Damaged stock reported successfully',
      damagedStock: completeDamage
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Report damage error:', error);
    res.status(500).json({
      error: 'Failed to report damaged stock',
      details: error.message
    });
  }
};

/**
 * Approve Damaged Stock
 */
exports.approveDamage = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { damageId } = req.params;
    const { disposalDate, disposalMethod, notes } = req.body;

    const damagedStock = await DamagedStock.findByPk(damageId, { transaction });

    if (!damagedStock) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Damaged stock record not found' });
    }

    if (damagedStock.status !== 'reported') {
      await transaction.rollback();
      return res.status(400).json({
        error: `Cannot approve. Current status: ${damagedStock.status}`
      });
    }

    await damagedStock.update({
      status: 'approved',
      approvedBy: req.user.id,
      disposalDate,
      disposalMethod: disposalMethod || damagedStock.disposalMethod,
      notes: notes ? `${damagedStock.notes || ''}\n${notes}` : damagedStock.notes
    }, { transaction });

    await transaction.commit();

    const updatedDamage = await DamagedStock.findByPk(damageId, {
      include: [
        { model: Ingredient, as: 'ingredient' },
        { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.json({
      message: 'Damaged stock approved',
      damagedStock: updatedDamage
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Approve damage error:', error);
    res.status(500).json({
      error: 'Failed to approve damaged stock',
      details: error.message
    });
  }
};

/**
 * Get Damaged Stock History
 */
exports.getDamagedStockHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      ingredientId,
      damageType,
      status,
      startDate,
      endDate
    } = req.query;

    const where = {};

    if (ingredientId) {
      where.ingredientId = ingredientId;
    }

    if (damageType) {
      where.damageType = damageType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.damageDate = {};
      if (startDate) {
        where.damageDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.damageDate[Op.lte] = new Date(endDate);
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await DamagedStock.findAndCountAll({
      where,
      include: [
        {
          model: Ingredient,
          as: 'ingredient',
          attributes: ['id', 'name', 'unit']
        },
        { model: User, as: 'reporter', attributes: ['id', 'username'] },
        { model: User, as: 'approver', attributes: ['id', 'username'] }
      ],
      order: [['damageDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate total loss
    const totalLoss = rows.reduce((sum, item) => sum + parseFloat(item.totalLoss || 0), 0);

    res.json({
      damagedStock: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      },
      summary: {
        totalRecords: count,
        totalLoss: totalLoss.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Get damaged stock history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve damaged stock history',
      details: error.message
    });
  }
};

// ============================================
// RETURN STOCK (TO SUPPLIER)
// ============================================

/**
 * Initiate Return to Supplier
 */
exports.initiateReturn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      ingredientId,
      quantity,
      returnReason,
      returnDescription,
      returnDate,
      supplierName,
      supplierContact,
      originalPurchaseReference,
      batchNumber,
      notes
    } = req.body;

    // Validate input
    if (!ingredientId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Ingredient ID and valid quantity are required'
      });
    }

    if (!returnReason) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Return reason is required'
      });
    }

    const validReasons = ['defective', 'wrong_item', 'excess', 'expired', 'quality_issue', 'other'];
    if (!validReasons.includes(returnReason)) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Return reason must be one of: ${validReasons.join(', ')}`
      });
    }

    // Get ingredient
    const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
    if (!ingredient) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Check if sufficient stock
    if (parseFloat(ingredient.currentStock) < parseFloat(quantity)) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Insufficient stock. Available: ${ingredient.currentStock}, Requested: ${quantity}`
      });
    }

    // Calculate refund
    const unitCost = ingredient.unitCost;
    const totalRefund = parseFloat(quantity) * parseFloat(unitCost);

    // Generate return number
    const returnNumber = await StockReturn.generateReturnNumber();

    // Create return record
    const stockReturn = await StockReturn.create({
      returnNumber,
      ingredientId,
      quantity: parseFloat(quantity),
      unit: ingredient.unit,
      returnReason,
      returnDescription,
      returnDate: returnDate || new Date(),
      supplierName: supplierName || ingredient.supplier,
      supplierContact,
      unitCost,
      totalRefund,
      refundStatus: 'pending',
      originalPurchaseReference,
      batchNumber,
      status: 'pending',
      initiatedBy: req.user.id,
      notes
    }, { transaction });

    // Calculate new stock
    const previousStock = parseFloat(ingredient.currentStock);
    const newStock = previousStock - parseFloat(quantity);

    // Generate transaction number
    const transactionNumber = await StockTransaction.generateTransactionNumber();

    // Create stock transaction
    const stockTransaction = await StockTransaction.create({
      transactionNumber,
      transactionType: 'return_to_supplier',
      ingredientId,
      quantity: -parseFloat(quantity),
      unit: ingredient.unit,
      previousStock,
      newStock,
      unitCost,
      totalCost: -totalRefund,
      referenceType: 'stock_return',
      referenceId: stockReturn.id,
      referenceNumber: returnNumber,
      reason: `${returnReason}: ${returnDescription || ''}`,
      batchNumber,
      notes,
      status: 'pending',
      performedBy: req.user.id,
      transactionDate: new Date()
    }, { transaction });

    // Update return with transaction reference
    await stockReturn.update({
      stockTransactionId: stockTransaction.id
    }, { transaction });

    // Update ingredient stock
    await ingredient.update({
      currentStock: newStock
    }, { transaction });

    await transaction.commit();

    // Fetch complete return record
    const completeReturn = await StockReturn.findByPk(stockReturn.id, {
      include: [
        { model: Ingredient, as: 'ingredient' },
        { model: User, as: 'initiator', attributes: ['id', 'username', 'email'] },
        { model: StockTransaction, as: 'stockTransaction' }
      ]
    });

    res.status(201).json({
      message: 'Return to supplier initiated successfully',
      return: completeReturn
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Initiate return error:', error);
    res.status(500).json({
      error: 'Failed to initiate return to supplier',
      details: error.message
    });
  }
};

/**
 * Approve Return
 */
exports.approveReturn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { returnId } = req.params;
    const { notes } = req.body;

    const stockReturn = await StockReturn.findByPk(returnId, {
      include: [{ model: StockTransaction, as: 'stockTransaction' }],
      transaction
    });

    if (!stockReturn) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return record not found' });
    }

    if (stockReturn.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        error: `Cannot approve. Current status: ${stockReturn.status}`
      });
    }

    // Update return status
    await stockReturn.update({
      status: 'approved',
      approvedBy: req.user.id,
      notes: notes ? `${stockReturn.notes || ''}\n${notes}` : stockReturn.notes
    }, { transaction });

    // Update stock transaction status
    if (stockReturn.stockTransaction) {
      await stockReturn.stockTransaction.update({
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      }, { transaction });
    }

    await transaction.commit();

    const updatedReturn = await StockReturn.findByPk(returnId, {
      include: [
        { model: Ingredient, as: 'ingredient' },
        { model: User, as: 'initiator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.json({
      message: 'Return approved',
      return: updatedReturn
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Approve return error:', error);
    res.status(500).json({
      error: 'Failed to approve return',
      details: error.message
    });
  }
};

/**
 * Mark Return as Completed (refund received)
 */
exports.completeReturn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { returnId } = req.params;
    const { refundDate, actualRefund, notes } = req.body;

    const stockReturn = await StockReturn.findByPk(returnId, { transaction });

    if (!stockReturn) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return record not found' });
    }

    if (stockReturn.status !== 'approved' && stockReturn.status !== 'shipped') {
      await transaction.rollback();
      return res.status(400).json({
        error: `Cannot complete. Current status: ${stockReturn.status}`
      });
    }

    await stockReturn.update({
      status: 'completed',
      refundStatus: 'refunded',
      refundDate: refundDate || new Date(),
      totalRefund: actualRefund || stockReturn.totalRefund,
      notes: notes ? `${stockReturn.notes || ''}\n${notes}` : stockReturn.notes
    }, { transaction });

    await transaction.commit();

    const updatedReturn = await StockReturn.findByPk(returnId, {
      include: [
        { model: Ingredient, as: 'ingredient' },
        { model: User, as: 'initiator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.json({
      message: 'Return completed',
      return: updatedReturn
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Complete return error:', error);
    res.status(500).json({
      error: 'Failed to complete return',
      details: error.message
    });
  }
};

/**
 * Get Return History
 */
exports.getReturnHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      ingredientId,
      returnReason,
      status,
      refundStatus,
      startDate,
      endDate
    } = req.query;

    const where = {};

    if (ingredientId) {
      where.ingredientId = ingredientId;
    }

    if (returnReason) {
      where.returnReason = returnReason;
    }

    if (status) {
      where.status = status;
    }

    if (refundStatus) {
      where.refundStatus = refundStatus;
    }

    if (startDate || endDate) {
      where.returnDate = {};
      if (startDate) {
        where.returnDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.returnDate[Op.lte] = new Date(endDate);
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StockReturn.findAndCountAll({
      where,
      include: [
        {
          model: Ingredient,
          as: 'ingredient',
          attributes: ['id', 'name', 'unit']
        },
        { model: User, as: 'initiator', attributes: ['id', 'username'] },
        { model: User, as: 'approver', attributes: ['id', 'username'] }
      ],
      order: [['returnDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate total refund
    const totalRefund = rows.reduce((sum, item) => sum + parseFloat(item.totalRefund || 0), 0);

    res.json({
      returns: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      },
      summary: {
        totalRecords: count,
        totalRefund: totalRefund.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Get return history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve return history',
      details: error.message
    });
  }
};

// ============================================
// STOCK HISTORY & REPORTS
// ============================================

/**
 * Get All Stock Transactions (Complete History)
 */
exports.getStockHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      ingredientId,
      transactionType,
      startDate,
      endDate,
      referenceNumber,
      status
    } = req.query;

    const where = {};

    if (ingredientId) {
      where.ingredientId = ingredientId;
    }

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (status) {
      where.status = status;
    }

    if (referenceNumber) {
      where[Op.or] = [
        { transactionNumber: { [Op.like]: `%${referenceNumber}%` } },
        { referenceNumber: { [Op.like]: `%${referenceNumber}%` } }
      ];
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate[Op.lte] = new Date(endDate);
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StockTransaction.findAndCountAll({
      where,
      include: [
        {
          model: Ingredient,
          as: 'ingredient',
          attributes: ['id', 'name', 'unit', 'currentStock']
        },
        { model: User, as: 'performer', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'username'] }
      ],
      order: [['transactionDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transactions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get stock history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve stock history',
      details: error.message
    });
  }
};

/**
 * Get Stock Summary Report
 */
exports.getStockSummary = async (req, res) => {
  try {
    console.log('=== GET STOCK SUMMARY REQUEST ===');
    console.log('User:', req.user?.id);
    console.log('Query:', req.query);

    const { ingredientId, startDate, endDate } = req.query;

    const where = {};

    if (ingredientId) {
      where.ingredientId = ingredientId;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate[Op.lte] = new Date(endDate);
      }
    }

    console.log('Querying StockTransaction...');
    // Get transaction summary by type
    const transactionSummary = await StockTransaction.findAll({
      attributes: [
        [sequelize.col('transaction_type'), 'transactionType'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('total_cost')), 'totalCost']
      ],
      where,
      group: ['transaction_type'],
      raw: true
    });
    console.log('Transaction summary retrieved:', transactionSummary.length, 'types');

    console.log('Querying Ingredients...');
    // Get current stock value
    const ingredients = await Ingredient.findAll({
      attributes: [
        'id',
        'name',
        'unit',
        'currentStock',
        'unitCost',
        [sequelize.literal('currentStock * unitCost'), 'stockValue']
      ],
      where: ingredientId ? { id: ingredientId } : {},
      raw: true
    });
    console.log('Ingredients retrieved:', ingredients.length);

    const totalStockValue = ingredients.reduce((sum, item) =>
      sum + parseFloat(item.stockValue || 0), 0
    );

    console.log('Sending response...');
    res.json({
      summary: {
        transactionSummary,
        totalStockValue: totalStockValue.toFixed(2),
        ingredientCount: ingredients.length,
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        }
      },
      ingredients: ingredientId ? ingredients : undefined
    });

  } catch (error) {
    console.error('=== GET STOCK SUMMARY ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to retrieve stock summary',
      details: error.message
    });
  }
};

/**
 * Get Stock Movement Report for specific ingredient
 */
exports.getIngredientMovement = async (req, res) => {
  try {
    const { ingredientId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const ingredient = await Ingredient.findByPk(ingredientId);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    const where = { ingredientId };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate[Op.lte] = new Date(endDate);
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StockTransaction.findAndCountAll({
      where,
      include: [
        { model: User, as: 'performer', attributes: ['id', 'username'] }
      ],
      order: [['transactionDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate totals by type
    const totals = await StockTransaction.findAll({
      attributes: [
        'transactionType',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['transactionType'],
      raw: true
    });

    res.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: ingredient.currentStock,
        reorderLevel: ingredient.reorderLevel
      },
      transactions: rows,
      summary: totals,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get ingredient movement error:', error);
    res.status(500).json({
      error: 'Failed to retrieve ingredient movement',
      details: error.message
    });
  }
};

module.exports = exports;
