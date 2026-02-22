const { MenuItem, MenuItemPortion, MenuItemIngredient, Product, Ingredient } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all menu items with optional filtering and grouping by category
 */
exports.getMenuItems = async (req, res) => {
  try {
    const { category, isAvailable, isActive, search, kitchenStationId } = req.query;

    // Disable caching to prevent 304 responses and ensure fresh data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const whereClause = {};

    if (category) {
      whereClause.category = category;
    }

    if (isAvailable !== undefined) {
      whereClause.isAvailable = isAvailable === 'true';
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (kitchenStationId) {
      whereClause.kitchenStationId = kitchenStationId;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const menuItems = await MenuItem.findAll({
      where: whereClause,
      order: [
        ['category', 'ASC'],
        ['displayOrder', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Group by category
    const grouped = menuItems.reduce((acc, item) => {
      const cat = item.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {});

    // Get unique categories
    const categories = [...new Set(menuItems.map(item => item.category))];

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: grouped,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items',
      error: error.message
    });
  }
};

/**
 * Get single menu item by ID
 */
exports.getMenuItemById = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByPk(req.params.id, {
      include: [
        {
          model: MenuItemPortion,
          as: 'portions',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: MenuItemIngredient,
              as: 'ingredients',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'sku', 'unit', 'category']
                }
              ]
            }
          ]
        },
        {
          model: MenuItemIngredient,
          as: 'recipe',
          include: [
            {
              model: Ingredient,
              as: 'ingredient'
            }
          ]
        }
      ]
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu item',
      error: error.message
    });
  }
};

/**
 * Create new menu item
 */
exports.createMenuItem = async (req, res) => {
  try {
    const { portions, ...menuItemData } = req.body;

    // Validate kitchen station is selected
    if (!menuItemData.kitchenStationId) {
      return res.status(400).json({
        success: false,
        message: 'Kitchen station is required before creating menu item'
      });
    }

    // Validate at least one portion is provided
    if (!portions || portions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one portion is required'
      });
    }

    // Create menu item
    const menuItem = await MenuItem.create(menuItemData);

    // Create portions with ingredients
    for (const portionData of portions) {
      const { ingredients, ...portion } = portionData;

      const createdPortion = await MenuItemPortion.create({
        ...portion,
        menuItemId: menuItem.id
      });

      // Create ingredients for this portion
      if (ingredients && ingredients.length > 0) {
        const ingredientsToCreate = ingredients.map(ing => ({
          portionId: createdPortion.id,
          productId: ing.productId,
          ingredientId: ing.ingredientId || null,
          quantity: ing.quantity,
          unit: ing.unit || 'piece',
          notes: ing.notes
        }));

        await MenuItemIngredient.bulkCreate(ingredientsToCreate);
      }
    }

    // Fetch complete menu item with portions and ingredients
    const completeMenuItem = await MenuItem.findByPk(menuItem.id, {
      include: [
        {
          model: MenuItemPortion,
          as: 'portions',
          include: [
            {
              model: MenuItemIngredient,
              as: 'ingredients',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'sku', 'unit']
                }
              ]
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: completeMenuItem
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating menu item',
      error: error.message
    });
  }
};

/**
 * Update menu item
 */
exports.updateMenuItem = async (req, res) => {
  try {
    const { portions, ...menuItemData } = req.body;

    const menuItem = await MenuItem.findByPk(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    const oldPrice = parseFloat(menuItem.price);
    const newPrice = req.body.price ? parseFloat(req.body.price) : oldPrice;

    // Update basic menu item data
    await menuItem.update(menuItemData);

    if (req.body.price && oldPrice !== newPrice) {
      const { PriceHistory, AuditLog } = require('../models');
      await PriceHistory.create({
        resourceType: 'MenuItem',
        resourceId: menuItem.id,
        itemName: menuItem.name,
        oldPrice,
        newPrice,
        changedBy: req.user.id,
        changedByName: req.user.fullName
      });

      await AuditLog.create({
        userId: req.user.id,
        action: 'PRICE_CHANGE',
        resourceType: 'MenuItem',
        resourceId: menuItem.id,
        description: `Price changed for menu item ${menuItem.name} from ${oldPrice} to ${newPrice}`,
        metadata: { oldPrice, newPrice, itemName: menuItem.name }
      });
    }

    // Update portions if provided
    if (portions && portions.length > 0) {
      // Delete existing portions (cascade will delete ingredients)
      await MenuItemPortion.destroy({
        where: { menuItemId: menuItem.id }
      });

      // Create new portions with ingredients
      for (const portionData of portions) {
        const { ingredients, ...portion } = portionData;

        const createdPortion = await MenuItemPortion.create({
          ...portion,
          menuItemId: menuItem.id
        });

        // Create ingredients for this portion
        if (ingredients && ingredients.length > 0) {
          const ingredientsToCreate = ingredients.map(ing => ({
            portionId: createdPortion.id,
            productId: ing.productId,
            ingredientId: ing.ingredientId || null,
            quantity: ing.quantity,
            unit: ing.unit || 'piece',
            notes: ing.notes
          }));

          await MenuItemIngredient.bulkCreate(ingredientsToCreate);
        }
      }
    }

    // Fetch complete updated menu item
    const updatedMenuItem = await MenuItem.findByPk(menuItem.id, {
      include: [
        {
          model: MenuItemPortion,
          as: 'portions',
          include: [
            {
              model: MenuItemIngredient,
              as: 'ingredients',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'sku', 'unit']
                }
              ]
            }
          ]
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: updatedMenuItem
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating menu item',
      error: error.message
    });
  }
};

/**
 * Delete menu item (soft delete by setting isActive to false)
 */
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByPk(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    await menuItem.destroy();

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting menu item',
      error: error.message
    });
  }
};

/**
 * Toggle menu item availability
 */
exports.toggleAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByPk(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    const newAvailability = req.body.isAvailable !== undefined
      ? req.body.isAvailable
      : !menuItem.isAvailable;

    await menuItem.update({ isAvailable: newAvailability });

    res.status(200).json({
      success: true,
      message: `Menu item ${newAvailability ? 'available' : 'unavailable'}`,
      data: menuItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating availability',
      error: error.message
    });
  }
};

/**
 * Get menu items by category
 */
exports.getMenuItemsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const menuItems = await MenuItem.findAll({
      where: {
        category,
        isActive: true
      },
      order: [
        ['displayOrder', 'ASC'],
        ['name', 'ASC']
      ]
    });

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items by category',
      error: error.message
    });
  }
};

/**
 * Get all categories
 */
exports.getCategories = async (req, res) => {
  try {
    // Get categories from the ENUM definition in the model
    const categories = MenuItem.rawAttributes.category.values;

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

/**
 * Get menu items by kitchen station
 */
exports.getMenuItemsByKitchen = async (req, res) => {
  try {
    const { kitchenStationId } = req.params;

    const menuItems = await MenuItem.findAll({
      where: {
        kitchenStationId,
        isActive: true
      },
      order: [
        ['category', 'ASC'],
        ['displayOrder', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Group by category
    const grouped = menuItems.reduce((acc, item) => {
      const cat = item.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: grouped,
      kitchenStationId: parseInt(kitchenStationId)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items by kitchen',
      error: error.message
    });
  }
};
