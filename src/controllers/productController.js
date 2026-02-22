const { Op } = require('sequelize');
const Product = require('../models/Product');
const KitchenStation = require('../models/KitchenStation');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res, next) => {
  try {
    const { category, isActive, kitchenStationId } = req.query;

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (kitchenStationId) where.kitchenStationId = kitchenStationId;

    const products = await Product.findAll({
      where,
      include: [{
        model: KitchenStation,
        as: 'kitchenStation',
        attributes: ['id', 'name', 'code']
      }]
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: KitchenStation,
        as: 'kitchenStation',
        attributes: ['id', 'name', 'code']
      }]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Manager, Admin)
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Manager, Admin)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const oldPrice = parseFloat(product.unitPrice);
    const newPrice = req.body.unitPrice ? parseFloat(req.body.unitPrice) : oldPrice;

    await product.update(req.body);

    if (req.body.unitPrice && oldPrice !== newPrice) {
      const { PriceHistory, AuditLog } = require('../models');
      await PriceHistory.create({
        resourceType: 'Product',
        resourceId: product.id,
        itemName: product.name,
        oldPrice,
        newPrice,
        changedBy: req.user.id,
        changedByName: req.user.fullName
      });

      await AuditLog.create({
        userId: req.user.id,
        action: 'PRICE_CHANGE',
        resourceType: 'Product',
        resourceId: product.id,
        description: `Price changed for product ${product.name} from ${oldPrice} to ${newPrice}`,
        metadata: { oldPrice, newPrice, productName: product.name }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.destroy();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search products by name, category, or code
// @route   GET /api/products/search
// @access  Private
exports.searchProducts = async (req, res, next) => {
  try {
    const {
      query,        // General search term
      name,         // Search by name
      category,     // Filter by category
      code,         // Search by SKU/code
      sku,          // Search by SKU
      barcode,      // Search by barcode
      kitchenStationId, // Filter by kitchen station
      isActive = 'true',
      page = 1,
      limit = 50
    } = req.query;

    // Validate and sanitize limit to prevent performance issues
    const maxLimit = 100;
    const safeLimit = Math.min(parseInt(limit) || 50, maxLimit);
    const safePage = Math.max(parseInt(page) || 1, 1);

    const where = {};
    const searchConditions = [];

    // OPTIMIZATION: Filter by active status first (most selective)
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // OPTIMIZATION: Category filter (indexed field, exact match)
    if (category) {
      where.category = category;
    }

    // Kitchen station filter
    if (kitchenStationId) {
      where.kitchenStationId = kitchenStationId;
    }

    // OPTIMIZATION: Prioritize exact SKU match over LIKE search
    if (code || sku) {
      const skuValue = code || sku;
      // Try exact match first
      const exactMatch = await Product.findOne({
        where: { sku: skuValue, ...where },
        attributes: ['id', 'name', 'sku', 'barcode', 'category', 'unitPrice', 'isActive']
      });

      if (exactMatch) {
        return res.status(200).json({
          success: true,
          count: 1,
          total: 1,
          totalPages: 1,
          currentPage: 1,
          data: [exactMatch]
        });
      }
      // Fall back to partial match
      searchConditions.push({
        sku: { [Op.like]: `%${skuValue}%` }
      });
    }

    // OPTIMIZATION: Exact barcode match (barcodes are typically exact)
    if (barcode) {
      const exactBarcode = await Product.findOne({
        where: { barcode, ...where },
        attributes: ['id', 'name', 'sku', 'barcode', 'category', 'unitPrice', 'isActive']
      });

      if (exactBarcode) {
        return res.status(200).json({
          success: true,
          count: 1,
          total: 1,
          totalPages: 1,
          currentPage: 1,
          data: [exactBarcode]
        });
      }
    }

    // General search - optimized field order (indexed fields first)
    if (query) {
      const searchTerm = query.trim();
      searchConditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },      // Indexed
          { sku: { [Op.like]: `%${searchTerm}%` } },       // Indexed
          { barcode: { [Op.like]: `%${searchTerm}%` } },   // Indexed
          { description: { [Op.like]: `%${searchTerm}%` } } // Not indexed, last
        ]
      });
    }

    // Specific search by name
    if (name) {
      searchConditions.push({
        name: { [Op.like]: `%${name.trim()}%` }
      });
    }

    // Combine all search conditions
    if (searchConditions.length > 0) {
      where[Op.and] = searchConditions;
    }

    // OPTIMIZATION: Calculate offset
    const offset = (safePage - 1) * safeLimit;

    // OPTIMIZATION: Use lean attributes - only return necessary fields
    const attributes = [
      'id', 'name', 'sku', 'barcode',
      'category', 'unitPrice', 'taxable',
      'unit', 'isActive', 'kitchenStationId'
    ];

    // OPTIMIZATION: Single optimized query with count
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['name', 'ASC']], // Uses index
      attributes,
      include: [{
        model: KitchenStation,
        as: 'kitchenStation',
        attributes: ['id', 'name', 'code']
      }],
      benchmark: process.env.NODE_ENV === 'development' // Log query time in dev
    });

    res.status(200).json({
      success: true,
      count: products.length,
      total: count,
      totalPages: Math.ceil(count / safeLimit),
      currentPage: safePage,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Private
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { isActive = 'true', page = 1, limit = 50 } = req.query;

    // Validate pagination
    const maxLimit = 100;
    const safeLimit = Math.min(parseInt(limit) || 50, maxLimit);
    const safePage = Math.max(parseInt(page) || 1, 1);

    // OPTIMIZATION: Build indexed where clause
    const where = { category }; // Uses category index
    if (isActive !== undefined) {
      where.isActive = isActive === 'true'; // Uses composite index
    }

    const offset = (safePage - 1) * safeLimit;

    // OPTIMIZATION: Lean attributes, indexed order
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['name', 'ASC']], // Uses composite index
      attributes: ['id', 'name', 'sku', 'barcode', 'category', 'unitPrice', 'unit', 'isActive'],
      raw: true
    });

    res.status(200).json({
      success: true,
      category,
      count: products.length,
      total: count,
      totalPages: Math.ceil(count / safeLimit),
      currentPage: safePage,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all unique categories
// @route   GET /api/products/categories/list
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const { isActive = 'true' } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // OPTIMIZATION: Use GROUP BY instead of DISTINCT (faster with indexes)
    const { sequelize } = require('../config/database');
    const categories = await Product.findAll({
      where,
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']], // Uses index
      raw: true
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories.map(c => c.category)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products by kitchen station (for menu item ingredients)
// @route   GET /api/products/by-kitchen/:kitchenStationId
// @access  Private
exports.getProductsByKitchen = async (req, res, next) => {
  try {
    const { kitchenStationId } = req.params;
    const { isActive = 'true' } = req.query;

    const where = {
      kitchenStationId: kitchenStationId
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const products = await Product.findAll({
      where,
      attributes: ['id', 'name', 'sku', 'category', 'unit', 'unitPrice', 'reorderLevel'],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: products.length,
      kitchenStationId: parseInt(kitchenStationId),
      data: products
    });
  } catch (error) {
    next(error);
  }
};
