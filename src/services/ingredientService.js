const { sequelize } = require('../config/database');
const Ingredient = require('../models/Ingredient');
const MenuItemIngredient = require('../models/MenuItemIngredient');
const IngredientTransaction = require('../models/IngredientTransaction');
const StockAlert = require('../models/StockAlert');

/**
 * Service for managing ingredient stock and deductions
 */
class IngredientService {
  /**
   * Deduct ingredients for a menu item order
   * @param {number} menuItemId - ID of the menu item
   * @param {number} quantity - Quantity of menu items ordered
   * @param {number} saleId - Reference sale ID
   * @param {number} userId - User performing the transaction
   * @param {number} stockLocationId - Optional ID of the stock location for station-specific tracking
   * @returns {Promise<Object>} - Deduction result
   */
  async deductIngredientsForOrder(menuItemId, quantity, saleId, userId, stockLocationId = null) {
    const { StockLocation, StockTransaction } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      // Get stock location if provided
      let location = null;
      if (stockLocationId) {
        location = await StockLocation.findByPk(stockLocationId, { transaction });
      }
      // Get all ingredients for this menu item
      const recipe = await MenuItemIngredient.findAll({
        where: { menuItemId },
        include: [{
          model: Ingredient,
          as: 'ingredient'
        }]
      });

      if (!recipe || recipe.length === 0) {
        await transaction.rollback();
        return {
          success: false,
          message: 'No recipe found for this menu item'
        };
      }

      const deductions = [];
      const insufficientStock = [];

      // Check stock availability and perform deductions
      for (const item of recipe) {
        const ingredient = item.ingredient;
        const requiredQuantity = parseFloat(item.quantity) * quantity;

        // Check if sufficient stock
        if (ingredient.currentStock < requiredQuantity) {
          insufficientStock.push({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            required: requiredQuantity,
            available: ingredient.currentStock,
            unit: item.unit
          });
          continue;
        }

        // Deduct stock
        const previousStock = ingredient.currentStock;
        const newStock = previousStock - requiredQuantity;

        await ingredient.update({
          currentStock: newStock
        }, { transaction });

        // Record transaction
        const ingredientTransaction = await IngredientTransaction.create({
          ingredientId: ingredient.id,
          transactionType: 'usage',
          quantity: -requiredQuantity,
          unit: item.unit,
          previousStock,
          newStock,
          unitCost: ingredient.unitCost,
          totalCost: ingredient.unitCost * requiredQuantity,
          referenceType: 'sale',
          referenceId: saleId,
          performedBy: userId,
          transactionDate: new Date()
        }, { transaction });

        // Record stock transaction for location-specific tracking if location is provided
        if (location) {
          const transactionNumber = await StockTransaction.generateTransactionNumber();
          await StockTransaction.create({
            transactionNumber,
            transactionType: 'usage',
            ingredientId: ingredient.id,
            quantity: -requiredQuantity,
            unit: item.unit,
            previousStock,
            newStock,
            unitCost: ingredient.unitCost,
            totalCost: ingredient.unitCost * requiredQuantity,
            fromLocation: location.locationName,
            referenceType: 'sale',
            referenceId: saleId,
            performedBy: userId,
            status: 'completed'
          }, { transaction });
        }

        deductions.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          deducted: requiredQuantity,
          unit: item.unit,
          previousStock,
          newStock,
          transactionId: ingredientTransaction.id
        });

        // Check if stock alert should be generated
        await this.checkAndGenerateAlert(ingredient.id, transaction);
      }

      if (insufficientStock.length > 0) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Insufficient stock for some ingredients',
          insufficientStock
        };
      }

      await transaction.commit();

      return {
        success: true,
        message: 'Ingredients deducted successfully',
        deductions
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Revert ingredient deductions (e.g., when order/sale is cancelled)
   * @param {string} referenceType - 'sale' or 'kitchen_order'
   * @param {number} referenceId - ID of the reference
   * @param {number} userId - User performing the reversion
   * @returns {Promise<Object>} - Reversion result
   */
  async revertDeductionForOrder(referenceType, referenceId, userId) {
    const { StockLocation, StockTransaction } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      // Find all transactions for this reference
      const transactions = await IngredientTransaction.findAll({
        where: {
          referenceType,
          referenceId,
          transactionType: 'usage'
        },
        include: [{ model: Ingredient, as: 'ingredient' }],
        transaction
      });

      if (transactions.length === 0) {
        await transaction.rollback();
        return { success: true, message: 'No deductions found to revert' };
      }

      const reversions = [];

      for (const usage of transactions) {
        const ingredient = usage.ingredient;
        const revertQuantity = Math.abs(parseFloat(usage.quantity));

        // Put back stock
        const previousStock = ingredient.currentStock;
        const newStock = previousStock + revertQuantity;

        await ingredient.update({ currentStock: newStock }, { transaction });

        // Record reversion transaction
        await IngredientTransaction.create({
          ingredientId: ingredient.id,
          transactionType: 'reversion',
          quantity: revertQuantity,
          unit: usage.unit,
          previousStock,
          newStock,
          unitCost: ingredient.unitCost,
          totalCost: (ingredient.unitCost || 0) * revertQuantity,
          referenceType,
          referenceId,
          performedBy: userId,
          transactionDate: new Date(),
          notes: `Reversion of transaction ${usage.id}`
        }, { transaction });

        // Also revert location-specific stock if it was a location-based transaction
        const stockTx = await StockTransaction.findOne({
          where: {
            referenceType,
            referenceId,
            transactionType: 'usage',
            ingredientId: ingredient.id
          },
          transaction
        });

        if (stockTx) {
          const transactionNumber = await StockTransaction.generateTransactionNumber();
          await StockTransaction.create({
            transactionNumber,
            transactionType: 'transfer_in', // Or a new type like 'reversion'
            ingredientId: ingredient.id,
            quantity: revertQuantity,
            unit: usage.unit,
            previousStock,
            newStock,
            toLocation: stockTx.fromLocation, // Put back to where it came from
            referenceType,
            referenceId,
            performedBy: userId,
            status: 'completed',
            reason: `Reversion of order ${referenceId}`
          }, { transaction });
        }

        reversions.push({
          ingredientId: ingredient.id,
          reverted: revertQuantity
        });

        // Check alerts (might resolve out-of-stock)
        await this.checkAndGenerateAlert(ingredient.id, transaction);
      }

      await transaction.commit();
      return { success: true, message: 'Deductions reverted successfully', reversions };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Record ingredient wastage
   * @param {number} ingredientId - ID of the ingredient
   * @param {number} quantity - Quantity wasted
   * @param {string} reason - Reason for wastage
   * @param {number} userId - User recording the wastage
   * @returns {Promise<Object>} - Wastage record
   */
  async recordWastage(ingredientId, quantity, reason, userId) {
    const transaction = await sequelize.transaction();

    try {
      const ingredient = await Ingredient.findByPk(ingredientId);

      if (!ingredient) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Ingredient not found'
        };
      }

      if (ingredient.currentStock < quantity) {
        await transaction.rollback();
        return {
          success: false,
          message: 'Wastage quantity exceeds current stock'
        };
      }

      const previousStock = ingredient.currentStock;
      const newStock = previousStock - quantity;

      await ingredient.update({
        currentStock: newStock
      }, { transaction });

      const wastageRecord = await IngredientTransaction.create({
        ingredientId,
        transactionType: 'wastage',
        quantity: -quantity,
        unit: ingredient.unit,
        previousStock,
        newStock,
        unitCost: ingredient.unitCost,
        totalCost: ingredient.unitCost * quantity,
        reason,
        performedBy: userId,
        transactionDate: new Date()
      }, { transaction });

      await this.checkAndGenerateAlert(ingredientId, transaction);

      await transaction.commit();

      return {
        success: true,
        message: 'Wastage recorded successfully',
        wastageRecord
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check and generate stock alerts
   * @param {number} ingredientId - ID of the ingredient
   * @param {Object} transaction - Sequelize transaction
   */
  async checkAndGenerateAlert(ingredientId, transaction) {
    const ingredient = await Ingredient.findByPk(ingredientId, { transaction });

    if (!ingredient) return;

    const existingAlert = await StockAlert.findOne({
      where: {
        ingredientId,
        isResolved: false
      },
      transaction
    });

    // Check for low stock
    if (ingredient.currentStock <= ingredient.reorderLevel && ingredient.currentStock > 0) {
      if (!existingAlert || existingAlert.alertType !== 'low_stock') {
        await StockAlert.create({
          ingredientId,
          alertType: 'low_stock',
          currentStock: ingredient.currentStock,
          reorderLevel: ingredient.reorderLevel,
          severity: ingredient.currentStock <= ingredient.reorderLevel * 0.5 ? 'high' : 'medium',
          message: `${ingredient.name} is running low. Current stock: ${ingredient.currentStock} ${ingredient.unit}. Reorder level: ${ingredient.reorderLevel} ${ingredient.unit}`
        }, { transaction });
      }
    }

    // Check for out of stock
    if (ingredient.currentStock <= 0) {
      if (!existingAlert || existingAlert.alertType !== 'out_of_stock') {
        await StockAlert.create({
          ingredientId,
          alertType: 'out_of_stock',
          currentStock: ingredient.currentStock,
          reorderLevel: ingredient.reorderLevel,
          severity: 'critical',
          message: `${ingredient.name} is out of stock!`
        }, { transaction });
      }
    }

    // Check for expiring soon
    if (ingredient.expiryDate) {
      const daysUntilExpiry = Math.ceil((ingredient.expiryDate - new Date()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        if (!existingAlert || existingAlert.alertType !== 'expiring_soon') {
          await StockAlert.create({
            ingredientId,
            alertType: 'expiring_soon',
            currentStock: ingredient.currentStock,
            severity: daysUntilExpiry <= 3 ? 'high' : 'medium',
            message: `${ingredient.name} expires in ${daysUntilExpiry} days`
          }, { transaction });
        }
      }

      if (daysUntilExpiry <= 0) {
        if (!existingAlert || existingAlert.alertType !== 'expired') {
          await StockAlert.create({
            ingredientId,
            alertType: 'expired',
            currentStock: ingredient.currentStock,
            severity: 'critical',
            message: `${ingredient.name} has expired!`
          }, { transaction });
        }
      }
    }
  }

  /**
   * Perform daily stock reconciliation
   * @param {number} userId - User performing reconciliation
   * @returns {Promise<Object>} - Reconciliation result
   */
  async performDailyReconciliation(userId) {
    const transaction = await sequelize.transaction();

    try {
      const ingredients = await Ingredient.findAll({
        where: { isActive: true },
        transaction
      });

      const alerts = [];

      for (const ingredient of ingredients) {
        await this.checkAndGenerateAlert(ingredient.id, transaction);

        if (ingredient.isLowStock()) {
          alerts.push({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            currentStock: ingredient.currentStock,
            reorderLevel: ingredient.reorderLevel,
            status: 'low_stock'
          });
        }
      }

      await transaction.commit();

      return {
        success: true,
        message: 'Daily reconciliation completed',
        totalIngredients: ingredients.length,
        lowStockItems: alerts.length,
        alerts
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new IngredientService();
