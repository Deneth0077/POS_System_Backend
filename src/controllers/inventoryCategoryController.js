const { InventoryCategory, KitchenStation, KitchenInventoryCategory, Ingredient } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all inventory categories
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { 
      includeInactive = false,
      includeKitchens = false,
      parentId = null
    } = req.query;

    const whereClause = {};
    
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    if (parentId !== null) {
      whereClause.parentCategoryId = parentId === 'null' ? null : parentId;
    }

    const include = [];
    
    if (includeKitchens) {
      include.push({
        model: KitchenStation,
        as: 'kitchenStations',
        through: {
          attributes: ['isPrimary', 'priority']
        },
        attributes: ['id', 'name', 'code', 'color', 'icon']
      });
    }

    // Include parent category
    include.push({
      model: InventoryCategory,
      as: 'parentCategory',
      attributes: ['id', 'name', 'code']
    });

    // Include sub-categories
    include.push({
      model: InventoryCategory,
      as: 'subCategories',
      attributes: ['id', 'name', 'code', 'icon', 'color', 'isActive']
    });

    const categories = await InventoryCategory.findAll({
      where: whereClause,
      include,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory categories',
      error: error.message
    });
  }
};

/**
 * Get a single inventory category by ID
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await InventoryCategory.findByPk(id, {
      include: [
        {
          model: KitchenStation,
          as: 'kitchenStations',
          through: {
            attributes: ['isPrimary', 'priority']
          }
        },
        {
          model: InventoryCategory,
          as: 'parentCategory',
          attributes: ['id', 'name', 'code']
        },
        {
          model: InventoryCategory,
          as: 'subCategories'
        },
        {
          model: Ingredient,
          as: 'ingredients',
          attributes: ['id', 'name', 'currentStock', 'unit', 'isActive']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

/**
 * Create a new inventory category
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, code, description, icon, color, parentCategoryId, kitchenStationIds } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required'
      });
    }

    // Check if code already exists
    const existingCategory = await InventoryCategory.findOne({
      where: { 
        [Op.or]: [
          { code },
          { name }
        ]
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name or code already exists'
      });
    }

    // Create the category
    const category = await InventoryCategory.create({
      name,
      code: code.toUpperCase(),
      description,
      icon,
      color,
      parentCategoryId: parentCategoryId || null
    });

    // Assign to kitchen stations if provided
    if (kitchenStationIds && kitchenStationIds.length > 0) {
      const assignments = kitchenStationIds.map((kitchenId, index) => ({
        kitchenStationId: kitchenId,
        inventoryCategoryId: category.id,
        isPrimary: index === 0, // First one is primary
        priority: index
      }));

      await KitchenInventoryCategory.bulkCreate(assignments);
    }

    // Fetch the created category with associations
    const createdCategory = await InventoryCategory.findByPk(category.id, {
      include: [
        {
          model: KitchenStation,
          as: 'kitchenStations',
          through: {
            attributes: ['isPrimary', 'priority']
          }
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: createdCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

/**
 * Update an inventory category
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, icon, color, parentCategoryId, isActive, kitchenStationIds } = req.body;

    const category = await InventoryCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check for duplicate name or code (excluding current category)
    if (name || code) {
      const duplicateCheck = await InventoryCategory.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: [
            name ? { name } : null,
            code ? { code } : null
          ].filter(Boolean)
        }
      });

      if (duplicateCheck) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name or code already exists'
        });
      }
    }

    // Update category
    await category.update({
      ...(name && { name }),
      ...(code && { code: code.toUpperCase() }),
      ...(description !== undefined && { description }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(parentCategoryId !== undefined && { parentCategoryId }),
      ...(isActive !== undefined && { isActive })
    });

    // Update kitchen assignments if provided
    if (kitchenStationIds) {
      // Remove existing assignments
      await KitchenInventoryCategory.destroy({
        where: { inventoryCategoryId: id }
      });

      // Create new assignments
      if (kitchenStationIds.length > 0) {
        const assignments = kitchenStationIds.map((kitchenId, index) => ({
          kitchenStationId: kitchenId,
          inventoryCategoryId: id,
          isPrimary: index === 0,
          priority: index
        }));

        await KitchenInventoryCategory.bulkCreate(assignments);
      }
    }

    // Fetch updated category
    const updatedCategory = await InventoryCategory.findByPk(id, {
      include: [
        {
          model: KitchenStation,
          as: 'kitchenStations',
          through: {
            attributes: ['isPrimary', 'priority']
          }
        }
      ]
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

/**
 * Delete an inventory category
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await InventoryCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has ingredients
    const ingredientCount = await Ingredient.count({
      where: { categoryId: id }
    });

    if (ingredientCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${ingredientCount} ingredient(s) assigned to it.`
      });
    }

    // Check if category has sub-categories
    const subCategoryCount = await InventoryCategory.count({
      where: { parentCategoryId: id }
    });

    if (subCategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${subCategoryCount} sub-category(ies).`
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};

/**
 * Get categories by kitchen station
 */
exports.getCategoriesByKitchen = async (req, res) => {
  try {
    const { kitchenId } = req.params;

    const kitchen = await KitchenStation.findByPk(kitchenId, {
      include: [
        {
          model: InventoryCategory,
          as: 'inventoryCategories',
          through: {
            attributes: ['isPrimary', 'priority']
          },
          where: { isActive: true }
        }
      ]
    });

    if (!kitchen) {
      return res.status(404).json({
        success: false,
        message: 'Kitchen station not found'
      });
    }

    res.json({
      success: true,
      data: {
        kitchen: {
          id: kitchen.id,
          name: kitchen.name,
          code: kitchen.code
        },
        categories: kitchen.inventoryCategories
      }
    });
  } catch (error) {
    console.error('Error fetching categories by kitchen:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories by kitchen',
      error: error.message
    });
  }
};

/**
 * Assign category to kitchen station
 */
exports.assignCategoryToKitchen = async (req, res) => {
  try {
    const { categoryId, kitchenStationId, isPrimary = false, priority = 0 } = req.body;

    if (!categoryId || !kitchenStationId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and Kitchen Station ID are required'
      });
    }

    // Check if category and kitchen exist
    const category = await InventoryCategory.findByPk(categoryId);
    const kitchen = await KitchenStation.findByPk(kitchenStationId);

    if (!category || !kitchen) {
      return res.status(404).json({
        success: false,
        message: 'Category or Kitchen Station not found'
      });
    }

    // Check if assignment already exists
    const existingAssignment = await KitchenInventoryCategory.findOne({
      where: { categoryId, kitchenStationId }
    });

    if (existingAssignment) {
      // Update existing assignment
      await existingAssignment.update({ isPrimary, priority });

      return res.json({
        success: true,
        message: 'Assignment updated successfully',
        data: existingAssignment
      });
    }

    // Create new assignment
    const assignment = await KitchenInventoryCategory.create({
      inventoryCategoryId: categoryId,
      kitchenStationId,
      isPrimary,
      priority
    });

    res.status(201).json({
      success: true,
      message: 'Category assigned to kitchen successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error assigning category to kitchen:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning category to kitchen',
      error: error.message
    });
  }
};

/**
 * Remove category from kitchen station
 */
exports.removeCategoryFromKitchen = async (req, res) => {
  try {
    const { categoryId, kitchenStationId } = req.params;

    const assignment = await KitchenInventoryCategory.findOne({
      where: {
        inventoryCategoryId: categoryId,
        kitchenStationId
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    await assignment.destroy();

    res.json({
      success: true,
      message: 'Category removed from kitchen successfully'
    });
  } catch (error) {
    console.error('Error removing category from kitchen:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing category from kitchen',
      error: error.message
    });
  }
};
