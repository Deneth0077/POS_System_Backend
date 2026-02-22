const Table = require('../models/Table');
const Sale = require('../models/Sale');
const { Op } = require('sequelize');

/**
 * @desc    Create a new table
 * @route   POST /api/tables
 * @access  Private (Admin/Manager)
 */
exports.createTable = async (req, res, next) => {
  try {
    const { tableNumber, capacity, location, notes } = req.body;

    // Check if table number already exists
    const existingTable = await Table.findOne({ where: { tableNumber } });
    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: 'Table number already exists'
      });
    }

    const table = await Table.create({
      tableNumber,
      capacity: capacity || 4,
      location,
      notes,
      status: 'available'
    });

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tables
 * @route   GET /api/tables
 * @access  Private
 */
exports.getAllTables = async (req, res, next) => {
  try {
    const { status, location, isActive } = req.query;

    const where = {};
    if (status) where.status = status;
    if (location) where.location = location;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const tables = await Table.findAll({
      where,
      order: [['tableNumber', 'ASC']],
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });

    res.json({
      success: true,
      count: tables.length,
      data: tables
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get table by ID
 * @route   GET /api/tables/:id
 * @access  Private
 */
exports.getTableById = async (req, res, next) => {
  try {
    const table = await Table.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update table
 * @route   PUT /api/tables/:id
 * @access  Private (Admin/Manager)
 */
exports.updateTable = async (req, res, next) => {
  try {
    const { tableNumber, capacity, location, status, isActive, notes } = req.body;

    const table = await Table.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // If updating table number, check for duplicates
    if (tableNumber && tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({ where: { tableNumber } });
      if (existingTable) {
        return res.status(400).json({
          success: false,
          message: 'Table number already exists'
        });
      }
    }

    // Update fields
    if (tableNumber) table.tableNumber = tableNumber;
    if (capacity) table.capacity = capacity;
    if (location !== undefined) table.location = location;
    if (status) table.status = status;
    if (isActive !== undefined) table.isActive = isActive;
    if (notes !== undefined) table.notes = notes;

    await table.save();

    res.json({
      success: true,
      message: 'Table updated successfully',
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete table
 * @route   DELETE /api/tables/:id
 * @access  Private (Admin)
 */
exports.deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // Check if table has active orders
    const activeOrders = await Sale.count({
      where: {
        tableId: req.params.id,
        status: { [Op.ne]: 'completed' }
      }
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete table with active orders'
      });
    }

    await table.destroy();

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign order to table
 * @route   POST /api/tables/:id/assign
 * @access  Private
 */
exports.assignOrderToTable = async (req, res, next) => {
  try {
    const { saleId } = req.body;
    const tableId = req.params.id;

    const table = await Table.findByPk(tableId);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    if (!table.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Table is not active'
      });
    }

    if (table.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        message: 'Table is under maintenance'
      });
    }

    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update sale with table information
    sale.tableId = tableId;
    sale.tableNumber = table.tableNumber;
    sale.orderType = 'dine-in';
    await sale.save();

    // Update table status to occupied
    if (table.status === 'available') {
      table.status = 'occupied';
      await table.save();
    }

    res.json({
      success: true,
      message: 'Order assigned to table successfully',
      data: {
        sale,
        table
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Release table (mark as available)
 * @route   POST /api/tables/:id/release
 * @access  Private
 */
exports.releaseTable = async (req, res, next) => {
  try {
    const table = await Table.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // Check for active orders
    const activeOrders = await Sale.count({
      where: {
        tableId: req.params.id,
        status: { [Op.in]: ['pending', 'in-progress'] }
      }
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot release table. ${activeOrders} active order(s) still assigned.`
      });
    }

    table.status = 'available';
    await table.save();

    res.json({
      success: true,
      message: 'Table released successfully',
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get table's current orders
 * @route   GET /api/tables/:id/orders
 * @access  Private
 */
exports.getTableOrders = async (req, res, next) => {
  try {
    const table = await Table.findByPk(req.params.id);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    const orders = await Sale.findAll({
      where: { tableId: req.params.id },
      order: [['saleDate', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      count: orders.length,
      data: {
        table,
        orders
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available tables
 * @route   GET /api/tables/status/available
 * @access  Private
 */
exports.getAvailableTables = async (req, res, next) => {
  try {
    const { capacity, location } = req.query;

    const where = {
      status: 'available',
      isActive: true
    };

    if (capacity) {
      where.capacity = { [Op.gte]: parseInt(capacity) };
    }

    if (location) {
      where.location = location;
    }

    const tables = await Table.findAll({
      where,
      order: [['tableNumber', 'ASC']],
      attributes: { exclude: ['createdAt', 'updatedAt', 'notes'] }
    });

    res.json({
      success: true,
      count: tables.length,
      data: tables
    });
  } catch (error) {
    next(error);
  }
};
