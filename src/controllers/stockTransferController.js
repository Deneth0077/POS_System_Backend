const { 
  StockTransfer, 
  StockTransferItem, 
  StockTransaction,
  Ingredient, 
  User, 
  sequelize 
} = require('../models');
const { Op } = require('sequelize');

/**
 * Initiate Stock Transfer
 */
exports.initiateTransfer = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      fromLocation,
      toLocation,
      items, // Array of { ingredientId, quantity, batchNumber, expiryDate }
      reason,
      notes
    } = req.body;

    // Validate input
    if (!fromLocation || !toLocation) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'From and to locations are required' 
      });
    }

    if (fromLocation === toLocation) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'From and to locations cannot be the same' 
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'At least one item is required for transfer' 
      });
    }

    // Generate transfer number
    const transferNumber = await StockTransfer.generateTransferNumber();

    // Create transfer header
    const stockTransfer = await StockTransfer.create({
      transferNumber,
      fromLocation,
      toLocation,
      status: 'pending',
      initiatedBy: req.user.id,
      reason,
      notes,
      transferDate: new Date()
    }, { transaction });

    const transferItems = [];
    const stockTransactions = [];

    // Process each item
    for (const item of items) {
      const { ingredientId, quantity, batchNumber, expiryDate, notes: itemNotes } = item;

      if (!ingredientId || !quantity || quantity <= 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Each item must have valid ingredient ID and quantity' 
        });
      }

      // Get ingredient
      const ingredient = await Ingredient.findByPk(ingredientId, { transaction });
      if (!ingredient) {
        await transaction.rollback();
        return res.status(404).json({ 
          error: `Ingredient with ID ${ingredientId} not found` 
        });
      }

      // Check if sufficient stock available
      if (parseFloat(ingredient.currentStock) < parseFloat(quantity)) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `Insufficient stock for ${ingredient.name}. Available: ${ingredient.currentStock}, Requested: ${quantity}` 
        });
      }

      // Calculate stock levels for outbound transaction
      const previousStock = parseFloat(ingredient.currentStock);
      const newStock = previousStock - parseFloat(quantity);

      // Generate transaction number for outbound
      const outboundTransactionNumber = await StockTransaction.generateTransactionNumber();

      // Create outbound stock transaction (deduct from source)
      const outboundTransaction = await StockTransaction.create({
        transactionNumber: outboundTransactionNumber,
        transactionType: 'transfer_out',
        ingredientId,
        quantity: -parseFloat(quantity),
        unit: ingredient.unit,
        previousStock,
        newStock,
        fromLocation,
        toLocation,
        referenceType: 'stock_transfer',
        referenceId: stockTransfer.id,
        referenceNumber: transferNumber,
        batchNumber,
        expiryDate,
        notes: itemNotes,
        status: 'completed',
        performedBy: req.user.id,
        transactionDate: new Date()
      }, { transaction });

      stockTransactions.push(outboundTransaction);

      // Update ingredient stock
      await ingredient.update({
        currentStock: newStock
      }, { transaction });

      // Create transfer item
      const transferItem = await StockTransferItem.create({
        transferId: stockTransfer.id,
        ingredientId,
        quantitySent: parseFloat(quantity),
        unit: ingredient.unit,
        unitCost: ingredient.unitCost,
        totalCost: parseFloat(quantity) * parseFloat(ingredient.unitCost),
        batchNumber,
        expiryDate,
        notes: itemNotes,
        stockTransactionOutId: outboundTransaction.id
      }, { transaction });

      transferItems.push(transferItem);
    }

    await transaction.commit();

    // Fetch complete transfer with items
    const completeTransfer = await StockTransfer.findByPk(stockTransfer.id, {
      include: [
        {
          model: StockTransferItem,
          as: 'items',
          include: [{ model: Ingredient, as: 'ingredient' }]
        },
        { model: User, as: 'initiator', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.status(201).json({
      message: 'Stock transfer initiated successfully',
      transfer: completeTransfer
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Initiate transfer error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate stock transfer',
      details: error.message 
    });
  }
};

/**
 * Receive Stock Transfer
 */
exports.receiveTransfer = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { transferId } = req.params;
    const { items } = req.body; // Array of { itemId, quantityReceived, damagedQuantity, damageReason }

    // Get transfer
    const stockTransfer = await StockTransfer.findByPk(transferId, {
      include: [{ model: StockTransferItem, as: 'items' }],
      transaction
    });

    if (!stockTransfer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Transfer not found' });
    }

    if (stockTransfer.status !== 'pending' && stockTransfer.status !== 'in_transit') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Transfer cannot be received. Current status: ${stockTransfer.status}` 
      });
    }

    // Process received items
    for (const receivedItem of items) {
      const { itemId, quantityReceived, damagedQuantity = 0, damageReason } = receivedItem;

      const transferItem = stockTransfer.items.find(item => item.id === itemId);
      if (!transferItem) {
        await transaction.rollback();
        return res.status(404).json({ 
          error: `Transfer item with ID ${itemId} not found` 
        });
      }

      // Get ingredient
      const ingredient = await Ingredient.findByPk(transferItem.ingredientId, { transaction });
      if (!ingredient) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Ingredient not found' });
      }

      // Validate quantities
      const qtyReceived = parseFloat(quantityReceived);
      const qtyDamaged = parseFloat(damagedQuantity);
      const qtySent = parseFloat(transferItem.quantitySent);

      if (qtyReceived + qtyDamaged > qtySent) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Received + damaged quantity cannot exceed sent quantity' 
        });
      }

      // Calculate new stock for inbound
      const previousStock = parseFloat(ingredient.currentStock);
      const newStock = previousStock + qtyReceived;

      // Generate transaction number for inbound
      const inboundTransactionNumber = await StockTransaction.generateTransactionNumber();

      // Create inbound stock transaction (add to destination)
      const inboundTransaction = await StockTransaction.create({
        transactionNumber: inboundTransactionNumber,
        transactionType: 'transfer_in',
        ingredientId: transferItem.ingredientId,
        quantity: qtyReceived,
        unit: transferItem.unit,
        previousStock,
        newStock,
        fromLocation: stockTransfer.fromLocation,
        toLocation: stockTransfer.toLocation,
        referenceType: 'stock_transfer',
        referenceId: stockTransfer.id,
        referenceNumber: stockTransfer.transferNumber,
        batchNumber: transferItem.batchNumber,
        expiryDate: transferItem.expiryDate,
        status: 'completed',
        performedBy: req.user.id,
        transactionDate: new Date()
      }, { transaction });

      // Update transfer item
      await transferItem.update({
        quantityReceived: qtyReceived,
        damagedQuantity: qtyDamaged,
        damageReason: qtyDamaged > 0 ? damageReason : null,
        stockTransactionInId: inboundTransaction.id
      }, { transaction });

      // Update ingredient stock
      await ingredient.update({
        currentStock: newStock
      }, { transaction });
    }

    // Update transfer status
    await stockTransfer.update({
      status: 'received',
      receivedBy: req.user.id,
      receivedAt: new Date()
    }, { transaction });

    await transaction.commit();

    // Fetch updated transfer
    const updatedTransfer = await StockTransfer.findByPk(transferId, {
      include: [
        {
          model: StockTransferItem,
          as: 'items',
          include: [{ model: Ingredient, as: 'ingredient' }]
        },
        { model: User, as: 'initiator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.json({
      message: 'Stock transfer received successfully',
      transfer: updatedTransfer
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Receive transfer error:', error);
    res.status(500).json({ 
      error: 'Failed to receive stock transfer',
      details: error.message 
    });
  }
};

/**
 * Get All Transfers
 */
exports.getAllTransfers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      fromLocation,
      toLocation,
      startDate,
      endDate
    } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (fromLocation) {
      where.fromLocation = {
        [Op.like]: `%${fromLocation}%`
      };
    }

    if (toLocation) {
      where.toLocation = {
        [Op.like]: `%${toLocation}%`
      };
    }

    if (startDate || endDate) {
      where.transferDate = {};
      if (startDate) {
        where.transferDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.transferDate[Op.lte] = new Date(endDate);
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StockTransfer.findAndCountAll({
      where,
      include: [
        {
          model: StockTransferItem,
          as: 'items',
          include: [{ 
            model: Ingredient, 
            as: 'ingredient',
            attributes: ['id', 'name', 'unit'] 
          }]
        },
        { model: User, as: 'initiator', attributes: ['id', 'username'] },
        { model: User, as: 'receiver', attributes: ['id', 'username'] }
      ],
      order: [['transferDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transfers: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve transfers',
      details: error.message 
    });
  }
};

/**
 * Get Single Transfer
 */
exports.getTransferById = async (req, res) => {
  try {
    const { transferId } = req.params;

    const transfer = await StockTransfer.findByPk(transferId, {
      include: [
        {
          model: StockTransferItem,
          as: 'items',
          include: [
            { model: Ingredient, as: 'ingredient' },
            { model: StockTransaction, as: 'outboundTransaction' },
            { model: StockTransaction, as: 'inboundTransaction' }
          ]
        },
        { model: User, as: 'initiator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'username', 'email'] }
      ]
    });

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.json({ transfer });

  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve transfer',
      details: error.message 
    });
  }
};

/**
 * Cancel Transfer
 */
exports.cancelTransfer = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { transferId } = req.params;
    const { reason } = req.body;

    const stockTransfer = await StockTransfer.findByPk(transferId, {
      include: [{ model: StockTransferItem, as: 'items' }],
      transaction
    });

    if (!stockTransfer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Transfer not found' });
    }

    if (stockTransfer.status === 'received' || stockTransfer.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Transfer cannot be cancelled. Current status: ${stockTransfer.status}` 
      });
    }

    // Reverse the outbound transactions (return stock to source)
    for (const item of stockTransfer.items) {
      const ingredient = await Ingredient.findByPk(item.ingredientId, { transaction });
      
      const previousStock = parseFloat(ingredient.currentStock);
      const newStock = previousStock + parseFloat(item.quantitySent);

      await ingredient.update({
        currentStock: newStock
      }, { transaction });

      // Create reversal transaction
      const reversalTransactionNumber = await StockTransaction.generateTransactionNumber();
      
      await StockTransaction.create({
        transactionNumber: reversalTransactionNumber,
        transactionType: 'adjustment',
        ingredientId: item.ingredientId,
        quantity: parseFloat(item.quantitySent),
        unit: item.unit,
        previousStock,
        newStock,
        reason: `Transfer cancellation: ${stockTransfer.transferNumber}. ${reason || ''}`,
        referenceType: 'transfer_cancellation',
        referenceId: stockTransfer.id,
        status: 'completed',
        performedBy: req.user.id,
        transactionDate: new Date()
      }, { transaction });
    }

    // Update transfer status
    await stockTransfer.update({
      status: 'cancelled',
      notes: `${stockTransfer.notes || ''}\nCancelled: ${reason || 'No reason provided'}`
    }, { transaction });

    await transaction.commit();

    res.json({
      message: 'Transfer cancelled and stock restored',
      transfer: stockTransfer
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Cancel transfer error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel transfer',
      details: error.message 
    });
  }
};

module.exports = exports;
