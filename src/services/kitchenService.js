const { Op } = require('sequelize');
const { KitchenOrder, KitchenStation, Sale, Product, MenuItem, MenuItemIngredient, Ingredient, MenuItemPortion, StockLocation, StockTransaction } = require('../models');
const XLSX = require('xlsx');
const fs = require('fs');

class KitchenService {
  /**
   * Create a kitchen order from a sale or as a standalone order
   * @param {Object} saleData - Sale data including items and routing information
   * @returns {Promise<Object>} - Created kitchen order
   */
  async createKitchenOrder(saleData) {
    try {
      const {
        saleId,
        items,
        orderType,
        tableNumber,
        tableId,
        priority,
        status,
        specialInstructions,
        customerName,
        customerPhone,
        customerEmail,
        kitchenStationId,
        paymentMethod,
        subtotal,
        tax,
        totalAmount
      } = saleData;

      // If saleId is provided, verify sale exists
      let sale = null;
      if (saleId) {
        sale = await Sale.findByPk(saleId);
        if (!sale) {
          throw new Error(`Sale with ID ${saleId} not found`);
        }
      }

      // Route items to appropriate stations
      const routedItems = await this.routeItemsToStations(items);

      // Calculate estimated preparation time
      const estimatedTime = await this.calculateEstimatedTime(routedItems);

      // Extract unique station IDs
      const assignedStations = [...new Set(routedItems.map(item => item.stationId).filter(Boolean))];

      // Generate kitchen order number
      const orderNumber = await this.generateOrderNumber();

      // Create kitchen order
      const kitchenOrder = await KitchenOrder.create({
        orderNumber,
        saleId: saleId || null,
        items: routedItems,
        orderType: orderType || sale?.orderType || 'takeaway',
        tableNumber: tableNumber || sale?.tableNumber || null,
        tableId: tableId || null,
        priority: priority || 'normal',
        status: status || 'unpaid', // Default to unpaid if no status provided
        estimatedTime,
        specialInstructions,
        customerName: customerName || sale?.customerName || 'Walk-in Customer',
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        assignedStations,
        kitchenStationId: kitchenStationId || null,
        paymentMethod: paymentMethod || null,
        subtotal: subtotal || null,
        tax: tax || null,
        totalAmount: totalAmount || null,
        isInventoryDeducted: saleData.isInventoryDeducted || false
      });

      return kitchenOrder;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Route items to appropriate kitchen stations
   * @param {Array} items - Array of sale items
   * @returns {Promise<Array>} - Items with station routing information
   */
  async routeItemsToStations(items) {
    const routedItems = [];

    console.log('Routing items to stations:', items.length, 'items');

    for (const item of items) {
      console.log('Processing item:', item);

      // Find product to determine category
      const productId = item.product || item.productId;
      console.log('Looking for product ID:', productId);

      let product = await Product.findByPk(productId);

      // If not found in Product, try fetching from MenuItem
      if (!product) {
        product = await MenuItem.findByPk(productId);
      }

      if (!product) {
        console.log('⚠ Item not found for ID:', productId);
        routedItems.push({
          ...item,
          productId: productId,
          productName: item.productName || item.name || 'Unknown Item',
          stationId: null,
          stationName: 'Unassigned',
          status: 'pending'
        });
        continue;
      }

      console.log('✓ Found product:', product.name, 'Category:', product.category);

      // Find station based on product category
      // MySQL uses JSON_CONTAINS instead of PostgreSQL's @> operator
      let station = null;

      if (product.category) {
        station = await KitchenStation.findOne({
          where: {
            isActive: true
          },
          order: [['priority', 'DESC']]
        });

        // Filter in JavaScript since MySQL JSON query syntax is complex
        const allStations = await KitchenStation.findAll({
          where: { isActive: true },
          order: [['priority', 'DESC']]
        });

        station = allStations.find(s => {
          const categories = s.productCategories || [];
          return categories.includes(product.category);
        });
      }

      console.log('Station found:', station ? station.name : 'None');

      routedItems.push({
        ...item,
        productId: product.id,
        productName: item.productName || product.name,
        category: product.category,
        stationId: station ? station.id : null,
        stationName: station ? station.name : 'Unassigned',
        stationCode: station ? station.code : null,
        status: 'pending'
      });
    }

    console.log('Routed items result:', routedItems.length, 'items');
    return routedItems;
  }

  /**
   * Calculate estimated preparation time based on items and stations
   * @param {Array} routedItems - Items with station information
   * @returns {Promise<Number>} - Estimated time in minutes
   */
  async calculateEstimatedTime(routedItems) {
    const stationIds = [...new Set(routedItems.map(item => item.stationId).filter(Boolean))];

    if (stationIds.length === 0) {
      return 15; // Default time if no stations assigned
    }

    const stations = await KitchenStation.findAll({
      where: {
        id: {
          [Op.in]: stationIds
        }
      }
    });

    // Use the maximum prep time among all stations (parallel preparation)
    const maxPrepTime = Math.max(...stations.map(s => s.averagePrepTime));

    // Add 2 minutes per item for complexity
    const complexityTime = Math.min(routedItems.length * 2, 10);

    return maxPrepTime + complexityTime;
  }

  /**
   * Generate unique kitchen order number
   * @returns {Promise<String>} - Generated order number
   */
  async generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const prefix = `KO-${year}${month}${day}`;

    const lastOrder = await KitchenOrder.findOne({
      where: {
        orderNumber: {
          [Op.like]: `${prefix}%`
        }
      },
      order: [['orderNumber', 'DESC']]
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Update kitchen order details
   * @param {Number} orderId - Kitchen order ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated kitchen order
   */
  async updateKitchenOrder(orderId, updateData) {
    try {
      const order = await KitchenOrder.findByPk(orderId);
      if (!order) {
        throw new Error(`Kitchen order with ID ${orderId} not found`);
      }

      const { items, specialInstructions, ...otherData } = updateData;

      if (items) {
        order.items = await this.routeItemsToStations(items);
        order.estimatedTime = await this.calculateEstimatedTime(order.items);
        order.assignedStations = [...new Set(order.items.map(item => item.stationId).filter(Boolean))];
      }

      if (specialInstructions !== undefined) {
        order.specialInstructions = specialInstructions;
      }

      // Update other fields
      Object.assign(order, otherData);

      await order.save();

      // If saleId exists, we might need to update it as well
      if (order.saleId) {
        const { Sale } = require('../models');
        await Sale.update({
          totalAmount: order.totalAmount,
          subtotal: order.subtotal,
          tax: order.tax,
          specialInstructions: order.specialInstructions,
          customerName: order.customerName,
          orderType: order.orderType
        }, {
          where: { id: order.saleId }
        });
      }

      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update kitchen order status
   * @param {Number} orderId - Kitchen order ID
   * @param {String} status - New status
   * @param {Number} userId - User ID performing the update
   * @returns {Promise<Object>} - Updated kitchen order
   */
  async updateOrderStatus(orderId, status, userId = null) {
    try {
      const order = await KitchenOrder.findByPk(orderId);

      if (!order) {
        throw new Error(`Kitchen order with ID ${orderId} not found`);
      }

      const updates = {
        status,
        statusUpdatedBy: userId,
        statusUpdatedAt: new Date()
      };

      // Update timestamps based on status
      if (status === 'preparing' && !order.startedAt) {
        updates.startedAt = new Date();
        // Deduct ingredients/products as soon as kitchen starts preparing
        // This ensures real-time inventory reflection for the recipe
        if (!order.isInventoryDeducted) {
          await this.deductIngredientsForCompletedOrder(order);
        }
      } else if (status === 'ready' && !order.readyAt) {
        updates.readyAt = new Date();
      } else if (status === 'completed' && !order.completedAt) {
        updates.completedAt = new Date();
        // Fallback deduction if it wasn't done during 'preparing'
        if (!order.isInventoryDeducted) {
          await this.deductIngredientsForCompletedOrder(order);
        }
      }

      await order.update(updates);

      // Sync status with related sale if saleId exists
      if (order.saleId) {
        const { Sale } = require('../models');
        const sale = await Sale.findByPk(order.saleId);

        if (sale) {
          // Map kitchen status to sale status
          const saleStatusMap = {
            'pending': 'pending',
            'preparing': 'preparing',
            'ready': 'ready',
            'completed': 'completed',
            'cancelled': 'voided' // Map cancelled kitchen order to voided sale
          };

          const newSaleStatus = saleStatusMap[status];
          if (newSaleStatus && sale.status !== newSaleStatus) {
            await sale.update({ status: newSaleStatus });
          }
        }
      }

      // Handle cancellation reversion
      if (status === 'cancelled') {
        const ingredientService = require('./ingredientService');
        if (order.isInventoryDeducted) {
          await ingredientService.revertDeductionForOrder('kitchen_order', order.id, userId);
          await order.update({ isInventoryDeducted: false });
        }
      }

      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update kitchen order with saleId after payment
   * @param {Number} orderId - Kitchen order ID
   * @param {Number} saleId - Sale ID to link
   * @param {String} status - Optional status to update
   * @returns {Promise<Object>} - Updated kitchen order
   */
  async linkSaleToOrder(orderId, saleId, status = 'pending') {
    try {
      const order = await KitchenOrder.findByPk(orderId);

      if (!order) {
        throw new Error(`Kitchen order with ID ${orderId} not found`);
      }

      await order.update({
        saleId: saleId,
        status: status
      });

      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get active kitchen orders
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of kitchen orders
   */
  async getActiveOrders(filters = {}) {
    try {
      const whereClause = {
        status: {
          [Op.in]: ['unpaid', 'pending', 'preparing', 'ready']
        }
      };

      // Use kitchenStationId for filtering (simpler and MySQL compatible)
      if (filters.stationId) {
        whereClause.kitchenStationId = filters.stationId;
      }

      if (filters.kitchenStationId) {
        whereClause.kitchenStationId = filters.kitchenStationId;
      }

      if (filters.orderType) {
        whereClause.orderType = filters.orderType;
      }

      if (filters.priority) {
        whereClause.priority = filters.priority;
      }

      const orders = await KitchenOrder.findAll({
        where: whereClause,
        include: [{
          model: Sale,
          as: 'sale',
          attributes: ['saleNumber', 'totalAmount', 'cashierName']
        }],
        order: [
          ['priority', 'DESC'],
          ['createdAt', 'ASC']
        ]
      });

      return orders;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get orders by station
   * @param {Number} stationId - Station ID
   * @returns {Promise<Array>} - Orders for the station
   */
  async getOrdersByStation(stationId) {
    try {
      const orders = await KitchenOrder.findAll({
        where: {
          kitchenStationId: stationId,
          status: {
            [Op.in]: ['pending', 'preparing', 'ready']
          }
        },
        include: [{
          model: Sale,
          as: 'sale',
          attributes: ['saleNumber', 'totalAmount']
        }],
        order: [
          ['priority', 'DESC'],
          ['createdAt', 'ASC']
        ]
      });

      // Filter items for this specific station
      const filteredOrders = orders.map(order => ({
        ...order.toJSON(),
        items: order.items.filter(item => item.stationId === stationId)
      }));

      return filteredOrders;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update item status within an order
   * @param {Number} orderId - Kitchen order ID
   * @param {Number} itemIndex - Index of the item in the items array
   * @param {String} status - New status for the item
   * @returns {Promise<Object>} - Updated kitchen order
   */
  async updateItemStatus(orderId, itemIndex, status) {
    try {
      const order = await KitchenOrder.findByPk(orderId);

      if (!order) {
        throw new Error(`Kitchen order with ID ${orderId} not found`);
      }

      const items = [...order.items];
      if (itemIndex < 0 || itemIndex >= items.length) {
        throw new Error(`Invalid item index ${itemIndex}`);
      }

      items[itemIndex].status = status;
      await order.update({ items });

      // Check if all items are ready
      const allReady = items.every(item => item.status === 'ready');
      if (allReady && order.status !== 'ready') {
        await this.updateOrderStatus(orderId, 'ready');
      }

      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get kitchen performance metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Performance metrics
   */
  async getKitchenMetrics(startDate, endDate) {
    try {
      const orders = await KitchenOrder.findAll({
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

      // Calculate average preparation time
      const completedWithTimes = orders.filter(o => o.startedAt && o.readyAt);
      const avgPrepTime = completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum, o) => {
          return sum + (new Date(o.readyAt) - new Date(o.startedAt)) / 60000;
        }, 0) / completedWithTimes.length
        : 0;

      // Orders by type
      const ordersByType = {
        'dine-in': orders.filter(o => o.orderType === 'dine-in').length,
        'takeaway': orders.filter(o => o.orderType === 'takeaway').length,
        'delivery': orders.filter(o => o.orderType === 'delivery').length
      };

      // Orders by priority
      const ordersByPriority = {
        'low': orders.filter(o => o.priority === 'low').length,
        'normal': orders.filter(o => o.priority === 'normal').length,
        'high': orders.filter(o => o.priority === 'high').length,
        'urgent': orders.filter(o => o.priority === 'urgent').length
      };

      return {
        totalOrders,
        completedOrders,
        cancelledOrders,
        avgPrepTime: Math.round(avgPrepTime * 10) / 10,
        ordersByType,
        ordersByPriority
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create multiple kitchen orders for different stations from a single sale
   * @param {Object} saleData - Sale data with items grouped by kitchen
   * @returns {Promise<Array>} - Array of created kitchen orders
   */
  async createMultipleKitchenOrders(saleData) {
    try {
      const { saleId, items, orderType, tableNumber, priority, specialInstructions, customerName, kitchenStationId, paymentMethod } = saleData;

      // Verify sale exists
      const sale = await Sale.findByPk(saleId);
      if (!sale) {
        throw new Error(`Sale with ID ${saleId} not found`);
      }

      // Group items by their kitchen station
      const itemsByKitchen = {};
      items.forEach(item => {
        const stationId = item.kitchenStationId || 'unassigned';
        if (!itemsByKitchen[stationId]) {
          itemsByKitchen[stationId] = [];
        }
        itemsByKitchen[stationId].push(item);
      });

      const createdOrders = [];

      // Create a kitchen order for each station
      for (const [stationId, stationItems] of Object.entries(itemsByKitchen)) {
        const orderNumber = await this.generateOrderNumber();
        const routedItems = await this.routeItemsToStations(stationItems);
        const estimatedTime = await this.calculateEstimatedTime(routedItems);
        const assignedStations = [...new Set(routedItems.map(item => item.stationId).filter(Boolean))];

        const kitchenOrder = await KitchenOrder.create({
          orderNumber,
          saleId,
          items: routedItems,
          orderType: orderType || sale.orderType || 'takeaway',
          tableNumber: tableNumber || sale.tableNumber,
          priority: priority || 'normal',
          status: 'pending',
          estimatedTime,
          specialInstructions,
          customerName: customerName || sale.customerName,
          assignedStations,
          kitchenStationId: stationId === 'unassigned' ? null : parseInt(stationId),
          paymentMethod: paymentMethod || sale.paymentMethod
        });

        createdOrders.push(kitchenOrder);
      }

      return createdOrders;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process recipe upload and create menu item
   * @param {Number} stationId - Kitchen Station ID
   * @param {Object} dishDetails - Details of the dish (name, price, etc.)
   * @param {Object} file - Uploaded file object
   * @returns {Promise<Object>} - Created menu item
   */
  async processRecipeUpload(stationId, dishDetails, file, userId = null) {
    console.log('[Recipe Upload START]');
    const { name, price, category, imageUrl, description, preparationTime, dailyTarget } = dishDetails;

    try {
      // 1. Validate Station
      const station = await KitchenStation.findByPk(stationId);
      if (!station) {
        const error = new Error('Kitchen Station not found');
        error.statusCode = 404;
        throw error;
      }

      const location = station.stockLocationId ? await StockLocation.findByPk(station.stockLocationId) : null;

      // Validate required fields
      console.log('[Recipe Upload Debug] Extracted Fields:', { name, price, category, preparationTime });
      if (!name || !price) {
        console.error('[Recipe Upload] Missing fields:', { name, price });
        const error = new Error(`Name and Price are required (Received: Name=${name}, Price=${price})`);
        error.statusCode = 400;
        throw error;
      }

      const parsedPrice = parseFloat(price);
      console.log('[Recipe Upload Debug] Parsed Price:', parsedPrice);
      if (isNaN(parsedPrice)) {
        console.error('[Recipe Upload] Invalid price:', price);
        const error = new Error(`Invalid price format: ${price}`);
        error.statusCode = 400;
        throw error;
      }

      console.log('[Recipe Upload Debug] Creating Menu Item...');
      const menuItem = await MenuItem.create({
        name,
        price: parsedPrice,
        category: category || 'mains',
        kitchenStationId: stationId,
        imageUrl: imageUrl || null,
        description: description || `Recipe uploaded for ${station.name}`,
        preparationTime: preparationTime ? parseInt(preparationTime) : 15,
        isActive: true,
        isAvailable: true,
        dailyTarget: (dailyTarget && !isNaN(parseInt(dailyTarget))) ? parseInt(dailyTarget) : 0
      });
      console.log('[Recipe Upload Debug] Menu Item Created:', menuItem.id);

      // 3. Process File
      let workbook;
      if (file.buffer) {
        workbook = XLSX.read(file.buffer, { type: 'buffer' });
      } else if (file.path) {
        if (!fs.existsSync(file.path)) {
          throw new Error(`File not found at path: ${file.path}`);
        }
        workbook = XLSX.readFile(file.path);
      } else {
        throw new Error('No file content found for processing');
      }

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel file contains no sheets');
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      // Expected columns: Ingredient, Quantity, Unit
      // Example row: { Ingredient: 'Rice', Quantity: 5, Unit: 'kg' }

      console.log(`[Recipe Upload Debug] Found ${data.length} rows in sheet`);

      const ingredientsToLink = [];

      for (const [index, row] of data.entries()) {
        console.log(`[Recipe Upload Debug] Processing row ${index + 1}:`, row);

        // Normalized key matching
        const rowKeys = Object.keys(row);
        const lKeys = rowKeys.map(k => k.toLowerCase().trim());

        // 1. Identify Ingredient Column
        const iColIdx = lKeys.findIndex(k =>
          ['ingredient', 'item', 'inventory item', 'ingredient name', 'component', 'material', 'product'].includes(k)
        );

        // 2. Identify Recipe Quantity Required (for the dish)
        const qColIdx = lKeys.findIndex(k =>
          ['recipe qty', 'req qty', 'amount', 'needed', 'usage', 'portion size', 'qty per dish', 'quantity', 'qty'].includes(k)
        );

        // 3. Identify Current Stock / Inventory level
        const sColIdx = lKeys.findIndex(k =>
          ['current qty', 'current quantity', 'stock', 'inventory', 'balance', 'on hand', 'available', 'stock level', 'quantity', 'qty'].includes(k)
        );

        const uColIdx = lKeys.findIndex(k => ['unit', 'type', 'measure', 'uom'].includes(k));

        // Finalize mapping with priority and fallback
        let finalRecipeQtyIdx = qColIdx;
        let finalStockIdx = sColIdx;

        // If no explicit recipe qty found, try generic quantity/qty columns
        if (finalRecipeQtyIdx === -1) {
          const genericIdx = lKeys.findIndex(k => ['quantity', 'qty'].includes(k));
          if (genericIdx !== -1) finalRecipeQtyIdx = genericIdx;
        }

        // If no explicit stock found, try generic quantity/qty columns (fallback)
        if (finalStockIdx === -1) {
          const genericIdx = lKeys.findIndex(k => ['quantity', 'qty'].includes(k));
          if (genericIdx !== -1) finalStockIdx = genericIdx;
        }

        const ingredientKey = iColIdx !== -1 ? rowKeys[iColIdx] : null;
        const recipeQtyKey = finalRecipeQtyIdx !== -1 ? rowKeys[finalRecipeQtyIdx] : null;

        // Only consider it a stock column if it's DIFFERENT from the recipe qty column
        // unless it's an explicit stock-related name
        let stockKey = null;
        if (finalStockIdx !== -1) {
          const potentialStockKey = rowKeys[finalStockIdx];
          // If it's a generic 'quantity' or 'qty' name, only use it as stock if it's NOT the same column as recipeQty
          const isGenericName = ['quantity', 'qty'].includes(potentialStockKey.toLowerCase().trim());
          if (!isGenericName || potentialStockKey !== recipeQtyKey) {
            stockKey = potentialStockKey;
          }
        }

        const unitKey = uColIdx !== -1 ? rowKeys[uColIdx] : null;

        if (!ingredientKey || !recipeQtyKey) {
          console.warn(`[Recipe Upload Debug] Row ${index + 1} is missing required columns (Ingredient/Quantity)`);
          continue;
        }

        const ingredientName = row[ingredientKey];
        const recipeQty = parseFloat(row[recipeQtyKey]);
        const unit = unitKey ? row[unitKey] : 'units';

        // NEW LOGIC: Calculate initial stock based on daily target if provided
        // OR use the stock column from Excel
        const targetMultiplier = (dailyTarget && !isNaN(parseInt(dailyTarget))) ? parseInt(dailyTarget) : 0;
        let initialStock = null;

        if (stockKey && !isNaN(parseFloat(row[stockKey]))) {
          initialStock = parseFloat(row[stockKey]);
        }

        // If target is set but no specific stock in Excel, calculate it automatically
        if (initialStock === null && targetMultiplier > 0) {
          initialStock = recipeQty * targetMultiplier;
          console.log(`[Recipe Upload] Auto-calculating stock for ${ingredientName}: ${recipeQty} * ${targetMultiplier} = ${initialStock}`);
        }

        if (!ingredientName || isNaN(recipeQty)) {
          console.warn(`[Recipe Upload Debug] Row ${index + 1} has invalid recipe data:`, { ingredientName, recipeQty });
          continue;
        }

        // Find or Create Ingredient
        console.log(`[Recipe Upload Debug] ${ingredientName}: RecipeQty=${recipeQty}, FinalStock=${initialStock}`);
        let ingredient = await Ingredient.findOne({
          where: {
            name: { [Op.like]: ingredientName },
            kitchenStationId: parseInt(stationId)
          }
        });

        if (!ingredient) {
          console.log(`[Recipe Upload Debug] Creating new ingredient: ${ingredientName}`);
          ingredient = await Ingredient.create({
            name: ingredientName,
            unit: unit,
            currentStock: initialStock !== null ? initialStock : 0,
            kitchenStationId: parseInt(stationId)
          });
        } else {
          console.log(`[Recipe Upload Debug] Found existing ingredient: ${ingredient.id}`);
          // Update existing ingredient stock
          if (initialStock !== null) {
            await ingredient.update({ currentStock: initialStock });
          }
        }

        // Handle Location-Based Stock if station has a location
        if (location && initialStock !== null && initialStock > 0) {
          try {
            console.log(`[Recipe Upload Debug] Generating transaction number for ${ingredientName}`);
            const transactionNumber = await StockTransaction.generateTransactionNumber();

            const txData = {
              transactionNumber,
              transactionType: 'opening_balance',
              ingredientId: ingredient.id,
              quantity: initialStock,
              unit: unit,
              previousStock: 0,
              newStock: initialStock,
              toLocation: location.locationName,
              status: 'completed',
              reason: targetMultiplier > 0 ? `Calculated from Target (${targetMultiplier} units)` : 'Excel Recipe Upload',
              performedBy: userId || 1,
              transactionDate: new Date()
            };
            console.log(`[Recipe Upload Debug] Creating transaction with data:`, txData);

            await StockTransaction.create(txData);
            console.log(`[Recipe Upload Debug] Created stock transaction for ${ingredientName}`);
          } catch (txError) {
            console.error(`[Recipe Upload ERROR] Transaction failed for ${ingredientName}:`, txError.message);
          }
        }

        ingredientsToLink.push({
          menuItemId: menuItem.id,
          ingredientId: ingredient.id,
          quantity: recipeQty,
          unit: unit,
          portionId: null,
          productId: null
        });
      }

      // 4. Create MenuItemIngredient links
      if (ingredientsToLink.length > 0) {
        console.log(`[Recipe Upload Debug] Creating ${ingredientsToLink.length} recipe links via bulkCreate...`);
        await MenuItemIngredient.bulkCreate(ingredientsToLink, {
          fields: ['menuItemId', 'ingredientId', 'quantity', 'unit', 'portionId', 'productId']
        });
      }

      return await MenuItem.findByPk(menuItem.id, {
        include: [{
          model: MenuItemIngredient,
          as: 'recipe', // Correct alias from associations
          include: [{ model: Ingredient, as: 'ingredient' }]
        }]
      });

    } catch (error) {
      console.error('Recipe Upload Error:', error);
      throw error;
    } finally {
      // Cleanup uploaded file
      if (file && file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', cleanupError);
        }
      }
    }
  }

  /**
   * Deduct ingredients or products for a completed kitchen order
   * @param {Object} order - Kitchen order object
   * @param {Object} transaction - Sequelize transaction
   */
  async deductIngredientsForCompletedOrder(order, transaction = null) {
    if (order.isInventoryDeducted) {
      console.log(`Order ${order.id} already has ingredients deducted.`);
      return;
    }

    const ingredientService = require('./ingredientService');
    const { KitchenStation } = require('../models');

    try {
      // Get kitchen station to find stock location
      const station = await KitchenStation.findByPk(order.kitchenStationId);
      const stockLocationId = station ? station.stockLocationId : null;

      // Group items in order to deduct
      // Note: order.items structure should have menuItemId or productId
      for (const item of order.items) {
        const menuItemId = item.menuItemId || item.productId;
        if (!menuItemId) continue;

        const result = await ingredientService.deductIngredientsForOrder(
          menuItemId,
          item.quantity || 1,
          null, // saleId
          order.statusUpdatedBy || 1,
          stockLocationId
        );

        if (!result.success) {
          console.error(`Deduction failed for item ${menuItemId} in order ${order.id}: ${result.message}`);
          // We don't throw error here to avoid blocking completion, but we log it
        }
      }

      await order.update({ isInventoryDeducted: true }, { transaction });
    } catch (error) {
      console.error(`Error in deductIngredientsForCompletedOrder:`, error);
    }
  }
}

module.exports = new KitchenService();
