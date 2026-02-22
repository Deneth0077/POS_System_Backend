const { Op } = require('sequelize');
const { Sale, Product, InventoryBatch, User, KitchenOrder, KitchenStation, MenuItem } = require('../models');
const vatService = require('./vatService');
const kitchenService = require('./kitchenService');
const ingredientService = require('./ingredientService');

class SalesService {
  /**
   * Create a new sale with automatic VAT calculation
   * @param {Object} saleData - Sale data including items, cashier info
   * @returns {Promise<Object>} - Created sale object with kitchen order
   */
  async createSale(saleData) {
    try {
      console.log('=== SALES SERVICE - createSale ===');

      const { items, cashierId, cashierName, paymentMethod, amountPaid, offlineId, orderType, tableId, tableNumber, customerName, specialInstructions, kitchenStationId } = saleData;

      if (!items || !Array.isArray(items) || items.length === 0) {
        const error = new Error('Sale must contain at least one item');
        error.statusCode = 400;
        throw error;
      }

      // Validate all products/menu items exist before processing
      const productIds = items.map(item => item.product);
      const foundProductIds = [];

      // Check in Products
      const products = await Product.findAll({
        where: { id: productIds }
      });
      foundProductIds.push(...products.map(p => p.id));

      // Check in MenuItems for any IDs not found in Products
      const missingIds = productIds.filter(id => !foundProductIds.includes(id));
      if (missingIds.length > 0) {
        const menuItems = await MenuItem.findAll({
          where: { id: missingIds }
        });
        foundProductIds.push(...menuItems.map(mi => mi.id));
      }

      const totalMissingIds = productIds.filter(id => !foundProductIds.includes(id));

      if (totalMissingIds.length > 0) {
        const error = new Error(`The following products or menu items do not exist: ${totalMissingIds.join(', ')}. Please refresh the product list and try again.`);
        error.statusCode = 400;
        throw error;
      }

      // Calculate VAT for entire bill
      const billCalculation = await vatService.calculateBillVAT(items);

      // Pre-fetch Kitchen Station locations if needed
      const stationIds = new Set(billCalculation.items.map(item => item.kitchenStationId).filter(Boolean));
      const stationLocationMap = new Map();
      if (stationIds.size > 0) {
        const stations = await KitchenStation.findAll({
          where: { id: Array.from(stationIds) },
          attributes: ['id', 'stockLocationId']
        });
        stations.forEach(s => {
          if (s.stockLocationId) {
            stationLocationMap.set(s.id, s.stockLocationId);
          }
        });
      }

      // Update inventory/ingredients for each item
      for (const item of billCalculation.items) {
        // Immediate deduction for ALL items (including kitchen items)

        if (item.itemType === 'product' && item.batchNumber) {
          await this.updateInventory(item.product, item.batchNumber, item.quantity);
        } else if (item.itemType === 'menu-item') {
          // Determine stock location
          let stockLocationId = null;
          if (item.kitchenStationId && stationLocationMap.has(item.kitchenStationId)) {
            stockLocationId = stationLocationMap.get(item.kitchenStationId);
          }

          const deductionResult = await ingredientService.deductIngredientsForOrder(
            item.product,
            item.quantity,
            null,
            cashierId,
            stockLocationId
          );

          if (!deductionResult.success) {
            if (deductionResult.message === 'No recipe found for this menu item') {
              console.warn(`Skipping ingredient deduction for ${item.productName}: No recipe found.`);
            } else {
              // For kitchen orders, we might want to allow order even if stock is low?
              // But user asked to deduct. If deduction fails due to insufficient stock, 
              // usually we should block or warn. 
              // Current logic throws Error.
              throw new Error(`Ingredient deduction failed for ${item.productName}: ${deductionResult.message}`);
            }
          }
        }
      }

      // Generate sale number
      const saleNumber = await this.generateSaleNumber();

      // Calculate change
      const changeGiven = amountPaid - billCalculation.totalAmount;

      // Create sale record
      const sale = await Sale.create({
        saleNumber,
        items: billCalculation.items,
        subtotal: billCalculation.subtotal,
        vatAmount: billCalculation.vatAmount,
        vatRate: billCalculation.vatRate,
        totalAmount: billCalculation.totalAmount,
        paymentMethod: paymentMethod || 'cash',
        amountPaid,
        changeGiven: changeGiven > 0 ? changeGiven : 0,
        cashierId,
        cashierName,
        offlineId: offlineId || null,
        isSynced: offlineId ? false : true,
        saleDate: new Date(),
        orderType: orderType || 'takeaway',
        tableId: tableId || null,
        tableNumber: tableNumber || null,
        kitchenStationId: kitchenStationId || null,
        status: 'pending'
      });

      // Automatically create kitchen order(s) or link existing one
      try {
        if (saleData.kitchenOrderId) {
          // If we have an existing kitchen order (e.g. from Payment Pending page)
          // Link it to the sale and update status
          await kitchenService.linkSaleToOrder(saleData.kitchenOrderId, sale.id, 'pending');
          await sale.update({ status: 'preparing' });

          const kitchenOrder = await KitchenOrder.findByPk(saleData.kitchenOrderId);
          if (kitchenOrder) {
            await kitchenOrder.update({ isInventoryDeducted: true });
          }

          return {
            ...sale.toJSON(),
            kitchenOrderId: kitchenOrder.id,
            kitchenOrderNumber: kitchenOrder.orderNumber
          };
        }

        const kitchenStations = new Set(billCalculation.items.map(item => item.kitchenStationId).filter(Boolean));

        if (kitchenStations.size > 1) {
          const kitchenOrders = await kitchenService.createMultipleKitchenOrders({
            saleId: sale.id,
            items: billCalculation.items,
            orderType: orderType || 'takeaway',
            tableNumber: tableNumber || null,
            priority: saleData.priority || 'normal',
            specialInstructions: specialInstructions || null,
            customerName: customerName || null,
            kitchenStationId: kitchenStationId || null,
            paymentMethod: paymentMethod || 'cash'
          });

          await sale.update({ status: 'preparing' });

          return {
            ...sale.toJSON(),
            kitchenOrders: kitchenOrders.map(ko => ({
              id: ko.id,
              orderNumber: ko.orderNumber,
              kitchenStationId: ko.kitchenStationId
            })),
            isInventoryDeducted: true
          };
        } else {
          const kitchenOrder = await kitchenService.createKitchenOrder({
            saleId: sale.id,
            items: billCalculation.items,
            orderType: orderType || 'takeaway',
            tableNumber: tableNumber || null,
            priority: saleData.priority || 'normal',
            specialInstructions: specialInstructions || null,
            customerName: customerName || null,
            kitchenStationId: kitchenStationId || (Array.from(kitchenStations)[0]) || null,
            paymentMethod: paymentMethod || 'cash',
            isInventoryDeducted: true
          });

          await sale.update({ status: 'preparing' });

          return {
            ...sale.toJSON(),
            kitchenOrderId: kitchenOrder.id,
            kitchenOrderNumber: kitchenOrder.orderNumber
          };
        }
      } catch (kitchenError) {
        console.error('Error creating kitchen order(s):', kitchenError);
        return sale;
      }
    } catch (error) {
      console.error('Error in salesService.createSale:', error);
      throw error;
    }
  }

  /**
   * Update inventory after a sale
   */
  async updateInventory(productId, batchNumber, quantity) {
    try {
      let batch;

      if (batchNumber) {
        batch = await InventoryBatch.findOne({
          where: {
            productId: productId,
            batchNumber: batchNumber
          }
        });
      } else {
        // Find the oldest batch with quantity
        batch = await InventoryBatch.findOne({
          where: {
            productId: productId,
            quantity: { [Op.gt]: 0 }
          },
          order: [['expiryDate', 'ASC'], ['createdAt', 'ASC']]
        });
      }

      if (!batch) {
        const error = new Error(`No available batch found for product ${productId}${batchNumber ? ` with batch number ${batchNumber}` : ''}`);
        error.statusCode = 400;
        throw error;
      }

      if (batch.quantity < quantity) {
        // If one batch is not enough, we could recursively deduct from next batches
        // But for now, let's just use what's available or throw
        if (batch.quantity > 0) {
          const remaining = quantity - batch.quantity;
          batch.quantity = 0;
          await batch.save();
          return this.updateInventory(productId, null, remaining);
        }
        const error = new Error(`Insufficient quantity in stock for product ${productId}. Requested: ${quantity}`);
        error.statusCode = 400;
        throw error;
      }

      batch.quantity -= quantity;
      await batch.save();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate unique sale number
   */
  async generateSaleNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const prefix = `SALE-${year}${month}${day}`;

    const lastSale = await Sale.findOne({
      where: {
        saleNumber: {
          [Op.like]: `${prefix}%`
        }
      },
      order: [['saleNumber', 'DESC']]
    });

    let sequence = 1;
    if (lastSale) {
      const lastSequence = parseInt(lastSale.saleNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Get sales by date range
   */
  async getSalesByDateRange(startDate, endDate, orderType = null) {
    try {
      const whereClause = {
        saleDate: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (orderType) {
        whereClause.orderType = orderType;
      }

      const sales = await Sale.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'cashier',
            attributes: ['username', 'fullName']
          },
          {
            model: KitchenOrder,
            as: 'kitchenOrders',
            required: false,
            attributes: ['id', 'orderNumber', 'status', 'priority', 'customerName', 'specialInstructions', 'kitchenStationId'],
            include: [
              {
                model: KitchenStation,
                as: 'kitchenStation',
                attributes: ['id', 'name', 'code', 'color', 'icon']
              }
            ]
          }
        ],
        order: [['saleDate', 'DESC']]
      });

      return sales;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get sales report with totals
   */
  async getSalesReport(startDate, endDate) {
    try {
      const sales = await this.getSalesByDateRange(startDate, endDate);

      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
      const totalVAT = sales.reduce((sum, sale) => sum + parseFloat(sale.vatAmount), 0);
      const totalSubtotal = sales.reduce((sum, sale) => sum + parseFloat(sale.subtotal), 0);

      const orderTypeBreakdown = {
        'dine-in': { count: 0, revenue: 0 },
        'takeaway': { count: 0, revenue: 0 },
        'delivery': { count: 0, revenue: 0 }
      };

      sales.forEach(sale => {
        const orderType = sale.orderType || 'takeaway';
        if (orderTypeBreakdown[orderType]) {
          orderTypeBreakdown[orderType].count += 1;
          orderTypeBreakdown[orderType].revenue += parseFloat(sale.totalAmount);
        }
      });

      return {
        totalSales,
        totalRevenue,
        totalVAT,
        totalSubtotal,
        orderTypeBreakdown,
        sales
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SalesService();
