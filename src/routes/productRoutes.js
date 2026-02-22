const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  getCategories,
  getProductsByKitchen
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { apiLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../config/roles');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

// Validation rules
const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number')
];

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products by name, category, or code
 *     description: Advanced search for menu items with multiple search criteria
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: General search across name, SKU, barcode, description
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by product name
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by exact category
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Search by product code/SKU
 *       - in: query
 *         name: sku
 *         schema:
 *           type: string
 *         description: Search by SKU
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         description: Search by barcode
 *       - in: query
 *         name: kitchenStationId
 *         schema:
 *           type: integer
 *         description: Filter by kitchen station ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/search', apiLimiter, protect, searchProducts);

/**
 * @swagger
 * /api/products/categories/list:
 *   get:
 *     summary: Get all product categories
 *     description: Retrieve list of unique categories
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Categories list
 */
router.get('/categories/list', apiLimiter, protect, getCategories);

/**
 * @swagger
 * /api/products/category/{category}:
 *   get:
 *     summary: Get products by category
 *     description: Retrieve all products in a specific category
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Products in category
 */
router.get('/category/:category', apiLimiter, protect, getProductsByCategory);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of all products with pagination support
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, SKU, or barcode
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active status
 *       - in: query
 *         name: kitchenStationId
 *         schema:
 *           type: integer
 *         description: Filter by kitchen station ID
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 */
router.get('/', apiLimiter, protect, getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieve detailed information about a specific product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', apiLimiter, protect, getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create new product
 *     description: Add a new product to inventory. Requires Admin or Manager role.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sku
 *               - category
 *               - unitPrice
 *             properties:
 *               name:
 *                 type: string
 *                 example: Coca Cola 500ml
 *               sku:
 *                 type: string
 *                 example: COKE-500
 *               barcode:
 *                 type: string
 *                 example: "1234567890123"
 *               category:
 *                 type: string
 *                 example: Beverages
 *               unitPrice:
 *                 type: number
 *                 format: decimal
 *                 example: 150.00
 *               costPrice:
 *                 type: number
 *                 format: decimal
 *                 example: 100.00
 *               description:
 *                 type: string
 *                 example: Refreshing cola drink
 *               reorderLevel:
 *                 type: integer
 *                 example: 50
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin or Manager role
 */
router.post('/', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), productValidation, validate, createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product
 *     description: Update existing product information. Requires Admin or Manager role.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               unitPrice:
 *                 type: number
 *                 format: decimal
 *               costPrice:
 *                 type: number
 *                 format: decimal
 *               description:
 *                 type: string
 *               reorderLevel:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put('/:id', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product
 *     description: Soft delete a product. Requires Admin role.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Product deleted successfully
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin role
 */
router.delete('/:id', apiLimiter, protect, authorize(ROLES.ADMIN), deleteProduct);

/**
 * @swagger
 * /api/products/by-kitchen/{kitchenStationId}:
 *   get:
 *     summary: Get products by kitchen station (for menu ingredients)
 *     description: Retrieve products available for a specific kitchen station to use as menu item ingredients
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kitchenStationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kitchen Station ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 25
 *                 kitchenStationId:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       sku:
 *                         type: string
 *                       category:
 *                         type: string
 *                       unit:
 *                         type: string
 *                       unitPrice:
 *                         type: number
 *                       reorderLevel:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/by-kitchen/:kitchenStationId', apiLimiter, protect, getProductsByKitchen);

module.exports = router;
