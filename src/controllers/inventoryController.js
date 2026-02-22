const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const IngredientTransaction = require('../models/IngredientTransaction');
const StockAlert = require('../models/StockAlert');
const MenuItemIngredient = require('../models/MenuItemIngredient');
const MenuItem = require('../models/MenuItem');
const Sale = require('../models/Sale');
const InventoryCategory = require('../models/InventoryCategory');
const KitchenStation = require('../models/KitchenStation');
const StockLocation = require('../models/StockLocation');
const StockTransaction = require('../models/StockTransaction');
const StockTransferItem = require('../models/StockTransferItem');
const DamagedStock = require('../models/DamagedStock');
const StockReturn = require('../models/StockReturn');
const StockReconciliationItem = require('../models/StockReconciliationItem');
const ingredientService = require('../services/ingredientService');

// @desc    Get all inventory batches
// @route   GET /api/inventory
// @access  Private
exports.getInventoryBatches = async (req, res, next) => {
  try {
    const { productId, isExpired, isExpiringSoon } = req.query;

    const where = {};
    if (productId) where.productId = productId;
    if (isExpired !== undefined) where.isExpired = isExpired === 'true';

    const batches = await InventoryBatch.findAll({
      where,
      include: [{
        model: Product,
        as: 'product',
        attributes: ['name', 'sku']
      }],
      order: [['expiryDate', 'ASC']]
    });

    // Filter for expiring soon if requested
    let filteredBatches = batches;
    if (isExpiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      filteredBatches = batches.filter(batch =>
        batch.expiryDate &&
        batch.expiryDate <= thirtyDaysFromNow &&
        batch.expiryDate > new Date()
      );
    }

    res.status(200).json({
      success: true,
      count: filteredBatches.length,
      data: filteredBatches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inventory batch
// @route   GET /api/inventory/:id
// @access  Private
exports.getInventoryBatchById = async (req, res, next) => {
  try {
    const batch = await InventoryBatch.findByPk(req.params.id, {
      include: [{
        model: Product,
        as: 'product',
        attributes: ['name', 'sku']
      }]
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Inventory batch not found'
      });
    }

    res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create inventory batch
// @route   POST /api/inventory
// @access  Private (Manager, Admin)
exports.createInventoryBatch = async (req, res, next) => {
  try {
    const batch = await InventoryBatch.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Inventory batch created successfully',
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inventory batch
// @route   PUT /api/inventory/:id
// @access  Private (Manager, Admin)
exports.updateInventoryBatch = async (req, res, next) => {
  try {
    const batch = await InventoryBatch.findByPk(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Inventory batch not found'
      });
    }

    await batch.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Inventory batch updated successfully',
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete inventory batch
// @route   DELETE /api/inventory/:id
// @access  Private (Admin)
exports.deleteInventoryBatch = async (req, res, next) => {
  try {
    const batch = await InventoryBatch.findByPk(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Inventory batch not found'
      });
    }

    await batch.destroy();

    res.status(200).json({
      success: true,
      message: 'Inventory batch deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==================== INGREDIENT MANAGEMENT ====================

// @desc    Get all ingredients
// @route   GET /api/inventory/ingredients
// @access  Private
exports.getIngredients = async (req, res, next) => {
  try {
    const {
      category,
      categoryId,
      kitchenStationId,
      isActive,
      lowStock,
      search
    } = req.query;

    const where = {};

    // Legacy category filter (string-based)
    if (category) where.category = category;

    // New category filter (ID-based)
    if (categoryId) where.categoryId = categoryId;

    // Kitchen station filter
    if (kitchenStationId) where.kitchenStationId = kitchenStationId;

    if (isActive !== undefined) where.isActive = isActive === 'true';

    // Search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { supplier: { [Op.like]: `%${search}%` } }
      ];
    }

    const include = [
      {
        model: InventoryCategory,
        as: 'inventoryCategory',
        attributes: ['id', 'name', 'code', 'icon', 'color']
      },
      {
        model: KitchenStation,
        as: 'kitchenStation',
        attributes: ['id', 'name', 'code', 'color', 'icon']
      }
    ];

    const ingredients = await Ingredient.findAll({
      where,
      include,
      order: [['name', 'ASC']]
    });

    // Filter for low stock if requested
    let filteredIngredients = ingredients;
    if (lowStock === 'true') {
      filteredIngredients = ingredients.filter(ing => ing.isLowStock());
    }

    res.status(200).json({
      success: true,
      count: filteredIngredients.length,
      data: filteredIngredients
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ingredient
// @route   GET /api/inventory/ingredients/:id
// @access  Private
exports.getIngredientById = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findByPk(req.params.id, {
      include: [{
        model: MenuItemIngredient,
        as: 'usedIn',
        include: [{
          model: MenuItem,
          as: 'menuItem',
          attributes: ['id', 'name', 'category']
        }]
      }]
    });

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: ingredient
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create ingredient
// @route   POST /api/inventory/ingredients
// @access  Private (Manager, Admin)
exports.createIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Ingredient created successfully',
      data: ingredient
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ingredient
// @route   PUT /api/inventory/ingredients/:id
// @access  Private (Manager, Admin)
exports.updateIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findByPk(req.params.id);

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    await ingredient.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Ingredient updated successfully',
      data: ingredient
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ingredient stock
// @route   PUT /api/inventory/ingredients/:id/stock
// @access  Private (Manager, Admin)
exports.updateIngredientStock = async (req, res, next) => {
  try {
    const { quantity, transactionType, reason, notes } = req.body;
    const ingredientId = req.params.id;

    const ingredient = await Ingredient.findByPk(ingredientId);

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    const previousStock = ingredient.currentStock;
    const newStock = previousStock + parseFloat(quantity);

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Resulting stock cannot be negative'
      });
    }

    await ingredient.update({ currentStock: newStock });

    const transaction = await IngredientTransaction.create({
      ingredientId,
      transactionType: transactionType || 'adjustment',
      quantity: parseFloat(quantity),
      unit: ingredient.unit,
      previousStock,
      newStock,
      unitCost: ingredient.unitCost,
      totalCost: (ingredient.unitCost || 0) * Math.abs(parseFloat(quantity)),
      reason,
      notes,
      performedBy: req.user.id,
      transactionDate: new Date()
    });

    // Handle Location-based Stock Transaction
    const { locationId, locationName } = req.body;
    let finalLocationName = locationName;
    if (locationId) {
      const { StockLocation } = require('../models');
      const location = await StockLocation.findByPk(locationId);
      if (location) finalLocationName = location.locationName;
    }

    if (finalLocationName) {
      const transactionNumber = await StockTransaction.generateTransactionNumber();
      await StockTransaction.create({
        transactionNumber,
        transactionType: parseFloat(quantity) > 0 ? 'transfer_in' : 'usage',
        ingredientId,
        quantity: parseFloat(quantity),
        unit: ingredient.unit,
        previousStock,
        newStock,
        toLocation: parseFloat(quantity) > 0 ? finalLocationName : null,
        fromLocation: parseFloat(quantity) < 0 ? finalLocationName : null,
        status: 'completed',
        reason: reason || 'Manual adjustment via Inventory',
        performedBy: req.user.id,
        transactionDate: new Date()
      });
    }

    // Check for Low Stock
    if (newStock <= ingredient.reorderLevel) {
      const { createNotification } = require('./notificationController');
      await createNotification({
        title: 'Low Stock Alert',
        message: `${ingredient.name} is low on stock (${newStock} ${ingredient.unit}).`,
        type: 'WARNING',
        targetRole: 'Manager'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        ingredient,
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete ingredient
// @route   DELETE /api/inventory/ingredients/:id
// @access  Private (Admin)
exports.deleteIngredient = async (req, res, next) => {
  console.log(`[Delete Ingredient Request] ID: ${req.params.id}, Force: ${req.query.force}`);
  let t;
  try {
    t = await sequelize.transaction();

    const ingredient = await Ingredient.findByPk(req.params.id, { transaction: t });

    if (!ingredient) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    // 1. Check usages in recipes (Menu Items)
    const recipeUsages = await MenuItemIngredient.findAll({
      where: { ingredientId: req.params.id },
      include: [{
        model: MenuItem,
        as: 'menuItem',
        attributes: ['name']
      }],
      transaction: t
    });

    // 2. Check usages in Stock Transactions
    const stockTransCount = await StockTransaction.count({
      where: { ingredientId: req.params.id },
      transaction: t
    });

    // 3. Check usages in Ingredient Transactions
    const ingTransCount = await IngredientTransaction.count({
      where: { ingredientId: req.params.id },
      transaction: t
    });

    // 4. Check active Stock Alerts
    const alertCount = await StockAlert.count({
      where: { ingredientId: req.params.id },
      transaction: t
    });

    // 5. Check usages in Stock Transfer Items
    const transferCount = await StockTransferItem.count({
      where: { ingredientId: req.params.id },
      transaction: t
    });

    // 6. Check Damaged Stock Records
    const damagedCount = await DamagedStock.count({
      where: { ingredientId: req.params.id },
      transaction: t
    });

    // 7. Check Stock Returns
    const returnCount = await StockReturn.count({
      where: { ingredientId: req.params.id },
      transaction: t
    });

    // 8. Check Stock Reconciliation Items
    const reconCount = await StockReconciliationItem.count({
      where: { ingredientId: req.params.id },
      transaction: t
    });

    const hasDependencies = recipeUsages.length > 0 || stockTransCount > 0 || ingTransCount > 0 ||
      alertCount > 0 || transferCount > 0 || damagedCount > 0 ||
      returnCount > 0 || reconCount > 0;

    console.log(`[Delete Ingredient Debug] ID: ${req.params.id}, Has Dependencies: ${hasDependencies}`);

    if (hasDependencies) {
      console.log(`[Delete Ingredient Debug] Counts - Recipes: ${recipeUsages.length}, StockTrans: ${stockTransCount}, IngTrans: ${ingTransCount}, Alerts: ${alertCount}, Transfers: ${transferCount}, Damaged: ${damagedCount}, Returns: ${returnCount}, Recons: ${reconCount}`);

      // Check if force delete is requested
      if (req.query.force === 'true') {
        console.log(`[Delete Ingredient Debug] Starting Force Delete for ID: ${req.params.id}`);
        try {
          // Force Delete: Remove all dependencies in correct order (dependents first)
          await MenuItemIngredient.destroy({ where: { ingredientId: req.params.id }, transaction: t });
          await StockAlert.destroy({ where: { ingredientId: req.params.id }, transaction: t });
          await StockTransferItem.destroy({ where: { ingredientId: req.params.id }, transaction: t });
          await DamagedStock.destroy({ where: { ingredientId: req.params.id }, transaction: t });
          await StockReturn.destroy({ where: { ingredientId: req.params.id }, transaction: t });
          await StockReconciliationItem.destroy({ where: { ingredientId: req.params.id }, transaction: t });
          await StockTransaction.destroy({ where: { ingredientId: req.params.id }, transaction: t });
          await IngredientTransaction.destroy({ where: { ingredientId: req.params.id }, transaction: t });
          console.log(`[Delete Ingredient Debug] Force Delete dependencies removed for ID: ${req.params.id}`);
        } catch (forceErr) {
          console.error(`[Delete Ingredient Debug] Force Delete dependencies FAILED:`, forceErr);
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Force delete failed: ${forceErr.message}. This is likely due to a complex database dependency.`,
            error: forceErr.name
          });
        }
      } else {
        await t.rollback();
        // Construct detailed dependency message
        const dependencies = [];
        if (recipeUsages.length > 0) {
          const menuItems = [...new Set(recipeUsages.map(u => u.menuItem?.name).filter(Boolean))];
          dependencies.push(`Recipes (${menuItems.length}): ${menuItems.join(', ')}`);
        }
        if (stockTransCount > 0) dependencies.push(`${stockTransCount} Stock Transactions`);
        if (ingTransCount > 0) dependencies.push(`${ingTransCount} Ingredient History Records`);
        if (alertCount > 0) dependencies.push(`${alertCount} Stock Alerts`);
        if (transferCount > 0) dependencies.push(`${transferCount} Stock Transfer Records`);
        if (damagedCount > 0) dependencies.push(`${damagedCount} Damaged Stock Records`);
        if (returnCount > 0) dependencies.push(`${returnCount} Stock Return Records`);
        if (reconCount > 0) dependencies.push(`${reconCount} Stock Reconciliation Records`);

        return res.status(400).json({
          success: false,
          message: `Cannot delete ingredient. It is used in: ${dependencies.join('; ')}`,
          forceRequired: true
        });
      }
    }

    await ingredient.destroy({ transaction: t });

    await t.commit();

    res.status(200).json({
      success: true,
      message: 'Ingredient deleted successfully'
    });
  } catch (error) {
    if (t) await t.rollback();
    next(error);
  }
};

// @desc    Record wastage
// @route   POST /api/inventory/wastage
// @access  Private (Manager, Admin)
exports.recordWastage = async (req, res, next) => {
  try {
    const { ingredientId, quantity, reason } = req.body;

    const result = await ingredientService.recordWastage(
      ingredientId,
      parseFloat(quantity),
      reason,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      message: 'Wastage recorded successfully',
      data: result.wastageRecord
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get stock alerts
// @route   GET /api/inventory/alerts
// @access  Private
exports.getStockAlerts = async (req, res, next) => {
  try {
    const { alertType, severity, isResolved } = req.query;

    const where = {};
    if (alertType) where.alertType = alertType;
    if (severity) where.severity = severity;
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';

    const alerts = await StockAlert.findAll({
      where,
      include: [{
        model: Ingredient,
        as: 'ingredient',
        attributes: ['id', 'name', 'unit', 'currentStock', 'reorderLevel']
      }],
      order: [
        ['severity', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge alert
// @route   PATCH /api/inventory/alerts/:id/acknowledge
// @access  Private (Manager, Admin)
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await StockAlert.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await alert.update({
      isAcknowledged: true,
      acknowledgedBy: req.user.id,
      acknowledgedAt: new Date(),
      notes: req.body.notes || alert.notes
    });

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve alert
// @route   PATCH /api/inventory/alerts/:id/resolve
// @access  Private (Manager, Admin)
exports.resolveAlert = async (req, res, next) => {
  try {
    const alert = await StockAlert.findByPk(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await alert.update({
      isResolved: true,
      resolvedBy: req.user.id,
      resolvedAt: new Date(),
      notes: req.body.notes || alert.notes
    });

    res.status(200).json({
      success: true,
      message: 'Alert resolved',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Perform reconciliation
// @route   POST /api/inventory/reconciliation
// @access  Private (Manager, Admin)
exports.performReconciliation = async (req, res, next) => {
  try {
    const result = await ingredientService.performDailyReconciliation(req.user.id);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ==================== REPORTS ====================

// @desc    Daily usage report
// @route   GET /api/inventory/reports/daily-usage
// @access  Private
exports.getDailyUsageReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    const transactions = await IngredientTransaction.findAll({
      where: {
        transactionType: 'usage',
        transactionDate: {
          [Op.between]: [start, end]
        }
      },
      include: [{
        model: Ingredient,
        as: 'ingredient',
        attributes: ['id', 'name', 'unit', 'category']
      }],
      order: [['transactionDate', 'DESC']]
    });

    const aggregated = transactions.reduce((acc, transaction) => {
      const ingId = transaction.ingredientId;
      if (!acc[ingId]) {
        acc[ingId] = {
          ingredientId: ingId,
          ingredientName: transaction.ingredient.name,
          category: transaction.ingredient.category,
          unit: transaction.ingredient.unit,
          totalUsed: 0,
          totalCost: 0,
          transactionCount: 0
        };
      }
      acc[ingId].totalUsed += Math.abs(parseFloat(transaction.quantity));
      acc[ingId].totalCost += parseFloat(transaction.totalCost || 0);
      acc[ingId].transactionCount += 1;
      return acc;
    }, {});

    const report = Object.values(aggregated);

    res.status(200).json({
      success: true,
      period: { startDate: start, endDate: end },
      totalIngredients: report.length,
      totalCost: report.reduce((sum, item) => sum + item.totalCost, 0),
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Wastage report
// @route   GET /api/inventory/reports/wastage
// @access  Private
exports.getWastageReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    const transactions = await IngredientTransaction.findAll({
      where: {
        transactionType: 'wastage',
        transactionDate: {
          [Op.between]: [start, end]
        }
      },
      include: [{
        model: Ingredient,
        as: 'ingredient',
        attributes: ['id', 'name', 'unit', 'category']
      }],
      order: [['transactionDate', 'DESC']]
    });

    const aggregated = transactions.reduce((acc, transaction) => {
      const ingId = transaction.ingredientId;
      if (!acc[ingId]) {
        acc[ingId] = {
          ingredientId: ingId,
          ingredientName: transaction.ingredient.name,
          category: transaction.ingredient.category,
          unit: transaction.ingredient.unit,
          totalWasted: 0,
          totalCost: 0,
          reasons: {}
        };
      }
      acc[ingId].totalWasted += Math.abs(parseFloat(transaction.quantity));
      acc[ingId].totalCost += parseFloat(transaction.totalCost || 0);

      const reason = transaction.reason || 'Unknown';
      if (!acc[ingId].reasons[reason]) {
        acc[ingId].reasons[reason] = 0;
      }
      acc[ingId].reasons[reason] += Math.abs(parseFloat(transaction.quantity));

      return acc;
    }, {});

    const report = Object.values(aggregated);

    res.status(200).json({
      success: true,
      period: { startDate: start, endDate: end },
      totalIngredients: report.length,
      totalWasteCost: report.reduce((sum, item) => sum + item.totalCost, 0),
      totalTransactions: transactions.length,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Popular items report
// @route   GET /api/inventory/reports/popular-items
// @access  Private
exports.getPopularItemsReport = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date(new Date() - 30 * 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    const transactions = await IngredientTransaction.findAll({
      where: {
        transactionType: 'usage',
        transactionDate: {
          [Op.between]: [start, end]
        },
        referenceType: 'sale'
      },
      include: [{
        model: Ingredient,
        as: 'ingredient',
        attributes: ['id', 'name', 'unit', 'category']
      }],
      attributes: [
        'ingredientId',
        [sequelize.fn('COUNT', sequelize.col('IngredientTransaction.id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.fn('ABS', sequelize.col('quantity'))), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('totalCost')), 'totalRevenue']
      ],
      group: ['ingredientId', 'ingredient.id', 'ingredient.name', 'ingredient.unit', 'ingredient.category'],
      order: [[sequelize.fn('COUNT', sequelize.col('IngredientTransaction.id')), 'DESC']],
      limit: parseInt(limit),
      subQuery: false
    });

    res.status(200).json({
      success: true,
      period: { startDate: start, endDate: end },
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all stock locations
// @route   GET /api/inventory/locations
// @access  Private
exports.getLocations = async (req, res, next) => {
  try {
    const locations = await StockLocation.findAll();
    res.status(200).json(locations);
  } catch (error) {
    next(error);
  }
};
