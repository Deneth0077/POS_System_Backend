const kitchenService = require('../services/kitchenService');
const { KitchenOrder, KitchenStation, MenuItem, MenuItemIngredient, Ingredient, StockLocation, StockTransaction, MenuItemPortion, Sale } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a kitchen order
// @route   POST /api/kitchen/orders
// @access  Private (Cashier, Manager, Admin)
exports.createKitchenOrder = async (req, res, next) => {
  try {
    const orderData = req.body;
    const kitchenOrder = await kitchenService.createKitchenOrder(orderData);

    // Create Notification for Kitchen Staff
    const { createNotification } = require('./notificationController');
    await createNotification({
      title: 'New Kitchen Order',
      message: `Order #${kitchenOrder.id} has been placed.`,
      type: 'INFO',
      targetRole: 'Kitchen Staff'
    });

    res.status(201).json({
      success: true,
      message: 'Kitchen order created successfully',
      data: kitchenOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active kitchen orders
// @route   GET /api/kitchen/orders
// @access  Private (Manager, Admin, Kitchen Staff)
exports.getActiveOrders = async (req, res, next) => {
  try {
    const filters = {
      stationId: req.query.stationId ? parseInt(req.query.stationId) : null,
      kitchenStationId: req.query.kitchenStationId ? parseInt(req.query.kitchenStationId) : null,
      orderType: req.query.orderType,
      priority: req.query.priority
    };

    // Remove null/undefined filters
    Object.keys(filters).forEach(key => !filters[key] && delete filters[key]);

    const orders = await kitchenService.getActiveOrders(filters);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get completed kitchen orders
// @route   GET /api/kitchen/orders/completed
// @access  Private (Manager, Admin, Kitchen Staff)
exports.getCompletedOrders = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.kitchenStationId) filters.kitchenStationId = parseInt(req.query.kitchenStationId);
    if (req.query.stationId) filters.kitchenStationId = parseInt(req.query.stationId);

    const whereClause = {
      status: 'completed',
      ...filters
    };

    if (req.query.startDate && req.query.endDate) {
      whereClause.updatedAt = {
        [Op.between]: [new Date(req.query.startDate), new Date(new Date(req.query.endDate).setHours(23, 59, 59))]
      };
    }

    const queryOptions = {
      where: whereClause,
      include: [{
        model: Sale,
        as: 'sale',
        attributes: ['saleNumber', 'totalAmount', 'cashierName']
      }],
      order: [['updatedAt', 'DESC']]
    };

    if (!req.query.startDate) {
      queryOptions.limit = 50;
    }

    const orders = await KitchenOrder.findAll(queryOptions);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get kitchen order by ID
// @route   GET /api/kitchen/orders/:id
// @access  Private (Manager, Admin, Kitchen Staff)
exports.getKitchenOrderById = async (req, res, next) => {
  try {
    const order = await KitchenOrder.findByPk(req.params.id, {
      include: ['sale']
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Kitchen order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update kitchen order
// @route   PUT /api/kitchen/orders/:id
// @access  Private (Manager, Admin, Cashier)
exports.updateKitchenOrder = async (req, res, next) => {
  try {
    const order = await kitchenService.updateKitchenOrder(parseInt(req.params.id), req.body);

    res.status(200).json({
      success: true,
      message: 'Kitchen order updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update kitchen order status
// @route   PATCH /api/kitchen/orders/:id/status
// @access  Private (Manager, Admin, Kitchen Staff)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await kitchenService.updateOrderStatus(parseInt(req.params.id), status, req.user.id);

    // Notify Cashier/Waiter/Manager about status change
    const { createNotification } = require('./notificationController');
    await createNotification({
      title: 'Order Status Update',
      message: `Order #${order.id} is now ${status}.`,
      type: status === 'ready' ? 'SUCCESS' : 'INFO',
      targetRole: 'Cashier' // Or 'All' if waiters exist
    });

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Link sale to kitchen order after payment
// @route   PATCH /api/kitchen/orders/:id/link-sale
// @access  Private (Manager, Admin, Cashier)
exports.linkSaleToOrder = async (req, res, next) => {
  try {
    const { saleId, status } = req.body;
    const order = await kitchenService.linkSaleToOrder(
      parseInt(req.params.id),
      parseInt(saleId),
      status
    );

    res.status(200).json({
      success: true,
      message: 'Sale linked to kitchen order successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item status in kitchen order
// @route   PATCH /api/kitchen/orders/:id/items/:itemIndex/status
// @access  Private (Manager, Admin, Kitchen Staff)
exports.updateItemStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const orderId = parseInt(req.params.id);
    const itemIndex = parseInt(req.params.itemIndex);

    const order = await kitchenService.updateItemStatus(orderId, itemIndex, status);

    res.status(200).json({
      success: true,
      message: 'Item status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel kitchen order with reason
// @route   PATCH /api/kitchen/orders/:id/cancel
// @access  Private (Manager, Admin, Kitchen Staff)
exports.cancelKitchenOrder = async (req, res, next) => {
  try {
    const { cancellationReason, cancellationNote } = req.body;

    if (!cancellationReason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const order = await KitchenOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Kitchen order not found'
      });
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed or already cancelled order'
      });
    }

    await order.update({
      status: 'cancelled',
      cancellationReason,
      cancellationNote: cancellationNote || null,
      statusUpdatedBy: req.user.id,
      statusUpdatedAt: new Date()
    });

    // Revert stock if it was deducted
    if (order.isInventoryDeducted) {
      const ingredientService = require('../services/ingredientService');
      await ingredientService.revertDeductionForOrder('kitchen_order', order.id, req.user.id);
      await order.update({ isInventoryDeducted: false });
    }

    // Also update the Sale record if saleId exists
    if (order.saleId) {
      const { Sale } = require('../models');
      await Sale.update(
        {
          status: 'cancelled',
          cancellationReason,
          cancellationNote: cancellationNote || null,
          statusUpdatedBy: req.user.id,
          statusUpdatedAt: new Date()
        },
        { where: { id: order.saleId } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Kitchen order cancelled successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Notify delay for kitchen order
// @route   PATCH /api/kitchen/orders/:id/delay
// @access  Private (Manager, Admin, Kitchen Staff)
exports.notifyDelay = async (req, res, next) => {
  try {
    const { delayReason, estimatedDelay, preparationNotes } = req.body;

    if (!delayReason) {
      return res.status(400).json({
        success: false,
        message: 'Delay reason is required'
      });
    }

    const order = await KitchenOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Kitchen order not found'
      });
    }

    // Update order with delay information
    const updateData = {
      preparationNotes: preparationNotes || delayReason,
      statusUpdatedBy: req.user.id,
      statusUpdatedAt: new Date()
    };

    // If estimated delay provided, update estimated time
    if (estimatedDelay) {
      updateData.estimatedTime = (order.estimatedTime || 0) + parseInt(estimatedDelay);
    }

    await order.update(updateData);

    // Also update the Sale record if saleId exists
    if (order.saleId) {
      const { Sale } = require('../models');
      await Sale.update(
        {
          preparationNotes: preparationNotes || delayReason,
          statusUpdatedBy: req.user.id,
          statusUpdatedAt: new Date()
        },
        { where: { id: order.saleId } }
      );
    }

    // TODO: Send notification to management/customer about delay
    // This could integrate with a notification service

    res.status(200).json({
      success: true,
      message: 'Delay notification sent successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset delay notification for order
// @route   PATCH /api/kitchen/orders/:id/reset-delay
// @access  Private (Manager, Admin, Kitchen Staff)
exports.resetDelay = async (req, res, next) => {
  try {
    const order = await KitchenOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Kitchen order not found'
      });
    }

    // Clear delay information
    await order.update({
      preparationNotes: null,
      statusUpdatedBy: req.user.id,
      statusUpdatedAt: new Date()
    });

    // Also clear the Sale record if saleId exists
    if (order.saleId) {
      const { Sale } = require('../models');
      await Sale.update(
        {
          preparationNotes: null,
          statusUpdatedBy: req.user.id,
          statusUpdatedAt: new Date()
        },
        { where: { id: order.saleId } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Delay notification reset successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get orders by station
// @route   GET /api/kitchen/stations/:id/orders
// @access  Private (Manager, Admin, Kitchen Staff)
exports.getOrdersByStation = async (req, res, next) => {
  try {
    const stationId = parseInt(req.params.id);
    const orders = await kitchenService.getOrdersByStation(stationId);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get kitchen performance metrics
// @route   GET /api/kitchen/metrics
// @access  Private (Manager, Admin)
exports.getKitchenMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const metrics = await kitchenService.getKitchenMetrics(
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
};

// KITCHEN STATION CONTROLLERS

// @desc    Create a kitchen station
// @route   POST /api/kitchen/stations
// @access  Private (Admin, Manager)
exports.createStation = async (req, res, next) => {
  try {
    const station = await KitchenStation.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Kitchen station created successfully',
      data: station
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all kitchen stations
// @route   GET /api/kitchen/stations
// @access  Private (All authenticated users)
exports.getStations = async (req, res, next) => {
  try {
    const whereClause = {};

    if (req.query.isActive !== undefined) {
      whereClause.isActive = req.query.isActive === 'true';
    }

    const stations = await KitchenStation.findAll({
      where: whereClause,
      order: [['priority', 'DESC'], ['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: stations.length,
      data: stations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get station by ID
// @route   GET /api/kitchen/stations/:id
// @access  Private (All authenticated users)
exports.getStationById = async (req, res, next) => {
  try {
    // Disable caching to ensure fresh data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const station = await KitchenStation.findByPk(req.params.id);

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Kitchen station not found'
      });
    }

    res.status(200).json({
      success: true,
      data: station
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update kitchen station
// @route   PUT /api/kitchen/stations/:id
// @access  Private (Admin, Manager)
exports.updateStation = async (req, res, next) => {
  try {
    const station = await KitchenStation.findByPk(req.params.id);

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Kitchen station not found'
      });
    }

    await station.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Kitchen station updated successfully',
      data: station
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete kitchen station
// @route   DELETE /api/kitchen/stations/:id
// @access  Private (Admin)
exports.deleteStation = async (req, res, next) => {
  try {
    const station = await KitchenStation.findByPk(req.params.id);

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Kitchen station not found'
      });
    }

    await station.destroy();

    res.status(200).json({
      success: true,
      message: 'Kitchen station deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};



// @desc    Upload recipe file (Excel/CSV) for a station
// @route   POST /api/kitchen/stations/:id/recipe
// @access  Private (Manager, Admin)
exports.uploadRecipe = async (req, res, next) => {
  try {
    console.log('[Upload Debug] Body:', req.body);
    console.log('[Upload Debug] File:', req.file ? { originalname: req.file.originalname, size: req.file.size } : 'Missing');

    if (!req.file) {
      console.error('[Upload Debug] No file received. Body keys:', Object.keys(req.body));
      console.error('[Upload Debug] Headers:', req.headers['content-type']);
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        debug: {
          bodyKeys: Object.keys(req.body),
          contentType: req.headers['content-type']
        }
      });
    }

    const stationId = parseInt(req.params.id);
    const dishDetails = req.body; // name, price, category, etc.

    const menuItem = await kitchenService.processRecipeUpload(stationId, dishDetails, req.file, req.user?.id);

    res.status(201).json({
      success: true,
      message: 'Recipe uploaded and menu item created successfully',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get station dashboard stats (Inventory & Production)
// @route   GET /api/kitchen/stations/:id/dashboard
// @access  Private (Manager, Admin, Kitchen Staff)
exports.getStationDashboard = async (req, res, next) => {
  try {
    // Disable caching for dashboard to ensure real-time stock data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const stationId = req.params.id;
    const station = await KitchenStation.findByPk(stationId);

    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    // 1. Get all menu items assigned to this station with recipes (both portions and direct)
    const fullMenuItems = await MenuItem.findAll({
      where: { kitchenStationId: stationId, isActive: true },
      include: [
        {
          model: MenuItemPortion,
          as: 'portions',
          where: { isActive: true },
          required: false,
          include: [{
            model: MenuItemIngredient,
            as: 'ingredients',
            include: [{ model: Ingredient, as: 'ingredient' }]
          }]
        },
        {
          model: MenuItemIngredient,
          as: 'recipe', // Direct ingredients
          include: [{ model: Ingredient, as: 'ingredient' }]
        }
      ]
    });

    // 2. Map unique ingredients and calculate stock
    const ingredientMap = new Map(); // Map<IngredientId, IngredientModel>
    const stockMap = new Map(); // Map<IngredientId, Quantity>

    // Helper to add ingredient
    const addIngredient = (ri) => {
      if (ri.ingredient) {
        if (!ingredientMap.has(ri.ingredientId)) {
          ingredientMap.set(ri.ingredientId, ri.ingredient);
          stockMap.set(ri.ingredientId, 0); // Default 0
        }
      }
    };

    fullMenuItems.forEach(item => {
      // Check portions
      if (item.portions) {
        item.portions.forEach(p => {
          if (p.ingredients) p.ingredients.forEach(addIngredient);
        });
      }
      // Check direct recipe
      if (item.recipe) {
        item.recipe.forEach(addIngredient);
      }
    });

    // Also fetch ingredients directly assigned to this station
    const stationIngredients = await Ingredient.findAll({
      where: { kitchenStationId: stationId }
    });

    console.log(`[Dashboard Debug] Station: ${stationId}, Recipe Ingredients: ${ingredientMap.size}, Direct Ingredients: ${stationIngredients.length}`);

    stationIngredients.forEach(ing => {
      const id = ing.id;
      if (!ingredientMap.has(id)) {
        ingredientMap.set(id, ing);
        stockMap.set(id, 0);
      }
    });

    const ingredientIds = Array.from(ingredientMap.keys());
    const location = station.stockLocationId ? await StockLocation.findByPk(station.stockLocationId) : null;

    // 3. Get Stock Levels
    if (location && ingredientIds.length > 0) {
      // Location-based stock
      const locationName = location.locationName;
      const stockResults = await StockTransaction.findAll({
        attributes: [
          'ingredientId',
          [sequelize.fn('SUM',
            sequelize.literal('CASE WHEN to_location = ' + sequelize.escape(locationName) + ' THEN quantity ELSE -quantity END')
          ), 'locationStock']
        ],
        where: {
          ingredientId: { [Op.in]: ingredientIds },
          status: 'completed',
          [Op.or]: [{ toLocation: locationName }, { fromLocation: locationName }]
        },
        group: ['ingredientId']
      });

      stockResults.forEach(res => {
        stockMap.set(res.ingredientId, parseFloat(res.getDataValue('locationStock')));
      });
    } else if (ingredientIds.length > 0) {
      // Global stock fallback
      const ingredients = await Ingredient.findAll({
        where: { id: { [Op.in]: ingredientIds } },
        attributes: ['id', 'currentStock']
      });
      ingredients.forEach(ing => {
        stockMap.set(ing.id, parseFloat(ing.currentStock));
      });
    }

    // 4. Prepare Inventory List
    const inventory = Array.from(ingredientMap.values()).map(ing => {
      const stock = stockMap.get(ing.id) || 0;
      return {
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        currentStock: stock,
        reorderLevel: ing.reorderLevel,
        isLow: stock <= ing.reorderLevel
      };
    });

    // 5. Calculate Production Capability
    // Get aggregated sales for today to calculate remaining target
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysOrders = await KitchenOrder.findAll({
      where: {
        createdAt: { [Op.gte]: today },
        status: { [Op.ne]: 'cancelled' }
      }
    });

    const soldCounts = {};
    todaysOrders.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.menuItemId) {
            soldCounts[item.menuItemId] = (soldCounts[item.menuItemId] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    const production = fullMenuItems.map(item => {
      let maxQuantity = Infinity;
      let limitingIngredient = null;
      let ingredientsFound = false;

      const checkIngredients = (list) => {
        if (!list || list.length === 0) return;
        ingredientsFound = true;

        list.forEach(ri => {
          const required = parseFloat(ri.quantity);
          const stock = stockMap.get(ri.ingredientId) || 0;
          if (required > 0) {
            const canMake = Math.floor(stock / required);
            if (canMake < maxQuantity) {
              maxQuantity = canMake;
              limitingIngredient = ri.ingredient ? ri.ingredient.name : 'Unknown';
            }
          }
        });
      };

      // Check portions (use first portion usually)
      if (item.portions && item.portions.length > 0) {
        checkIngredients(item.portions[0].ingredients);
      } else if (item.recipe && item.recipe.length > 0) {
        checkIngredients(item.recipe);
      }

      if (!ingredientsFound) maxQuantity = 0;
      if (maxQuantity === Infinity) maxQuantity = 0;

      const stockLimit = maxQuantity;
      const dailyTarget = item.dailyTarget || 0;
      const soldToday = soldCounts[item.id] || 0;

      let effectiveMax = stockLimit;
      let limitReason = limitingIngredient ? `Limited by ${limitingIngredient}` : null;

      // Apply Daily Target Limit if set
      if (dailyTarget > 0) {
        const remainingTarget = Math.max(0, dailyTarget - soldToday);
        if (remainingTarget < effectiveMax) {
          effectiveMax = remainingTarget;
          limitReason = 'Daily Target Limit';
        }
      }

      return {
        id: item.id,
        name: item.name,
        maxQuantity: effectiveMax,
        limitingIngredient: limitReason,
        stockLimit,
        dailyTarget,
        soldToday
      };
    }).sort((a, b) => a.maxQuantity - b.maxQuantity);

    res.status(200).json({
      success: true,
      data: {
        inventory,
        production,
        menuItems: fullMenuItems // Provide full structure for frontend
      }
    });

  } catch (error) {
    next(error);
  }
};
